import { useState, useEffect, useMemo } from 'react';
import api from '../../../api/client';
import { startOfMonth, endOfMonth, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const useReportsController = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/dashboard', {
        params: {
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString()
        }
      });
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error("Error cargando reportes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  // Formateo de datos para Recharts
  const chartData = useMemo(() => {
    if (!data) return {};

    // 1. Tendencia de Ventas Diarias
    const dailyMap = {};
    data.incomeTransactions.forEach(t => {
      const date = format(parseISO(t.date), 'dd MMM', { locale: es });
      if (!dailyMap[date]) dailyMap[date] = { name: date, Cafetería: 0, Pastelería: 0, Total: 0 };
      
      const val = parseFloat(t.total);
      if (t.source === 'CAFETERIA') dailyMap[date].Cafetería += val;
      if (t.source === 'PASTELERIA') dailyMap[date].Pastelería += val;
      dailyMap[date].Total += val;
    });
    const dailySales = Object.values(dailyMap);

    // 2. Origen de Ingresos (Pie Chart)
    const incomeSource = [
      { name: 'Cafetería', value: data.incomeTransactions.filter(t => t.source === 'CAFETERIA').reduce((acc, curr) => acc + parseFloat(curr.total), 0) },
      { name: 'Pastelería', value: data.incomeTransactions.filter(t => t.source === 'PASTELERIA').reduce((acc, curr) => acc + parseFloat(curr.total), 0) }
    ];

    // 3. Gastos Operativos (Pie Chart)
    const opexData = data.opexTransactions.map(t => ({
      name: t.expenseCategory,
      value: parseFloat(t.total)
    }));

    // 4. Métodos de Pago
    const paymentMethods = data.paymentMethods.map(t => ({
      name: t.metodo,
      value: parseFloat(t.total)
    }));

    // KPIs Generales
    const totalIncome = incomeSource.reduce((acc, curr) => acc + curr.value, 0);
    const totalOpex = opexData.reduce((acc, curr) => acc + curr.value, 0);
    // Absoluto porque mermas viene como negativo desde la DB según tu modelo
    const totalMermas = Math.abs(parseFloat(data.inventoryStats.totalMermas || 0)); 
    const netProfit = totalIncome - totalOpex - totalMermas;

    return {
      dailySales,
      incomeSource,
      opexData,
      paymentMethods,
      productSales: data.productSales,
      kpis: {
        totalIncome,
        totalOpex,
        totalMermas,
        netProfit
      }
    };
  }, [data]);

  return {
    loading,
    dateRange,
    setDateRange,
    chartData
  };
};