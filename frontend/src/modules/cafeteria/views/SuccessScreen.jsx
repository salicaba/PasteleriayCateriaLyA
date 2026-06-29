// src/modules/cafeteria/views/SuccessScreen.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export const SuccessScreen = ({ 
  title = "¡Orden Enviada!", 
  message = "Imprimiendo en cocina..." 
}) => {
  return (
    <div className="absolute inset-0 z-[60] bg-gray-900/40 dark:bg-black/60 lya:bg-lya-dark/60 backdrop-blur-md flex flex-col items-center justify-center p-4 transition-colors">
      
      {/* Tarjetita (Card) */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.9, opacity: 0, y: 20 }} 
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] p-8 md:p-10 w-full max-w-sm shadow-2xl flex flex-col items-center border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 text-center transition-colors"
      >
        {/* Círculo Animado */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-24 h-24 bg-emerald-50 dark:bg-emerald-500/10 lya:bg-lya-primary/10 text-emerald-500 rounded-full flex items-center justify-center shadow-inner mb-6 border border-emerald-100 dark:border-emerald-800/30 lya:border-lya-primary/20"
        >
          <motion.div
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Check size={48} strokeWidth={3} className="text-emerald-500 dark:text-emerald-400 lya:text-lya-primary" />
          </motion.div>
        </motion.div>

        {/* Texto Animado */}
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-2 uppercase tracking-tight"
        >
          {title}
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/70 leading-relaxed"
        >
          {message}
        </motion.p>
      </motion.div>
    </div>
  );
};