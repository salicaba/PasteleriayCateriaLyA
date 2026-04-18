import Order from './Order.model.js';
import OrderItem from './OrderItem.model.js';
import Product from '../menu/Product.model.js';

// 1. Crear una nueva orden (Abre una Mesa o un Ticket L-01)
export const createOrder = async (req, res) => {
  try {
    const { orderType, ticketId, tableId } = req.body;
    const employeeId = req.user.id; // El ID lo sacamos del token JWT, gracias a tu middleware

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

// 2. Agregar productos a una orden existente
export const addItemsToOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { items } = req.body; // Array de { productId, variantId, quantity, subtotal, notes }

    // Verificar que la orden exista y esté abierta
    const order = await Order.findByPk(orderId);
    if (!order || order.status !== 'OPEN') {
      return res.status(400).json({ message: 'La orden no existe o ya está cerrada.' });
    }

    // Preparar los items agregando el orderId
    const itemsToInsert = items.map(item => ({
      ...item,
      orderId,
      kitchenStatus: 'PENDING' // Se va directo a la cola de la cocina
    }));

    // Insertar todos los items de golpe
    const createdItems = await OrderItem.bulkCreate(itemsToInsert);

    // Actualizar el gran total de la orden
    const newTotal = Number(order.totalAmount) + items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    await order.update({ totalAmount: newTotal });

    res.status(201).json({ message: 'Productos agregados a la orden', orderItems: createdItems, newTotal });
  } catch (error) {
    res.status(500).json({ message: 'Error al agregar productos', error: error.message });
  }
};

// 3. Obtener órdenes activas (Para el KDS de Cocina y POS)
export const getActiveOrders = async (req, res) => {
  try {
    const activeOrders = await Order.findAll({
      where: { status: 'OPEN' },
      include: [
        { 
          model: OrderItem, 
          as: 'items',
          include: [{ model: Product, attributes: ['name'] }] 
        }
      ]
    });
    
    res.json(activeOrders);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener órdenes', error: error.message });
  }
};