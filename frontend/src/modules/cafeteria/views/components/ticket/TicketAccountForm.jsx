// src/modules/cafeteria/views/components/ticket/TicketAccountForm.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, User, Phone, AlertTriangle } from 'lucide-react';

export const TicketAccountForm = ({
  newCuentaName, setNewCuentaName,
  newCuentaPhone, setNewCuentaPhone,
  handleAddCuenta,
  isCompletamentePagada
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localWarning, setLocalWarning] = useState(null);

  const triggerWarning = (msg) => {
    setLocalWarning(msg);
    setTimeout(() => setLocalWarning(null), 3500);
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setNewCuentaPhone(value);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    
    if (newCuentaPhone && newCuentaPhone.length !== 10) {
      triggerWarning("El número de celular debe tener exactamente 10 dígitos");
      return;
    }
    
    if (!newCuentaName.trim()) {
       triggerWarning("Por favor ingresa un nombre para la cuenta");
       return;
    }
    
    handleAddCuenta(e);
    setIsExpanded(false); 
  };

  const handleCancel = () => {
    setIsExpanded(false);
    setNewCuentaName('');
    setNewCuentaPhone('');
    setLocalWarning(null);
  };

  if (isCompletamentePagada) return null;

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-800 lya:border-lya-border/40 bg-white dark:bg-gray-900 lya:bg-lya-surface relative z-20 shrink-0">
      
      {/* CÁPSULA NEO-BENTO ÁMBAR (Advertencia) */}
      <AnimatePresence>
        {localWarning && (
          <div className="absolute top-[105%] left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="bg-white/95 dark:bg-gray-900/95 lya:bg-lya-surface/95 backdrop-blur-xl text-gray-800 dark:text-white lya:text-lya-text px-4 py-3 rounded-[1.5rem] shadow-xl flex items-center justify-center gap-3 font-bold border border-amber-200/50 dark:border-amber-900/30 lya:border-amber-500/30 pointer-events-auto text-center"
            >
              <div className="bg-amber-100 dark:bg-amber-500/20 text-amber-500 p-1.5 rounded-full shrink-0">
                <AlertTriangle size={18} strokeWidth={2.5} />
              </div>
              <span className="text-[13px] tracking-wide">{localWarning}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONTENEDOR DE ANIMACIÓN FLUIDA (El secreto está en el overflow-hidden) */}
      <AnimatePresence mode="wait" initial={false}>
        {!isExpanded ? (
          <motion.div
            key="btn-wrapper"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full py-3.5 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg md:hover:bg-gray-100 dark:md:hover:bg-gray-700 text-gray-600 dark:text-gray-300 lya:text-lya-text rounded-xl font-bold text-sm transition-transform active:scale-95 border border-dashed border-gray-300 dark:border-gray-600 lya:border-lya-border flex items-center justify-center gap-2 outline-none shadow-sm"
            >
              <Plus size={18} strokeWidth={2.5} /> Añadir cuenta a la mesa
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="form-wrapper"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <form onSubmit={onSubmit} className="flex flex-col gap-2.5 pt-1">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={16} className="text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Nueva Cuenta..."
                    value={newCuentaName}
                    onChange={(e) => setNewCuentaName(e.target.value)}
                    className="focus:ring-inset w-full pl-9 pr-3 py-3 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 text-gray-900 dark:text-white lya:text-lya-text rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all placeholder-gray-400 dark:placeholder-gray-500 shadow-inner"
                  />
                </div>
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone size={16} className="text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="tel"
                    placeholder="Celular (Opcional)"
                    value={newCuentaPhone}
                    onChange={handlePhoneChange} // Blindaje activo
                    className="focus:ring-inset w-full pl-9 pr-3 py-3 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 text-gray-900 dark:text-white lya:text-lya-text rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all placeholder-gray-400 dark:placeholder-gray-500 shadow-inner"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-1">
                <button 
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 lya:text-lya-text rounded-xl font-bold text-sm transition-transform active:scale-95 border border-gray-200 dark:border-gray-700 outline-none"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={!newCuentaName.trim()}
                  className="flex-1 py-3 bg-gray-900 dark:bg-white lya:bg-lya-text text-white dark:text-gray-900 lya:text-lya-surface rounded-xl font-black text-sm transition-transform active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed outline-none shadow-md"
                >
                  <Plus size={18} strokeWidth={3} /> Agregar
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};