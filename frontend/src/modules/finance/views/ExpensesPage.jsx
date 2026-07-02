// src/modules/finance/views/ExpensesPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFinanceController } from '../controllers/useFinanceController';
import { Zap, Wrench, Package, Briefcase, Megaphone, HelpCircle, Plus, Calendar, AlertTriangle, Loader2, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';

const CATEGORIES = [
  { id: 'PAYROLL', label: 'Nómina / Sueldos', icon: Briefcase, color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10 lya:bg-blue-500/10' },
  { id: 'UTILITIES', label: 'Servicios (Luz, Agua, Gas)', icon: Zap, color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 lya:bg-yellow-500/10' },
  { id: 'MAINTENANCE', label: 'Mantenimiento', icon: Wrench, color: 'text-orange-500 bg-orange-50 dark:bg-orange-500/10 lya:bg-orange-500/10' },
  { id: 'SUPPLIES', label: 'Artículos de Limpieza', icon: Package, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 lya:bg-emerald-500/10' },
  { id: 'MARKETING', label: 'Publicidad', icon: Megaphone, color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10 lya:bg-purple-500/10' },
  { id: 'OTHER', label: 'Otros Gastos', icon: HelpCircle, color: 'text-gray-500 bg-gray-50 dark:bg-gray-500/10 lya:bg-gray-500/10' },
];

/* ==========================================
   COMPONENTE SELECTOR 100% TEMATIZADO
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
            className="absolute z-50 top-full mt-2 left-0 min-w-[200px] w-full bg-white dark:bg-gray-800 lya:bg-lya-surface border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 rounded-2xl shadow-xl overflow-hidden py-1"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors ${
                  value === opt.value 
                    ? 'bg-red-50 dark:bg-gray-700 lya:bg-lya-primary/10 text-red-600 dark:text-white lya:text-lya-primary' 
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

export const ExpensesPage = () => {
  const { theme } = useTheme();
  const { expenses, isLoading, fetchExpenses, registerExpense } = useFinanceController();
  
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

  const [timeRange, setTimeRange] = useState('this_month');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('PAYROLL');
  const [expenseDate, setExpenseDate] = useState(formatLocalDate(new Date())); 
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // 🔥 SOLUCIÓN MAESTRA: Este estado nace en TRUE. Obliga a mostrar la carga al montar el componente.
  const [isFullScreenLoader, setIsFullScreenLoader] = useState(true);
  
  const isDarkMode = document.documentElement.classList.contains('dark');

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // 🔥 En lugar de depender ciegamente del isLoading del controlador, controlamos el cierre nosotros
  useEffect(() => {
    const loadData = async () => {
      await fetchExpenses(startDate, endDate);
      setIsFullScreenLoader(false); // Cerramos el telón cuando ya hay datos seguros
    };
    loadData();
  }, [startDate, endDate, fetchExpenses]);

  const handleRangeChange = (val) => {
    setIsFullScreenLoader(true); // Bloqueamos la pantalla instantáneamente al hacer clic
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
        return; 
      default:
        return;
    }

    setStartDate(formatLocalDate(start));
    setEndDate(formatLocalDate(end));
  };

  const handleCustomDateChange = (val, type) => {
    setIsFullScreenLoader(true); // Bloqueamos la pantalla al usar el calendario
    setTimeRange('custom');
    if (type === 'start') setStartDate(val);
    if (type === 'end') setEndDate(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !description || !expenseDate) return showNotification('Completa los campos obligatorios', 'error');
    
    setIsSubmitting(true);
    const res = await registerExpense({ 
      amount: parseFloat(amount), 
      description, 
      expenseCategory: category,
      expenseDate 
    });
    
    if (res.success) {
      showNotification('Gasto registrado exitosamente', 'success');
      setAmount('');
      setDescription('');
      setExpenseDate(formatLocalDate(new Date())); 
      // Al registrar, NO bloqueamos la pantalla, solo usamos fetchExpenses para el loader chiquito
      fetchExpenses(startDate, endDate);
    } else {
      showNotification(res.error || 'Error al registrar el gasto', 'error');
    }
    setIsSubmitting(false);
  };

  const totalGastos = (expenses || [])
    .filter(ex => ex.status === 'ACTIVE')
    .reduce((sum, ex) => sum + parseFloat(ex.amount), 0);

  return (
    <>
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed top-8 left-0 right-0 flex justify-center z-[9999] pointer-events-none px-4"
          >
            <div className={`backdrop-blur-xl rounded-full shadow-2xl border px-5 py-3 flex items-center gap-3 transition-colors ${
              notification.type === 'success'
                ? 'bg-emerald-50/90 dark:bg-emerald-900/80 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 lya:bg-lya-surface/90 lya:border-emerald-500/30'
                : 'bg-red-50/90 dark:bg-red-900/80 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 lya:bg-lya-surface/90 lya:border-red-500/30'
            }`}>
              {notification.type === 'success' ? <CheckCircle2 size={20} className="lya:text-emerald-500" /> : <AlertCircle size={20} className="lya:text-red-500" />}
              <span className="font-bold text-sm lya:text-lya-text">{notification.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* 🔥 PANTALLA DE CARGA ABSOLUTA: Controlada por isFullScreenLoader */}
        {isFullScreenLoader ? (
          <motion.div
            key="loader-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg transition-colors duration-300 z-[100]"
          >
            <motion.div
              animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="w-24 h-24 bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-800 lya:border-lya-border/40"
            >
              <Briefcase size={40} className="text-red-500 lya:text-lya-primary" />
            </motion.div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">
              Cargando Gastos
            </h2>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-red-500 lya:text-lya-primary" /> Sincronizando operaciones...
            </p>
          </motion.div>
        ) : (
          <motion.div 
            key="main-content"
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300 relative"
          >
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 z-[50] relative transition-colors">
              <div className="flex items-center space-x-4">
                <div className="bg-red-500 dark:bg-red-600 lya:bg-lya-primary text-white lya:text-lya-surface p-3 rounded-2xl shadow-md shadow-red-500/20 dark:shadow-red-900/30 lya:shadow-lya-primary/20">
                  <Briefcase size={28} />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text tracking-tight transition-colors">Gastos Operativos</h1>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1 transition-colors">Registra aquí el pago de luz, nóminas y otros egresos de 𝓛𝔂𝓪.</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto z-20">
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

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 relative">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 h-fit transition-colors">
                  <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white lya:text-lya-text border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 pb-3 transition-colors">Registrar Nuevo Gasto</h2>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/50 tracking-widest mb-2 transition-colors">Fecha del Gasto</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 lya:text-lya-primary" size={18} />
                        <input 
                          type="date"
                          required
                          value={expenseDate}
                          onChange={(e) => setExpenseDate(e.target.value)}
                          style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                          className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg text-gray-800 dark:text-white lya:text-lya-text font-bold outline-none focus:ring-2 focus:ring-red-500/50 dark:focus:ring-red-500/40 lya:focus:ring-lya-primary/50 transition-all cursor-pointer"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/50 tracking-widest mb-3 transition-colors">Categoría del Gasto</label>
                      <div className="grid grid-cols-2 gap-3">
                        {CATEGORIES.map(cat => {
                          const Icon = cat.icon;
                          const isSelected = category === cat.id;
                          return (
                            <button
                              type="button"
                              key={cat.id}
                              onClick={() => setCategory(cat.id)}
                              className={`p-3 rounded-2xl flex flex-col items-center gap-2 transition-all border-2 ${
                                isSelected 
                                  ? `border-red-500 dark:border-red-500/70 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 lya:border-lya-primary lya:bg-lya-primary/10 lya:text-lya-primary shadow-sm` 
                                  : 'border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 lya:border-lya-border/30 lya:text-lya-text/60 bg-gray-50/50 dark:bg-gray-800/50 lya:bg-transparent'
                              }`}
                            >
                              <div className={`p-2.5 rounded-xl transition-colors ${isSelected ? cat.color : 'bg-white dark:bg-gray-700 lya:bg-lya-surface'}`}>
                                <Icon size={20} />
                              </div>
                              <span className="text-[11px] font-bold text-center leading-tight">{cat.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/50 tracking-widest mb-2 transition-colors">Monto ($)</label>
                      <input 
                        required 
                        type="number" 
                        step="0.01" 
                        min="0.01" 
                        placeholder="0.00" 
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg text-gray-900 dark:text-white lya:text-lya-text placeholder-gray-400 dark:placeholder-gray-500 lya:placeholder-lya-text/40 outline-none focus:ring-2 focus:ring-red-500/50 dark:focus:ring-red-500/40 lya:focus:ring-lya-primary/50 font-black text-2xl transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/50 tracking-widest mb-2 transition-colors">Concepto / Descripción</label>
                      <textarea 
                        required 
                        rows="2" 
                        placeholder="Ej. Pago de recibo CFE Mayo" 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg text-gray-800 dark:text-white lya:text-lya-text placeholder-gray-400 dark:placeholder-gray-500 lya:placeholder-lya-text/40 outline-none focus:ring-2 focus:ring-red-500/50 dark:focus:ring-red-500/40 lya:focus:ring-lya-primary/50 text-sm font-medium resize-none transition-all"
                      ></textarea>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmitting} 
                      className="w-full py-4 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 lya:bg-lya-secondary lya:hover:bg-lya-secondary/90 text-white lya:text-lya-surface rounded-xl font-bold shadow-lg shadow-red-500/30 dark:shadow-red-900/30 lya:shadow-lya-secondary/30 flex justify-center items-center gap-2 transition-all transform hover:-translate-y-0.5 disabled:opacity-75 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                      {isSubmitting ? 'Procesando...' : 'Aplicar Gasto'}
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 flex flex-col gap-6 relative">
                  <div className="bg-red-50 dark:bg-red-900/10 lya:bg-lya-secondary/10 border border-red-100 dark:border-red-900/30 lya:border-lya-secondary/20 p-8 rounded-[2rem] flex justify-between items-center shadow-sm transition-colors relative z-10">
                    <div>
                      <p className="text-red-500 dark:text-red-400 lya:text-lya-secondary font-black text-[11px] uppercase tracking-widest mb-1.5 transition-colors">
                        {timeRange === 'today' || timeRange === 'yesterday' ? 'Total Gastado este día' : 'Total Gastado en el periodo'}
                      </p>
                      <h2 className="text-4xl md:text-5xl font-black text-red-600 dark:text-red-500 lya:text-lya-secondary transition-colors">
                        ${totalGastos.toFixed(2)}
                      </h2>
                    </div>
                    <div className="h-16 w-16 bg-red-100 dark:bg-red-800/30 lya:bg-lya-secondary/20 rounded-2xl flex items-center justify-center text-red-500 dark:text-red-400 lya:text-lya-secondary rotate-12 shadow-sm transition-colors">
                      <AlertTriangle size={32} />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex-1 p-6 transition-colors relative overflow-hidden">
                    {/* 🔥 EL SPINNER SILENCIOSO PARA CUANDO GUARDAS UN GASTO */}
                    {isLoading && !isFullScreenLoader && (
                       <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 lya:bg-lya-surface/60 backdrop-blur-sm z-20">
                         <Loader2 className="animate-spin text-red-500 lya:text-lya-primary" size={32} />
                       </div>
                    )}

                    <h3 className="font-bold text-gray-800 dark:text-white lya:text-lya-text mb-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 pb-3 transition-colors">Historial de Gastos</h3>
                    
                    {!isLoading && (!expenses || expenses.length === 0) ? (
                      <div className="text-center py-16 text-gray-400 dark:text-gray-500 lya:text-lya-text/50">
                        <Briefcase size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-bold text-lg">No hay gastos registrados en este periodo.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(expenses || []).map((ex, idx) => {
                          const catConfig = CATEGORIES.find(c => c.id === ex.expenseCategory) || CATEGORIES[5];
                          const Icon = catConfig.icon;
                          const isCancelled = ex.status === 'CANCELLED';
                          
                          const dateObj = new Date(ex.createdAt);
                          const formattedDate = dateObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
                          const formattedTime = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute:'2-digit' });

                          return (
                            <motion.div 
                              key={ex.id} 
                              initial={{ opacity: 0, y: 15 }} 
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ type: "spring", stiffness: 300, damping: 24, delay: idx * 0.04 }}
                              className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                                isCancelled 
                                  ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 opacity-60 grayscale lya:bg-lya-bg lya:border-lya-border/20' 
                                  : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 lya:bg-lya-surface lya:border-lya-border/50 shadow-sm'
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`p-3.5 rounded-xl transition-colors ${catConfig.color}`}>
                                  <Icon size={24} />
                                </div>
                                <div>
                                  <p className={`font-bold text-base transition-colors ${isCancelled ? 'line-through text-gray-400 dark:text-gray-500 lya:text-lya-text/50' : 'text-gray-800 dark:text-white lya:text-lya-text'}`}>
                                    {ex.description}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-bold transition-colors">
                                    <span className="capitalize">{formattedDate}</span>
                                    <span className="text-gray-300 dark:text-gray-600 lya:text-lya-border">•</span>
                                    <span>{formattedTime}</span>
                                    <span className="text-gray-300 dark:text-gray-600 lya:text-lya-border">•</span>
                                    <span className="uppercase tracking-widest text-[10px]">{catConfig.label}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`font-black text-xl transition-colors ${isCancelled ? 'text-gray-400 dark:text-gray-500 lya:text-lya-text/50' : 'text-red-600 dark:text-red-400 lya:text-red-500'}`}>
                                  -${parseFloat(ex.amount).toFixed(2)}
                                </p>
                                {isCancelled && <span className="text-[10px] font-black text-red-500 dark:text-red-400 lya:text-red-600 uppercase tracking-widest bg-red-50 dark:bg-red-900/20 lya:bg-red-500/10 px-2 py-0.5 rounded mt-1 inline-block transition-colors">Anulado</span>}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};