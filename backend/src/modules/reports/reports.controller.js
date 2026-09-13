// backend/src/modules/reports/reports.controller.js
import { Op, fn, col, literal } from 'sequelize';
import Transaction from '../cash/Transaction.model.js';
import Order from '../pos/Order.model.js';
import OrderItem from '../pos/OrderItem.model.js';
import Product from '../menu/Product.model.js';
import PasteleriaOrder from '../pasteleria/PasteleriaOrder.model.js';
import InventoryTransaction from '../inventory/InventoryTransaction.model.js';

// =========================================================================
// 🌐 UTILIDAD: FECHA LOCAL ESTRICTA (CHIAPAS / CDMX)
// =========================================================================
const getLocalNow = () => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
};

export const getDashboardData = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let start, end;

    // 🔥 Limpiamos las fechas por si el frontend manda formato ISO con hora y 'Z'
    const cleanStartDate = startDate ? startDate.split('T')[0] : null;
    const cleanEndDate = endDate ? endDate.split('T')[0] : null;

    if (cleanStartDate && cleanEndDate) {
      start = new Date(`${cleanStartDate}T00:00:00.000-06:00`);
      end = new Date(`${cleanEndDate}T23:59:59.999-06:00`);
    } else {
      const localNow = getLocalNow();
      const year = localNow.getFullYear();
      const month = String(localNow.getMonth() + 1).padStart(2, '0');
      const day = String(localNow.getDate()).padStart(2, '0');
      
      const startStr = `${year}-${month}-01`;
      const endStr = `${year}-${month}-${day}`;

      start = new Date(`${startStr}T00:00:00.000-06:00`);
      end = new Date(`${endStr}T23:59:59.999-06:00`);
    }

    const duration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration - 1); 
    const prevEnd = new Date(start.getTime() - 1);

    const dateFilter = { createdAt: { [Op.between]: [start, end] } };
    const prevDateFilter = { createdAt: { [Op.between]: [prevStart, prevEnd] } };

    // 1. Tendencia de Ventas Diarias e Ingresos por Origen (Actual)
    const rawIncomes = await Transaction.findAll({
      where: { ...dateFilter, type: 'INCOME', status: 'ACTIVE' },
      attributes: ['createdAt', 'source', 'amount'],
      raw: true
    });

    const dailyMap = {};
    rawIncomes.forEach(t => {
      const dateStr = new Date(t.createdAt).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
      
      const key = `${dateStr}_${t.source}`;
      if (!dailyMap[key]) {
        dailyMap[key] = { date: dateStr, source: t.source, total: 0 };
      }
      dailyMap[key].total += parseFloat(t.amount);
    });
    
    const incomeTransactions = Object.values(dailyMap);

    const totalTransactionsCount = await Transaction.count({
      where: { ...dateFilter, type: 'INCOME', status: 'ACTIVE' }
    });

    // 2. Gastos Operativos (OPEX) (Actual - Agrupado para KPIs)
    const opexTransactions = await Transaction.findAll({
      where: { ...dateFilter, type: 'EXPENSE', status: 'ACTIVE' },
      attributes: [
        'expenseCategory',
        [fn('SUM', col('amount')), 'total']
      ],
      group: ['expenseCategory'],
      raw: true
    });

    // 2.5 LISTA DETALLADA DE GASTOS (Para el Excel)
    const expenseTransactions = await Transaction.findAll({
      where: { ...dateFilter, type: 'EXPENSE', status: 'ACTIVE' },
      attributes: ['id', 'folio', 'expenseCategory', 'description', 'amount', 'createdAt', 'paymentMethod'],
      order: [['createdAt', 'DESC']],
      raw: true
    });

    // 3. Ventas de Cafetería
    const allProducts = await Product.findAll({
      attributes: ['id', 'name', 'departamento'],
      raw: true
    });

    const soldItems = await OrderItem.findAll({
      where: { 
        createdAt: { [Op.between]: [start, end] },
        status: 'ACTIVE'
      },
      include: [{
        model: Order,
        as: 'order',
        attributes: [],
        where: { 
          status: { [Op.in]: ['PAID', 'CLOSED'] } 
        }
      }],
      attributes: [
        'productId',
        [fn('SUM', col('quantity')), 'totalQuantity'],
        [fn('SUM', col('subtotal')), 'totalRevenue']
      ],
      group: ['productId'],
      raw: true
    });

    const productSales = allProducts.map(product => {
      const saleData = soldItems.find(item => item.productId === product.id);
      return {
        name: product.name,
        departamento: product.departamento,
        cantidad: saleData ? parseInt(saleData.totalQuantity) : 0,
        ingreso: saleData ? parseFloat(saleData.totalRevenue) : 0
      };
    }).sort((a, b) => b.cantidad - a.cantidad);

    // 4. Ventas/Rendimiento de Pastelería (Pedidos Entregados)
    const pasteleriaSalesRaw = await PasteleriaOrder.findAll({
      where: { 
        updatedAt: { [Op.between]: [start, end] },
        estado: 'entregado'
      },
      attributes: [
        ['categoria', 'name'],
        [fn('COUNT', col('id')), 'cantidad'],
        [fn('SUM', col('costoTotal')), 'ingreso']
      ],
      group: ['categoria'],
      raw: true
    });

    const pasteleriaSales = pasteleriaSalesRaw.map(item => {
      let cleanName = item.name ? item.name.replace(/[\[\]"']/g, '') : 'Personalizado';
      return {
        name: cleanName,
        departamento: 'PASTELERÍA',
        cantidad: parseInt(item.cantidad || 0, 10),
        ingreso: parseFloat(item.ingreso || 0)
      };
    }).sort((a, b) => b.cantidad - a.cantidad);

    // 5. Mermas y Ajustes
    const mermasActual = await InventoryTransaction.findOne({
      where: { ...dateFilter, type: { [Op.in]: ['CONSUMPTION', 'WASTE'] }, status: 'ACTIVE' },
      attributes: [[fn('SUM', col('totalCost')), 'total']],
      raw: true
    });
    
    const sobrantesActual = await InventoryTransaction.findOne({
      where: { ...dateFilter, type: 'ADJUSTMENT', status: 'ACTIVE' },
      attributes: [[fn('SUM', col('totalCost')), 'total']],
      raw: true
    });

    const inventoryStats = {
      totalMermas: parseFloat(mermasActual?.total || 0),
      totalSobrantes: parseFloat(sobrantesActual?.total || 0)
    };

    // 6. Métodos de Pago
    const paymentMethods = await Transaction.findAll({
      where: { ...dateFilter, type: 'INCOME', status: 'ACTIVE' },
      attributes: [
        [literal(`
          CASE 
            WHEN description LIKE '%Transferencia%' THEN 'Transferencia'
            WHEN description LIKE '%Tarjeta%' THEN 'Tarjeta'
            ELSE 'Efectivo' 
          END
        `), 'metodo'],
        [fn('SUM', col('amount')), 'total']
      ],
      group: ['metodo'],
      raw: true
    });

    // --- TENDENCIAS ---
    const prevIncomeTransactions = await Transaction.findAll({
      where: { ...prevDateFilter, type: 'INCOME', status: 'ACTIVE' },
      attributes: [[fn('SUM', col('amount')), 'total']],
      raw: true
    });
    const prevTotalIncome = parseFloat(prevIncomeTransactions[0]?.total || 0);

    const prevOpexTransactions = await Transaction.findAll({
      where: { ...prevDateFilter, type: 'EXPENSE', status: 'ACTIVE' },
      attributes: [[fn('SUM', col('amount')), 'total']],
      raw: true
    });
    const prevTotalOpex = parseFloat(prevOpexTransactions[0]?.total || 0);

    const prevMermas = await InventoryTransaction.findOne({
      where: { ...prevDateFilter, type: { [Op.in]: ['CONSUMPTION', 'WASTE'] }, status: 'ACTIVE' },
      attributes: [[fn('SUM', col('totalCost')), 'total']],
      raw: true
    });
    const prevTotalMermas = parseFloat(prevMermas?.total || 0);

    res.json({
      success: true,
      data: {
        incomeTransactions,
        totalTransactions: totalTransactionsCount,
        opexTransactions,
        expenseTransactions,
        productSales,
        pasteleriaSales,
        inventoryStats: inventoryStats, 
        paymentMethods,
        previousKpis: {
          totalIncome: prevTotalIncome,
          totalOpex: prevTotalOpex,
          totalMermas: prevTotalMermas
        }
      }
    });

  } catch (error) {
    console.error('Error en getDashboardData:', error);
    res.status(500).json({ success: false, message: 'Error generando reportes' });
  }
};

export const getProductStats = async (req, res) => {
  try {
    const { productId } = req.params;
    const { period } = req.query; 

    let dateFilter = {};
    if (period && period !== 'all') {
      const localNow = getLocalNow();
      const year = localNow.getFullYear();
      const month = String(localNow.getMonth() + 1).padStart(2, '0');
      const day = String(localNow.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      
      let start, end;
      
      if (period === 'today') {
        start = new Date(`${todayStr}T00:00:00.000-06:00`);
        end = new Date(`${todayStr}T23:59:59.999-06:00`);
      } else if (period === 'yesterday') {
        const yesterday = new Date(localNow);
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        start = new Date(`${yStr}T00:00:00.000-06:00`);
        end = new Date(`${yStr}T23:59:59.999-06:00`);
      } else if (period === 'week') {
        const dayOfWeek = localNow.getDay() || 7; 
        const startWeek = new Date(localNow);
        startWeek.setDate(localNow.getDate() - dayOfWeek + 1);
        const startWStr = `${startWeek.getFullYear()}-${String(startWeek.getMonth() + 1).padStart(2, '0')}-${String(startWeek.getDate()).padStart(2, '0')}`;
        
        const endWeek = new Date(localNow);
        endWeek.setDate(localNow.getDate() + (7 - dayOfWeek));
        const endWStr = `${endWeek.getFullYear()}-${String(endWeek.getMonth() + 1).padStart(2, '0')}-${String(endWeek.getDate()).padStart(2, '0')}`;
        
        start = new Date(`${startWStr}T00:00:00.000-06:00`);
        end = new Date(`${endWStr}T23:59:59.999-06:00`);
      } else if (period === 'month') {
        const startMStr = `${year}-${month}-01`;
        const endOfM = new Date(year, localNow.getMonth() + 1, 0);
        const endMStr = `${year}-${month}-${String(endOfM.getDate()).padStart(2, '0')}`;
        
        start = new Date(`${startMStr}T00:00:00.000-06:00`);
        end = new Date(`${endMStr}T23:59:59.999-06:00`);
      }

      if (start && end) {
        dateFilter = { createdAt: { [Op.between]: [start, end] } };
      }
    }

    const soldItems = await OrderItem.findAll({
      where: { 
        productId,
        status: 'ACTIVE',
        ...dateFilter
      },
      include: [{
        model: Order,
        as: 'order',
        attributes: [],
        where: { 
          status: { [Op.in]: ['PAID', 'CLOSED'] } 
        }
      }],
      attributes: [
        [fn('SUM', col('quantity')), 'totalQuantity'],
        [fn('SUM', col('subtotal')), 'totalRevenue']
      ],
      raw: true
    });

    const qty = soldItems[0]?.totalQuantity ? parseInt(soldItems[0].totalQuantity) : 0;
    const rev = soldItems[0]?.totalRevenue ? parseFloat(soldItems[0].totalRevenue) : 0;

    res.json({ success: true, data: { cantidad: qty, ingreso: rev } });
  } catch (error) {
    console.error('Error en getProductStats:', error);
    res.status(500).json({ success: false, message: 'Error generando estadísticas del producto' });
  }
};