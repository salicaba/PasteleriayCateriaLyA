import { Op, fn, col, literal } from 'sequelize';
import Transaction from '../cash/Transaction.model.js';
import Order from '../pos/Order.model.js';
import OrderItem from '../pos/OrderItem.model.js';
import Product from '../menu/Product.model.js';
import InventoryReconciliationDetail from '../inventory/InventoryReconciliationDetail.model.js';
import InventoryReconciliation from '../inventory/InventoryReconciliation.model.js';

export const getDashboardData = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Configurar rango de fechas actual
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // --- CÁLCULO DE PERIODO ANTERIOR (TENDENCIAS) ---
    const duration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration - 1); 
    const prevEnd = new Date(start.getTime() - 1);

    const dateFilter = { createdAt: { [Op.between]: [start, end] } };
    const prevDateFilter = { createdAt: { [Op.between]: [prevStart, prevEnd] } };

    // 1. Tendencia de Ventas Diarias e Ingresos por Origen (Actual)
    const incomeTransactions = await Transaction.findAll({
      where: { ...dateFilter, type: 'INCOME', status: 'ACTIVE' },
      attributes: [
        [fn('DATE', col('createdAt')), 'date'],
        'source',
        [fn('SUM', col('amount')), 'total']
      ],
      group: [fn('DATE', col('createdAt')), 'source'],
      raw: true
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

    // 3. Ventas de TODOS los productos
    const allProducts = await Product.findAll({
      attributes: ['id', 'name', 'departamento'],
      raw: true
    });

    const soldItems = await OrderItem.findAll({
      where: { createdAt: { [Op.between]: [start, end] } },
      include: [{
        model: Order,
        as: 'order',
        attributes: [],
        where: { status: { [Op.in]: ['PAID', 'CLOSED'] } }
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

    // 4. Mermas y Ajustes de Inventario (Actual)
    const inventoryStats = await InventoryReconciliationDetail.findAll({
      where: { createdAt: { [Op.between]: [start, end] } },
      include: [{ 
        model: InventoryReconciliation, 
        as: 'reconciliation',
        attributes: [], 
        where: { status: 'COMPLETED' } 
      }],
      attributes: [
        // 🔥 CORRECCIÓN AQUÍ: Comillas dobles agregadas a "difference" y "totalDifferenceCost"
        [fn('SUM', literal('CASE WHEN "difference" < 0 THEN "totalDifferenceCost" ELSE 0 END')), 'totalMermas'],
        [fn('SUM', literal('CASE WHEN "difference" > 0 THEN "totalDifferenceCost" ELSE 0 END')), 'totalSobrantes']
      ],
      raw: true
    });

    // 5. Métodos de Pago
    const paymentMethods = await Transaction.findAll({
      where: { ...dateFilter, type: 'INCOME', status: 'ACTIVE' },
      attributes: [
        [literal(`
          CASE 
            WHEN description LIKE '%Tarjeta%' THEN 'Tarjeta'
            WHEN description LIKE '%Transferencia%' THEN 'Transferencia'
            ELSE 'Efectivo' 
          END
        `), 'metodo'],
        [fn('SUM', col('amount')), 'total']
      ],
      group: ['metodo'],
      raw: true
    });

    // --- CONSULTAS DEL PERIODO ANTERIOR ---
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

    const prevInventoryStats = await InventoryReconciliationDetail.findAll({
      where: { createdAt: { [Op.between]: [prevStart, prevEnd] } },
      include: [{ 
        model: InventoryReconciliation, as: 'reconciliation', attributes: [], 
        where: { status: 'COMPLETED' } 
      }],
      // 🔥 CORRECCIÓN AQUÍ: También aplicamos las comillas en el cálculo anterior
      attributes: [[fn('SUM', literal('CASE WHEN "difference" < 0 THEN "totalDifferenceCost" ELSE 0 END')), 'totalMermas']],
      raw: true
    });
    const prevTotalMermas = Math.abs(parseFloat(prevInventoryStats[0]?.totalMermas || 0));

    res.json({
      success: true,
      data: {
        incomeTransactions,
        opexTransactions,
        productSales,
        inventoryStats: inventoryStats[0] || { totalMermas: 0, totalSobrantes: 0 },
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