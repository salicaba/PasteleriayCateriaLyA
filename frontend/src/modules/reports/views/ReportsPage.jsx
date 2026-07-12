import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, TrendingUp, TrendingDown, DollarSign, 
  PackageMinus, Wallet, PieChart as PieChartIcon, Filter, 
  FileText, FileSpreadsheet, ChevronDown, Search, Loader2 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { useReportsController } from '../controllers/useReportsController';
import { useTheme } from '../../../hooks/useTheme';

const COLORS = {
  primary: ['#f97316', '#8b5cf6', '#10b981', '#0ea5e9'], 
  lya: ['#4A2B29', '#8A3A3A', '#DDB892', '#556B2F'],     
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
  'REFUND': 'Reembolsos / Devoluciones',
  'NONE': 'Sin Categoría'
};

const ThemedDropdown = ({ value, onChange, options, icon: Icon, containerClassName, buttonClassName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className={`relative ${containerClassName}`} ref={dropdownRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center text-sm font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text outline-none cursor-pointer w-full transition-colors md:hover:scale-[1.02] active:scale-95 ${buttonClassName}`}
      >
        <div className="flex items-center truncate">
          {Icon && <Icon size={16} className="text-gray-400 dark:text-gray-500 lya:text-lya-primary mr-2 shrink-0" />}
          <span className="truncate">{selected?.label}</span>
        </div>
        <ChevronDown size={14} className={`text-gray-400 dark:text-gray-500 ml-2 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 top-full mt-2 left-0 min-w-[200px] w-full bg-white dark:bg-gray-800 lya:bg-lya-surface border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 rounded-xl shadow-lg shadow-black/5 dark:shadow-black/20 overflow-hidden py-1"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${
                  value === opt.value 
                    ? 'bg-orange-50 dark:bg-gray-700 lya:bg-lya-primary/10 text-orange-600 dark:text-white lya:text-lya-primary' 
                    : 'text-gray-600 dark:text-gray-300 lya:text-lya-text hover:bg-gray-50 dark:hover:bg-gray-700/50 lya:hover:bg-lya-bg/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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
      className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl md:hover:shadow-lg md:hover:-translate-y-1 shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex items-center justify-between transition-all duration-300"
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
      <div className={`p-4 rounded-[1.2rem] transition-colors ${
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
  <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/20 lya:bg-lya-bg/30 border-2 border-dashed border-gray-200 dark:border-gray-700 lya:border-lya-border/40 rounded-[2rem] transition-colors">
    <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 lya:text-lya-text/20 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
    <p className="text-gray-400 dark:text-gray-500 lya:text-lya-text/40 font-bold text-sm text-center px-4">
      {message}
    </p>
  </div>
);

export const ReportsPage = () => {
  const { theme } = useTheme();
  const { loading, dateRange, setDateRange, chartData, exportToExcel, exportToPDF, productFilter, setProductFilter } = useReportsController();
  
  // Neo-Bento UI States
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState('this_month');
  
  // Segmented Control State (Cafeteria vs Pasteleria)
  const [activeTab, setActiveTab] = useState('CAFETERIA');

  const gridColor = theme === 'dark' ? '#374151' : theme === 'lya' ? '#E6CCB2' : '#e5e7eb';
  const textColor = theme === 'dark' ? '#9ca3af' : theme === 'lya' ? '#4A2B29' : '#6b7280';
  const getPieColors = () => theme === 'lya' ? COLORS.lya : COLORS.primary;
  const getOpexColors = () => theme === 'lya' ? COLORS.opexLya : COLORS.opex;

  const handleRangeChange = (val) => {
    setTimeRange(val);
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch(val) {
      case 'today':
        start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); break;
      case 'yesterday':
        start.setDate(now.getDate() - 1); start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1); end.setHours(23, 59, 59, 999); break;
      case 'this_week':
        const firstDay = now.getDate() - now.getDay();
        start.setDate(firstDay); start.setHours(0, 0, 0, 0);
        end.setDate(firstDay + 6); end.setHours(23, 59, 59, 999); break;
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999); break;
      case 'custom':
        return; 
      default: break;
    }
    setDateRange({ start, end });
  };

  const handleDateChange = (e, type) => {
    setTimeRange('custom');
    setDateRange(prev => ({
      ...prev,
      [type]: new Date(e.target.value)
    }));
  };

  // Memoizado y Aislado: Lógica para Filtros de Cafetería
  const processedCafeteriaView = useMemo(() => {
    if (!chartData?.productSales) return [];
    let list = [...chartData.productSales];
    
    if (searchTerm) {
      list = list.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    list.sort((a, b) => b.cantidad - a.cantidad);
    
    if (productFilter === 'SOLD') {
      list = list.filter(p => p.cantidad > 0);
    } else if (productFilter !== 'ALL') {
      list = list.slice(0, parseInt(productFilter));
    }
    return list;
  }, [chartData?.productSales, productFilter, searchTerm]);

  // Memoizado y Aislado: Lógica para Filtros de Pastelería
  const processedPasteleriaView = useMemo(() => {
    if (!chartData?.pasteleriaSales) return [];
    let list = [...chartData.pasteleriaSales];
    
    if (searchTerm) {
      list = list.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    list.sort((a, b) => b.cantidad - a.cantidad);
    
    if (productFilter === 'SOLD') {
      list = list.filter(p => p.cantidad > 0);
    } else if (productFilter !== 'ALL') {
      list = list.slice(0, parseInt(productFilter));
    }
    return list;
  }, [chartData?.pasteleriaSales, productFilter, searchTerm]);

  // Renderizado Condicional del Segmented Control
  const currentViewProducts = activeTab === 'CAFETERIA' ? processedCafeteriaView : processedPasteleriaView;
  const currentChartProducts = [...currentViewProducts].reverse();

  if (loading || !chartData?.kpis) {
    return (
      <div className="h-full w-full flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg overflow-hidden">
        <motion.div
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-24 h-24 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-800"
        >
          <PieChartIcon size={40} className="text-orange-500" />
        </motion.div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">
          Cargando Inteligencia de Negocios
        </h2>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-orange-500" /> Analizando datos financieros...
        </p>
      </div>
    );
  }

  const dynamicChartHeight = Math.max(300, currentChartProducts.length * 35);

  const translatedOpexData = chartData?.opexData?.map(item => {
    const safeName = item.name ? item.name.toUpperCase() : 'NONE';
    return { ...item, name: OPEX_TRANSLATIONS[safeName] || item.name };
  }) || [];

  const kpis = chartData?.kpis || { totalIncome: 0, netProfit: 0, totalOpex: 0, totalMermas: 0 };
  const trends = chartData?.trends || {};

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="h-full w-full flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300 relative overflow-hidden"
    >
      
      {/* HEADER */}
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 z-20 relative transition-colors duration-300">
        <div className="flex items-center space-x-4">
          <div className="bg-orange-500 dark:bg-orange-600 lya:bg-lya-primary text-white lya:text-lya-surface p-3 rounded-2xl shadow-md shadow-orange-500/20 dark:shadow-orange-900/30 lya:shadow-lya-primary/20">
            <PieChartIcon size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text tracking-tight transition-colors">
              Inteligencia de Negocios
            </h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1 transition-colors text-justify">
              Análisis financiero y de ventas del periodo actual.
            </p>
          </div>
        </div>
        
        <div className="flex flex-col xl:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="flex gap-2 w-full sm:w-auto">
             <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={exportToPDF}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 md:hover:scale-105 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/40 px-4 py-2.5 rounded-xl transition-all text-sm font-bold shadow-sm"
             >
                <FileText size={18} /> <span className="hidden xl:inline">Exportar PDF</span>
             </motion.button>
             <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={exportToExcel}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 md:hover:scale-105 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/40 px-4 py-2.5 rounded-xl transition-all text-sm font-bold shadow-sm"
             >
                <FileSpreadsheet size={18} /> <span className="hidden xl:inline">Exportar Excel</span>
             </motion.button>
          </div>

          <div className="flex flex-col sm:flex-row items-center bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 rounded-xl px-1 py-1 shadow-inner transition-colors w-full sm:w-auto">
            <ThemedDropdown
              value={timeRange}
              onChange={handleRangeChange}
              icon={CalendarIcon}
              options={[
                { value: 'today', label: 'Hoy' },
                { value: 'yesterday', label: 'Ayer' },
                { value: 'this_week', label: 'Esta Semana' },
                { value: 'this_month', label: 'Este Mes' },
                { value: 'last_month', label: 'Mes Anterior' },
                { value: 'custom', label: 'Personalizado...' }
              ]}
              containerClassName="px-2 py-1.5 min-w-[170px]"
              buttonClassName="justify-between"
            />
            <AnimatePresence>
              {timeRange === 'custom' && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex items-center overflow-hidden whitespace-nowrap mt-2 sm:mt-0 pb-2 sm:pb-0 px-2 sm:px-0"
                >
                  <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 lya:bg-lya-border/40 mx-2 hidden sm:block"></div>
                  <input 
                    type="date" 
                    value={dateRange.start.toISOString().split('T')[0]} 
                    onChange={(e) => handleDateChange(e, 'start')}
                    style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                    className="bg-transparent text-xs font-bold text-gray-600 dark:text-gray-300 lya:text-lya-text/80 outline-none cursor-pointer w-[110px]"
                  />
                  <span className="text-gray-300 dark:text-gray-600 mx-1">-</span>
                  <input 
                    type="date" 
                    value={dateRange.end.toISOString().split('T')[0]} 
                    onChange={(e) => handleDateChange(e, 'end')}
                    style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                    className="bg-transparent text-xs font-bold text-gray-600 dark:text-gray-300 lya:text-lya-text/80 outline-none cursor-pointer w-[110px]"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* CONTENIDO SCROLLABLE */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 space-y-6 pr-1 z-10">
        
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <KPICard title="Ingresos Totales" amount={kpis.totalIncome} trend={trends.income} icon={DollarSign} type="income" delay={0.05} />
          <KPICard title="Utilidad Neta (Aprox)" amount={kpis.netProfit} trend={trends.profit} icon={kpis.netProfit >= 0 ? TrendingUp : TrendingDown} type="profit" delay={0.1} />
          <KPICard title="Gastos Operativos" amount={kpis.totalOpex} trend={trends.opex} icon={Wallet} type="expense" delay={0.15} />
          <KPICard title="Mermas (Kardex)" amount={kpis.totalMermas} trend={trends.mermas} icon={PackageMinus} type="expense" delay={0.2} />
        </div>

        {/* INGRESOS DIARIOS */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.25 }}
          className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 transition-colors duration-300"
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
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.3 }} className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 transition-colors duration-300">
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

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.35 }} className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 transition-colors duration-300">
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

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.4 }} className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 transition-colors duration-300">
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

        {/* SECCIÓN NEO-BENTO DE PRODUCTOS Y PASTELERIA */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.45 }}
          className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 overflow-hidden transition-colors duration-300 relative"
        >
          {/* Elemento Decorativo Neo-Bento */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 dark:bg-orange-500/10 lya:bg-lya-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transition-colors"></div>

          {/* Header Rendimiento con Segmented Control */}
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/20 transition-colors flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text flex items-center gap-3 transition-colors">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 lya:bg-lya-primary/20 rounded-xl transition-colors">
                  <PackageMinus className="w-5 h-5 text-orange-600 dark:text-orange-400 lya:text-lya-primary" />
                </div>
                Rendimiento y Desglose del Menú
              </h3>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-2 transition-colors text-justify">
                Análisis visual y financiero del movimiento de productos (Cafetería) y Pedidos Finalizados (Pastelería).
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
              
              {/* SEGMENTED CONTROL (TABS) */}
              <div className="flex bg-gray-100 dark:bg-gray-800/50 lya:bg-lya-bg/50 p-1 rounded-xl w-full sm:w-auto shrink-0 shadow-inner">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab('CAFETERIA')}
                  className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 md:hover:scale-[1.02] ${
                    activeTab === 'CAFETERIA'
                      ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface text-gray-900 dark:text-white lya:text-lya-primary shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Cafetería
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab('PASTELERIA')}
                  className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 md:hover:scale-[1.02] ${
                    activeTab === 'PASTELERIA'
                      ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface text-gray-900 dark:text-white lya:text-lya-primary shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Pastelería
                </motion.button>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center w-full sm:w-auto gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 md:hover:scale-105 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 lya:bg-lya-bg lya:hover:bg-lya-bg/80 text-gray-700 dark:text-gray-200 lya:text-lya-text border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-orange-500/50 lya:focus:ring-lya-primary/50 outline-none"
              >
                <Filter className="w-4 h-4 text-orange-500 dark:text-orange-400 lya:text-lya-primary" />
                {showFilters ? 'Ocultar Filtros' : 'Filtros y Búsqueda'}
                <motion.div animate={{ rotate: showFilters ? 180 : 0 }} transition={{ duration: 0.3 }}>
                  <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </motion.div>
              </motion.button>
            </div>
          </div>

          {/* Panel Desplegable de Filtros */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/20 bg-gray-50/50 dark:bg-gray-950/30 lya:bg-lya-bg/30 relative z-20"
              >
                <div className="p-6 flex flex-wrap gap-4 relative z-10">
                  {/* Buscador de Texto */}
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-2 uppercase tracking-wider">
                      Buscar {activeTab === 'CAFETERIA' ? 'producto' : 'categoría'}
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={activeTab === 'CAFETERIA' ? "Ej. Frappé..." : "Ej. Pastel de Bodas..."}
                        className="w-full bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-800 dark:text-white lya:text-lya-text focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 lya:focus:border-lya-primary focus:ring-1 focus:ring-orange-500 lya:focus:ring-lya-primary transition-all shadow-sm font-medium"
                      />
                    </div>
                  </div>

                  {/* Filtro Select (Top N) con Componente Tematizado */}
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-2 uppercase tracking-wider">
                      Clasificación / Rango
                    </label>
                    <ThemedDropdown
                      value={productFilter}
                      onChange={setProductFilter}
                      icon={Filter}
                      options={[
                        { value: '5', label: 'Top 5 más vendidos' },
                        { value: '10', label: 'Top 10 más vendidos' },
                        { value: '20', label: 'Top 20 más vendidos' },
                        { value: '50', label: 'Top 50 más vendidos' },
                        { value: 'SOLD', label: 'Solo elementos con ventas' },
                        { value: 'ALL', label: 'Todo el catálogo histórico' }
                      ]}
                      containerClassName="w-full relative z-30"
                      buttonClassName="w-full justify-between bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 rounded-xl px-4 py-2.5 focus:border-orange-500 dark:focus:border-orange-400 lya:focus:border-lya-primary focus:ring-1 focus:ring-orange-500 lya:focus:ring-lya-primary shadow-sm"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="p-6 flex flex-col gap-6 relative z-10">
            {/* Gráfica de Barras Horizontal */}
            <div className="w-full border border-gray-100 dark:border-gray-800/50 lya:border-lya-border/20 rounded-[2rem] overflow-y-auto custom-scrollbar max-h-[400px]">
              {currentChartProducts?.length > 0 ? (
                <div style={{ height: dynamicChartHeight, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <BarChart layout="vertical" data={currentChartProducts} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
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
                        cursor={{fill: theme === 'dark' ? '#374151' : theme === 'lya' ? '#E6CCB2' : '#f3f4f6', opacity: 0.4}} 
                        contentStyle={{ borderRadius: '16px', border: 'none', color: '#111827' }}
                      />
                      <Bar 
                        dataKey="cantidad" 
                        name={activeTab === 'CAFETERIA' ? "Unidades Vendidas" : "Entregas Exitosas"} 
                        fill={activeTab === 'CAFETERIA' ? (theme === 'lya' ? '#DDB892' : '#f97316') : (theme === 'lya' ? '#8A3A3A' : '#8b5cf6')} 
                        radius={[0, 6, 6, 0]} 
                        barSize={18} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px]">
                  <EmptyChartState message="No hay resultados para la vista seleccionada." />
                </div>
              )}
            </div>

            {/* Tabla Detallada */}
            <div className="overflow-x-auto custom-scrollbar border border-gray-100 dark:border-gray-800/50 lya:border-lya-border/20 rounded-2xl max-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50 dark:bg-gray-950/50 lya:bg-lya-bg/50 sticky top-0 z-10 backdrop-blur-md">
                  <tr className="border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/20 text-gray-500 dark:text-gray-400 lya:text-lya-text/70 text-xs uppercase tracking-wider font-bold transition-colors">
                    <th className="p-4">{activeTab === 'CAFETERIA' ? 'Producto' : 'Categoría (Pastelería)'}</th>
                    <th className="p-4 text-center">Clasificación</th>
                    <th className="p-4 text-right">{activeTab === 'CAFETERIA' ? 'Cant. Vendida' : 'Entregados'}</th>
                    <th className="p-4 text-right">Ingreso Bruto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 lya:divide-lya-border/10">
                  <AnimatePresence mode="popLayout">
                    {currentViewProducts.map((prod, index) => (
                      <motion.tr 
                        key={prod.name + index}
                        layout 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 26, delay: Math.min(index * 0.01, 0.1) }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/40 lya:hover:bg-lya-bg/40 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 transition-colors ${activeTab === 'CAFETERIA' ? 'bg-orange-100 dark:bg-orange-900/30 lya:bg-lya-primary/20 text-orange-600 dark:text-orange-400 lya:text-lya-primary' : 'bg-purple-100 dark:bg-purple-900/30 lya:bg-[#8A3A3A]/20 text-purple-600 dark:text-purple-400 lya:text-[#8A3A3A]'}`}>
                              {prod.name.charAt(0)}
                            </div>
                            <div className="font-bold text-sm text-gray-800 dark:text-gray-100 lya:text-lya-text flex items-center gap-2 transition-colors line-clamp-2">
                              {prod.cantidad === 0 && <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" title="Sin rotación"></span>}
                              {index + 1}. {prod.name}
                            </div>
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