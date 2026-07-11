// src/modules/cafeteria/views/components/ToastNotification.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

export const ToastNotification = ({ message, type }) => {
  return (
    <AnimatePresence>
      {message && (
        <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className={`bg-white dark:bg-gray-900 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 font-bold border pointer-events-auto max-w-md w-full sm:w-auto text-center ${
              type === 'error' ? 'border-red-100 dark:border-red-900/30 lya:border-red-500/30' : 
              type === 'warning' ? 'border-amber-100 dark:border-amber-900/30 lya:border-amber-500/30' :
              'border-emerald-100 dark:border-emerald-900/30 lya:border-lya-primary/30'
            }`}
          >
            <div className={`p-1.5 rounded-full shrink-0 ${
              type === 'error' ? 'bg-red-100 dark:bg-red-500/20 text-red-500' : 
              type === 'warning' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-500 lya:text-amber-400' :
              'bg-emerald-100 dark:bg-emerald-500/20 lya:bg-lya-primary/20 text-emerald-500 lya:text-lya-primary'
            }`}>
              {type === 'error' ? <AlertCircle size={20} /> : type === 'warning' ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
            </div>
            <span className="text-sm">{message}</span>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};