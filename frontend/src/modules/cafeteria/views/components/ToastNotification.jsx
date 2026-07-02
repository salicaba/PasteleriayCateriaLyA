// src/modules/cafeteria/views/components/ToastNotification.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export const ToastNotification = ({ message, type }) => {
  return (
    <AnimatePresence>
      {message && (
        <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="bg-white dark:bg-gray-900 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 font-bold border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 pointer-events-auto"
          >
            <div className={`p-1.5 rounded-full shrink-0 ${type === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/20 lya:bg-lya-primary/20 text-emerald-500 lya:text-lya-primary' : 'bg-red-100 dark:bg-red-500/20 text-red-500'}`}>
              {type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            </div>
            <span className="text-sm">{message}</span>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};