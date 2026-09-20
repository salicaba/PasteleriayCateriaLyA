// backend/src/modules/pos/pos.cancellations.controller.js
import { Op } from 'sequelize';
import { getIO } from '../../config/socket.js'; 
import Order from './Order.model.js';
import OrderItem from './OrderItem.model.js';
import Product from '../menu/Product.model.js';
import Table from './Table.model.js';
import Transaction from '../cash/Transaction.model.js';

// =====================================================================
// 🧠 HELPER: LIMPIEZA EXTREMA DE NOMBRES DE CUENTA (Fix Teléfonos)
// =====================================================================
const getCleanAccountName = (str) => {
  if (!str) return 'General';
  let clean = String(str);
  
  if (clean.includes(' | ')) clean = clean.split(' | ')[0];
  if (clean.includes(' - ')) {
      const parts = clean.split(' - ');
      clean = parts.slice(0, -1).join(' ');
  }
  
  clean = clean.replace(/\d+/g, '').trim();
  
  return clean || 'General';
};

// =====================================================================
// 🔥 NUEVO HELPER: DETECCIÓN BLINDADA CONTRA TILDES Y MAYÚSCULAS
// =====================================================================
const getOrigenProducto = (departamento) => {
  if (!departamento) return 'CAFETERIA';
  // Convierte "Pastelería" a "PASTELERIA" quitando acentos
  const deptoNormalizado = String(departamento).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (deptoNormalizado.includes('PASTELERIA')) return 'PASTELERIA';
  return 'CAFETERIA';
};

// =====================================================================
// 🔥 FUNCIÓN MAESTRA: MODIFICAR TRANSACCIÓN (Precisión Láser Corregida)
// =====================================================================
const modificarTransaccionOriginal = async (orderId, monto, tipoOperacion, detalle, userId = null, cuentaName = null, baseDateForDb, sourceToMatch = null) => {
  let whereClause = { referenceId: orderId, type: 'INCOME' };
  
  // 1. Buscamos todas las transacciones de ingresos de esta orden (tanto anuladas como activas)
  let txs = await Transaction.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
  });

  let targetTxs = txs;
  
  // 2. FILTRO DE ORO: Intentamos filtrar por origen si nos lo proveen (Cafetería vs Pastelería)
  if (sourceToMatch) {
      const sourceFiltered = txs.filter(tx => tx.source === sourceToMatch);
      if (sourceFiltered.length > 0) {
          targetTxs = sourceFiltered;
      }
  } 
  // 3. PLAN B: Si no hay origen, intentamos el viejo filtro por nombre de cuenta en Mesas
  else if (cuentaName) {
    const cleanTarget = getCleanAccountName(cuentaName);
    const filteredTxs = txs.filter(tx => 
      tx.description && tx.description.includes(`Cuenta: ${cleanTarget}`)
    );
    if (filteredTxs.length > 0) {
       targetTxs = filteredTxs; 
    }
  }

  let remainingMonto = monto;

  for (let tx of targetTxs) {
      if (remainingMonto <= 0) break;

      let nuevoMonto = Number(tx.amount);
      let appliedAmount = 0;

      if (tipoOperacion === 'restar') {
          // Si estamos anulando, le quitamos dinero hasta llegar a 0
          appliedAmount = Math.min(nuevoMonto, remainingMonto);
          nuevoMonto -= appliedAmount;
          remainingMonto -= appliedAmount;
          tx.description += ` | 📉 -$${appliedAmount.toFixed(2)} (Anulado: ${detalle})`;
      } else if (tipoOperacion === 'sumar') {
          // Si estamos restaurando, le devolvemos el dinero sin límite
          appliedAmount = remainingMonto;
          nuevoMonto += appliedAmount;
          remainingMonto -= appliedAmount;
          tx.description += ` | 📈 +$${appliedAmount.toFixed(2)} (Restaurado: ${detalle})`;
      }

      if (nuevoMonto <= 0.01) nuevoMonto = 0;

      let newStatus = tx.status;
      let cancelledAt = tx.cancelledAt;
      let cancelledBy = tx.cancelledBy;

      if (nuevoMonto === 0 && tx.status !== 'CANCELLED') {
          newStatus = 'CANCELLED';
          cancelledAt = baseDateForDb; // 🔥 Recibe la fecha pura de la BD
          cancelledBy = userId;
      } else if (nuevoMonto > 0 && tx.status === 'CANCELLED') {
          newStatus = 'ACTIVE';
          cancelledAt = null;
          cancelledBy = null;
      }

      await tx.update({
          amount: nuevoMonto,
          description: tx.description,
          status: newStatus,
          cancelledAt,
          cancelledBy
      });
  }
  return true;
};

// ==========================================
// 📌 CANCELAR UN PRODUCTO INDIVIDUAL
// ==========================================
export const cancelOrderItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { cancelReason, cancelQty } = req.body; 
    const userId = req.user?.id; 

    const item = await OrderItem.findOne({ 
      where: { id: itemId, orderId: id }, 
      include: [{ model: Product, as: 'product' }] 
    });
    
    if (!item) return res.status(404).json({ message: 'Producto no encontrado' });

    const order = await Order.findByPk(id, {
      include: [{ model: Table, as: 'table' }]
    });

    const qtyToCancel = (cancelQty && cancelQty < item.quantity) ? parseInt(cancelQty, 10) : item.quantity;
    const isPartial = qtyToCancel < item.quantity;

    let unitPrice = Number(item.subtotal) / item.quantity;
    let refundAmount = unitPrice * qtyToCancel;
    if (refundAmount < 0) refundAmount = 0;

    let wasPaid = order.status === 'PAID' || (order.paidAccounts && order.paidAccounts.includes(item.cuenta));

    // 🔥 FIX: Fecha pura (UTC) para que no truene la BD al guardar en "cancelledAt"
    const dbNow = new Date();

    if (wasPaid && refundAmount > 0) {
      const nombreProducto = item.product?.name || item.nombre || 'Producto';
      // 🔥 Usamos el nuevo helper blindado
      const origen = getOrigenProducto(item.product?.departamento);
      
      await modificarTransaccionOriginal(order.id, refundAmount, 'restar', `${qtyToCancel}x ${nombreProducto}`, userId, item.cuenta, dbNow, origen);
    }

    let notesArray = [];
    try { notesArray = JSON.parse(item.notes || '[]'); } catch(e) {}
    if (!Array.isArray(notesArray)) notesArray = [notesArray];

    if (isPartial) {
        const cancelledNotes = notesArray.slice(0, qtyToCancel);
        const remainingNotes = notesArray.slice(qtyToCancel);

        await OrderItem.create({
            orderId: item.orderId,
            productId: item.productId,
            quantity: qtyToCancel,
            subtotal: refundAmount, 
            cuenta: item.cuenta,
            isTakeaway: item.isTakeaway,
            notes: JSON.stringify(cancelledNotes),
            kitchenStatus: item.kitchenStatus,
            status: 'CANCELLED',
            cancelledAt: dbNow, // 🔥 Fecha limpia
            cancelReason: cancelReason || `Cancelación parcial desde POS`,
            cancelledBy: userId
        });

        await item.update({
            quantity: item.quantity - qtyToCancel,
            subtotal: Math.max(0, Number(item.subtotal) - refundAmount), 
            notes: JSON.stringify(remainingNotes)
        });
    } else {
        await item.update({
          status: 'CANCELLED',
          cancelledAt: dbNow, // 🔥 Fecha limpia
          cancelReason: cancelReason || `Cancelado desde POS`,
          cancelledBy: userId
        });
    }

    getIO().emit('orderItemCancelled', { 
        orderId: id, 
        itemId: item.id, 
        productId: item.productId, 
        cancelQty: qtyToCancel 
    });

    const newTotal = await OrderItem.sum('subtotal', { where: { orderId: id, status: 'ACTIVE' } }) || 0;
    const activeItems = await OrderItem.count({ where: { orderId: id, status: 'ACTIVE' } });
    
    if (activeItems === 0 && order.status !== 'CLOSED') {
      const numeroMesa = order.table ? order.table.numero || order.table.number : 'Sin Mesa/Llevar';
      const nombreCuenta = item.cuenta || 'Cuenta General'; 
      
      let motivoMecanismoSeguridad = `Cancelación de cuenta: ${nombreCuenta} (Mesa #${numeroMesa}) - Se vaciaron los productos automáticamente`;

      if (order.ticketId && order.ticketId.toUpperCase().includes('MOSTRADOR')) {
        motivoMecanismoSeguridad = `Se vaciaron los productos automáticamente`;
      }

      await order.update({ 
        status: 'CANCELLED', 
        totalAmount: 0, 
        cancelledAt: dbNow, // 🔥 Fecha limpia
        cancelReason: motivoMecanismoSeguridad, 
        cancelledBy: userId 
      });
      
      getIO().emit('orderCancelled', { orderId: id, tableId: order.tableId });

      if (order.tableId) {
        const remainingOrders = await Order.count({ where: { tableId: order.tableId, status: ['OPEN', 'PAID'] } });
        if (remainingOrders === 0) {
          await Table.update({ status: 'active' }, { where: { id: order.tableId } });
        }
      }
    } else {
      await order.update({ totalAmount: newTotal });
    }

    const allItems = await OrderItem.findAll({
      where: { orderId: id, status: 'ACTIVE' },
      include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice', 'imageUrl', 'requiereCocina'] }]
    });

    getIO().emit('pos:update'); 
    res.json({ message: 'Producto cancelado correctamente', wasRefunded: wasPaid, orderItems: allItems });
  } catch (error) {
    console.error('Error en cancelOrderItem:', error);
    res.status(500).json({ message: 'Error al cancelar producto' });
  }
};

// ==========================================
// 📌 CANCELAR TODA LA ORDEN (MESA COMPLETA)
// ==========================================
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancelReason } = req.body;
    const userId = req.user?.id;

    const order = await Order.findByPk(id, { 
      include: [
        { 
          model: OrderItem, 
          as: 'items',
          include: [{ model: Product, as: 'product' }] 
        },
        { model: Table, as: 'table' } 
      ] 
    });
    
    if (!order) return res.status(404).json({ message: 'Orden no encontrada' });
    if (order.status === 'CLOSED') return res.status(400).json({ message: 'No se puede cancelar una orden cerrada definitivamente' });

    const cuentasActivas = order.items.filter(i => i.status === 'ACTIVE').map(i => i.cuenta || 'Cuenta General');
    const uniqueCuentas = [...new Set(cuentasActivas)];
    const nombresCuentas = uniqueCuentas.length > 0 ? uniqueCuentas.join(', ') : 'Cuenta General';
    
    const numeroMesa = order.table ? order.table.numero || order.table.number : 'Sin Mesa/Llevar';
    
    let textoPapelera = order.table 
        ? `Mesa Completa #${numeroMesa} (Cuentas: ${nombresCuentas})`
        : `Pedido para Llevar (Cuentas: ${nombresCuentas})`;
        
    if (order.ticketId && order.ticketId.toUpperCase().includes('MOSTRADOR')) {
      textoPapelera = `Mostrador Express`;
    }
    
    const motivoFinal = cancelReason ? `Cancelación de ${textoPapelera} - Motivo: ${cancelReason}` : `Cancelación de ${textoPapelera}`;

    let totalRefundByAccount = {};
    // 🔥 FIX: Fecha pura para la Base de Datos
    const dbNow = new Date();

    for (const item of order.items) {
      if (item.status === 'ACTIVE') {
        let wasPaid = order.status === 'PAID' || (order.paidAccounts && order.paidAccounts.includes(item.cuenta));
        if (wasPaid) {
           // 🔥 Usamos el nuevo helper blindado
           const origen = getOrigenProducto(item.product?.departamento);
           const key = `${item.cuenta}||${origen}`;
           totalRefundByAccount[key] = (totalRefundByAccount[key] || 0) + Number(item.subtotal);
        }

        await item.update({
          status: 'CANCELLED',
          cancelledAt: dbNow, // 🔥 Fecha limpia
          cancelReason: motivoFinal, 
          cancelledBy: userId
        });
      }
    }

    getIO().emit('orderCancelled', { orderId: id, tableId: order.tableId });

    for (const [key, amount] of Object.entries(totalRefundByAccount)) {
       if (amount > 0) {
          const [cuentaName, origen] = key.split('||');
          await modificarTransaccionOriginal(order.id, amount, 'restar', `Cancelación Mesa`, userId, cuentaName, dbNow, origen);
       }
    }

    await order.update({
      status: 'CANCELLED',
      totalAmount: 0,
      cancelledAt: dbNow, // 🔥 Fecha limpia
      cancelReason: motivoFinal, 
      cancelledBy: userId
    });

    if (order.tableId) {
      const cuentasRestantes = await Order.count({
        where: { tableId: order.tableId, status: ['OPEN', 'PAID'] }
      });
      if (cuentasRestantes === 0) {
        await Table.update({ status: 'active' }, { where: { id: order.tableId } });
      }
    }

    getIO().emit('pos:update'); 
    res.json({ message: `La cuenta fue cancelada correctamente` });
  } catch (error) {
    console.error('Error en cancelOrder:', error);
    res.status(500).json({ message: 'Error al cancelar la cuenta' });
  }
};

// ==========================================
// 📊 OBTENER RESUMEN DIARIO (VENDIDOS Y PAPELERA)
// ==========================================
export const getDailySummary = async (req, res) => {
  try {
    // 🔥 BLINDAJE DE ZONA HORARIA: Evita que el servidor UTC revuelva los días
    const nowLocalStr = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
    const localNow = new Date(nowLocalStr);

    const year = localNow.getFullYear();
    const month = String(localNow.getMonth() + 1).padStart(2, '0');
    const day = String(localNow.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    // Forzamos el límite a las 00:00 y 23:59:59 con el offset de Chiapas (-06:00)
    const startOfDay = new Date(`${todayStr}T00:00:00.000-06:00`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999-06:00`);

    const dateFilter = { [Op.between]: [startOfDay, endOfDay] };

    const vendidosOrders = await Order.findAll({
      where: { status: 'PAID', createdAt: dateFilter },
      include: [{ model: Table, as: 'table', required: false }],
      order: [['createdAt', 'DESC']]
    });

    const cancelledOrders = await Order.findAll({
      where: { status: 'CANCELLED', cancelledAt: dateFilter },
      include: [{ model: Table, as: 'table', required: false }],
      order: [['cancelledAt', 'DESC']]
    });

    const rawCancelledItems = await OrderItem.findAll({
      where: { status: 'CANCELLED', cancelledAt: dateFilter },
      include: [{ model: Product, as: 'product' }],
      order: [['cancelledAt', 'DESC']]
    });

    const orderIds = [...new Set(rawCancelledItems.map(i => i.orderId))];
    const parentOrders = await Order.findAll({
      where: { id: orderIds },
      include: [{ model: Table, as: 'table', required: false }]
    });

    const cancelledItems = rawCancelledItems.map(item => {
      const itemJSON = item.toJSON ? item.toJSON() : item;
      itemJSON.parentOrder = parentOrders.find(o => o.id === item.orderId);
      return itemJSON;
    });

    const transactions = await Transaction.findAll({
      where: { createdAt: dateFilter },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      vendidosCount: vendidosOrders.length,
      papeleraCount: cancelledOrders.length + cancelledItems.length,
      vendidosOrders,
      cancelledOrders,
      cancelledItems,
      transactions
    });
  } catch (error) {
    console.error('Error en getDailySummary:', error);
    res.status(500).json({ message: 'Error al obtener el resumen diario' });
  }
};