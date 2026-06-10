import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, DollarSign, PackageMinus, Wallet, PieChart as PieChartIcon, Filter, Download, FileText, FileSpreadsheet, Coffee } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { useReportsController } from '../controllers/useReportsController';
import { useTheme } from '../../../hooks/useTheme';

const COLORS = {
  primary: ['#f97316', '#fb923c', '#fdba74'], 
  lya: ['#4A2B29', '#E6CCB2', '#DDB892'], 
  opex: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'], 
  opexLya: ['#4A2B29', '#DDB892', '#8A3A3A', '#4682B4', '#556B2F', '#9E6A55', '#6b7280'], 
  success: '#10b981',
  danger: '#ef4444'
};

const OPEX_TRANSLATIONS = {
  'PAYROLL': 'Nómina / Sueldos',
  'UTILITIES': 'Servicios (Luz, Agua, Gas)',
  'MAINTENANCE': 'Mantenimiento',
  'SUPPLIES': 'Artículos de Limpieza',
  'MARKETING': 'Publicidad',
  'OTHER': 'Otros Gastos',
  'NONE': 'Sin Categoría'
};

const KPICard = ({ title, amount, trend, icon: Icon, type, delay }) => {
  const isPositive = type === 'income' || (type === 'profit' && amount >= 0);
  const isNegative = type === 'expense' || (type === 'profit' && amount < 0);
  
  const isTrendGood = (type === 'income' || type === 'profit') ? trend >= 0 : trend <= 0;
  const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26, delay }}
      className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex items-center justify-between transition-colors duration-300"
    >
      <div>
        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-1 transition-colors">{title}</p>
        <h3 className={`text-2xl font-black transition-colors ${
          isPositive ? 'text-green-500 dark:text-green-400 lya:text-green-600' : 
          isNegative ? 'text-red-500 dark:text-red-400' : 
          'text-gray-900 dark:text-white lya:text-lya-text'
        }`}>
          ${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </h3>
        
        {trend !== undefined && !isNaN(trend) && (
          <div className={`mt-2 flex items-center text-xs font-black ${isTrendGood ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            <TrendIcon size={14} className="mr-1" strokeWidth={3} />
            <span>{Math.abs(trend).toFixed(1)}% <span className="text-gray-400 dark:text-gray-500 font-bold ml-1">vs anterior</span></span>
          </div>
        )}
      </div>
      <div className={`p-4 rounded-2xl transition-colors ${
        isPositive ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 lya:bg-green-100 lya:text-green-700' : 
        isNegative ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 
        'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 lya:bg-lya-primary/20 lya:text-lya-primary'
      }`}>
        <Icon size={28} />
      </div>
    </motion.div>
  );
};

const EmptyChartState = ({ message }) => (
  <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/20 lya:bg-lya-bg/30 border-2 border-dashed border-gray-200 dark:border-gray-700 lya:border-lya-border/40 rounded-2xl transition-colors">
    <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 lya:text-lya-text/20 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
    <p className="text-gray-400 dark:text-gray-500 lya:text-lya-text/40 font-bold text-sm text-center px-4">
      {message}
    </p>
  </div>
);

const ReportsSkeleton = () => (
  <motion.div 
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8"
  >
    {/* Header Skeleton */}
    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 bg-white/60 dark:bg-gray-900/60 lya:bg-lya-surface/60 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0">
      <div className="flex items-center space-x-4">
        <div className="w-14 h-14 bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/30 rounded-2xl animate-pulse" />
        <div className="space-y-2">
          <div className="w-48 h-6 bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/30 rounded-lg animate-pulse" />
          <div className="w-64 h-4 bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/30 rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="flex gap-4 w-full xl:w-auto">
        <div className="w-full sm:w-32 h-12 bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/30 rounded-xl animate-pulse" />
        <div className="w-full sm:w-64 h-12 bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/30 rounded-xl animate-pulse" />
      </div>
    </div>

    <div className="flex-1 overflow-y-auto hide-scrollbar pb-24 space-y-6 pr-1">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-white/60 dark:bg-gray-900/60 lya:bg-lya-surface/60 backdrop-blur-md rounded-3xl animate-pulse border border-gray-100 dark:border-gray-800 lya:border-lya-border/30" />
        ))}
      </div>
      
      {/* Big Chart Skeleton */}
      <div className="h-[300px] bg-white/60 dark:bg-gray-900/60 lya:bg-lya-surface/60 backdrop-blur-md rounded-3xl animate-pulse border border-gray-100 dark:border-gray-800 lya:border-lya-border/30" />
      
      {/* 3 Small Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-[300px] bg-white/60 dark:bg-gray-900/60 lya:bg-lya-surface/60 backdrop-blur-md rounded-3xl animate-pulse border border-gray-100 dark:border-gray-800 lya:border-lya-border/30" />
        ))}
      </div>
    </div>
  </motion.div>
);

export const ReportsPage = () => {
  const { theme } = useTheme();
  const { loading, dateRange, setDateRange, chartData, exportToExcel, exportToPDF } = useReportsController();
  
  const [productFilter, setProductFilter] = useState('5');

  const gridColor = theme === 'dark' ? '#374151' : theme === 'lya' ? '#E6CCB2' : '#e5e7eb';
  const textColor = theme === 'dark' ? '#9ca3af' : theme === 'lya' ? '#4A2B29' : '#6b7280';
  const getPieColors = () => theme === 'lya' ? COLORS.lya : COLORS.primary;
  const getOpexColors = () => theme === 'lya' ? COLORS.opexLya : COLORS.opex;

  const handleDateChange = (e, type) => {
    setDateRange(prev => ({
      ...prev,
      [type]: new Date(e.target.value)
    }));
  };

  // 🔥 SOLUCIÓN: Los useMemo ahora están declarados ANTES del return temprano.
  const processedProducts = useMemo(() => {
    if (!chartData?.productSales) return [];
    
    let list = [...chartData.productSales];
    list.sort((a, b) => b.cantidad - a.cantidad);

    if (productFilter === 'SOLD') {
      list = list.filter(p => p.cantidad > 0);
    } else if (productFilter !== 'ALL') {
      list = list.slice(0, parseInt(productFilter));
    }
    
    return list;
  }, [chartData?.productSales, productFilter]);

  const chartDisplayedProducts = useMemo(() => {
    return [...processedProducts].reverse();
  }, [processedProducts]);

  // 🔥 AHORA SÍ: Validamos el estado de carga
  if (loading || !chartData?.kpis) return <ReportsSkeleton />;

  const dynamicChartHeight = Math.max(300, chartDisplayedProducts.length * 35);

  const translatedOpexData = chartData?.opexData?.map(item => {
    const safeName = item.name ? item.name.toUpperCase() : 'NONE';
    return {
      ...item,
      name: OPEX_TRANSLATIONS[safeName] || item.name 
    };
  }) || [];

  const kpis = chartData?.kpis || { totalIncome: 0, netProfit: 0, totalOpex: 0, totalMermas: 0 };
  const trends = chartData?.trends || {};

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300 relative overflow-hidden"
    >
      
      {/* HEADER */}
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 z-10 relative transition-colors duration-300">
        <div className="flex items-center space-x-4">
          <div className="bg-orange-500 dark:bg-orange-600 lya:bg-lya-primary text-white lya:text-lya-surface p-3 rounded-2xl shadow-md shadow-orange-500/20 dark:shadow-orange-900/30 lya:shadow-lya-primary/20">
            <PieChartIcon size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text tracking-tight transition-colors">
              Inteligencia de Negocios
            </h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1 transition-colors">
              Análisis financiero y de ventas del periodo
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          
          <div className="flex gap-2 w-full sm:w-auto">
             <button 
                onClick={exportToPDF}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/40 px-4 py-2.5 rounded-xl transition-colors text-sm font-bold shadow-sm"
             >
                <FileText size={18} /> <span className="hidden sm:inline">Exportar PDF</span>
             </button>
             <button 
                onClick={exportToExcel}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/40 px-4 py-2.5 rounded-xl transition-colors text-sm font-bold shadow-sm"
             >
                <FileSpreadsheet size={18} /> <span className="hidden sm:inline">Exportar Excel</span>
             </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 rounded-xl px-4 py-2.5 shadow-inner transition-colors">
            <CalendarIcon size={18} className="text-gray-400 dark:text-gray-500 lya:text-lya-text/40 shrink-0" />
            <input 
              type="date" 
              value={dateRange.start.toISOString().split('T')[0]} 
              onChange={(e) => handleDateChange(e, 'start')}
              style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
              className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text outline-none cursor-pointer w-full"
            />
            <span className="text-gray-300 dark:text-gray-600 lya:text-lya-border font-bold">-</span>
            <input 
              type="date" 
              value={dateRange.end.toISOString().split('T')[0]} 
              onChange={(e) => handleDateChange(e, 'end')}
              style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
              className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text outline-none cursor-pointer w-full"
            />
          </div>
        </div>
      </header>

      {/* CONTENIDO SCROLLABLE */}
      <div className="flex-1 overflow-y-auto hide-scrollbar pb-24 space-y-6 pr-1">
        
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <KPICard title="Ingresos Totales" amount={kpis.totalIncome} trend={trends.income} icon={DollarSign} type="income" delay={0.05} />
          <KPICard title="Utilidad Neta (Aprox)" amount={kpis.netProfit} trend={trends.profit} icon={kpis.netProfit >= 0 ? TrendingUp : TrendingDown} type="profit" delay={0.1} />
          <KPICard title="Gastos (OPEX)" amount={kpis.totalOpex} trend={trends.opex} icon={Wallet} type="expense" delay={0.15} />
          <KPICard title="Mermas (Kardex)" amount={kpis.totalMermas} trend={trends.mermas} icon={PackageMinus} type="expense" delay={0.2} />
        </div>

        {/* INGRESOS DIARIOS */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.25 }}
          className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 transition-colors duration-300"
        >
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text mb-6 transition-colors">Tendencia de Ingresos Diarios</h3>
          <div className="h-[300px] w-full">
            {chartData?.dailySales?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <AreaChart data={chartData.dailySales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme === 'lya' ? '#4A2B29' : '#f97316'} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={theme === 'lya' ? '#4A2B29' : '#f97316'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="name" stroke={textColor} fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke={textColor} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: theme === 'dark' ? '#111827' : theme === 'lya' ? '#FDF8F5' : '#ffffff', borderRadius: '16px', border: `1px solid ${gridColor}`, color: textColor, fontWeight: 'bold' }}
                    itemStyle={{ color: textColor }}
                  />
                  <Area type="monotone" dataKey="Total" stroke={theme === 'lya' ? '#4A2B29' : '#f97316'} strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState message="No hay ventas registradas en este periodo" />
            )}
          </div>
        </motion.div>

        {/* PIES Y BARRAS PEQUEÑAS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.3 }} className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 transition-colors duration-300">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text mb-4 transition-colors">Ingresos por Origen</h3>
            <div className="h-[250px]">
              {chartData?.incomeSource?.some(item => item.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie data={chartData.incomeSource} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {chartData.incomeSource.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getPieColors()[index % getPieColors().length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => `$${value}`} contentStyle={{ borderRadius: '12px', border: 'none', color: '#111827' }} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', color: textColor }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState message="No hay ingresos registrados" />
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.35 }} className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 transition-colors duration-300">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text mb-4 transition-colors">Métodos de Pago</h3>
            <div className="h-[250px]">
              {chartData?.paymentMethods?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <BarChart data={chartData.paymentMethods} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false}/>
                    <XAxis dataKey="name" stroke={textColor} fontSize={12} tickLine={false} axisLine={false}/>
                    <RechartsTooltip formatter={(value) => `$${value}`} cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', color: '#111827' }}/>
                    <Bar dataKey="value" fill={theme === 'lya' ? '#E6CCB2' : '#8b5cf6'} radius={[8, 8, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState message="Sin métodos de pago registrados" />
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.4 }} className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 transition-colors duration-300">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text mb-4 transition-colors">Gastos Operativos</h3>
            <div className="h-[250px]">
               {translatedOpexData?.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <PieChart>
                      <Pie data={translatedOpexData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {translatedOpexData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getOpexColors()[index % getOpexColors().length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => `$${value}`} contentStyle={{ borderRadius: '12px', border: 'none', color: '#111827' }} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', color: textColor }} />
                    </PieChart>
                 </ResponsiveContainer>
               ) : (
                 <EmptyChartState message="No hay gastos operativos registrados" />
               )}
            </div>
          </motion.div>
        </div>

        {/* SECCIÓN DE PRODUCTOS */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.45 }}
          className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 overflow-hidden transition-colors duration-300"
        >
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/20 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div>
               <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text transition-colors">Rendimiento y Desglose del Menú</h3>
               <p className="text-xs font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1 transition-colors">Análisis visual y financiero de los productos vendidos.</p>
             </div>

             <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 rounded-xl px-4 py-2 shadow-inner w-full md:w-auto">
               <Filter size={16} className="text-gray-400" />
               <span className="text-xs font-bold text-gray-500 mr-1">Mostrar:</span>
               <select 
                  value={productFilter} 
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text outline-none cursor-pointer border-none focus:ring-0 appearance-none"
               >
                  <option value="5">Top 5 más vendidos</option>
                  <option value="10">Top 10 más vendidos</option>
                  <option value="20">Top 20 más vendidos</option>
                  <option value="50">Top 50 más vendidos</option>
                  <option value="SOLD">Solo productos vendidos</option>
                  <option value="ALL">Todo el catálogo completo</option>
               </select>
             </div>
          </div>
          
          <div className="p-6 flex flex-col gap-6">
            
            <div className="w-full border border-gray-100 dark:border-gray-800/50 lya:border-lya-border/20 rounded-2xl overflow-y-auto hide-scrollbar max-h-[400px]">
              {chartDisplayedProducts?.length > 0 ? (
                <div style={{ height: dynamicChartHeight, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <BarChart layout="vertical" data={chartDisplayedProducts} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} vertical={true}/>
                      <XAxis type="number" stroke={textColor} fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke={textColor} 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        width={140} 
                        tickFormatter={(val) => val.length > 18 ? val.substring(0, 17) + '...' : val}
                      />
                      <RechartsTooltip 
                        cursor={{fill: theme === 'dark' ? '#374151' : '#f3f4f6', opacity: 0.4}} 
                        contentStyle={{ borderRadius: '12px', border: 'none', color: '#111827' }}
                      />
                      <Bar 
                        dataKey="cantidad" 
                        name="Unidades Vendidas" 
                        fill={theme === 'lya' ? '#DDB892' : '#8b5cf6'} 
                        radius={[0, 6, 6, 0]} 
                        barSize={18} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px]">
                  <EmptyChartState message="No hay productos registrados en esta vista." />
                </div>
              )}
            </div>

            <div className="overflow-x-auto hide-scrollbar border border-gray-100 dark:border-gray-800/50 lya:border-lya-border/20 rounded-2xl max-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50 dark:bg-gray-950/50 lya:bg-lya-bg/50 sticky top-0 z-10">
                  <tr className="border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/20 text-gray-500 dark:text-gray-400 lya:text-lya-text/70 text-xs uppercase tracking-wider font-bold transition-colors">
                    <th className="p-4">Producto</th>
                    <th className="p-4 text-center">Clasificación</th>
                    <th className="p-4 text-right">Cant. Vendida</th>
                    <th className="p-4 text-right">Ingreso Bruto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 lya:divide-lya-border/10">
                  <AnimatePresence mode="popLayout">
                    {processedProducts.map((prod, index) => (
                      <motion.tr 
                        key={prod.name + index}
                        layout 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 26, delay: Math.min(index * 0.01, 0.1) }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/40 lya:hover:bg-lya-bg/40 transition-colors"
                      >
                        <td className="p-4">
                          <div className="font-bold text-sm text-gray-800 dark:text-gray-100 lya:text-lya-text flex items-center gap-2 transition-colors">
                            {prod.cantidad === 0 && <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" title="Sin rotación"></span>}
                            {index + 1}. {prod.name}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-gray-100 dark:bg-gray-800 lya:bg-lya-border/20 text-gray-600 dark:text-gray-400 lya:text-lya-text/70 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors">
                            {prod.departamento}
                          </span>
                        </td>
                        <td className="p-4 text-right font-black text-base text-gray-900 dark:text-white lya:text-lya-text transition-colors">
                          {prod.cantidad}
                        </td>
                        <td className="p-4 text-right">
                          <span className={`font-black transition-colors ${prod.ingreso > 0 ? 'text-emerald-600 dark:text-emerald-400 lya:text-lya-secondary' : 'text-gray-400 dark:text-gray-600'}`}>
                            ${prod.ingreso.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

          </div>
        </motion.div>

      </div>
    </motion.div>
  );
};

export default ReportsPage;