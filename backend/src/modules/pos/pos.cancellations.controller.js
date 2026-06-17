// backend/src/modules/pos/pos.cancellations.controller.js
import { Op } from 'sequelize';
import { getIO } from '../../config/socket.js'; 
import Order from './Order.model.js';
import OrderItem from './OrderItem.model.js';
import Product from '../menu/Product.model.js';
import Table from './Table.model.js';
import Transaction from '../cash/Transaction.model.js';

// ==========================================
// 📌 2. CANCELAR UN PRODUCTO INDIVIDUAL
// ==========================================
export const cancelOrderItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { cancelReason, cancelQty } = req.body; 
    const userId = req.user?.id; 

    const item = await OrderItem.findOne({ where: { id: itemId, orderId: id } });
    if (!item) return res.status(404).json({ message: 'Producto no encontrado' });

    const order = await Order.findByPk(id);

    const qtyToCancel = (cancelQty && cancelQty < item.quantity) ? parseInt(cancelQty, 10) : item.quantity;
    const isPartial = qtyToCancel < item.quantity;

    const unitPrice = Number(item.subtotal) / item.quantity;
    const refundAmount = unitPrice * qtyToCancel;

    let wasPaid = order.status === 'PAID' || (order.paidAccounts && order.paidAccounts.includes(item.cuenta));

    if (wasPaid && refundAmount > 0) {
      await Transaction.create({
        type: 'EXPENSE',
        source: 'CAFETERIA',
        expenseCategory: 'REFUND',
        amount: refundAmount,
        description: `Reembolso por cancelación de producto en Ticket ${order.ticketId || id}`,
        referenceId: order.id,
        createdBy: userId
      });
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
          cancelReason: cancelReason || 'Cancelación desde POS',
          cancelledBy: userId
        });
    }

    if (['PENDING', 'PREPARING', 'READY'].includes(previousKitchenStatus)) {
      getIO().emit('orderItemCancelled', { orderId: id, itemId: item.id });
    }

    const newTotal = await OrderItem.sum('subtotal', { where: { orderId: id, status: 'ACTIVE' } }) || 0;
    const activeItems = await OrderItem.count({ where: { orderId: id, status: 'ACTIVE' } });
    
    if (activeItems === 0 && order.status !== 'CLOSED') {
      await order.update({ status: 'CANCELLED', totalAmount: 0, cancelledAt: new Date(), cancelReason: 'Todos los productos fueron cancelados automáticamente', cancelledBy: userId });
      if (order.tableId) await Table.update({ status: 'active' }, { where: { id: order.tableId } });
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
// 📌 3. CANCELAR CUENTA COMPLETA
// ==========================================
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancelReason } = req.body;
    const userId = req.user?.id;

    const order = await Order.findByPk(id, { 
      include: [{ model: OrderItem, as: 'items' }] 
    });
    
    if (!order) return res.status(404).json({ message: 'Orden no encontrada' });

    if (order.status === 'CLOSED') {
      return res.status(400).json({ message: 'No se puede cancelar una orden cerrada definitivamente' });
    }

    let totalRefund = 0;

    for (const item of order.items) {
      if (item.status === 'ACTIVE') {
        const previousKitchenStatus = item.kitchenStatus;
        
        let wasPaid = order.status === 'PAID' || 
                      (order.paidAccounts && order.paidAccounts.includes(item.cuenta));
        if (wasPaid) totalRefund += Number(item.subtotal);

        await item.update({
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: cancelReason || 'Cancelación de cuenta completa',
          cancelledBy: userId
        });

        if (['PENDING', 'PREPARING', 'READY'].includes(previousKitchenStatus)) {
          getIO().emit('orderItemCancelled', { orderId: id, itemId: item.id });
        }
      }
    }

    if (totalRefund > 0) {
      await Transaction.create({
        type: 'EXPENSE',
        source: 'CAFETERIA',
        expenseCategory: 'REFUND',
        amount: totalRefund,
        description: `Reembolso total por cancelación de Orden ${order.ticketId || id}`,
        referenceId: order.id,
        createdBy: userId
      });
    }

    await order.update({
      status: 'CANCELLED',
      totalAmount: 0,
      cancelledAt: new Date(),
      cancelReason: cancelReason || 'Cancelada desde POS',
      cancelledBy: userId
    });

    if (order.tableId) {
      await Table.update({ status: 'active' }, { where: { id: order.tableId } });
    }

    getIO().emit('pos:update'); 
    res.json({ message: 'Cuenta cancelada completamente', refundedAmount: totalRefund });
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

    const cancelledItems = await OrderItem.findAll({
      where: { status: 'CANCELLED', cancelledAt: dateFilter },
      include: [{ model: Product, as: 'product' }],
      order: [['cancelledAt', 'DESC']]
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

    const item = await OrderItem.findOne({ where: { id: itemId, orderId: id } });
    if (!item) return res.status(404).json({ message: 'Producto no encontrado en la papelera' });

    const order = await Order.findByPk(id);
    
    let wasPaid = order.status === 'PAID' || (order.paidAccounts && order.paidAccounts.includes(item.cuenta));
    
    if (wasPaid) {
      const unitPrice = Number(item.subtotal) / item.quantity;
      const amountToRestore = unitPrice * item.quantity;
      
      await Transaction.create({
        type: 'INCOME',
        source: 'CAFETERIA',
        expenseCategory: 'RECOVERY', 
        amount: amountToRestore,
        description: `Recuperación por producto restaurado en Ticket ${order.ticketId || id}`,
        referenceId: order.id,
        createdBy: userId
      });
    }

    await item.update({
      status: 'ACTIVE',
      cancelledAt: null,
      cancelReason: null,
      cancelledBy: null
    });

    const newTotal = await OrderItem.sum('subtotal', { where: { orderId: id, status: 'ACTIVE' } }) || 0;
    await order.update({ totalAmount: newTotal });

    getIO().emit('orderItemRestored', { orderId: id, itemId: item.id });
    getIO().emit('pos:update');

    res.json({ message: 'Producto restaurado exitosamente', wasRefundReversed: wasPaid });
  } catch (error) {
    console.error('Error en restoreOrderItem:', error);
    res.status(500).json({ message: 'Error al restaurar producto' });
  }
};

// ==========================================
// ♻️ RESTAURAR ORDEN COMPLETA (CUENTA)
// ==========================================
export const restoreOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const order = await Order.findByPk(id, { 
      include: [{ model: OrderItem, as: 'items' }] 
    });
    
    if (!order) return res.status(404).json({ message: 'Orden no encontrada' });

    if (order.tableId) {
      const table = await Table.findByPk(order.tableId);
      if (table && table.status === 'active') {
        await table.update({ status: 'ocupada' });
      } else if (table && table.status === 'ocupada') {
        return res.status(400).json({ message: `La mesa #${table.number} ya está ocupada por otro cliente. Libere la mesa primero.` });
      }
    }

    let totalRestoredAmount = 0;

    for (const item of order.items) {
      if (item.status === 'CANCELLED' && item.cancelReason === 'Cancelación de cuenta completa') {
        let wasPaid = order.status === 'PAID' || (order.paidAccounts && order.paidAccounts.includes(item.cuenta));
        if (wasPaid) totalRestoredAmount += Number(item.subtotal);

        await item.update({ status: 'ACTIVE', cancelledAt: null, cancelReason: null, cancelledBy: null });
        getIO().emit('orderItemRestored', { orderId: id, itemId: item.id });
      }
    }

    if (totalRestoredAmount > 0) {
      await Transaction.create({
        type: 'INCOME',
        source: 'CAFETERIA',
        expenseCategory: 'RECOVERY',
        amount: totalRestoredAmount,
        description: `Recuperación global por orden restaurada: ${order.ticketId || id}`,
        referenceId: order.id,
        createdBy: userId
      });
    }

    const newTotal = await OrderItem.sum('subtotal', { where: { orderId: id, status: 'ACTIVE' } }) || 0;

    await order.update({
      status: 'OPEN',
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