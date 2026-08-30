// frontend/src/modules/reports/controllers/useReportsController.js
import { useState, useEffect, useMemo } from 'react';
import api from '../../../api/client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const useReportsController = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  
  // 🔥 SEGURO DE FECHAS: Desde el día 1 a las 00:00:00 hasta el último día a las 23:59:59
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    };
  });
  
  const [productFilter, setProductFilter] = useState('5');

  // 🔥 DETECCIÓN AUTOMÁTICA DE MES COMPLETO
  const isFullMonth = useMemo(() => {
    const start = dateRange.start;
    const end = dateRange.end;
    
    const isFirstDay = start.getDate() === 1;
    const lastDayOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const isLastDay = end.getDate() === lastDayOfMonth;
    const isSameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    
    return isFirstDay && isLastDay && isSameMonth;
  }, [dateRange]);

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
    let sumCafeteria = 0;
    let sumPasteleria = 0;
    let sumGlobal = 0;

    // 🔥 AGRUPACIÓN DE INGRESOS DIARIOS
    data.incomeTransactions.forEach(t => {
      // Forzamos el string a fecha local para evitar brincos de zona horaria
      const dateObj = new Date(t.date + 'T00:00:00'); 
      const dateFormatted = format(dateObj, 'dd MMM yyyy', { locale: es });
      
      if (!dailyMap[t.date]) dailyMap[t.date] = { dateRaw: t.date, name: dateFormatted, Cafetería: 0, Pastelería: 0, Total: 0 };
      
      const val = parseFloat(t.total);
      if (t.source === 'CAFETERIA') {
        dailyMap[t.date].Cafetería += val;
        sumCafeteria += val;
      }
      if (t.source === 'PASTELERIA') {
        dailyMap[t.date].Pastelería += val;
        sumPasteleria += val;
      }
      dailyMap[t.date].Total += val;
      sumGlobal += val;
    });

    const dailySales = Object.values(dailyMap).sort((a, b) => a.dateRaw.localeCompare(b.dateRaw));

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

    // 🔥 TICKET PROMEDIO
    const totalOrders = data.totalTransactions > 0 ? data.totalTransactions : 1;
    const ticketPromedio = totalIncome / totalOrders;

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
      dailySales, 
      dailyTotals: { cafeteria: sumCafeteria, pasteleria: sumPasteleria, global: sumGlobal },
      incomeSource, opexData, paymentMethods, 
      productSales: data.productSales,
      pasteleriaSales: data.pasteleriaSales,
      kpis: { totalIncome, totalOpex, totalMermas, netProfit, ticketPromedio },
      trends
    };
  }, [data]);

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

  const processedPasteleriaProducts = useMemo(() => {
    if (!chartData.pasteleriaSales) return [];
    
    let list = [...chartData.pasteleriaSales];
    list.sort((a, b) => b.cantidad - a.cantidad);

    if (productFilter === 'SOLD') {
      list = list.filter(p => p.cantidad > 0);
    } else if (productFilter !== 'ALL') {
      list = list.slice(0, parseInt(productFilter));
    }
    
    return list;
  }, [chartData.pasteleriaSales, productFilter]);

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

      // 1. HOJA DE RESUMEN
      const resumenData = [
        ['Rango de Fechas', `${format(dateRange.start, 'dd MMM yyyy')} al ${format(dateRange.end, 'dd MMM yyyy')}`],
        [],
        ['Métrica', 'Monto ($)'],
        ['Ingresos Totales', chartData.kpis.totalIncome],
        ['Ticket Promedio', chartData.kpis.ticketPromedio]
      ];

      if (isFullMonth) {
        resumenData.push(
          ['Gastos Operativos (OPEX)', chartData.kpis.totalOpex],
          ['Mermas (Kardex)', chartData.kpis.totalMermas],
          ['Utilidad Neta Aprox', chartData.kpis.netProfit]
        );
      }
      
      const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
      wsResumen['!cols'] = getAutoWidths(resumenData);
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen KPIs');

      // 2. HOJA DE INGRESOS DIARIOS
      const diariosData = chartData.dailySales.map(d => ({
        'Fecha': d.name,
        'Cafetería ($)': d.Cafetería,
        'Pastelería ($)': d.Pastelería,
        'Total del Día ($)': d.Total
      }));
      diariosData.push({
        'Fecha': 'TOTAL PERIODO',
        'Cafetería ($)': chartData.dailyTotals.cafeteria,
        'Pastelería ($)': chartData.dailyTotals.pasteleria,
        'Total del Día ($)': chartData.dailyTotals.global
      });
      const wsDiario = XLSX.utils.json_to_sheet(diariosData);
      wsDiario['!cols'] = getAutoWidths(diariosData, Object.keys(diariosData[0]));
      XLSX.utils.book_append_sheet(wb, wsDiario, 'Ingresos Diarios');

      // 3. HOJA DE MÉTODOS DE PAGO
      const pagosData = chartData.paymentMethods.map(p => ({
        'Método de Pago': p.name,
        'Ingreso ($)': p.value
      }));
      const wsPagos = XLSX.utils.json_to_sheet(pagosData);
      wsPagos['!cols'] = getAutoWidths(pagosData, Object.keys(pagosData[0]));
      XLSX.utils.book_append_sheet(wb, wsPagos, 'Métodos de Pago');

      // 4. RENDIMIENTO DE PRODUCTOS
      const productosData = processedProducts.map(p => ({
        Producto: p.name,
        Departamento: p.departamento,
        'Cantidad Vendida': p.cantidad,
        'Ingreso Bruto ($)': p.ingreso
      }));
      const wsProductos = XLSX.utils.json_to_sheet(productosData);
      if (productosData.length > 0) wsProductos['!cols'] = getAutoWidths(productosData, Object.keys(productosData[0]));
      XLSX.utils.book_append_sheet(wb, wsProductos, 'Rendimiento Cafetería');

      const pasteleriaData = processedPasteleriaProducts.map(p => ({
        Categoría: p.name,
        Departamento: p.departamento,
        'Cantidad Entregada': p.cantidad,
        'Ingreso Bruto ($)': p.ingreso
      }));
      const wsPasteleria = XLSX.utils.json_to_sheet(pasteleriaData);
      if (pasteleriaData.length > 0) wsPasteleria['!cols'] = getAutoWidths(pasteleriaData, Object.keys(pasteleriaData[0]));
      XLSX.utils.book_append_sheet(wb, wsPasteleria, 'Rendimiento Pastelería');

      // 5. GASTOS (Solo si es mes completo)
      if (isFullMonth) {
        const gastosData = chartData.opexData.map(g => ({
          Categoría: g.name,
          'Monto ($)': g.value
        }));
        const wsGastos = XLSX.utils.json_to_sheet(gastosData);
        if (gastosData.length > 0) wsGastos['!cols'] = getAutoWidths(gastosData, Object.keys(gastosData[0]));
        XLSX.utils.book_append_sheet(wb, wsGastos, 'Gastos Operativos');
      }

      XLSX.writeFile(wb, `Reporte_LyA_${format(dateRange.start, 'dd-MMM')}__al__${format(dateRange.end, 'dd-MMM-yyyy')}.xlsx`);
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

      // --- TABLA 1: KPIs FINANCIEROS ---
      const kpiBody = [
        ['Ingresos Totales', `$${chartData.kpis.totalIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`],
        ['Ticket Promedio', `$${chartData.kpis.ticketPromedio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`]
      ];

      if (isFullMonth) {
        kpiBody.push(
          ['Gastos Operativos (OPEX)', `$${chartData.kpis.totalOpex.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`],
          ['Mermas de Inventario', `$${chartData.kpis.totalMermas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`],
          ['Utilidad Neta (Aprox)', `$${chartData.kpis.netProfit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`]
        );
      }

      autoTable(doc, {
        startY: 40,
        head: [['Métrica Financiera', 'Monto ($)']],
        body: kpiBody,
        theme: 'grid',
        headStyles: { fillColor: [249, 115, 22] } 
      });

      let finalY = doc.lastAutoTable.finalY + 15;

      // --- TABLA 2: INGRESOS DIARIOS ---
      doc.setFontSize(14);
      doc.setTextColor(74, 43, 41);
      doc.text('Desglose Diario de Ingresos', 14, finalY);

      const dailyBody = chartData.dailySales.map(d => [
        d.name, 
        `$${d.Cafetería.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        `$${d.Pastelería.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        `$${d.Total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
      ]);

      dailyBody.push([
        'TOTAL PERIODO', 
        `$${chartData.dailyTotals.cafeteria.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        `$${chartData.dailyTotals.pasteleria.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        `$${chartData.dailyTotals.global.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
      ]);

      autoTable(doc, {
        startY: finalY + 5,
        head: [['Fecha', 'Cafetería', 'Pastelería', 'Total del Día']],
        body: dailyBody,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] },
        footStyles: { fillColor: [200, 200, 200], textColor: [0,0,0], fontStyle: 'bold' },
        showFoot: 'lastPage'
      });

      finalY = doc.lastAutoTable.finalY + 15;

      // --- TABLA 3: MÉTODOS DE PAGO ---
      if (finalY > 250) { doc.addPage(); finalY = 20; }
      doc.setFontSize(14);
      doc.setTextColor(74, 43, 41);
      doc.text('Ingresos por Método de Pago', 14, finalY);

      autoTable(doc, {
        startY: finalY + 5,
        head: [['Método de Pago', 'Total Recaudado']],
        body: chartData.paymentMethods.map(p => [
          p.name, `$${p.value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });

      finalY = doc.lastAutoTable.finalY + 15;

      // --- TABLA 4: PRODUCTOS CAFETERÍA ---
      if (processedProducts.length > 0) {
        if (finalY > 240) { doc.addPage(); finalY = 20; }
        doc.setFontSize(14);
        doc.setTextColor(74, 43, 41);
        
        const tituloTabla = productFilter === 'SOLD' ? 'Cafetería: Productos Vendidos' : 
                            productFilter === 'ALL' ? 'Cafetería: Catálogo Completo' : 
                            `Cafetería: Top ${productFilter} Vendidos`;

        doc.text(tituloTabla, 14, finalY);
        
        autoTable(doc, {
          startY: finalY + 5,
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
        finalY = doc.lastAutoTable.finalY + 15;
      }

      // --- TABLA 5: PRODUCTOS PASTELERÍA ---
      if (processedPasteleriaProducts.length > 0) {
        if (finalY > 240) { doc.addPage(); finalY = 20; }
        doc.setFontSize(14);
        doc.setTextColor(74, 43, 41);
        
        const tituloPasteleria = productFilter === 'SOLD' ? 'Pastelería: Entregados' : 
                            productFilter === 'ALL' ? 'Pastelería: Histórico' : 
                            `Pastelería: Top ${productFilter} Entregados`;

        doc.text(tituloPasteleria, 14, finalY);
        
        autoTable(doc, {
          startY: finalY + 5,
          head: [['Categoría', 'Depto', 'Entregados', 'Ingreso']],
          body: processedPasteleriaProducts.map(p => [
            p.name, 
            p.departamento, 
            p.cantidad, 
            `$${p.ingreso.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [139, 92, 246] } 
        });
      }

      doc.save(`Reporte_LyA_${format(dateRange.start, 'dd-MMM')}__al__${format(dateRange.end, 'dd-MMM-yyyy')}.pdf`);
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
    productFilter, 
    setProductFilter,
    isFullMonth // Lo retornamos por si en la vista ReportsPage.jsx quieres ocultar las gráficas de utilidades si no es mes completo
  };
};