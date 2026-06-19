import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFinanceController } from '../controllers/useFinanceController';
import { TrendingUp, TrendingDown, DollarSign, Wallet, AlertCircle, Calendar, ChevronDown } from 'lucide-react';

/* ==========================================
   COMPONENTE SELECTOR 100% TEMATIZADO (Finanzas)
   ========================================== */
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
        className={`flex items-center text-sm font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text outline-none cursor-pointer w-full transition-colors ${buttonClassName}`}
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
                    ? 'bg-emerald-50 dark:bg-gray-700 lya:bg-lya-primary/10 text-emerald-600 dark:text-white lya:text-lya-primary' 
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

export const NetProfitDashboard = () => {
  const { summary, isSummaryLoading, fetchFinancialSummary } = useFinanceController();
  
  // Función auxiliar para evitar problemas de zona horaria al formatear fechas
  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return formatLocalDate(new Date(d.getFullYear(), d.getMonth(), 1));
  });
  
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return formatLocalDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  });

  // Estado del selector premium
  const [timeRange, setTimeRange] = useState('this_month');

  useEffect(() => {
    fetchFinancialSummary(startDate, endDate);
  }, [startDate, endDate, fetchFinancialSummary]);

  // Lógica de cambio de rango
  const handleRangeChange = (val) => {
    setTimeRange(val);

    const now = new Date();
    let start, end;

    switch(val) {
      case 'today':
        start = new Date(now);
        end = new Date(now);
        break;
      case 'yesterday':
        start = new Date(now);
        start.setDate(start.getDate() - 1);
        end = new Date(start);
        break;
      case 'this_week':
        start = new Date(now);
        const firstDay = start.getDate() - start.getDay();
        start.setDate(firstDay);
        end = new Date(start);
        end.setDate(firstDay + 6);
        break;
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'custom':
        return; // Mantiene las fechas actuales si se elige personalizado
      default:
        return;
    }

    setStartDate(formatLocalDate(start));
    setEndDate(formatLocalDate(end));
  };

  const handleCustomDateChange = (val, type) => {
    setTimeRange('custom');
    if (type === 'start') setStartDate(val);
    if (type === 'end') setEndDate(val);
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  // Solo inyectar el modo de color si es necesario (el input type=date usa colorScheme)
  const isDarkMode = document.documentElement.classList.contains('dark');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300"
    >
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-8 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 z-10 relative transition-colors">
        <div className="flex items-center space-x-4">
          <div className="bg-emerald-500 dark:bg-emerald-600 lya:bg-lya-primary text-white lya:text-lya-surface p-3 rounded-2xl shadow-md shadow-emerald-500/20 dark:shadow-emerald-900/30 lya:shadow-lya-primary/20">
            <DollarSign size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text tracking-tight transition-colors">Estado de Resultados</h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1 transition-colors">Análisis de Utilidad Neta y Costos del Negocio.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          
          {/* Selector de Fechas Premium (Neo-Bento) */}
          <div className="flex flex-col sm:flex-row items-center bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 rounded-xl px-1 py-1 shadow-inner transition-colors w-full sm:w-auto">
            
            <ThemedDropdown
              value={timeRange}
              onChange={handleRangeChange}
              icon={Calendar}
              options={[
                { value: 'today', label: 'Hoy' },
                { value: 'yesterday', label: 'Ayer' },
                { value: 'this_week', label: 'Esta Semana' },
                { value: 'this_month', label: 'Este Mes' },
                { value: 'last_month', label: 'Mes Anterior' },
                { value: 'custom', label: 'Personalizado...' }
              ]}
              containerClassName="px-2 py-1.5 min-w-[170px] w-full sm:w-auto"
              buttonClassName="justify-between"
            />

            {/* Inputs manuales (Solo se ven si elige "Personalizado") */}
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
                    value={startDate} 
                    onChange={(e) => handleCustomDateChange(e.target.value, 'start')}
                    style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                    className="bg-transparent text-xs font-bold text-gray-600 dark:text-gray-300 lya:text-lya-text/80 outline-none cursor-pointer w-[110px]"
                  />
                  <span className="text-gray-300 dark:text-gray-600 mx-1">-</span>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => handleCustomDateChange(e.target.value, 'end')}
                    style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                    className="bg-transparent text-xs font-bold text-gray-600 dark:text-gray-300 lya:text-lya-text/80 outline-none cursor-pointer w-[110px]"
                  />
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
        {isSummaryLoading || !summary ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center gap-4 opacity-50">
              <Wallet className="w-16 h-16 text-emerald-500 dark:text-emerald-600 lya:text-lya-primary transition-colors" />
              <p className="text-lg font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60">Calculando finanzas...</p>
            </div>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="max-w-4xl mx-auto w-full space-y-6"
          >
            {/* PASO 1: INGRESOS BRUTOS */}
            <motion.div variants={itemVariants} className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 md:p-8 rounded-3xl shadow-sm border-2 border-emerald-100 dark:border-emerald-900/30 lya:border-lya-primary/30 relative overflow-hidden transition-colors">
              <div className="absolute -right-10 -top-10 text-emerald-50 dark:text-emerald-900/10 lya:text-lya-primary/5 rotate-12 pointer-events-none transition-colors">
                <TrendingUp size={200} />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="text-emerald-600 dark:text-emerald-400 lya:text-lya-primary font-black text-[11px] uppercase tracking-widest mb-2 flex items-center gap-2 transition-colors">
                    <TrendingUp size={16} /> Ingresos Brutos
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-xs font-bold transition-colors">Total de ventas cobradas en Caja y Pastelería</p>
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-emerald-600 dark:text-emerald-400 lya:text-lya-primary transition-colors">
                  {formatMoney(summary.totalIncome)}
                </h2>
              </div>
            </motion.div>

            {/* FLECHA DE DESCUENTO */}
            <motion.div variants={itemVariants} className="flex justify-center -my-2 relative z-20">
              <div className="bg-red-50 dark:bg-red-900/20 lya:bg-lya-secondary/10 text-red-500 dark:text-red-400 lya:text-lya-secondary border border-red-100 dark:border-red-900/30 lya:border-lya-secondary/20 px-5 py-2 rounded-full text-xs font-black flex items-center gap-2 shadow-sm transition-colors">
                <TrendingDown size={16} /> MENOS
              </div>
            </motion.div>

            {/* PASO 2: COSTO DE VENTAS (COGS) */}
            <motion.div variants={itemVariants} className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 w-11/12 mx-auto transition-colors">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="text-gray-800 dark:text-gray-200 lya:text-lya-text font-black text-[11px] uppercase tracking-widest mb-2 transition-colors">
                    Costo de Ventas (COGS)
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-xs font-bold flex items-center gap-1 transition-colors">
                    <AlertCircle size={14} /> Valor de insumos consumidos (Calculado por Arqueos)
                  </p>
                </div>
                <h3 className="text-3xl font-bold text-gray-800 dark:text-white lya:text-lya-text transition-colors">
                  - {formatMoney(summary.totalCogs)}
                </h3>
              </div>
            </motion.div>

            {/* UTILIDAD BRUTA (Subtotal) */}
            <motion.div variants={itemVariants} className="bg-blue-50 dark:bg-blue-900/10 lya:bg-lya-primary/10 p-6 md:p-8 rounded-3xl border border-blue-100 dark:border-blue-900/30 lya:border-lya-primary/20 w-10/12 mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-2 transition-colors">
              <p className="text-blue-600 dark:text-blue-400 lya:text-lya-primary font-black uppercase text-[11px] tracking-widest transition-colors">Utilidad Bruta</p>
              <p className="text-blue-600 dark:text-blue-400 lya:text-lya-primary font-black text-2xl md:text-3xl transition-colors">{formatMoney(summary.grossProfit)}</p>
            </motion.div>

            {/* FLECHA DE DESCUENTO 2 */}
            <motion.div variants={itemVariants} className="flex justify-center -my-2 relative z-20">
              <div className="bg-red-50 dark:bg-red-900/20 lya:bg-lya-secondary/10 text-red-500 dark:text-red-400 lya:text-lya-secondary border border-red-100 dark:border-red-900/30 lya:border-lya-secondary/20 px-5 py-2 rounded-full text-xs font-black flex items-center gap-2 shadow-sm transition-colors">
                <TrendingDown size={16} /> MENOS
              </div>
            </motion.div>

            {/* PASO 3: GASTOS OPERATIVOS (OPEX) */}
            <motion.div variants={itemVariants} className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 w-11/12 mx-auto transition-colors">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="text-gray-800 dark:text-gray-200 lya:text-lya-text font-black text-[11px] uppercase tracking-widest mb-2 transition-colors">
                    Gastos Operativos (OPEX)
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-xs font-bold flex items-center gap-1 transition-colors">
                    <AlertCircle size={14} /> Luz, Sueldos, Limpieza (Registrados manualmente)
                  </p>
                </div>
                <h3 className="text-3xl font-bold text-gray-800 dark:text-white lya:text-lya-text transition-colors">
                  - {formatMoney(summary.totalOpex)}
                </h3>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="w-full h-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 lya:via-lya-border/50 to-transparent my-6 transition-colors" />

            {/* RESULTADO FINAL: UTILIDAD NETA */}
            <motion.div variants={itemVariants} className="bg-gray-900 dark:bg-black lya:bg-lya-primary p-8 md:p-12 rounded-[2rem] shadow-2xl relative overflow-hidden transform hover:scale-[1.02] transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 dark:from-yellow-400/10 lya:from-white/20 to-transparent opacity-50 pointer-events-none transition-colors" />
              <div className="relative z-10 flex flex-col items-center text-center">
                <p className="text-yellow-400 dark:text-yellow-300 lya:text-lya-surface font-black text-xs md:text-sm uppercase tracking-[0.3em] mb-4 flex items-center gap-2 transition-colors">
                  <Wallet size={20} /> Utilidad Neta Real
                </p>
                <h1 className={`text-5xl md:text-7xl font-black tracking-tight transition-colors ${summary.netProfit >= 0 ? 'text-white lya:text-lya-surface' : 'text-red-400 dark:text-red-500 lya:text-red-200'}`}>
                  {formatMoney(summary.netProfit)}
                </h1>
                <p className="text-gray-400 dark:text-gray-400 lya:text-lya-surface/80 mt-6 text-sm md:text-base font-medium max-w-lg transition-colors">
                  {summary.netProfit >= 0 
                    ? "Este es el margen de ganancia real después de cubrir producto y operación."
                    : "Atención: El negocio operó con pérdidas en este periodo."}
                </p>
              </div>
            </motion.div>

          </motion.div>
        )}
      </div>
    </motion.div>
  );
};