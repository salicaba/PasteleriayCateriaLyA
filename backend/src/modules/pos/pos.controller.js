import Order from './Order.model.js';
import OrderItem from './OrderItem.model.js';
import Product from '../menu/Product.model.js';
import Table from './Table.model.js';

// ==========================================
// GESTIÓN DE ÓRDENES
// ==========================================

export const createOrder = async (req, res) => {
  try {
    const { orderType, ticketId, tableId } = req.body;
    const employeeId = req.user.id; 

    const newOrder = await Order.create({
      orderType,
      ticketId: orderType === 'LLEVAR' ? ticketId : null,
      tableId: orderType === 'SALON' ? tableId : null,
      createdBy: employeeId,
      status: 'OPEN',
      totalAmount: 0
    });

    res.status(201).json({ message: 'Orden iniciada', order: newOrder });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear la orden', error: error.message });
  }
};

export const addItemsToOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { items } = req.body; 

    const order = await Order.findByPk(orderId);
    if (!order || order.status !== 'OPEN') {
      return res.status(400).json({ message: 'La orden no existe o ya está cerrada.' });
    }

    const itemsToInsert = items.map(item => ({
      ...item,
      orderId,
      kitchenStatus: 'PENDING' 
    }));

    const createdItems = await OrderItem.bulkCreate(itemsToInsert);

    const newTotal = Number(order.totalAmount) + items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    await order.update({ totalAmount: newTotal });

    res.status(201).json({ message: 'Productos agregados', orderItems: createdItems, newTotal });
  } catch (error) {
    res.status(500).json({ message: 'Error al agregar productos', error: error.message });
  }
};

export const getActiveOrders = async (req, res) => {
  try {
    const activeOrders = await Order.findAll({
      where: { status: 'OPEN' },
      include: [
        { 
          model: OrderItem, 
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['name'] }] 
        }
      ]
    });
    
    res.json(activeOrders);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener órdenes', error: error.message });
  }
};

// ==========================================
// GESTIÓN DE MESAS (Auto-Indexado)
// ==========================================

export const getTables = async (req, res) => {
  try {
    // Las ordenamos por ID (orden de creación)
    const tables = await Table.findAll({ 
      where: { status: 'active' },
      order: [['id', 'ASC']]
    });
    res.json(tables);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener mesas', error: error.message });
  }
};

// Crear mesa con número automático correlativo
export const createTable = async (req, res) => {
  try {
    const { zone } = req.body;
    
    // Contamos cuántas mesas activas hay
    const count = await Table.count({ where: { status: 'active', zone: zone || 'salon' } });
    const nextNumber = (count + 1).toString();

    const newTable = await Table.create({ 
      number: nextNumber, 
      zone: zone || 'salon', 
      qrToken: `qr-${Date.now()}-${nextNumber}`
    });
    
    res.status(201).json(newTable);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear mesa automática', error: error.message });
  }
};

// Eliminar y Re-indexar (Para que no queden huecos 1, 3, 4...)
export const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Ocultamos la mesa eliminada
    await Table.update({ status: 'inactive' }, { where: { id } });

    // 2. Buscamos las que quedaron activas (ordenadas por antigüedad)
    const remainingTables = await Table.findAll({
      where: { status: 'active', zone: 'salon' },
      order: [['id', 'ASC']]
    });

    // 3. Renombramos secuencialmente
    for (let i = 0; i < remainingTables.length; i++) {
      const newNumber = (i + 1).toString();
      if (remainingTables[i].number !== newNumber) {
        await remainingTables[i].update({ number: newNumber });
      }
    }

    res.json({ message: 'Mesa eliminada y catálogo re-indexado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al re-indexar mesas', error: error.message });
  }
};