// frontend/src/modules/finance/views/ExpensesPage.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useFinanceController } from '../controllers/useFinanceController';
import { Zap, Wrench, Package, Briefcase, Megaphone, HelpCircle, Plus, Calendar, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { id: 'UTILITIES', label: 'Servicios (Luz, Agua)', icon: Zap, color: 'text-yellow-500 bg-yellow-50 lya:bg-yellow-500/10' },
  { id: 'PAYROLL', label: 'Nómina / Sueldos', icon: Briefcase, color: 'text-blue-500 bg-blue-50 lya:bg-blue-500/10' },
  { id: 'MAINTENANCE', label: 'Mantenimiento', icon: Wrench, color: 'text-orange-500 bg-orange-50 lya:bg-orange-500/10' },
  { id: 'SUPPLIES', label: 'Limpieza e Insumos', icon: Package, color: 'text-emerald-500 bg-emerald-50 lya:bg-emerald-500/10' },
  { id: 'MARKETING', label: 'Publicidad', icon: Megaphone, color: 'text-purple-500 bg-purple-50 lya:bg-purple-500/10' },
  { id: 'OTHER', label: 'Otros Gastos', icon: HelpCircle, color: 'text-gray-500 bg-gray-50 lya:bg-gray-500/10' },
];

export const ExpensesPage = () => {
  const { expenses, isLoading, fetchExpenses, registerExpense } = useFinanceController();
  
  // 🔥 SOLUCIÓN DEL VIAJE EN EL TIEMPO: Forzamos la fecha local exacta
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
  });
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('UTILITIES');
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
    <div className="p-6 h-full flex flex-col lya:bg-lya-bg overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold lya:text-lya-text flex items-center gap-2">
            <Briefcase className="w-8 h-8 text-red-500" />
            Gastos Operativos (OPEX)
          </h1>
          <p className="text-gray-500 text-sm mt-1">Registra aquí el pago de luz, nóminas y otros egresos del negocio.</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 lya:bg-lya-surface px-4 py-2 rounded-xl border border-gray-200 lya:border-lya-border/40 shadow-sm">
          <Calendar className="text-gray-400" size={20} />
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text outline-none cursor-pointer"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PANEL IZQUIERDO: FORMULARIO */}
        <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 h-fit">
          <h2 className="text-lg font-bold mb-4 lya:text-lya-text border-b lya:border-lya-border/30 pb-3">Registrar Nuevo Gasto</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase text-gray-400 mb-2">Categoría del Gasto</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`p-3 rounded-xl flex flex-col items-center gap-2 text-xs font-bold transition-all border ${
                        isSelected 
                          ? `border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 lya:border-lya-primary lya:bg-lya-primary/10 lya:text-lya-primary shadow-sm` 
                          : 'border-gray-100 dark:border-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 lya:border-lya-border/30 lya:text-lya-text/60'
                      }`}
                    >
                      <div className={`p-2 rounded-full ${isSelected ? cat.color : 'bg-gray-100 dark:bg-gray-800'}`}>
                        <Icon size={18} />
                      </div>
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-gray-400 mb-1.5">Monto ($)</label>
              <input required type="number" step="0.01" min="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg lya:text-lya-text outline-none focus:ring-2 focus:ring-orange-500 font-bold text-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-gray-400 mb-1.5">Concepto / Descripción</label>
              <textarea required rows="2" placeholder="Ej. Pago de recibo CFE Mayo" value={description} onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg lya:text-lya-text outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none"
              ></textarea>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg flex justify-center items-center gap-2 transition-all transform hover:-translate-y-1">
              <Plus size={20} />
              {isSubmitting ? 'Guardando...' : 'Aplicar Gasto'}
            </button>
          </form>
        </div>

        {/* PANEL DERECHO: HISTORIAL DEL DÍA */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 lya:border-red-500/20 p-6 rounded-3xl flex justify-between items-center">
            <div>
              <p className="text-red-500 dark:text-red-400 font-black text-sm uppercase tracking-wider mb-1">Total Gastado este día</p>
              <h2 className="text-4xl font-extrabold text-red-600 dark:text-red-500">
                ${totalGastos.toFixed(2)}
              </h2>
            </div>
            <div className="h-16 w-16 bg-red-100 dark:bg-red-800/30 rounded-full flex items-center justify-center text-red-500">
              <AlertTriangle size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex-1 p-6 overflow-y-auto">
            <h3 className="font-bold text-gray-800 dark:text-white lya:text-lya-text mb-4 border-b lya:border-lya-border/30 pb-3">Historial de Gastos</h3>
            
            {isLoading ? (
              <p className="text-center py-10 text-gray-400">Cargando...</p>
            ) : expenses.length === 0 ? (
              <p className="text-center py-10 text-gray-400 font-medium text-sm">No hay gastos registrados en esta fecha.</p>
            ) : (
              <div className="space-y-3">
                {expenses.map(ex => {
                  const catConfig = CATEGORIES.find(c => c.id === ex.expenseCategory) || CATEGORIES[5];
                  const Icon = catConfig.icon;
                  const isCancelled = ex.status === 'CANCELLED';

                  return (
                    <motion.div key={ex.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        isCancelled 
                          ? 'bg-gray-50 border-gray-100 opacity-60 grayscale lya:bg-lya-bg lya:border-lya-border/20' 
                          : 'bg-white border-gray-100 hover:border-gray-300 lya:bg-lya-surface lya:border-lya-border/50 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${catConfig.color}`}>
                          <Icon size={24} />
                        </div>
                        <div>
                          <p className={`font-bold text-sm ${isCancelled ? 'line-through text-gray-400' : 'text-gray-800 dark:text-white lya:text-lya-text'}`}>
                            {ex.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 lya:text-lya-text/60 font-medium">
                            <span>{new Date(ex.createdAt).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})}</span>
                            <span>•</span>
                            <span className="uppercase text-[10px] tracking-wider">{catConfig.label}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-black text-lg ${isCancelled ? 'text-gray-400' : 'text-red-600 dark:text-red-500'}`}>
                          -${parseFloat(ex.amount).toFixed(2)}
                        </p>
                        {isCancelled && <span className="text-[10px] font-bold text-red-500 uppercase">ANULADO</span>}
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
  );
};