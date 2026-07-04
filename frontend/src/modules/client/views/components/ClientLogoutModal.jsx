// src/modules/client/views/components/ClientLogoutModal.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';

export default function ClientLogoutModal({ onClose, onConfirm }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 dark:bg-black/80 z-[90] flex items-center justify-center p-6">
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="relative bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] p-8 shadow-2xl max-w-[320px] w-full border border-gray-200 dark:border-gray-800 lya:border-lya-border/50 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 lya:bg-red-500/20 rounded-full flex items-center justify-center mb-4 shadow-sm">
          <LogOut size={32} strokeWidth={2} />
        </div>
        <h3 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-2 tracking-tight">¿Estás seguro?</h3>
        <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-medium text-sm mb-8 leading-relaxed">
          Tu sesión se cerrará y cualquier artículo en tu carrito que no hayas confirmado se perderá.
        </p>
        <div className="flex gap-3 w-full">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="flex-[1] py-3.5 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 lya:text-lya-text rounded-2xl font-bold transition-colors"
          >
            Cancelar
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={onConfirm}
            className="flex-[1] py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-colors shadow-lg shadow-red-500/30"
          >
            Abandonar
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}