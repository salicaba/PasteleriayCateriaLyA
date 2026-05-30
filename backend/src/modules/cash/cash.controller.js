import InventoryTransaction from '../inventory/InventoryTransaction.model.js';
import Transaction from './Transaction.model.js';
import Order from '../pos/Order.model.js';
import PasteleriaOrder from '../pasteleria/PasteleriaOrder.model.js';
import User from '../users/User.model.js';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

export const getTransactions = async (req, res) => {
  try {
    const { date, type } = req.query; // 🔥 Agregamos 'type' para poder filtrar solo egresos
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
    res.status(500).json({ message: 'Error al obtener transacciones', error: error.message });
  }
};

// 🔥 NUEVA FUNCIÓN: REGISTRAR GASTOS/EGRESOS MANUALES
export const registerManualTransaction = async (req, res) => {
  try {
    const { amount, description, expenseCategory } = req.body;
    
    if (!amount || amount <= 0) return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
    if (!description) return res.status(400).json({ message: 'La descripción es obligatoria' });

    const newTx = await Transaction.create({
      folio: `EGR-${Date.now().toString().slice(-6)}`, // Generamos un folio de egreso
      type: 'EXPENSE',
      source: 'MANUAL',
      expenseCategory: expenseCategory || 'OTHER',
      amount,
      description,
      createdBy: req.user.id
    });

    res.status(201).json({ message: 'Gasto registrado correctamente', data: newTx });
  } catch (error) {
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
    res.status(500).json({ message: 'Error al restaurar movimiento', error: error.message });
  }
};

// 🔥 NUEVA FUNCIÓN: ESTADO DE RESULTADOS (GANANCIAS NETAS)
export const getFinancialSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Si no mandan fechas, calculamos el mes actual por defecto
    const start = startDate ? new Date(`${startDate}T00:00:00`) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(`${endDate}T23:59:59`) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

    // 1. Ingresos Brutos (Ventas Activas)
    const incomes = await Transaction.sum('amount', {
      where: { 
        type: 'INCOME', 
        status: 'ACTIVE', 
        createdAt: { [Op.between]: [start, end] } 
      }
    });

    // 2. Gastos Operativos (OPEX Activos)
    const opex = await Transaction.sum('amount', {
      where: { 
        type: 'EXPENSE', 
        status: 'ACTIVE', 
        createdAt: { [Op.between]: [start, end] } 
      }
    });

    // 3. Costo de Ventas (COGS) -> Lo que se consumió en los Arqueos
    const cogs = await InventoryTransaction.sum('totalCost', {
      where: { 
        type: 'CONSUMPTION', 
        createdAt: { [Op.between]: [start, end] } 
      }
    });

    // Convertimos a números (Sequelize.sum devuelve null si no hay registros)
    const totalIncome = parseFloat(incomes || 0);
    const totalOpex = parseFloat(opex || 0);
    const totalCogs = parseFloat(cogs || 0);
    
    // La Fórmula de Oro
    const grossProfit = totalIncome - totalCogs;
    const netProfit = grossProfit - totalOpex;

    res.json({
      period: { start, end },
      metrics: {
        totalIncome,
        totalCogs,
        grossProfit,
        totalOpex,
        netProfit
      }
    });
  } catch (error) {
    console.error('Error calculando finanzas:', error);
    res.status(500).json({ message: 'Error al calcular resumen financiero', error: error.message });
  }
};