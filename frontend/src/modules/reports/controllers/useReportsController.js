import { useState, useEffect, useMemo } from 'react';
import api from '../../../api/client';
import { startOfMonth, endOfMonth, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const useReportsController = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });
  
  // 🔥 Movimos el filtro aquí para que todo el módulo lo comparta
  const [productFilter, setProductFilter] = useState('5');

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
      toast.error('Error al cargar la información financiera');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const chartData = useMemo(() => {
    if (!data) return {};

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

    const incomeSource = [
      { name: 'Cafetería', value: data.incomeTransactions.filter(t => t.source === 'CAFETERIA').reduce((acc, curr) => acc + parseFloat(curr.total), 0) },
      { name: 'Pastelería', value: data.incomeTransactions.filter(t => t.source === 'PASTELERIA').reduce((acc, curr) => acc + parseFloat(curr.total), 0) }
    ];

    const opexData = data.opexTransactions.map(t => ({
      name: t.expenseCategory,
      value: parseFloat(t.total)
    }));

    const paymentMethods = data.paymentMethods.map(t => ({
      name: t.metodo,
      value: parseFloat(t.total)
    }));

    const totalIncome = incomeSource.reduce((acc, curr) => acc + curr.value, 0);
    const totalOpex = opexData.reduce((acc, curr) => acc + curr.value, 0);
    const totalMermas = Math.abs(parseFloat(data.inventoryStats.totalMermas || 0)); 
    const netProfit = totalIncome - totalOpex - totalMermas;

    const prevIncome = parseFloat(data.previousKpis?.totalIncome || 0);
    const prevOpex = parseFloat(data.previousKpis?.totalOpex || 0);
    const prevMermas = parseFloat(data.previousKpis?.totalMermas || 0);
    const prevNetProfit = prevIncome - prevOpex - prevMermas;

    const calculateTrend = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const trends = {
      income: calculateTrend(totalIncome, prevIncome),
      opex: calculateTrend(totalOpex, prevOpex),
      mermas: calculateTrend(totalMermas, prevMermas),
      profit: calculateTrend(netProfit, prevNetProfit)
    };

    return {
      dailySales, incomeSource, opexData, paymentMethods, productSales: data.productSales,
      kpis: { totalIncome, totalOpex, totalMermas, netProfit },
      trends
    };
  }, [data]);

  // 🔥 Calculamos los productos procesados según el filtro directamente en el controlador
  const processedProducts = useMemo(() => {
    if (!chartData.productSales) return [];
    
    let list = [...chartData.productSales];
    list.sort((a, b) => b.cantidad - a.cantidad);

    if (productFilter === 'SOLD') {
      list = list.filter(p => p.cantidad > 0);
    } else if (productFilter !== 'ALL') {
      list = list.slice(0, parseInt(productFilter));
    }
    
    return list;
  }, [chartData.productSales, productFilter]);

  const exportToExcel = () => {
    if (!chartData.kpis) return;
    try {
      const wb = XLSX.utils.book_new();

      const getAutoWidths = (dataArray, headers = []) => {
        const colWidths = headers.map(h => h.length);
        dataArray.forEach(row => {
          Object.values(row).forEach((cell, i) => {
            const cellLength = cell !== null && cell !== undefined ? cell.toString().length : 0;
            if (cellLength > (colWidths[i] || 0)) {
              colWidths[i] = cellLength;
            }
          });
        });
        return colWidths.map(w => ({ wch: w + 5 }));
      };

      const resumenData = [
        ['Métrica', 'Monto ($)'],
        ['Ingresos Totales', chartData.kpis.totalIncome],
        ['Utilidad Neta Aprox', chartData.kpis.netProfit],
        ['Gastos Operativos (OPEX)', chartData.kpis.totalOpex],
        ['Mermas (Kardex)', chartData.kpis.totalMermas]
      ];
      const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
      wsResumen['!cols'] = getAutoWidths(resumenData);
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen KPIs');

      // 🔥 Usamos la lista filtrada de productos (processedProducts) en Excel
      const productosData = processedProducts.map(p => ({
        Producto: p.name,
        Departamento: p.departamento,
        'Cantidad Vendida': p.cantidad,
        'Ingreso Bruto ($)': p.ingreso
      }));
      const wsProductos = XLSX.utils.json_to_sheet(productosData);
      if (productosData.length > 0) {
        wsProductos['!cols'] = getAutoWidths(productosData, Object.keys(productosData[0]));
      }
      XLSX.utils.book_append_sheet(wb, wsProductos, 'Rendimiento Productos');

      const gastosData = chartData.opexData.map(g => ({
        Categoría: g.name,
        'Monto ($)': g.value
      }));
      const wsGastos = XLSX.utils.json_to_sheet(gastosData);
      if (gastosData.length > 0) {
        wsGastos['!cols'] = getAutoWidths(gastosData, Object.keys(gastosData[0]));
      }
      XLSX.utils.book_append_sheet(wb, wsGastos, 'Gastos Operativos');

      XLSX.writeFile(wb, `Inteligencia_Negocios_LyA_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success('Reporte Excel exportado correctamente');
    } catch (error) {
      console.error(error);
      toast.error('Ocurrió un error al exportar a Excel');
    }
  };

  const exportToPDF = () => {
    if (!chartData.kpis) return;
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.setTextColor(74, 43, 41);
      doc.text('Inteligencia de Negocios - LyA', 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Periodo evaluado: ${format(dateRange.start, 'dd MMM yyyy', {locale: es})} al ${format(dateRange.end, 'dd MMM yyyy', {locale: es})}`, 14, 30);

      autoTable(doc, {
        startY: 40,
        head: [['Métrica Financiera', 'Monto ($)']],
        body: [
          ['Ingresos Totales', `$${chartData.kpis.totalIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`],
          ['Utilidad Neta (Aprox)', `$${chartData.kpis.netProfit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`],
          ['Gastos Operativos (OPEX)', `$${chartData.kpis.totalOpex.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`],
          ['Mermas de Inventario', `$${chartData.kpis.totalMermas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [249, 115, 22] } 
      });

      // 🔥 Usamos la lista filtrada directamente en el PDF
      if (processedProducts.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(74, 43, 41);
        
        const finalY = doc.lastAutoTable.finalY;
        
        // Adaptamos el título según el filtro seleccionado
        const tituloTabla = productFilter === 'SOLD' ? 'Productos Vendidos' : 
                            productFilter === 'ALL' ? 'Desglose del Catálogo Completo' : 
                            `Top ${productFilter} Productos Más Vendidos`;

        doc.text(tituloTabla, 14, finalY + 15);
        
        autoTable(doc, {
          startY: finalY + 20,
          head: [['Producto', 'Depto', 'Unidades', 'Ingreso']],
          body: processedProducts.map(p => [
            p.name, 
            p.departamento, 
            p.cantidad, 
            `$${p.ingreso.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [74, 43, 41] } 
        });
      }

      doc.save(`Inteligencia_Negocios_LyA_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Reporte PDF exportado correctamente');
    } catch (error) {
      console.error(error);
      toast.error('Ocurrió un error al exportar a PDF');
    }
  };

  return {
    loading,
    dateRange,
    setDateRange,
    chartData,
    exportToExcel,
    exportToPDF,
    productFilter, // Retornamos el estado para conectarlo a la UI
    setProductFilter,
    processedProducts // Retornamos la lista ya filtrada
  };
};