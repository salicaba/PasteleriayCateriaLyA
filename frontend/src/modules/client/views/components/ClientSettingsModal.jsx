// src/modules/client/views/components/ClientSettingsModal.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { X, Palette, Type, LogOut } from 'lucide-react';
import { THEME_NAMES, SIZES } from '../utils/clientMenuUtils';

export default function ClientSettingsModal({
  themeIndex,
  sizeIndex,
  cycleTheme,
  cycleSize,
  onClose,
  onLogoutClick
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 dark:bg-black/80 z-[80] flex items-center justify-center p-6">
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="relative bg-white dark:bg-gray-900 lya:bg-lya-bg rounded-[2.5rem] p-6 shadow-2xl max-w-[280px] w-full border border-gray-200 dark:border-gray-800 lya:border-lya-border/50 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text">Ajustes</h3>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onClose} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 lya:bg-lya-surface text-gray-500 dark:text-gray-400 lya:text-lya-text md:hover:bg-gray-200 transition-colors"><X size={18} strokeWidth={3} /></motion.button>
        </div>
        <div className="space-y-4">
          <motion.button whileTap={{ scale: 0.95 }} onClick={cycleTheme} className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-gray-50 dark:bg-gray-800 lya:bg-lya-surface border border-gray-200/60 dark:border-gray-700/60 lya:border-lya-border/40 md:hover:border-orange-500/50 transition-colors group shadow-sm">
            <div className="flex items-center gap-3 text-gray-800 dark:text-gray-200 lya:text-lya-text"><Palette size={20} className="text-orange-500 dark:text-orange-400 lya:text-lya-secondary transition-transform md:group-hover:rotate-12" /><span className="font-bold text-sm">Tema</span></div>
            <span className="text-xs font-black bg-white dark:bg-gray-700 lya:bg-lya-bg px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-600 lya:border-lya-border/30 text-gray-700 dark:text-gray-200 lya:text-lya-text shadow-sm">{THEME_NAMES[themeIndex]}</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={cycleSize} className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-gray-50 dark:bg-gray-800 lya:bg-lya-surface border border-gray-200/60 dark:border-gray-700/60 lya:border-lya-border/40 md:hover:border-orange-500/50 transition-colors group shadow-sm">
            <div className="flex items-center gap-3 text-gray-800 dark:text-gray-200 lya:text-lya-text"><Type size={20} className="text-orange-500 dark:text-orange-400 lya:text-lya-secondary transition-transform md:group-hover:scale-110" /><span className="font-bold text-sm">Tamaño</span></div>
            <span className="text-xs font-black bg-white dark:bg-gray-700 lya:bg-lya-bg px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-600 lya:border-lya-border/30 text-gray-700 dark:text-gray-200 lya:text-lya-text shadow-sm">{SIZES[sizeIndex].name}</span>
          </motion.button>
        </div>

        <motion.button 
          whileTap={{ scale: 0.95 }} 
          onClick={onLogoutClick} 
          className="w-full mt-6 flex items-center justify-center gap-2 p-4 rounded-[1.5rem] bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-500/30"
        >
          <LogOut size={20} strokeWidth={2.5} />
          <span>Abandonar Mesa</span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}