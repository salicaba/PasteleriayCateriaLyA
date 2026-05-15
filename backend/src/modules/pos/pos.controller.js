import Order from './Order.model.js';
import OrderItem from './OrderItem.model.js';
import Product from '../menu/Product.model.js';
import Table from './Table.model.js';

// ==========================================
// 🛒 CREAR O RECUPERAR ORDEN (Evita duplicados)
// ==========================================
export const createOrder = async (req, res) => {
  try {
    const { orderType, ticketId, tableId } = req.body;
    const employeeId = req.user?.id || null; 
    const finalTableId = orderType === 'SALON' ? tableId : null;

    if (orderType === 'SALON' && finalTableId) {
      const existingOrder = await Order.findOne({ 
        where: { tableId: finalTableId, status: ['OPEN', 'PAID'] } 
      });
      if (existingOrder) return res.status(200).json({ message: 'Orden activa recuperada', order: existingOrder });
    }

    const newOrder = await Order.create({ 
      orderType, 
      ticketId: orderType === 'LLEVAR' ? ticketId : null, 
      tableId: finalTableId, 
      createdBy: employeeId, 
      status: 'OPEN', 
      totalAmount: 0 
    });
    
    res.status(201).json({ message: 'Orden iniciada', order: newOrder });
  } catch (error) { 
    res.status(500).json({ message: 'Error al crear orden', error: error.message }); 
  }
};

// ==========================================
// ➕ AGREGAR PRODUCTOS A LA COMANDA
// ==========================================
export const addItemsToOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { items } = req.body; 
    const order = await Order.findByPk(orderId);
    
    if (!order || !['OPEN', 'PAID'].includes(order.status)) {
      return res.status(400).json({ message: 'La orden no está abierta para recibir productos.' });
    }

    const itemsToInsert = items.map(item => ({ 
      ...item, 
      orderId, 
      cuenta: item.cuenta || 'General', 
      kitchenStatus: 'PENDING' 
    }));

    const createdItems = await OrderItem.bulkCreate(itemsToInsert);
    
    const subtotalNuevo = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    await order.update({ totalAmount: Number(order.totalAmount) + subtotalNuevo });

    res.status(201).json({ message: 'Productos enviados a cocina', orderItems: createdItems });
  } catch (error) { 
    res.status(500).json({ message: 'Error al agregar productos', error: error.message }); 
  }
};

// ==========================================
// 🔍 OBTENER ORDEN COMPLETA (Para el POS)
// ==========================================
export const getActiveOrderByTable = async (req, res) => {
  try {
    const { tableId } = req.params;
    const order = await Order.findOne({
      where: { tableId, status: ['OPEN', 'PAID'] },
      include: [
        { 
          model: OrderItem, 
          as: 'items', 
          include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice', 'imageUrl'] }] 
        }
      ]
    });
    res.json({ order });
  } catch (error) { 
    res.status(500).json({ message: 'Error al recuperar comanda', error: error.message }); 
  }
};

// ==========================================
// 💰 REGISTRAR PAGO (Parcial o Total)
// ==========================================
export const payOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cuentaName, isFullPayment } = req.body; 
    const order = await Order.findByPk(orderId);
    
    let paidAccounts = order.paidAccounts || [];
    if (!isFullPayment && cuentaName && !paidAccounts.includes(cuentaName)) {
      paidAccounts.push(cuentaName);
    }

    await order.update({ 
      status: isFullPayment ? 'PAID' : order.status, 
      paidAccounts: paidAccounts 
    });

    res.json({ message: 'Pago registrado con éxito', order });
  } catch (error) { 
    res.status(500).json({ message: 'Error al procesar pago', error: error.message }); 
  }
};

// ==========================================
// 🚪 CERRAR Y LIBERAR MESA
// ==========================================
export const closeOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findByPk(orderId);
    
    await order.update({ status: 'CLOSED' });
    
    if (order.tableId) {
      await Table.update({ status: 'active' }, { where: { id: order.tableId } });
    }

    res.json({ message: 'Mesa liberada y orden archivada.' });
  } catch (error) { 
    res.status(500).json({ message: 'Error al cerrar mesa', error: error.message }); 
  }
};

// ==========================================
// 📊 LISTAR TODAS LAS ÓRDENES ACTIVAS
// ==========================================
export const getActiveOrders = async (req, res) => {
  try {
    const activeOrders = await Order.findAll({
      where: { status: ['OPEN', 'PAID'] },
      include: [ 
        { model: Table, as: 'table', attributes: ['id', 'number', 'zone'] },
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice', 'imageUrl'] }] } 
      ]
    });
    res.json(activeOrders);
  } catch (error) { 
    res.status(500).json({ message: 'Error al listar órdenes', error: error.message }); 
  }
};

// ==========================================
// 🪑 GESTIÓN DE MESAS (CRUD)
// ==========================================
export const getTables = async (req, res) => {
  try {
    const tables = await Table.findAll({ 
      where: { status: 'active' }, 
      order: [['id', 'ASC']] 
    });
    res.json(tables);
  } catch (error) { 
    res.status(500).json({ message: 'Error al obtener mesas', error: error.message }); 
  }
};

export const createTable = async (req, res) => {
  try {
    const { zone } = req.body;
    const count = await Table.count({ where: { status: 'active', zone: zone || 'salon' } });
    const nextNumber = (count + 1).toString();
    
    const newTable = await Table.create({ 
      number: nextNumber, 
      zone: zone || 'salon', 
      qrToken: `qr-${Date.now()}-${nextNumber}` 
    });
    
    res.status(201).json(newTable);
  } catch (error) { 
    res.status(500).json({ message: 'Error al crear mesa', error: error.message }); 
  }
};

export const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;
    await Table.update({ status: 'inactive' }, { where: { id } });
    
    // Re-indexar las mesas restantes del salón para que los números sean consecutivos
    const remainingTables = await Table.findAll({ 
      where: { status: 'active', zone: 'salon' }, 
      order: [['id', 'ASC']] 
    });
    
    for (let i = 0; i < remainingTables.length; i++) {
      const newNumber = (i + 1).toString();
      if (remainingTables[i].number !== newNumber) {
        await remainingTables[i].update({ number: newNumber });
      }
    }
    
    res.json({ message: 'Mesa eliminada y re-indexada correctamente' });
  } catch (error) { 
    res.status(500).json({ message: 'Error al eliminar mesa', error: error.message }); 
  }
};