// backend/src/modules/reports/reports.controller.js
import { Op, fn, col, literal } from 'sequelize';
import Transaction from '../cash/Transaction.model.js';
import Order from '../pos/Order.model.js';
import OrderItem from '../pos/OrderItem.model.js';
import Product from '../menu/Product.model.js';
import PasteleriaOrder from '../pasteleria/PasteleriaOrder.model.js';
import InventoryTransaction from '../inventory/InventoryTransaction.model.js';

export const getDashboardData = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // 🔥 SEGURO DE ZONA HORARIA
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

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

    // 2. Gastos Operativos (OPEX) (Actual)
    const opexTransactions = await Transaction.findAll({
      where: { ...dateFilter, type: 'EXPENSE', status: 'ACTIVE' },
      attributes: [
        'expenseCategory',
        [fn('SUM', col('amount')), 'total']
      ],
      group: ['expenseCategory'],
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
        // 🔥 CORRECCIÓN: Ahora usa updatedAt para que tome en cuenta el día en que se marcó como "entregado"
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
      // 🔥 CORRECCIÓN: Expresión regular para limpiar los corchetes y comillas del nombre
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
      const nowStr = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
      const now = new Date(nowStr);
      
      let start, end;
      
      if (period === 'today') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      } else if (period === 'yesterday') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      } else if (period === 'week') {
        const day = now.getDay() || 7; 
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - day), 23, 59, 59, 999);
      } else if (period === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
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