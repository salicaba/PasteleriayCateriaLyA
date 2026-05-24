import OrderItem from '../pos/OrderItem.model.js';
import Order from '../pos/Order.model.js';
import Product from '../menu/Product.model.js';
import Table from '../pos/Table.model.js';

// ==========================================
// 🍳 OBTENER TICKETS DE COCINA (KDS)
// ==========================================
export const getKitchenTickets = async (req, res) => {
  try {
    const tickets = await OrderItem.findAll({
      where: {
        // 🔥 REFACTOR FASE 1 y 2: Solo traemos los que están pendientes o en preparación. 
        // Cuando pasen a 'READY' (Listo para Entregar), desaparecerán mágicamente de aquí.
        kitchenStatus: ['PENDING', 'PREPARING']
      },
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderType', 'ticketId', 'tableId', 'createdAt'],
          where: { status: 'OPEN' },
          include: [
            {
              model: Table,
              as: 'table',
              attributes: ['number', 'zone']
            }
          ]
        },
        {
          model: Product,
          as: 'product',
          attributes: ['name']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    res.json(tickets);
  } catch (error) {
    console.error('🔥 Error al obtener tickets:', error);
    res.status(500).json({ message: 'Error al obtener tickets', error: error.message });
  }
};

// ==========================================
// 🔄 ACTUALIZAR ESTADO DEL PLATILLO
// ==========================================
export const updateKitchenStatus = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { status } = req.body;

    const item = await OrderItem.findByPk(itemId);
    if (!item) return res.status(404).json({ message: 'Platillo no encontrado.' });

    item.kitchenStatus = status;
    await item.save();

    res.json({ message: `Estado actualizado a ${status}`, item });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar estado', error: error.message });
  }
};