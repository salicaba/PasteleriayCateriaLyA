import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';

export const ClientLogoutModal = ({ isOpen, onClose, onLogout }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleConfirm = async () => {
    setIsLoggingOut(true);
    // Retardo para UX (Se ve el spinner y bloquea el botón)
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Llamamos a la función que viene desde ClientApp.jsx
    onLogout();
    setIsLoggingOut(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-3xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 text-center"
      >
        <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <LogOut size={32} strokeWidth={2.5} />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white lya:text-lya-text mb-2">
          ¿Salir de la mesa?
        </h3>
        <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-6 text-sm">
          Tendrás que volver a escanear el código QR para poder ordenar.
        </p>
        
        <div className="flex gap-3 w-full">
          <button
            onClick={() => !isLoggingOut && onClose()}
            disabled={isLoggingOut}
            className="flex-1 py-3 rounded-2xl font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 outline-none"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={isLoggingOut}
            className="flex-1 py-3 rounded-2xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-80 disabled:cursor-not-allowed outline-none"
          >
            {isLoggingOut ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saliendo...</span>
              </>
            ) : (
              'Sí, salir'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};