import { Op } from 'sequelize';
import { getIO } from '../../config/socket.js'; 
import Order from './Order.model.js';
import OrderItem from './OrderItem.model.js';
import Product from '../menu/Product.model.js';
import Table from './Table.model.js';
import Transaction from '../cash/Transaction.model.js';

// =====================================================================
// 🔥 FUNCIÓN MAESTRA: MODIFICAR TRANSACCIÓN (Ahora Inteligente por Cuentas)
// =====================================================================
const modificarTransaccionOriginal = async (orderId, monto, tipoOperacion, detalle, userId = null, cuentaName = null) => {
  let whereClause = { referenceId: orderId, type: 'INCOME' };
  
  // Obtenemos todas las transacciones de esta mesa
  let txs = await Transaction.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
  });

  // 🔥 FIX FRANCOTIRADOR CIEGO: Buscamos exactamente el ticket de la cuenta afectada
  let targetTxs = cuentaName 
    ? txs.filter(tx => tx.description && tx.description.includes(`Cuenta: ${cuentaName}`)) 
    : txs;
  
  // Si por alguna razón no encuentra la cuenta exacta (ej. Cobro de Mesa Completa), usamos el historial general
  if (targetTxs.length === 0) targetTxs = txs; 

  let remainingMonto = monto;

  for (let tx of targetTxs) {
      if (remainingMonto <= 0) break;

      let nuevoMonto = Number(tx.amount);
      let appliedAmount = 0;

      if (tipoOperacion === 'restar') {
          appliedAmount = Math.min(nuevoMonto, remainingMonto);
          nuevoMonto -= appliedAmount;
          remainingMonto -= appliedAmount;
          tx.description += ` | 📉 -$${appliedAmount.toFixed(2)} (Anulado: ${detalle})`;
      } else if (tipoOperacion === 'sumar') {
          appliedAmount = remainingMonto;
          nuevoMonto += appliedAmount;
          remainingMonto -= appliedAmount;
          tx.description += ` | 📈 +$${appliedAmount.toFixed(2)} (Restaurado: ${detalle})`;
      }

      // Evitamos decimales residuales
      if (nuevoMonto <= 0.01) nuevoMonto = 0;

      let newStatus = tx.status;
      let cancelledAt = tx.cancelledAt;
      let cancelledBy = tx.cancelledBy;

      if (nuevoMonto === 0 && tx.status !== 'CANCELLED') {
          newStatus = 'CANCELLED';
          cancelledAt = new Date();
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
// 📌 2. CANCELAR UN PRODUCTO INDIVIDUAL (Blindado anti-errores)
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

    // 🔥 FIX PROMOCIONES: Detectamos si el ítem cancelado era una promoción
    let unitPrice = Number(item.subtotal) / item.quantity;
    let refundAmount = unitPrice * qtyToCancel;
    let isPromoItem = false;
    
    try {
        const notesArray = JSON.parse(item.notes || '[]');
        if (Array.isArray(notesArray)) {
            const promoMeta = notesArray.find(n => n && n._isPromoMeta);
            if (promoMeta && promoMeta.isAutoPromo) isPromoItem = true;
        }
    } catch(e) {}

    // 🔥 RECÁLCULO INTELIGENTE: Si se cancela un producto NORMAL, revertimos la promo de otro ítem
    if (!isPromoItem && unitPrice > 0) {
        const promoPartners = await OrderItem.findAll({
            where: { orderId: id, productId: item.productId, cuenta: item.cuenta, status: 'ACTIVE', id: { [Op.ne]: item.id } }
        });

        let promosToRevert = qtyToCancel;
        for (const partner of promoPartners) {
            if (promosToRevert <= 0) break;

            let isPartnerPromo = false;
            let pOriginalPrice = 0;
            let partnerNotes = [];
            
            try {
                partnerNotes = JSON.parse(partner.notes || '[]');
                if (Array.isArray(partnerNotes)) {
                    const pMeta = partnerNotes.find(n => n && n._isPromoMeta);
                    if (pMeta && pMeta.isAutoPromo) {
                        isPartnerPromo = true;
                        pOriginalPrice = Number(pMeta.precioOriginal || 0);
                    }
                }
            } catch(e){}

            if (isPartnerPromo) {
                let partnerUnitPromoPrice = Number(partner.subtotal) / partner.quantity;
                let qtyToRevert = Math.min(promosToRevert, partner.quantity);
                let priceDiffPerUnit = pOriginalPrice - partnerUnitPromoPrice;

                if (priceDiffPerUnit > 0) {
                    // Restamos la penalización por romper la promo del reembolso total
                    refundAmount -= (priceDiffPerUnit * qtyToRevert);

                    if (qtyToRevert === partner.quantity) {
                        // Quitamos el tag de promo y lo regresamos a precio normal
                        const cleanedNotes = partnerNotes.filter(n => !(n && n._isPromoMeta));
                        await partner.update({
                            subtotal: pOriginalPrice * partner.quantity,
                            notes: JSON.stringify(cleanedNotes)
                        });
                    } else {
                        // Si era un grupo de promos, dividimos el ítem
                        const remainingQty = partner.quantity - qtyToRevert;
                        const cleanedNotes = partnerNotes.filter(n => !(n && n._isPromoMeta));
                        
                        await partner.update({
                            quantity: remainingQty,
                            subtotal: partnerUnitPromoPrice * remainingQty
                        });

                        await OrderItem.create({
                            orderId: partner.orderId,
                            productId: partner.productId,
                            quantity: qtyToRevert,
                            subtotal: pOriginalPrice * qtyToRevert,
                            cuenta: partner.cuenta,
                            isTakeaway: partner.isTakeaway,
                            notes: JSON.stringify(cleanedNotes),
                            kitchenStatus: partner.kitchenStatus,
                            status: 'ACTIVE'
                        });
                    }
                }
                promosToRevert -= qtyToRevert;
            }
        }
    }

    // Evitamos reembolsos negativos por errores de cálculo
    if (refundAmount < 0) refundAmount = 0;

    let wasPaid = order.status === 'PAID' || (order.paidAccounts && order.paidAccounts.includes(item.cuenta));

    if (wasPaid && refundAmount > 0) {
      const nombreProducto = item.product?.name || item.nombre || 'Producto';
      // 🔥 PASAMOS LA CUENTA ESPECÍFICA PARA QUE DESCUENTE DEL LUGAR CORRECTO
      await modificarTransaccionOriginal(order.id, refundAmount, 'restar', `${qtyToCancel}x ${nombreProducto}`, userId, item.cuenta);
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
            subtotal: refundAmount, // Guardamos el valor matemáticamente correcto
            cuenta: item.cuenta,
            isTakeaway: item.isTakeaway,
            notes: JSON.stringify(cancelledNotes),
            kitchenStatus: item.kitchenStatus,
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelReason: cancelReason || `Cancelación parcial desde POS`,
            cancelledBy: userId
        });

        await item.update({
            quantity: item.quantity - qtyToCancel,
            subtotal: Math.max(0, Number(item.subtotal) - (unitPrice * qtyToCancel)), 
            notes: JSON.stringify(remainingNotes)
        });
    } else {
        await item.update({
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: cancelReason || `Cancelado desde POS`,
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

    // 🔥 FIX: Agrupamos el reembolso por Cuentas para no cruzar los recibos de la Caja
    let totalRefundByAccount = {};

    for (const item of order.items) {
      if (item.status === 'ACTIVE') {
        const previousKitchenStatus = item.kitchenStatus;
        
        let wasPaid = order.status === 'PAID' || (order.paidAccounts && order.paidAccounts.includes(item.cuenta));
        if (wasPaid) {
           totalRefundByAccount[item.cuenta] = (totalRefundByAccount[item.cuenta] || 0) + Number(item.subtotal);
        }

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

    // Procesamos la devolución a cada recibo de forma individual
    for (const [cuentaName, amount] of Object.entries(totalRefundByAccount)) {
       if (amount > 0) {
          await modificarTransaccionOriginal(order.id, amount, 'restar', `Cancelación Mesa completa (${cuentaName})`, userId, cuentaName);
       }
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
      
      // 🔥 FIX RESTAURAR: Lo inyectamos de vuelta a la cuenta específica
      await modificarTransaccionOriginal(order.id, amountToRestore, 'sumar', `${item.quantity}x ${nombreProducto}`, userId, item.cuenta);
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

    let totalRestoredByAccount = {};

    for (const item of order.items) {
      if (item.status === 'CANCELLED') {
        let wasPaid = wasGloballyPaid || (order.paidAccounts && order.paidAccounts.includes(item.cuenta));
        if (wasPaid) {
            totalRestoredByAccount[item.cuenta] = (totalRestoredByAccount[item.cuenta] || 0) + Number(item.subtotal);
        }

        await item.update({ status: 'ACTIVE', cancelledAt: null, cancelReason: null, cancelledBy: null });
        getIO().emit('orderItemRestored', { orderId: id, itemId: item.id });
      }
    }

    for (const [cuentaName, amount] of Object.entries(totalRestoredByAccount)) {
        if (amount > 0) {
           await modificarTransaccionOriginal(order.id, amount, 'sumar', `Todos los productos (${cuentaName})`, userId, cuentaName);
        }
    }

    const newTotal = await OrderItem.sum('subtotal', { where: { orderId: id, status: 'ACTIVE' } }) || 0;
    
    const finalStatus = (wasGloballyPaid || (Object.values(totalRestoredByAccount).reduce((a,b)=>a+b,0) >= newTotal)) && newTotal > 0 ? 'PAID' : 'OPEN';

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