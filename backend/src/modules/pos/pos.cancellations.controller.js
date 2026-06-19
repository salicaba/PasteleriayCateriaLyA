import { Op } from 'sequelize';
import { getIO } from '../../config/socket.js'; 
import Order from './Order.model.js';
import OrderItem from './OrderItem.model.js';
import Product from '../menu/Product.model.js';
import Table from './Table.model.js';
import Transaction from '../cash/Transaction.model.js';

// =====================================================================
// 🔥 FUNCIÓN MAESTRA: MODIFICAR TRANSACCIÓN ORIGINAL (ANULACIONES) 🔥
// =====================================================================
const modificarTransaccionOriginal = async (orderId, monto, tipoOperacion, detalle, userId = null) => {
  const tx = await Transaction.findOne({
    where: { referenceId: orderId, type: 'INCOME' },
    order: [['createdAt', 'DESC']]
  });

  if (tx && monto > 0) {
    let nuevoMonto = Number(tx.amount);
    let nuevaDescripcion = tx.description || '';

    if (tipoOperacion === 'restar') {
      nuevoMonto -= monto;
      nuevaDescripcion += ` | 📉 -$${monto.toFixed(2)} (Anulado: ${detalle})`;
    } else if (tipoOperacion === 'sumar') {
      nuevoMonto += monto;
      nuevaDescripcion += ` | 📈 +$${monto.toFixed(2)} (Restaurado: ${detalle})`;
    }

    // Evitamos decimales residuales
    if (nuevoMonto <= 0.01) nuevoMonto = 0;

    let newStatus = tx.status;
    let cancelledAt = tx.cancelledAt;
    let cancelledBy = tx.cancelledBy;

    // 🔥 LA MAGIA: Si llega a 0, la pasamos a ANULADO automáticamente.
    if (nuevoMonto === 0 && tx.status !== 'CANCELLED') {
      newStatus = 'CANCELLED';
      cancelledAt = new Date();
      cancelledBy = userId;
    } 
    // 🔥 Si estaba anulada y le regresamos dinero (Restaurar), la revivimos.
    else if (nuevoMonto > 0 && tx.status === 'CANCELLED') {
      newStatus = 'ACTIVE';
      cancelledAt = null;
      cancelledBy = null;
    }

    await tx.update({
      amount: nuevoMonto,
      description: nuevaDescripcion,
      status: newStatus,
      cancelledAt,
      cancelledBy
    });
    return true;
  }
  return false;
};

// ==========================================
// 📌 2. CANCELAR UN PRODUCTO INDIVIDUAL
// ==========================================
export const cancelOrderItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { cancelReason, cancelQty } = req.body; 
    const userId = req.user?.id; 

    const item = await OrderItem.findOne({ where: { id: itemId, orderId: id }, include: [{ model: Product, as: 'product' }] });
    if (!item) return res.status(404).json({ message: 'Producto no encontrado' });

    const order = await Order.findByPk(id, {
      include: [{ model: Table, as: 'table' }]
    });

    const qtyToCancel = (cancelQty && cancelQty < item.quantity) ? parseInt(cancelQty, 10) : item.quantity;
    const isPartial = qtyToCancel < item.quantity;

    const unitPrice = Number(item.subtotal) / item.quantity;
    const refundAmount = unitPrice * qtyToCancel;

    let wasPaid = order.status === 'PAID' || (order.paidAccounts && order.paidAccounts.includes(item.cuenta));

    if (wasPaid && refundAmount > 0) {
      const nombreProducto = item.product?.name || item.nombre || 'Producto';
      await modificarTransaccionOriginal(order.id, refundAmount, 'restar', `${qtyToCancel}x ${nombreProducto}`, userId);
    }

    const previousKitchenStatus = item.kitchenStatus;
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
            cancelledAt: new Date(),
            cancelReason: cancelReason || 'Cancelación parcial desde POS',
            cancelledBy: userId
        });

        await item.update({
            quantity: item.quantity - qtyToCancel,
            subtotal: Number(item.subtotal) - refundAmount,
            notes: JSON.stringify(remainingNotes)
        });
    } else {
        await item.update({
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: cancelReason || 'Cancelado desde POS',
          cancelledBy: userId
        });
    }

    if (['PENDING', 'PREPARING', 'READY'].includes(previousKitchenStatus)) {
      getIO().emit('orderItemCancelled', { orderId: id, itemId: item.id });
    }

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
        cancelledAt: new Date(), 
        cancelReason: motivoMecanismoSeguridad, 
        cancelledBy: userId 
      });
      
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
// 📌 3. CANCELAR TODA LA ORDEN (MESA COMPLETA)
// ==========================================
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancelReason } = req.body;
    const userId = req.user?.id;

    const order = await Order.findByPk(id, { 
      include: [
        { model: OrderItem, as: 'items' },
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

    let totalRefund = 0;

    for (const item of order.items) {
      if (item.status === 'ACTIVE') {
        const previousKitchenStatus = item.kitchenStatus;
        
        let wasPaid = order.status === 'PAID' || (order.paidAccounts && order.paidAccounts.includes(item.cuenta));
        if (wasPaid) totalRefund += Number(item.subtotal);

        await item.update({
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: motivoFinal, 
          cancelledBy: userId
        });

        if (['PENDING', 'PREPARING', 'READY'].includes(previousKitchenStatus)) {
          getIO().emit('orderItemCancelled', { orderId: id, itemId: item.id });
        }
      }
    }

    if (totalRefund > 0) {
      await modificarTransaccionOriginal(order.id, totalRefund, 'restar', 'Todos los productos/Cuentas', userId);
    }

    await order.update({
      status: 'CANCELLED',
      totalAmount: 0,
      cancelledAt: new Date(),
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
    res.json({ message: `La cuenta fue cancelada correctamente`, refundedAmount: totalRefund });
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
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

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

// ==========================================
// ♻️ RESTAURAR PRODUCTO CANCELADO
// ==========================================
export const restoreOrderItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const userId = req.user?.id;

    const item = await OrderItem.findOne({ where: { id: itemId, orderId: id }, include: [{ model: Product, as: 'product' }] });
    if (!item) return res.status(404).json({ message: 'Producto no encontrado en la papelera' });

    const order = await Order.findByPk(id);

    if (order.status === 'CANCELLED' || order.status === 'CLOSED') {
      return res.status(400).json({ message: `No se puede restaurar un producto individual si el ticket entero ya fue finalizado o cancelado. Restaura el ticket completo primero.` });
    }

    const tx = await Transaction.findOne({ where: { referenceId: order.id, type: 'INCOME' } });
    let wasPaid = !!tx || (order.paidAccounts && order.paidAccounts.includes(item.cuenta));
    
    if (wasPaid) {
      const unitPrice = Number(item.subtotal) / item.quantity;
      const amountToRestore = unitPrice * item.quantity;
      const nombreProducto = item.product?.name || item.nombre || 'Producto';
      
      await modificarTransaccionOriginal(order.id, amountToRestore, 'sumar', `${item.quantity}x ${nombreProducto}`, userId);
    }

    await item.update({
      status: 'ACTIVE',
      cancelledAt: null,
      cancelReason: null,
      cancelledBy: null
    });

    const newTotal = await OrderItem.sum('subtotal', { where: { orderId: id, status: 'ACTIVE' } }) || 0;
    
    await order.update({ 
      status: wasPaid ? 'PAID' : 'OPEN',
      totalAmount: newTotal,
    });

    getIO().emit('orderItemRestored', { orderId: id, itemId: item.id });
    getIO().emit('pos:update');

    res.json({ message: 'Producto restaurado exitosamente', wasRefundReversed: wasPaid });
  } catch (error) {
    console.error('Error en restoreOrderItem:', error);
    res.status(500).json({ message: 'Error al restaurar producto' });
  }
};

// ==========================================
// ♻️ RESTAURAR ORDEN COMPLETA (CUENTA O MESA)
// ==========================================
export const restoreOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const order = await Order.findByPk(id, { 
      include: [
        { model: OrderItem, as: 'items' },
        { model: Table, as: 'table' } 
      ] 
    });
    
    if (!order) return res.status(404).json({ message: 'Orden no encontrada' });

    if (order.tableId) {
      if (order.status === 'CANCELLED' || order.status === 'CLOSED') {
        const table = order.table;
        const activeOrdersOnTable = await Order.count({
          where: { tableId: order.tableId, status: ['OPEN', 'PAID'] }
        });
        
        if (activeOrdersOnTable > 0) {
          return res.status(400).json({ message: `No se puede restaurar. La Mesa #${table?.numero || table?.number || ''} ya está siendo ocupada por un nuevo cliente.` });
        }
      }
    } else if (order.ticketId && order.ticketId.toUpperCase().includes('MOSTRADOR')) {
      if (order.status === 'CANCELLED' || order.status === 'CLOSED') {
        const activeVitrina = await Order.findAll({
          where: {
            tableId: null,
            status: ['OPEN', 'PAID'],
            ticketId: { [Op.iLike]: '%MOSTRADOR%' }
          },
          include: [{ model: OrderItem, as: 'items', where: { status: 'ACTIVE' }, required: true }] 
        });

        if (activeVitrina.length > 0) {
          return res.status(400).json({ message: `No se puede restaurar. Actualmente hay una venta en curso en el Mostrador con productos adentro. Pásela a "Siguiente Venta" o cancélela primero.` });
        }
      }
    }

    const tx = await Transaction.findOne({ where: { referenceId: order.id, type: 'INCOME' } });
    const wasGloballyPaid = !!tx;

    let totalRestoredAmount = 0;

    for (const item of order.items) {
      if (item.status === 'CANCELLED') {
        let wasPaid = wasGloballyPaid || (order.paidAccounts && order.paidAccounts.includes(item.cuenta));
        if (wasPaid) totalRestoredAmount += Number(item.subtotal);

        await item.update({ status: 'ACTIVE', cancelledAt: null, cancelReason: null, cancelledBy: null });
        getIO().emit('orderItemRestored', { orderId: id, itemId: item.id });
      }
    }

    if (totalRestoredAmount > 0) {
      await modificarTransaccionOriginal(order.id, totalRestoredAmount, 'sumar', 'Todos los productos/Cuentas', userId);
    }

    const newTotal = await OrderItem.sum('subtotal', { where: { orderId: id, status: 'ACTIVE' } }) || 0;
    
    const finalStatus = (wasGloballyPaid || totalRestoredAmount >= newTotal) && newTotal > 0 ? 'PAID' : 'OPEN';

    await order.update({
      status: finalStatus,
      totalAmount: newTotal,
      cancelledAt: null,
      cancelReason: null,
      cancelledBy: null
    });

    getIO().emit('pos:update');
    res.json({ message: 'Orden restaurada correctamente' });
  } catch (error) {
    console.error('Error en restoreOrder:', error);
    res.status(500).json({ message: 'Error al restaurar la cuenta' });
  }
};