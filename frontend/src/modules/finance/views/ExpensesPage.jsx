// src/modules/finance/views/ExpensesPage.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useFinanceController } from '../controllers/useFinanceController';
import { Zap, Wrench, Package, Briefcase, Megaphone, HelpCircle, Plus, Calendar, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

// 🔥 CORRECCIÓN: Sincronizado exactamente con Reportes (Artículos de Limpieza)
const CATEGORIES = [
  { id: 'PAYROLL', label: 'Nómina / Sueldos', icon: Briefcase, color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10 lya:bg-blue-500/10' },
  { id: 'UTILITIES', label: 'Servicios (Luz, Agua, Gas)', icon: Zap, color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 lya:bg-yellow-500/10' },
  { id: 'MAINTENANCE', label: 'Mantenimiento', icon: Wrench, color: 'text-orange-500 bg-orange-50 dark:bg-orange-500/10 lya:bg-orange-500/10' },
  { id: 'SUPPLIES', label: 'Artículos de Limpieza', icon: Package, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 lya:bg-emerald-500/10' },
  { id: 'MARKETING', label: 'Publicidad', icon: Megaphone, color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10 lya:bg-purple-500/10' },
  { id: 'OTHER', label: 'Otros Gastos', icon: HelpCircle, color: 'text-gray-500 bg-gray-50 dark:bg-gray-500/10 lya:bg-gray-500/10' },
];

export const ExpensesPage = () => {
  const { expenses, isLoading, fetchExpenses, registerExpense } = useFinanceController();
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
  });
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('PAYROLL'); // Por defecto seleccionado
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchExpenses(selectedDate);
  }, [selectedDate, fetchExpenses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !description) return toast.error('Completa los campos obligatorios');
    
    setIsSubmitting(true);
    const res = await registerExpense({ amount: parseFloat(amount), description, expenseCategory: category });
    
    if (res.success) {
      toast.success('Gasto registrado con éxito');
      setAmount('');
      setDescription('');
      fetchExpenses(selectedDate);
    } else {
      toast.error(res.error || 'Error al registrar el gasto');
    }
    setIsSubmitting(false);
  };

  const totalGastos = expenses
    .filter(ex => ex.status === 'ACTIVE')
    .reduce((sum, ex) => sum + parseFloat(ex.amount), 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 z-10 relative transition-colors">
        <div className="flex items-center space-x-4">
          <div className="bg-red-500 dark:bg-red-600 lya:bg-lya-primary text-white lya:text-lya-surface p-3 rounded-2xl shadow-md shadow-red-500/20 dark:shadow-red-900/30 lya:shadow-lya-primary/20">
            <Briefcase size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text tracking-tight transition-colors">Gastos Operativos (OPEX)</h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1 transition-colors">Registra aquí el pago de luz, nóminas y otros egresos del negocio.</p>
          </div>
        </div>
        
        <div className="w-full md:w-auto flex items-center gap-3 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 shadow-sm transition-all">
          <Calendar className="text-gray-400 dark:text-gray-500 lya:text-lya-text/50 transition-colors" size={20} />
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-transparent font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text outline-none cursor-pointer transition-colors"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PANEL IZQUIERDO: FORMULARIO */}
          <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 h-fit transition-colors">
            <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white lya:text-lya-text border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 pb-3 transition-colors">Registrar Nuevo Gasto</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest mb-3 transition-colors">Categoría del Gasto</label>
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
                <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest mb-2 transition-colors">Monto ($)</label>
                <input required type="number" step="0.01" min="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg text-gray-900 dark:text-white lya:text-lya-text placeholder-gray-400 dark:placeholder-gray-500 lya:placeholder-lya-text/40 outline-none focus:ring-2 focus:ring-red-500/50 dark:focus:ring-red-500/40 lya:focus:ring-lya-primary/50 font-black text-2xl transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest mb-2 transition-colors">Concepto / Descripción</label>
                <textarea required rows="2" placeholder="Ej. Pago de recibo CFE Mayo" value={description} onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg text-gray-800 dark:text-white lya:text-lya-text placeholder-gray-400 dark:placeholder-gray-500 lya:placeholder-lya-text/40 outline-none focus:ring-2 focus:ring-red-500/50 dark:focus:ring-red-500/40 lya:focus:ring-lya-primary/50 text-sm font-medium resize-none transition-all"
                ></textarea>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 lya:bg-lya-secondary lya:hover:bg-lya-secondary/90 text-white lya:text-lya-surface rounded-xl font-bold shadow-lg shadow-red-500/30 dark:shadow-red-900/30 lya:shadow-lya-secondary/30 flex justify-center items-center gap-2 transition-all transform hover:-translate-y-0.5">
                <Plus size={20} />
                {isSubmitting ? 'Guardando...' : 'Aplicar Gasto'}
              </button>
            </form>
          </div>

          {/* PANEL DERECHO: HISTORIAL DEL DÍA */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 lya:border-red-500/20 p-8 rounded-3xl flex justify-between items-center shadow-sm transition-colors">
              <div>
                <p className="text-red-500 dark:text-red-400 lya:text-lya-secondary font-black text-[11px] uppercase tracking-widest mb-1.5 transition-colors">Total Gastado este día</p>
                <h2 className="text-4xl md:text-5xl font-black text-red-600 dark:text-red-500 lya:text-lya-secondary transition-colors">
                  ${totalGastos.toFixed(2)}
                </h2>
              </div>
              <div className="h-16 w-16 bg-red-100 dark:bg-red-800/30 lya:bg-lya-secondary/20 rounded-2xl flex items-center justify-center text-red-500 dark:text-red-400 lya:text-lya-secondary rotate-12 shadow-sm transition-colors">
                <AlertTriangle size={32} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex-1 p-6 transition-colors">
              <h3 className="font-bold text-gray-800 dark:text-white lya:text-lya-text mb-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 pb-3 transition-colors">Historial de Gastos</h3>
              
              {isLoading ? (
                <div className="flex justify-center items-center py-10 opacity-50">
                  <Briefcase className="animate-pulse text-gray-400 dark:text-gray-500" size={40} />
                </div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-16 text-gray-400 dark:text-gray-500 lya:text-lya-text/50">
                  <Briefcase size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="font-bold text-lg">No hay gastos registrados en esta fecha.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {expenses.map((ex, idx) => {
                    const catConfig = CATEGORIES.find(c => c.id === ex.expenseCategory) || CATEGORIES[5];
                    const Icon = catConfig.icon;
                    const isCancelled = ex.status === 'CANCELLED';

                    return (
                      <motion.div 
                        key={ex.id} 
                        initial={{ opacity: 0, y: 15 }} 
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 24, delay: idx * 0.05 }}
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
                            <p className={`font-bold text-base transition-colors ${isCancelled ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-white lya:text-lya-text'}`}>
                              {ex.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-bold transition-colors">
                              <span>{new Date(ex.createdAt).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})}</span>
                              <span className="text-gray-300 dark:text-gray-600 lya:text-lya-border">•</span>
                              <span className="uppercase tracking-widest text-[10px]">{catConfig.label}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-black text-xl transition-colors ${isCancelled ? 'text-gray-400 dark:text-gray-500' : 'text-red-600 dark:text-red-400 lya:text-red-500'}`}>
                            -${parseFloat(ex.amount).toFixed(2)}
                          </p>
                          {isCancelled && <span className="text-[10px] font-black text-red-500 dark:text-red-400 uppercase tracking-widest bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded mt-1 inline-block transition-colors">Anulado</span>}
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
  );
};