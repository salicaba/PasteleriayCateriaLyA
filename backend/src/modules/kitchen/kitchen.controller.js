// backend/src/modules/kitchen/kitchen.controller.js
import { getIO } from '../../config/socket.js';
import { Op } from 'sequelize'; 
import OrderItem from '../pos/OrderItem.model.js';
import Order from '../pos/Order.model.js';
import Product from '../menu/Product.model.js';
import Table from '../pos/Table.model.js';

// =========================================================================
// 🌐 UTILIDAD: FECHA LOCAL ESTRICTA (CHIAPAS / CDMX)
// =========================================================================
const getLocalNow = () => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
};

// ==========================================
// 🍳 OBTENER TICKETS DE COCINA (KDS)
// ==========================================
export const getKitchenTickets = async (req, res) => {
  try {
    const tickets = await OrderItem.findAll({
      where: {
        // Solo traemos los que están pendientes o en preparación.
        kitchenStatus: ['PENDING', 'PREPARING']
      },
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderType', 'ticketId', 'tableId', 'createdAt', 'status'], 
          where: { 
            // 🔥 LA MAGIA: Permitimos que lleguen las órdenes Canceladas a la cocina para avisarles
            status: { [Op.in]: ['OPEN', 'PAID', 'CANCELLED'] } 
          },
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
          attributes: ['name', 'requiereCocina'] 
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

    // 🔥 BLINDAJE DE ZONA HORARIA
    // Forzamos el reloj de Chiapas al momento de tocar el estado.
    // Esto es crucial para medir los "Tiempos de Preparación" de los cocineros.
    const localNow = getLocalNow();

    item.kitchenStatus = status;
    item.updatedAt = localNow; // Obliga al KDS a medir el tiempo real
    
    await item.save();

    getIO().emit('pos:update');

    res.json({ message: `Estado actualizado a ${status}`, item });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar estado', error: error.message });
  }
};