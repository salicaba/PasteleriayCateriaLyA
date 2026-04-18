import OrderItem from '../pos/OrderItem.model.js';
import Order from '../pos/Order.model.js';
import Product from '../menu/Product.model.js';
import Variant from '../menu/Variant.model.js';

// 1. Obtener todos los platillos pendientes o en preparación
export const getKitchenTickets = async (req, res) => {
  try {
    const tickets = await OrderItem.findAll({
      where: {
        kitchenStatus: ['PENDING', 'PREPARING']
      },
      include: [
        {
          model: Order,
          attributes: ['orderType', 'ticketId', 'tableId', 'createdAt'],
          where: { status: 'OPEN' } // Solo traer de órdenes que sigan abiertas
        },
        {
          model: Product,
          attributes: ['name']
        },
        {
          model: Variant,
          attributes: ['name']
        }
      ],
      order: [['createdAt', 'ASC']] // Los más viejos primero (FIFO)
    });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener tickets de cocina', error: error.message });
  }
};

// 2. Cambiar el estado de un platillo (ej: PENDING -> PREPARING -> READY)
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
    res.status(500).json({ message: 'Error al actualizar estado', error: error.message });
  }
};