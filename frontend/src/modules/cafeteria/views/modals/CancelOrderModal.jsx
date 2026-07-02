// src/modules/cafeteria/views/modals/CancelOrderModal.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Loader2 } from 'lucide-react';

export const CancelOrderModal = ({ 
  orderToCancel, 
  onClose, 
  isCanceling, 
  onConfirm 
}) => {
  return (
    <AnimatePresence>
      {orderToCancel && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => !isCanceling && onClose()} 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0" 
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.95, opacity: 0, y: 20 }} 
            className="relative z-10 w-full max-w-sm bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 p-8 text-center flex flex-col items-center"
          >
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 lya:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-5 shadow-sm">
              {isCanceling ? (
                <Loader2 size={32} className="animate-spin" />
              ) : (
                <Trash2 size={32} strokeWidth={1.5} />
              )}
            </div>
            
            <h3 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight mb-3">
              {isCanceling ? 'Eliminando...' : '¿Eliminar Cuenta?'}
            </h3>
            
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/70 mb-8 leading-relaxed">
              Estás a punto de cancelar y enviar a la papelera la cuenta <span className="font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text">{orderToCancel.numero}</span>.
            </p>
            
            <div className="flex gap-3 w-full">
              <button 
                onClick={onClose}
                disabled={isCanceling}
                className={`flex-1 px-4 py-3.5 rounded-2xl font-bold text-sm bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-gray-600 dark:text-gray-300 lya:text-lya-text transition-colors ${isCanceling ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95'}`}
              >
                Cancelar
              </button>
              <button 
                disabled={isCanceling}
                onClick={() => onConfirm(orderToCancel.orderId)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-bold text-sm text-white shadow-lg shadow-red-500/30 transition-all ${isCanceling ? 'bg-red-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 active:scale-95'}`}
              >
                {isCanceling ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Espera...</span>
                  </>
                ) : (
                  'Sí, Eliminar'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};