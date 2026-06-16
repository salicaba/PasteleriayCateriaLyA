import InventoryTransaction from '../inventory/InventoryTransaction.model.js';
import Transaction from './Transaction.model.js';
import Order from '../pos/Order.model.js';
import PasteleriaOrder from '../pasteleria/PasteleriaOrder.model.js';
import User from '../users/User.model.js';
import { Op } from 'sequelize';

export const getTransactions = async (req, res) => {
  try {
    const { date, type } = req.query; 
    let whereClause = {};

    if (date) {
      // date viene como "YYYY-MM-DD"
      const [year, month, day] = date.split('-').map(Number);
      
      // 🔥 SOLUCIÓN MATEMÁTICA: Chiapas es UTC-6 permanentemente.
      // 00:00:00 en Chiapas = 06:00:00 en el reloj global (UTC).
      // 23:59:59 en Chiapas = 05:59:59 del DÍA SIGUIENTE en el reloj global.
      const startDate = new Date(Date.UTC(year, month - 1, day, 6, 0, 0));
      const endDate = new Date(Date.UTC(year, month - 1, day + 1, 5, 59, 59));
      
      whereClause.createdAt = { [Op.between]: [startDate, endDate] };
    } else {
      // Si no hay fecha, calculamos HOY en Chiapas
      const now = new Date();
      const chiapasTime = new Date(now.getTime() - (6 * 60 * 60 * 1000));
      const year = chiapasTime.getUTCFullYear();
      const month = chiapasTime.getUTCMonth();
      const day = chiapasTime.getUTCDate();

      const startDate = new Date(Date.UTC(year, month, day, 6, 0, 0));
      whereClause.createdAt = { [Op.gte]: startDate };
    }

    if (type) {
      whereClause.type = type;
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
    console.error("❌ ERROR EN CAJA (getTransactions):", error);
    res.status(500).json({ message: 'Error al obtener transacciones', error: error.message });
  }
};

// REGISTRAR GASTOS/EGRESOS MANUALES
export const registerManualTransaction = async (req, res) => {
  try {
    const { amount, description, expenseCategory } = req.body;
    
    if (!amount || amount <= 0) return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
    if (!description) return res.status(400).json({ message: 'La descripción es obligatoria' });

    const newTx = await Transaction.create({
      folio: `EGR-${Date.now().toString().slice(-6)}`, 
      type: 'EXPENSE',
      source: 'MANUAL',
      expenseCategory: expenseCategory || 'OTHER',
      amount,
      description,
      createdBy: req.user.id
    });

    res.status(201).json({ message: 'Gasto registrado correctamente', data: newTx });
  } catch (error) {
    console.error("❌ ERROR AL REGISTRAR GASTO:", error);
    res.status(500).json({ message: 'Error al registrar gasto', error: error.message });
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

    res.json({ message: 'Movimiento anulado correctamente.', data: tx });
  } catch (error) {
    console.error("❌ ERROR AL ANULAR TX:", error);
    res.status(500).json({ message: 'Error al anular movimiento', error: error.message });
  }
};

export const restoreTransaction = async (req, res) => {
  try {
    if (req.user?.role !== 'Administrador') {
      return res.status(403).json({ message: 'Solo los administradores pueden restaurar movimientos.' });
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
          pedido.abonos = [...abonosActuales, { id: tx.id, fecha: tx.createdAt, monto: parseFloat(tx.amount) }];
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
    console.error("❌ ERROR AL RESTAURAR TX:", error);
    res.status(500).json({ message: 'Error al restaurar movimiento', error: error.message });
  }
};

// ESTADO DE RESULTADOS (GANANCIAS NETAS) CON CORRECCIÓN DE ZONA HORARIA
export const getFinancialSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let start, end;

    if (startDate && endDate) {
      const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
      start = new Date(Date.UTC(sYear, sMonth - 1, sDay, 6, 0, 0));

      const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
      end = new Date(Date.UTC(eYear, eMonth - 1, eDay + 1, 5, 59, 59));
    } else {
      const now = new Date();
      const chiapasTime = new Date(now.getTime() - (6 * 60 * 60 * 1000));
      const year = chiapasTime.getUTCFullYear();
      const month = chiapasTime.getUTCMonth();
      
      start = new Date(Date.UTC(year, month, 1, 6, 0, 0));
      end = new Date(Date.UTC(year, month + 1, 1, 5, 59, 59));
    }

    const incomes = await Transaction.sum('amount', {
      where: { type: 'INCOME', status: 'ACTIVE', createdAt: { [Op.between]: [start, end] } }
    });

    const opex = await Transaction.sum('amount', {
      where: { type: 'EXPENSE', status: 'ACTIVE', createdAt: { [Op.between]: [start, end] } }
    });

    const cogs = await InventoryTransaction.sum('totalCost', {
      where: { type: 'CONSUMPTION', createdAt: { [Op.between]: [start, end] } }
    });

    const totalIncome = parseFloat(incomes || 0);
    const totalOpex = parseFloat(opex || 0);
    const totalCogs = parseFloat(cogs || 0);
    
    const grossProfit = totalIncome - totalCogs;
    const netProfit = grossProfit - totalOpex;

    res.json({
      period: { start, end },
      metrics: { totalIncome, totalCogs, grossProfit, totalOpex, netProfit }
    });
  } catch (error) {
    console.error('❌ Error calculando finanzas:', error);
    res.status(500).json({ message: 'Error al calcular resumen financiero', error: error.message });
  }
};