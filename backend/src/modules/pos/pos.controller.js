// backend/src/modules/pos/pos.controller.js
import Order from './Order.model.js';
import OrderItem from './OrderItem.model.js';
import Product from '../menu/Product.model.js';
import Table from './Table.model.js';

export const createOrder = async (req, res) => {
  try {
    const { orderType, ticketId, tableId } = req.body;
    const employeeId = req.user?.id || null; 
    const newOrder = await Order.create({ orderType, ticketId: orderType === 'LLEVAR' ? ticketId : null, tableId: orderType === 'SALON' ? tableId : null, createdBy: employeeId, status: 'OPEN', totalAmount: 0 });
    res.status(201).json({ message: 'Orden iniciada', order: newOrder });
  } catch (error) { res.status(500).json({ message: 'Error', error: error.message }); }
};

export const addItemsToOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { items } = req.body; 
    const order = await Order.findByPk(orderId);
    if (!order || !['OPEN', 'PAID'].includes(order.status)) return res.status(400).json({ message: 'Orden cerrada o inexistente.' });

    const itemsToInsert = items.map(item => ({ ...item, orderId, cuenta: item.cuenta || 'General', kitchenStatus: 'PENDING' }));
    const createdItems = await OrderItem.bulkCreate(itemsToInsert);
    const newTotal = Number(order.totalAmount) + items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    await order.update({ totalAmount: newTotal, status: 'OPEN' });

    res.status(201).json({ message: 'Items agregados', orderItems: createdItems });
  } catch (error) { res.status(500).json({ message: 'Error', error: error.message }); }
};

export const getActiveOrderByTable = async (req, res) => {
  try {
    const { tableId } = req.params;
    const order = await Order.findOne({
      where: { tableId, status: ['OPEN', 'PAID'] },
      include: [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice', 'imageUrl'] }] }]
    });
    res.json({ order });
  } catch (error) { res.status(500).json({ message: 'Error', error: error.message }); }
};

export const payOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cuentaName, isFullPayment } = req.body; 
    const order = await Order.findByPk(orderId);
    let paidAccounts = order.paidAccounts || [];
    if (!isFullPayment && cuentaName && !paidAccounts.includes(cuentaName)) paidAccounts.push(cuentaName);
    await order.update({ status: isFullPayment ? 'PAID' : order.status, paidAccounts });
    res.json({ message: 'Pago registrado', order });
  } catch (error) { res.status(500).json({ message: 'Error', error: error.message }); }
};

export const closeOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findByPk(orderId);
    await order.update({ status: 'CLOSED' });
    if (order.tableId) await Table.update({ status: 'active' }, { where: { id: order.tableId } });
    res.json({ message: 'Mesa liberada' });
  } catch (error) { res.status(500).json({ message: 'Error', error: error.message }); }
};

// 🔥 FIX: Que el index global también traiga las imágenes y las mesas "PAID" temporalmente
export const getActiveOrders = async (req, res) => {
  try {
    const activeOrders = await Order.findAll({
      where: { status: ['OPEN', 'PAID'] },
      include: [ { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice', 'imageUrl'] }] } ]
    });
    res.json(activeOrders);
  } catch (error) { res.status(500).json({ message: 'Error', error: error.message }); }
};

export const getTables = async (req, res) => {
  try {
    const tables = await Table.findAll({ where: { status: 'active' }, order: [['id', 'ASC']] });
    res.json(tables);
  } catch (error) { res.status(500).json({ message: 'Error', error: error.message }); }
};

export const createTable = async (req, res) => {
  try {
    const { zone } = req.body;
    const count = await Table.count({ where: { status: 'active', zone: zone || 'salon' } });
    const nextNumber = (count + 1).toString();
    const newTable = await Table.create({ number: nextNumber, zone: zone || 'salon', qrToken: `qr-${Date.now()}-${nextNumber}` });
    res.status(201).json(newTable);
  } catch (error) { res.status(500).json({ message: 'Error', error: error.message }); }
};

export const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;
    await Table.update({ status: 'inactive' }, { where: { id } });
    const remainingTables = await Table.findAll({ where: { status: 'active', zone: 'salon' }, order: [['id', 'ASC']] });
    for (let i = 0; i < remainingTables.length; i++) {
      const newNumber = (i + 1).toString();
      if (remainingTables[i].number !== newNumber) await remainingTables[i].update({ number: newNumber });
    }
    res.json({ message: 'Re-indexado' });
  } catch (error) { res.status(500).json({ message: 'Error', error: error.message }); }
};