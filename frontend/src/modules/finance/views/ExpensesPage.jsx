// src/modules/finance/views/ExpensesPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFinanceController } from '../controllers/useFinanceController';
import { 
  Zap, Wrench, Package, Briefcase, Megaphone, HelpCircle, Plus, 
  Calendar, AlertTriangle, Loader2, CheckCircle2, AlertCircle, ChevronDown, 
  Trash2, ArchiveRestore, X 
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';

// 🔥 FIX: Formateador y Timezone para evitar brincos UTC
const getMexicoCityDate = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));

const formatLocalInputDate = (dateObj) => {
  if (!dateObj || isNaN(dateObj)) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const CATEGORIES = [
  { id: 'PAYROLL', label: 'Nómina / Sueldos', icon: Briefcase, color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10 lya:bg-blue-500/10' },
  { id: 'UTILITIES', label: 'Servicios (Luz, Agua, Gas)', icon: Zap, color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 lya:bg-yellow-500/10' },
  { id: 'MAINTENANCE', label: 'Mantenimiento', icon: Wrench, color: 'text-orange-500 bg-orange-50 dark:bg-orange-500/10 lya:bg-orange-500/10' },
  { id: 'SUPPLIES', label: 'Artículos de Limpieza', icon: Package, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 lya:bg-emerald-500/10' },
  { id: 'MARKETING', label: 'Publicidad', icon: Megaphone, color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10 lya:bg-purple-500/10' },
  { id: 'OTHER', label: 'Otros Gastos', icon: HelpCircle, color: 'text-gray-500 bg-gray-50 dark:bg-gray-500/10 lya:bg-gray-500/10' },
];

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
      <motion.button 
        whileTap={{ scale: 0.95 }}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center text-sm font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text outline-none cursor-pointer w-full transition-colors ${buttonClassName}`}
      >
        <div className="flex items-center truncate">
          {Icon && <Icon size={16} className="text-gray-400 dark:text-gray-500 lya:text-lya-primary mr-2 shrink-0" />}
          <span className="truncate">{selected?.label}</span>
        </div>
        <ChevronDown size={14} className={`text-gray-400 dark:text-gray-500 ml-2 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

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
              <motion.button
                whileTap={{ scale: 0.98 }}
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors ${
                  value === opt.value 
                    ? 'bg-red-50 dark:bg-gray-700 lya:bg-lya-primary/10 text-red-600 dark:text-white lya:text-lya-primary' 
                    : 'text-gray-600 dark:text-gray-300 lya:text-lya-text md:hover:bg-gray-50 dark:md:hover:bg-gray-700/50 lya:md:hover:bg-lya-bg/50'
                }`}
              >
                {opt.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ExpensesPage = () => {
  const { theme } = useTheme();
  const { expenses, isLoading, fetchExpenses, registerExpense, cancelExpense, restoreExpense } = useFinanceController();
  
  // 🔥 LÍMITE DE FECHA: Calculamos "Hoy" en Chiapas para bloquear el futuro
  const todayForLimit = getMexicoCityDate();
  const maxDateLimit = formatLocalInputDate(todayForLimit);

  // Inicializamos en el mes actual hasta HOY
  const [startDate, setStartDate] = useState(() => {
    const d = getMexicoCityDate();
    return formatLocalInputDate(new Date(d.getFullYear(), d.getMonth(), 1));
  });
  const [endDate, setEndDate] = useState(() => formatLocalInputDate(getMexicoCityDate()));

  const [timeRange, setTimeRange] = useState('this_month');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('PAYROLL');
  const [expenseDate, setExpenseDate] = useState(() => formatLocalInputDate(getMexicoCityDate())); 
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null); 
  const [notification, setNotification] = useState(null);
  const [isFullScreenLoader, setIsFullScreenLoader] = useState(true);

  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [cancelModal, setCancelModal] = useState({ isOpen: false, expenseId: null, reason: '' });
  
  const isDarkMode = document.documentElement.classList.contains('dark');

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    if (!isLoading) {
      const minLoadTime = new Promise(resolve => setTimeout(resolve, 600));
      minLoadTime.then(() => setIsFullScreenLoader(false));
    }
  }, [isLoading]);

  useEffect(() => {
    fetchExpenses(startDate, endDate);
  }, [startDate, endDate, fetchExpenses]);

  const handleRangeChange = (val) => {
    setTimeRange(val);
    const now = getMexicoCityDate();
    let start, end;

    switch(val) {
      case 'today':
        start = new Date(now); end = new Date(now); break;
      case 'yesterday':
        start = new Date(now); start.setDate(start.getDate() - 1); end = new Date(start); break;
      case 'this_week':
        start = new Date(now); const firstDay = start.getDate() - start.getDay(); start.setDate(firstDay); end = new Date(start); end.setDate(firstDay + 6); break;
      case 'this_month':
      case 'custom':
        // 🔥 FIX: Del 1er día del mes actual, hasta el día de HOY
        start = new Date(now.getFullYear(), now.getMonth(), 1); 
        end = new Date(now); 
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0); break;
      default: return;
    }

    setStartDate(formatLocalInputDate(start));
    setEndDate(formatLocalInputDate(end));
  };

  const handleCustomDateChange = (val, type) => {
    setTimeRange('custom');
    if (type === 'start') setStartDate(val);
    if (type === 'end') setEndDate(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !description || !expenseDate) return showNotification('Completa los campos obligatorios', 'error');
    
    setIsSubmitting(true);
    try {
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
        setExpenseDate(formatLocalInputDate(getMexicoCityDate())); 
        await fetchExpenses(startDate, endDate);
      } else {
        showNotification(res.error || 'Error al registrar el gasto', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    try {
      setActionLoadingId(cancelModal.expenseId);
      const res = await cancelExpense(cancelModal.expenseId, cancelModal.reason);
      if (res.success) {
        showNotification('Gasto anulado. El dinero ha vuelto a caja.', 'success');
        setCancelModal({ isOpen: false, expenseId: null, reason: '' });
        await fetchExpenses(startDate, endDate);
      } else {
        showNotification(res.error || 'No se pudo anular el gasto', 'error');
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestore = async (id) => {
    try {
      setActionLoadingId(id);
      const res = await restoreExpense(id);
      if (res.success) {
        showNotification('Gasto restaurado correctamente.', 'success');
        await fetchExpenses(startDate, endDate);
      } else {
        showNotification(res.error || 'No se pudo restaurar el gasto', 'error');
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const todayStr = new Date().toLocaleDateString('es-MX');
  const activeExpenses = (expenses || []).filter(ex => ex.status === 'ACTIVE');
  const cancelledExpenses = (expenses || []).filter(ex => {
    if (ex.status !== 'CANCELLED') return false;
    const cancelDate = ex.cancelledAt ? new Date(ex.cancelledAt) : new Date(ex.createdAt);
    return cancelDate.toLocaleDateString('es-MX') === todayStr;
  });
  const totalGastos = activeExpenses.reduce((sum, ex) => sum + parseFloat(ex.amount), 0);

  return (
    <>
      <AnimatePresence>
        {notification && (
          <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
            <motion.div 
              initial={{ opacity: 0, y: -50, scale: 0.9 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`bg-white dark:bg-gray-900 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 font-bold border pointer-events-auto transition-colors ${
                notification.type === 'error' ? 'border-red-100 dark:border-red-900/30 lya:border-red-500/30' : 'border-emerald-100 dark:border-emerald-900/30 lya:border-lya-primary/30'
              }`}
            >
              <div className={`p-1.5 rounded-full shrink-0 ${
                notification.type === 'error' 
                  ? 'bg-red-100 dark:bg-red-500/20 text-red-500' 
                  : 'bg-emerald-100 dark:bg-emerald-500/20 lya:bg-lya-primary/20 text-emerald-500 lya:text-lya-primary'
              }`}>
                {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
              </div>
              <div className="flex flex-col">
                  <span className="text-sm text-center">{notification.message}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
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
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full w-full flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300 relative"
          >
{/* 🔥 FIX: Aumentamos a z-[60] para que el dropdown flote por encima de todo */}
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 z-[60] relative transition-colors">
              <div className="flex items-center space-x-4">
                <div className="bg-red-500 dark:bg-red-600 lya:bg-lya-primary text-white lya:text-lya-surface p-3 rounded-2xl shadow-md shadow-red-500/20 dark:shadow-red-900/30 lya:shadow-lya-primary/20">
                  <Briefcase size={28} />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text tracking-tight transition-colors">Gastos Operativos</h1>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1 transition-colors text-justify">Registra aquí el pago de luz, nóminas y otros egresos de 𝓛𝔂𝓪.</p>
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
                        className="flex flex-col sm:flex-row items-center overflow-hidden mt-2 sm:mt-0 pb-2 sm:pb-0 px-2 sm:px-0 gap-2 sm:gap-0"
                      >
                        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 lya:bg-lya-border/40 mx-2 hidden sm:block"></div>
                        
                        {/* 🔥 FIX: Fechas Clickeables y con Límite anti-futuro */}
                        <div className="flex items-center w-full sm:w-auto bg-white dark:bg-gray-700 lya:bg-lya-surface border border-gray-200 dark:border-gray-600 lya:border-lya-border/40 px-2 py-1.5 rounded-lg relative cursor-pointer"
                             onClick={() => document.getElementById('expense-filter-start').showPicker()} >
                          <input 
                            id="expense-filter-start"
                            type="date" 
                            max={maxDateLimit}
                            value={startDate} 
                            onChange={(e) => handleCustomDateChange(e.target.value, 'start')}
                            onClick={(e) => e.stopPropagation()}
                            style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                            className="bg-transparent text-xs font-bold text-gray-600 dark:text-gray-300 lya:text-lya-text/80 outline-none cursor-pointer w-[110px]
                              [&::-webkit-calendar-picker-indicator]:opacity-0 
                              [&::-webkit-calendar-picker-indicator]:absolute 
                              [&::-webkit-calendar-picker-indicator]:inset-0 
                              [&::-webkit-calendar-picker-indicator]:w-full 
                              [&::-webkit-calendar-picker-indicator]:h-full 
                              [&::-webkit-calendar-picker-indicator]:cursor-pointer z-10"
                          />
                        </div>
                        <span className="text-gray-300 dark:text-gray-600 mx-2 hidden sm:block">-</span>
                        <div className="flex items-center w-full sm:w-auto bg-white dark:bg-gray-700 lya:bg-lya-surface border border-gray-200 dark:border-gray-600 lya:border-lya-border/40 px-2 py-1.5 rounded-lg relative cursor-pointer"
                             onClick={() => document.getElementById('expense-filter-end').showPicker()} >
                          <input 
                            id="expense-filter-end"
                            type="date" 
                            max={maxDateLimit}
                            value={endDate} 
                            onChange={(e) => handleCustomDateChange(e.target.value, 'end')}
                            onClick={(e) => e.stopPropagation()}
                            style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                            className="bg-transparent text-xs font-bold text-gray-600 dark:text-gray-300 lya:text-lya-text/80 outline-none cursor-pointer w-[110px]
                              [&::-webkit-calendar-picker-indicator]:opacity-0 
                              [&::-webkit-calendar-picker-indicator]:absolute 
                              [&::-webkit-calendar-picker-indicator]:inset-0 
                              [&::-webkit-calendar-picker-indicator]:w-full 
                              [&::-webkit-calendar-picker-indicator]:h-full 
                              [&::-webkit-calendar-picker-indicator]:cursor-pointer z-10"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 relative">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* FORMULARIO DE REGISTRO */}
                <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 h-fit transition-colors">
                  <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white lya:text-lya-text border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 pb-3 transition-colors">Registrar Nuevo Gasto</h2>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/50 tracking-widest mb-2 transition-colors">Fecha del Gasto</label>
                      <div className="flex items-center gap-2">
                        {/* 🔥 FIX: Clickeable y Límite anti-futuro en Formulario */}
                        <div className="relative flex-1 cursor-pointer" onClick={() => document.getElementById('new-expense-date').showPicker()}>
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 lya:text-lya-primary pointer-events-none z-20" size={18} />
                          <input 
                            id="new-expense-date"
                            type="date"
                            required
                            max={maxDateLimit}
                            value={expenseDate}
                            onChange={(e) => setExpenseDate(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg text-gray-800 dark:text-white lya:text-lya-text font-bold outline-none focus:ring-2 focus:ring-red-500/50 dark:focus:ring-red-500/40 lya:focus:ring-lya-primary/50 transition-all cursor-pointer relative z-10
                              [&::-webkit-calendar-picker-indicator]:opacity-0 
                              [&::-webkit-calendar-picker-indicator]:absolute 
                              [&::-webkit-calendar-picker-indicator]:inset-0 
                              [&::-webkit-calendar-picker-indicator]:w-full 
                              [&::-webkit-calendar-picker-indicator]:h-full 
                              [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                          />
                        </div>
                        <motion.button 
                          type="button"
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setExpenseDate(formatLocalInputDate(getMexicoCityDate()))}
                          className="px-4 py-3.5 bg-gray-100 dark:bg-gray-800 md:hover:bg-gray-200 dark:md:hover:bg-gray-700 lya:bg-lya-border/20 lya:md:hover:bg-lya-border/40 text-gray-700 dark:text-gray-300 lya:text-lya-text rounded-xl transition-colors font-bold shadow-sm text-sm shrink-0"
                        >
                          Hoy
                        </motion.button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/50 tracking-widest mb-3 transition-colors">Categoría del Gasto</label>
                      <div className="grid grid-cols-2 gap-3">
                        {CATEGORIES.map(cat => {
                          const Icon = cat.icon;
                          const isSelected = category === cat.id;
                          return (
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              type="button"
                              key={cat.id}
                              onClick={() => setCategory(cat.id)}
                              className={`p-3 rounded-2xl flex flex-col items-center gap-2 transition-all border-2 ${
                                isSelected 
                                  ? `border-red-500 dark:border-red-500/70 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 lya:border-lya-primary lya:bg-lya-primary/10 lya:text-lya-primary shadow-sm` 
                                  : 'border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 md:hover:border-gray-300 dark:md:hover:border-gray-600 lya:border-lya-border/30 lya:text-lya-text/60 bg-gray-50/50 dark:bg-gray-800/50 lya:bg-transparent'
                              }`}
                            >
                              <div className={`p-2.5 rounded-xl transition-colors ${isSelected ? cat.color : 'bg-white dark:bg-gray-700 lya:bg-lya-surface'}`}>
                                <Icon size={20} />
                              </div>
                              <span className="text-[11px] font-bold text-center leading-tight">{cat.label}</span>
                            </motion.button>
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
                        className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg text-gray-800 dark:text-white lya:text-lya-text placeholder-gray-400 dark:placeholder-gray-500 lya:placeholder-lya-text/40 outline-none focus:ring-2 focus:ring-red-500/50 dark:focus:ring-red-500/40 lya:focus:ring-lya-primary/50 text-sm font-medium resize-none transition-all text-justify"
                      ></textarea>
                    </div>

                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      type="submit" 
                      disabled={isSubmitting} 
                      className="w-full py-4 bg-red-500 md:hover:bg-red-600 dark:bg-red-600 dark:md:hover:bg-red-500 lya:bg-lya-secondary lya:md:hover:bg-lya-secondary/90 text-white lya:text-lya-surface rounded-xl font-bold shadow-lg shadow-red-500/30 dark:shadow-red-900/30 lya:shadow-lya-secondary/30 flex justify-center items-center gap-2 transition-all transform md:hover:-translate-y-0.5 disabled:opacity-75 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                      {isSubmitting ? 'Procesando...' : 'Aplicar Gasto'}
                    </motion.button>
                  </form>
                </div>

                {/* HISTORIAL Y TOTAL */}
                <div className="lg:col-span-2 flex flex-col gap-6 relative">
                  <div className="bg-red-50 dark:bg-red-900/10 lya:bg-lya-secondary/10 border border-red-100 dark:border-red-900/30 lya:border-lya-secondary/20 p-8 rounded-[2rem] flex justify-between items-center shadow-sm transition-colors relative z-10">
                    <div>
                      <p className="text-red-500 dark:text-red-400 lya:text-lya-secondary font-black text-[11px] uppercase tracking-widest mb-1.5 transition-colors">
                        {timeRange === 'today' || timeRange === 'yesterday' ? 'Total Gastado este día' : 'Total Gastado en el periodo'}
                      </p>
                      <h2 className="text-4xl md:text-5xl font-black text-red-600 dark:text-red-500 lya:text-lya-secondary transition-colors truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                        ${totalGastos.toFixed(2)}
                      </h2>
                    </div>
                    <div className="h-16 w-16 bg-red-100 dark:bg-red-800/30 lya:bg-lya-secondary/20 rounded-2xl flex items-center justify-center text-red-500 dark:text-red-400 lya:text-lya-secondary rotate-12 shadow-sm transition-colors shrink-0">
                      <AlertTriangle size={32} />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex-1 p-6 transition-colors relative overflow-hidden flex flex-col">
                    
                    {/* Carga Local del Componente (Sin Pantallazo Completo) */}
                    {isLoading && !isFullScreenLoader && (
                       <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 lya:bg-lya-surface/60 backdrop-blur-sm z-20 rounded-[2.5rem]">
                         <Loader2 className="animate-spin text-red-500 lya:text-lya-primary" size={32} />
                       </div>
                    )}

                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 pb-3 transition-colors shrink-0">
                      <h3 className="font-bold text-gray-800 dark:text-white lya:text-lya-text truncate">Historial de Gastos</h3>
                      <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsTrashOpen(true)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all shrink-0 ${
                          isTrashOpen 
                            ? 'bg-red-500 text-white shadow-md lya:bg-lya-primary lya:text-lya-surface' 
                            : 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 md:hover:bg-red-100 dark:md:hover:bg-red-900/40 lya:bg-lya-primary/10 lya:text-lya-primary lya:md:hover:bg-lya-primary/20'
                        }`}
                      >
                        <Trash2 size={16} />
                        Papelera ({cancelledExpenses.length})
                      </motion.button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar relative pr-2">
                      {!isLoading && activeExpenses.length === 0 ? (
                        <div className="text-center py-16 text-gray-400 dark:text-gray-500 lya:text-lya-text/50">
                          <Briefcase size={48} className="mx-auto mb-4 opacity-20" />
                          <p className="font-bold text-lg text-center">No hay gastos activos registrados.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {activeExpenses.map((ex, idx) => {
                            const catConfig = CATEGORIES.find(c => c.id === ex.expenseCategory) || CATEGORIES[5];
                            const Icon = catConfig.icon;
                            const dateObj = new Date(ex.createdAt);
                            const formattedDate = dateObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
                            const formattedTime = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute:'2-digit' });

                            const auditMatch = ex.description?.match(/\[Registrado el: (.*?)\]/);
                            const realAuditDateTime = auditMatch ? auditMatch[1] : null;
                            const displayDesc = ex.description ? ex.description.replace(/\[Registrado el: .*?\]\s*/, '') : '';

                            return (
                              <motion.div 
                                key={ex.id} 
                                initial={{ opacity: 0, y: 15 }} 
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 300, damping: 24, delay: Math.min(idx * 0.04, 0.2) }}
                                className="flex flex-row items-start justify-between p-4 sm:p-5 rounded-[1.5rem] border bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 md:hover:border-gray-300 dark:md:hover:border-gray-500 lya:bg-lya-surface lya:border-lya-border/50 shadow-sm transition-all gap-4"
                              >
                                <div className="flex flex-row items-start gap-3 sm:gap-4 min-w-0 flex-1">
                                  <div className={`p-3 sm:p-3.5 rounded-xl shrink-0 transition-colors ${catConfig.color}`}>
                                    <Icon size={20} className="sm:w-6 sm:h-6" />
                                  </div>
                                  <div className="flex flex-col min-w-0 flex-1 pt-0.5">
                                    <p className="font-bold text-sm sm:text-base text-gray-800 dark:text-white lya:text-lya-text line-clamp-2 w-full text-justify">
                                      {displayDesc}
                                    </p>
                                    <div className="flex flex-col mt-1 gap-1">
                                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-bold">
                                        <span className="capitalize whitespace-nowrap">{formattedDate}</span>
                                        
                                        {!realAuditDateTime && (
                                          <>
                                            <span className="text-gray-300 dark:text-gray-600 lya:text-lya-border shrink-0">•</span>
                                            <span className="whitespace-nowrap">{formattedTime}</span>
                                          </>
                                        )}

                                        {realAuditDateTime && (
                                          <>
                                            <span className="text-gray-300 dark:text-gray-600 lya:text-lya-border shrink-0">•</span>
                                            <span className="text-[9px] font-black text-amber-600 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                                              Diferido
                                            </span>
                                          </>
                                        )}
                                      </div>
                                      
                                      {realAuditDateTime && (
                                        <span className="text-[10px] sm:text-[11px] font-medium text-gray-400 dark:text-gray-500">
                                          Teclado: {realAuditDateTime}
                                        </span>
                                      )}
                                    </div>
                                    <span className="uppercase tracking-widest text-[9px] sm:text-[10px] font-black text-gray-400 dark:text-gray-500 lya:text-lya-text/50 truncate w-full mt-1.5">
                                      {catConfig.label}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex flex-col items-end gap-2 shrink-0 pt-0.5">
                                  <p className="font-black text-lg sm:text-xl text-red-600 dark:text-red-400 lya:text-red-500 transition-colors">
                                    -${parseFloat(ex.amount).toFixed(2)}
                                  </p>
                                  <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setCancelModal({ isOpen: true, expenseId: ex.id, reason: '' })}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 lya:bg-lya-bg text-gray-400 md:hover:bg-red-50 dark:md:hover:bg-red-900/30 md:hover:text-red-500 transition-colors text-[10px] font-bold uppercase tracking-wider"
                                  >
                                    <Trash2 size={14} /> Anular
                                  </motion.button>
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cancelModal.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => {
                if (actionLoadingId !== cancelModal.expenseId) {
                  setCancelModal({ isOpen: false, expenseId: null, reason: '' });
                }
              }}
              className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 lya:bg-lya-dark/50 backdrop-blur-sm transition-colors"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-[400px] flex flex-col items-center text-center border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 transition-colors"
            >
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 lya:bg-red-500/20 mx-auto rounded-full flex items-center justify-center mb-5 shadow-sm">
                <AlertTriangle size={32} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-2 tracking-tight text-center">
                Anular Gasto
              </h3>
              <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-medium text-sm mb-6 leading-relaxed px-2 text-center">
                ¿Estás seguro que deseas eliminar este gasto de los registros? El monto regresará a caja.
              </p>

              <div className="w-full mb-8">
                <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/50 tracking-widest mb-2 w-full text-center">
                  Motivo de anulación (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Error en la cantidad..."
                  value={cancelModal.reason}
                  onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                  className="w-full px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg text-gray-900 dark:text-white lya:text-lya-text text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/50 dark:focus:ring-red-500/40 lya:focus:ring-lya-primary/50 transition-all text-center"
                />
              </div>

              <div className="flex gap-3 w-full">
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCancelModal({ isOpen: false, expenseId: null, reason: '' })}
                  disabled={actionLoadingId === cancelModal.expenseId}
                  className="flex-[1] py-4 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg md:hover:bg-gray-200 dark:md:hover:bg-gray-700 lya:md:hover:bg-lya-border/30 text-gray-700 dark:text-gray-300 lya:text-lya-text rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={handleConfirmCancel} 
                  disabled={actionLoadingId === cancelModal.expenseId}
                  className="flex-[1.5] py-4 bg-red-500 md:hover:bg-red-600 dark:bg-red-600 dark:md:hover:bg-red-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/30 dark:shadow-red-900/40 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:shadow-none disabled:opacity-75"
                >
                  {actionLoadingId === cancelModal.expenseId ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Anulando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} strokeWidth={2.5} />
                      <span>Sí, Anular</span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTrashOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsTrashOpen(false)}
              className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 lya:bg-lya-dark/50 backdrop-blur-sm transition-colors"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-3xl flex flex-col max-h-[85vh] border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 transition-colors overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg/50 shrink-0 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 lya:bg-red-500/10 rounded-2xl text-red-500 lya:text-red-500 shadow-sm border border-red-200 dark:border-red-800/50 lya:border-red-500/20">
                    <Trash2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 lya:text-lya-text tracking-tight truncate">Papelera de Gastos</h3>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-0.5 line-clamp-1">Los gastos eliminados hoy desaparecerán a medianoche</p>
                  </div>
                </div>
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsTrashOpen(false)} 
                  className="p-2.5 text-gray-400 md:hover:text-gray-700 bg-gray-100 md:hover:bg-gray-200 dark:bg-gray-800 dark:md:hover:bg-gray-700 dark:md:hover:text-white lya:bg-lya-bg lya:text-lya-text/40 lya:md:hover:text-lya-text lya:md:hover:bg-lya-border/30 rounded-xl transition-all"
                >
                  <X size={20} strokeWidth={2.5} />
                </motion.button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gray-50/30 dark:bg-gray-950/20 lya:bg-lya-bg/30 transition-colors">
                {cancelledExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="bg-gray-100 dark:bg-gray-800 lya:bg-lya-surface p-6 rounded-[2rem] shadow-inner mb-4 transition-colors">
                      <Trash2 size={40} className="text-gray-400 dark:text-gray-600 lya:text-lya-text/30" strokeWidth={1.5} />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-bold lya:text-lya-text/60 text-lg text-center">No hay gastos anulados el día de hoy.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cancelledExpenses.map((ex) => {
                      const catConfig = CATEGORIES.find(c => c.id === ex.expenseCategory) || CATEGORIES[5];
                      const Icon = catConfig.icon;
                      const dateObj = new Date(ex.cancelledAt || ex.createdAt);
                      const formattedTime = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute:'2-digit' });

                      const auditMatch = ex.description?.match(/\[Registrado el: (.*?)\]/);
                      const realAuditDateTime = auditMatch ? auditMatch[1] : null;
                      const displayDesc = ex.description ? ex.description.replace(/\[Registrado el: .*?\]\s*/, '') : '';

                      return (
                        <div key={ex.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[1.5rem] shadow-sm border border-red-100 dark:border-red-900/30 lya:border-red-500/20 opacity-80 md:hover:opacity-100 transition-opacity gap-4 sm:gap-0">
                          
                          <div className="flex flex-row items-start gap-3 flex-1 min-w-0 pr-2">
                            <div className={`h-12 w-12 flex-shrink-0 rounded-[1.25rem] ${catConfig.color} flex items-center justify-center border border-gray-100 dark:border-gray-700 lya:border-transparent`}>
                              <Icon size={20} />
                            </div>
                            <div className="min-w-0 flex-1 pt-0.5">
                              <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 lya:text-lya-text truncate w-full">{displayDesc}</h4>
                              
                              <div className="flex flex-col mt-1 gap-1">
                                <div className="flex flex-wrap items-center gap-x-1">
                                  <span className="text-xs font-medium text-gray-500 lya:text-lya-text/60 whitespace-nowrap">
                                    Anulado: {formattedTime}
                                  </span>
                                  {realAuditDateTime && (
                                    <span 
                                      className="ml-1 text-[9px] font-black text-amber-600 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0"
                                      title={`Teclado en sistema: ${realAuditDateTime}`}
                                    >
                                      Diferido
                                    </span>
                                  )}
                                </div>
                                {realAuditDateTime && (
                                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                                    Teclado: {realAuditDateTime}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end sm:items-center sm:flex-row gap-4 shrink-0 w-full sm:w-auto">
                            <span className="font-black text-base text-red-500 lya:text-red-400 hidden sm:block">
                              ${parseFloat(ex.amount).toFixed(2)}
                            </span>
                            <motion.button 
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleRestore(ex.id)}
                              disabled={actionLoadingId === ex.id}
                              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-all bg-emerald-50 text-emerald-600 md:hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:md:hover:bg-emerald-900/40 lya:bg-emerald-500/10 lya:text-emerald-500 lya:md:hover:bg-emerald-500/20 disabled:opacity-50 shrink-0"
                            >
                              {actionLoadingId === ex.id ? <Loader2 size={14} className="animate-spin" /> : <ArchiveRestore size={14} />}
                              <span className="hidden sm:inline">
                                {actionLoadingId === ex.id ? 'Restaurando' : 'Restaurar'}
                              </span>
                            </motion.button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </>
  );
};