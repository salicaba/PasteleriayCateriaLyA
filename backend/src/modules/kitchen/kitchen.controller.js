import OrderItem from '../pos/OrderItem.model.js';
import Order from '../pos/Order.model.js';
import Product from '../menu/Product.model.js';

// ==========================================
// 🍳 OBTENER TICKETS DE COCINA (KDS)
// ==========================================
export const getKitchenTickets = async (req, res) => {
  try {
    const tickets = await OrderItem.findAll({
      where: {
        kitchenStatus: ['PENDING', 'PREPARING']
      },
      include: [
        {
          model: Order,
          as: 'order', // 🔥 CRUCIAL: Debe coincidir con el alias definido en associations.js
          attributes: ['orderType', 'ticketId', 'tableId', 'createdAt'],
          where: { status: 'OPEN' } // Solo traer de órdenes que sigan abiertas
        },
        {
          model: Product,
          as: 'product', // 🔥 CRUCIAL: Debe coincidir con el alias definido en associations.js
          attributes: ['name']
        }
      ],
      order: [['createdAt', 'ASC']] // Los más viejos primero (FIFO)
    });

    res.json(tickets);
  } catch (error) {
    console.error('🔥 Error crítico al obtener tickets de cocina:', error);
    res.status(500).json({ message: 'Error al obtener tickets de cocina', error: error.message });
  }
};

// ==========================================
// 🔄 ACTUALIZAR ESTADO DEL PLATILLO
// ==========================================
export const updateKitchenStatus = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { status } = req.body; // PENDING, PREPARING, READY, DELIVERED

    const validStatuses = ['PENDING', 'PREPARING', 'READY', 'DELIVERED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Estado de cocina inválido.' });
    }

    const item = await OrderItem.findByPk(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Platillo no encontrado.' });
    }

    item.kitchenStatus = status;
    await item.save();

    res.json({ message: `Estado actualizado a ${status}`, item });
  } catch (error) {
    console.error('🔥 Error al actualizar estado en cocina:', error);
    res.status(500).json({ message: 'Error al actualizar estado', error: error.message });
  }
};