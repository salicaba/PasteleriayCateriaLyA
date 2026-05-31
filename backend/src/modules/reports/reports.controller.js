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
    
    // Configurar rango de fechas (Por defecto: mes actual)
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const dateFilter = {
      createdAt: { [Op.between]: [start, end] }
    };

    // 1. Tendencia de Ventas Diarias e Ingresos por Origen (Cafetería vs Pastelería)
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

    // 2. Gastos Operativos (OPEX)
    const opexTransactions = await Transaction.findAll({
      where: { ...dateFilter, type: 'EXPENSE', status: 'ACTIVE' },
      attributes: [
        'expenseCategory',
        [fn('SUM', col('amount')), 'total']
      ],
      group: ['expenseCategory'],
      raw: true
    });

    // 3. Ventas de TODOS los productos (incluyendo 0 ventas)
    const allProducts = await Product.findAll({
      attributes: ['id', 'name', 'departamento'],
      raw: true
    });

    const soldItems = await OrderItem.findAll({
      where: { createdAt: { [Op.between]: [start, end] } },
      include: [{
        model: Order,
        as: 'order', // <-- ALIAS AGREGADO
        attributes: [],
        where: { status: { [Op.in]: ['PAID', 'CLOSED'] } } // Solo órdenes pagadas
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
    }).sort((a, b) => b.cantidad - a.cantidad); // Ordenar de mayor a menor

    // 4. Mermas y Ajustes de Inventario (Arqueos)
    const inventoryStats = await InventoryReconciliationDetail.findAll({
      where: { createdAt: { [Op.between]: [start, end] } },
      include: [{ 
        model: InventoryReconciliation, 
        as: 'reconciliation', // <-- ALIAS AGREGADO
        attributes: [], 
        where: { status: 'COMPLETED' } 
      }],
      attributes: [
        [fn('SUM', literal('CASE WHEN difference < 0 THEN totalDifferenceCost ELSE 0 END')), 'totalMermas'], // Consumos/Pérdidas
        [fn('SUM', literal('CASE WHEN difference > 0 THEN totalDifferenceCost ELSE 0 END')), 'totalSobrantes'] // Ajustes positivos a favor
      ],
      raw: true
    });

    // 5. Métodos de Pago (Simulación basada en descripción si no existe la columna en Transaction)
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

    res.json({
      success: true,
      data: {
        incomeTransactions,
        opexTransactions,
        productSales,
        inventoryStats: inventoryStats[0] || { totalMermas: 0, totalSobrantes: 0 },
        paymentMethods
      }
    });

  } catch (error) {
    console.error('Error en getDashboardData:', error);
    res.status(500).json({ success: false, message: 'Error generando reportes' });
  }
};