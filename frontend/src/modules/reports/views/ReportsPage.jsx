import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, DollarSign, PackageMinus, Wallet, PieChart as PieChartIcon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { useReportsController } from '../controllers/useReportsController';
import { useTheme } from '../../../hooks/useTheme';

// Paleta de colores adaptativa
const COLORS = {
  primary: ['#f97316', '#fb923c', '#fdba74'], // Naranjas
  lya: ['#4A2B29', '#E6CCB2', '#DDB892'], // Corporativo LyA
  opex: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'], // Rojo, Azul, Verde, Ambar, Morado, Rosa, Cyan
  opexLya: ['#4A2B29', '#DDB892', '#8A3A3A', '#4682B4', '#556B2F', '#9E6A55', '#6b7280'], // Vino, Beige, Rojo Ladrillo, Azul Acero, Verde Olivo, Terracota, Gris Oscuro
  success: '#10b981',
  danger: '#ef4444'
};

// Diccionario sincronizado EXACTAMENTE con tu ExpensesPage.jsx y la BD
const OPEX_TRANSLATIONS = {
  'PAYROLL': 'Nómina / Sueldos',
  'UTILITIES': 'Servicios (Luz, Agua, Gas)',
  'MAINTENANCE': 'Mantenimiento',
  'SUPPLIES': 'Artículos de Limpieza',
  'MARKETING': 'Publicidad',
  'OTHER': 'Otros Gastos',
  'NONE': 'Sin Categoría'
};

// KPICard extraída y animada
const KPICard = ({ title, amount, icon: Icon, type, delay }) => {
  const isPositive = type === 'income' || (type === 'profit' && amount >= 0);
  const isNegative = type === 'expense' || (type === 'profit' && amount < 0);
  
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

export const ReportsPage = () => {
  const { theme } = useTheme();
  const { loading, dateRange, setDateRange, chartData } = useReportsController();

  // Adaptación de colores
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

  if (loading || !chartData.kpis) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg transition-colors duration-300">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Traducción OPEX
  const translatedOpexData = chartData.opexData?.map(item => {
    const safeName = item.name ? item.name.toUpperCase() : 'NONE';
    return {
      ...item,
      name: OPEX_TRANSLATIONS[safeName] || item.name 
    };
  }) || [];

  // 🔥 TODOS los productos
  const allProductsChart = chartData.productSales || [];
  // Calculamos una altura dinámica: 35px por cada producto, mínimo 300px
  const dynamicChartHeight = Math.max(300, allProductsChart.length * 35);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300 relative overflow-hidden"
    >
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 z-10 relative transition-colors duration-300">
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
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-3 w-full sm:w-auto bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 rounded-xl px-4 py-2.5 shadow-inner transition-colors">
            <CalendarIcon size={18} className="text-gray-400 dark:text-gray-500 lya:text-lya-text/40" />
            <input 
              type="date" 
              value={dateRange.start.toISOString().split('T')[0]} 
              onChange={(e) => handleDateChange(e, 'start')}
              style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
              className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text outline-none cursor-pointer"
            />
            <span className="text-gray-300 dark:text-gray-600 lya:text-lya-border font-bold">-</span>
            <input 
              type="date" 
              value={dateRange.end.toISOString().split('T')[0]} 
              onChange={(e) => handleDateChange(e, 'end')}
              style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
              className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text outline-none cursor-pointer"
            />
          </div>
        </div>
      </header>

      {/* CONTENIDO SCROLLABLE */}
      <div className="flex-1 overflow-y-auto hide-scrollbar pb-24 space-y-6 pr-1">
        
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <KPICard title="Ingresos Totales" amount={chartData.kpis.totalIncome} icon={DollarSign} type="income" delay={0.05} />
          <KPICard title="Utilidad Neta (Aprox)" amount={chartData.kpis.netProfit} icon={chartData.kpis.netProfit >= 0 ? TrendingUp : TrendingDown} type="profit" delay={0.1} />
          <KPICard title="Gastos (OPEX)" amount={chartData.kpis.totalOpex} icon={Wallet} type="expense" delay={0.15} />
          <KPICard title="Mermas (Kardex)" amount={chartData.kpis.totalMermas} icon={PackageMinus} type="expense" delay={0.2} />
        </div>

        {/* INGRESOS DIARIOS */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.25 }}
          className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 transition-colors duration-300"
        >
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text mb-6 transition-colors">Tendencia de Ingresos Diarios</h3>
          <div className="h-[300px] w-full">
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
          </div>
        </motion.div>

        {/* PIES Y BARRAS PEQUEÑAS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.3 }} className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 transition-colors duration-300">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text mb-4 transition-colors">Ingresos por Origen</h3>
            <div className="h-[250px]">
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
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.35 }} className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 transition-colors duration-300">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text mb-4 transition-colors">Métodos de Pago</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={chartData.paymentMethods} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false}/>
                  <XAxis dataKey="name" stroke={textColor} fontSize={12} tickLine={false} axisLine={false}/>
                  <RechartsTooltip formatter={(value) => `$${value}`} cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', color: '#111827' }}/>
                  <Bar dataKey="value" fill={theme === 'lya' ? '#E6CCB2' : '#8b5cf6'} radius={[8, 8, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.4 }} className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 transition-colors duration-300">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text mb-4 transition-colors">Gastos Operativos</h3>
            <div className="h-[250px]">
               {translatedOpexData.length > 0 ? (
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
                  <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 font-bold text-sm transition-colors">
                    Sin gastos registrados
                  </div>
               )}
            </div>
          </motion.div>
        </div>

        {/* 🔥 GRÁFICA DE RENDIMIENTO DE TODOS LOS PRODUCTOS (CON SCROLL DINÁMICO) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.45 }}
          className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 transition-colors duration-300"
        >
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text transition-colors">Rendimiento Gráfico del Menú</h3>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1 transition-colors">
              Representación visual de todas las ventas ordenadas por unidades (incluye productos sin movimiento).
            </p>
          </div>
          
          <div className="w-full border border-gray-100 dark:border-gray-800/50 lya:border-lya-border/20 rounded-2xl overflow-y-auto hide-scrollbar max-h-[500px]">
            {allProductsChart.length > 0 ? (
              <div style={{ height: dynamicChartHeight, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <BarChart layout="vertical" data={allProductsChart} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
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
              <div className="h-[300px] flex items-center justify-center text-gray-400 dark:text-gray-500 font-bold text-sm transition-colors">
                No hay productos registrados en el menú.
              </div>
            )}
          </div>
        </motion.div>

        {/* TABLA DE RENDIMIENTO COMPLETO (Se mantiene por si quieres ver el $ exacto) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.50 }} 
          className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 overflow-hidden transition-colors duration-300"
        >
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/20 transition-colors">
             <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text transition-colors">Desglose Financiero del Menú</h3>
             <p className="text-xs font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1 transition-colors">Detalle monetario exacto por artículo.</p>
          </div>
          
          <div className="overflow-x-auto hide-scrollbar max-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50 dark:bg-gray-950/50 lya:bg-lya-bg/50 sticky top-0 z-10">
                <tr className="border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/20 text-gray-500 dark:text-gray-400 lya:text-lya-text/70 text-xs uppercase tracking-wider font-bold transition-colors">
                  <th className="p-5">Producto</th>
                  <th className="p-5">Departamento</th>
                  <th className="p-5 text-right">Cantidad</th>
                  <th className="p-5 text-right">Ingreso Generado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 lya:divide-lya-border/10">
                <AnimatePresence mode="popLayout">
                  {chartData.productSales.map((prod, index) => (
                    <motion.tr 
                      key={prod.name + index}
                      layout 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 26, delay: Math.min(index * 0.02, 0.2) }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/40 lya:hover:bg-lya-bg/40 transition-colors"
                    >
                      <td className="p-5">
                        <div className="font-bold text-sm text-gray-800 dark:text-gray-100 lya:text-lya-text flex items-center gap-2 transition-colors">
                          {prod.cantidad === 0 && <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" title="Sin rotación"></span>}
                          {prod.name}
                        </div>
                      </td>
                      <td className="p-5">
                        <span className="bg-gray-100 dark:bg-gray-800 lya:bg-lya-border/20 text-gray-600 dark:text-gray-400 lya:text-lya-text/70 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors">
                          {prod.departamento}
                        </span>
                      </td>
                      <td className="p-5 text-right font-black text-lg text-gray-900 dark:text-white lya:text-lya-text transition-colors">
                        {prod.cantidad}
                      </td>
                      <td className="p-5 text-right">
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
        </motion.div>

      </div>
    </motion.div>
  );
};

export default ReportsPage;