//frontend/src/modules/pasteleria/views/modals/RefundConfirmModal.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2, Banknote, Smartphone } from 'lucide-react';

export default function RefundConfirmModal({ isOpen, onClose, onConfirm, devolucion, isSubmitting }) {
  // 🔥 Estado local para la elección del método
  const [metodo, setMetodo] = useState('efectivo');

  // Resetear el método siempre que se abre el modal
  useEffect(() => {
    if (isOpen) setMetodo('efectivo');
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => !isSubmitting && onClose()} 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-colors"
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.9, opacity: 0, y: 20 }} 
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 flex flex-col items-center relative z-10"
          >
            <div className="bg-amber-100 dark:bg-amber-900/30 p-4 rounded-full mb-5 text-amber-500 shadow-inner">
              <AlertTriangle size={36} strokeWidth={2.5} />
            </div>
            
            <h3 className="text-2xl font-black text-gray-800 dark:text-white lya:text-lya-text mb-3 text-center tracking-tight">
              ¿Registrar Reembolso?
            </h3>
            
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/70 mb-2 text-center px-2 leading-relaxed">
              El nuevo precio genera un saldo a favor de:
            </p>
            
            <span className="text-4xl font-black text-amber-500 mb-6 block text-center tracking-tighter">
              ${Number(devolucion).toFixed(2)}
            </span>

            {/* 🔥 Selector de Método de Reembolso Neo-Bento */}
            <div className="w-full mb-8">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block text-center">
                ¿Por dónde entregarás el dinero?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <motion.button type="button" whileTap={!isSubmitting ? { scale: 0.95 } : {}} onClick={() => setMetodo('efectivo')} disabled={isSubmitting}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-colors outline-none ${metodo === 'efectivo' ? 'border-emerald-500 bg-emerald-500/10 lya:border-lya-primary lya:bg-lya-primary/10 shadow-sm' : 'border-gray-100 dark:border-gray-800 lya:border-lya-border/40 bg-white dark:bg-gray-800 lya:bg-lya-surface hover:border-gray-300'}`}>
                  <Banknote size={24} className={`mb-1.5 ${metodo === 'efectivo' ? 'text-emerald-500 lya:text-lya-primary' : 'text-gray-400'}`} />
                  <span className={`text-[11px] font-bold ${metodo === 'efectivo' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>Efectivo</span>
                </motion.button>
                
                <motion.button type="button" whileTap={!isSubmitting ? { scale: 0.95 } : {}} onClick={() => setMetodo('transferencia')} disabled={isSubmitting}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-colors outline-none ${metodo === 'transferencia' ? 'border-purple-500 bg-purple-500/10 shadow-sm' : 'border-gray-100 dark:border-gray-800 lya:border-lya-border/40 bg-white dark:bg-gray-800 lya:bg-lya-surface hover:border-gray-300'}`}>
                  <Smartphone size={24} className={`mb-1.5 ${metodo === 'transferencia' ? 'text-purple-500' : 'text-gray-400'}`} />
                  <span className={`text-[11px] font-bold ${metodo === 'transferencia' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>Transferencia</span>
                </motion.button>
              </div>
            </div>

            <div className="flex w-full gap-3">
              <motion.button 
                whileTap={!isSubmitting ? { scale: 0.95 } : {}}
                onClick={onClose} 
                disabled={isSubmitting}
                className="flex-1 py-3.5 text-gray-600 dark:text-gray-300 lya:text-lya-text/80 bg-gray-100 md:hover:bg-gray-200 dark:bg-gray-800 dark:md:hover:bg-gray-700 lya:bg-lya-border/20 lya:md:hover:bg-lya-border/40 rounded-xl font-bold transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </motion.button>
              
              <motion.button 
                whileTap={!isSubmitting ? { scale: 0.95 } : {}}
                onClick={() => onConfirm(metodo)} // 🔥 Pasamos el método aquí
                disabled={isSubmitting}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-white rounded-xl font-bold transition-all outline-none shadow-lg ${
                  isSubmitting 
                    ? 'bg-amber-400 dark:bg-amber-600 opacity-70 cursor-wait shadow-none' 
                    : 'bg-amber-500 md:hover:bg-amber-600 shadow-amber-500/30 md:hover:-translate-y-0.5'
                }`}
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : null}
                {isSubmitting ? 'Guardando...' : 'Confirmar'}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}