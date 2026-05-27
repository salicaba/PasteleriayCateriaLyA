import Transaction from './Transaction.model.js';
import Order from '../pos/Order.model.js';
import PasteleriaOrder from '../pasteleria/PasteleriaOrder.model.js';
import User from '../users/User.model.js';
import { Op } from 'sequelize';

export const getTransactions = async (req, res) => {
  try {
    const { date } = req.query; 
    let whereClause = {};

    if (date) {
      const startDate = new Date(`${date}T00:00:00`);
      const endDate = new Date(`${date}T23:59:59`);
      whereClause.createdAt = { [Op.between]: [startDate, endDate] };
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      whereClause.createdAt = { [Op.gte]: today };
    }

    const transactions = await Transaction.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'username', 'role'] },
        { model: User, as: 'canceller', attributes: ['id', 'fullName', 'username', 'role'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener caja', error: error.message });
  }
};

export const cancelTransaction = async (req, res) => {
  try {
    if (req.user?.role !== 'Administrador') {
      return res.status(403).json({ message: 'Solo los administradores pueden anular movimientos de caja.' });
    }

    const { id } = req.params;
    const tx = await Transaction.findByPk(id);

    if (!tx) return res.status(404).json({ message: 'Transacción no encontrada' });
    if (tx.status === 'CANCELLED') return res.status(400).json({ message: 'El movimiento ya está anulado' });

    if (tx.source === 'CAFETERIA') {
      const order = await Order.findByPk(tx.referenceId);
      if (order) {
        order.status = 'OPEN'; 
        if (tx.description.includes('Pago cuenta')) {
          const cuentaName = tx.description.replace('Pago cuenta ', '').trim();
          order.paidAccounts = (order.paidAccounts || []).filter(c => c !== cuentaName);
        } else {
          order.paidAccounts = [];
        }
        await order.save();
      }
    } else if (tx.source === 'PASTELERIA') {
      const pedido = await PasteleriaOrder.findByPk(tx.referenceId);
      if (pedido) {
        pedido.abonos = (pedido.abonos || []).filter(a => a.id !== tx.id);
        await pedido.save();
      }
    }

    tx.status = 'CANCELLED';
    tx.cancelledBy = req.user.id;
    tx.cancelledAt = new Date();
    await tx.save();

    res.json({ message: 'Movimiento anulado correctamente. El dinero se ha descontado de la caja.', data: tx });
  } catch (error) {
    res.status(500).json({ message: 'Error al anular movimiento', error: error.message });
  }
};

// --- NUEVA FUNCIÓN: RESTAURAR TRANSACCIÓN ---
export const restoreTransaction = async (req, res) => {
  try {
    if (req.user?.role !== 'Administrador') {
      return res.status(403).json({ message: 'Solo los administradores pueden restaurar movimientos de caja.' });
    }

    const { id } = req.params;
    const tx = await Transaction.findByPk(id);

    if (!tx) return res.status(404).json({ message: 'Transacción no encontrada' });
    if (tx.status === 'ACTIVE') return res.status(400).json({ message: 'El movimiento ya está activo' });

    if (tx.source === 'CAFETERIA') {
      const order = await Order.findByPk(tx.referenceId, { include: ['items'] });
      if (order) {
        let paidAccounts = [...(order.paidAccounts || [])];
        
        if (tx.description.includes('Pago cuenta')) {
          const cuentaName = tx.description.replace('Pago cuenta ', '').trim();
          if (!paidAccounts.includes(cuentaName)) paidAccounts.push(cuentaName);
        } else {
          // Si fue pago total, marcamos todas las cuentas únicas de los items como pagadas
          const allAccounts = [...new Set(order.items.map(i => i.cuenta))];
          paidAccounts = allAccounts;
        }

        const unpaidItems = order.items.filter(i => !paidAccounts.includes(i.cuenta));
        order.status = unpaidItems.length === 0 ? 'PAID' : 'OPEN';
        order.paidAccounts = paidAccounts;
        await order.save();
      }
    } else if (tx.source === 'PASTELERIA') {
      const pedido = await PasteleriaOrder.findByPk(tx.referenceId);
      if (pedido) {
        const abonosActuales = pedido.abonos || [];
        if (!abonosActuales.some(a => a.id === tx.id)) {
          pedido.abonos = [...abonosActuales, {
            id: tx.id,
            fecha: tx.createdAt,
            monto: parseFloat(tx.amount)
          }];
          await pedido.save();
        }
      }
    }

    tx.status = 'ACTIVE';
    tx.cancelledBy = null;
    tx.cancelledAt = null;
    await tx.save();

    res.json({ message: 'Movimiento restaurado correctamente.', data: tx });
  } catch (error) {
    res.status(500).json({ message: 'Error al restaurar movimiento', error: error.message });
  }
};