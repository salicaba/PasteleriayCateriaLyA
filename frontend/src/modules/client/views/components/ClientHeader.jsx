// src/modules/client/views/components/ClientHeader.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Settings, Utensils, ShoppingBag } from 'lucide-react';

export default function ClientHeader({
  displayName,
  displayPhone,
  type,
  tableId,
  categories,
  activeCategory,
  setActiveCategory,
  setShowSettings
}) {
  // 🔥 LA CURA: Extraemos el número visual. Si es el objeto nuevo usa .numero, sino usa el valor directo.
  const numeroVisual = tableId?.numero || tableId;

  return (
    <header className="px-6 pt-6 pb-3 shrink-0 space-y-4 z-10 sticky top-0 bg-gray-50 dark:bg-gray-900 lya:bg-[#FAF6F0] border-b border-gray-200 dark:border-gray-800 lya:border-[#EADCC9] transition-colors">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 lya:text-[#7A6353] uppercase tracking-wider text-left">Menú Digital</p>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-[#3E2723] truncate text-left leading-tight">Hola, {displayName}</h2>
          {displayPhone && (
            <div className="flex items-center gap-1 mt-1.5 w-fit px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 lya:bg-emerald-50/50 rounded-md border border-emerald-100 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-black tracking-widest">
              <Phone size={12} /><span>{displayPhone}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowSettings(true)} className="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] shadow-sm text-gray-600 dark:text-gray-400 lya:text-[#7A6353] transition-colors md:hover:bg-gray-100 outline-none"><Settings size={18} /></motion.button>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] shadow-sm text-[10px] font-bold text-gray-700 dark:text-gray-300 lya:text-[#7A6353] rounded-full">
            {type === 'mesa' ? <Utensils size={12} className="text-orange-500 dark:text-orange-400 lya:text-[#78350F]" /> : <ShoppingBag size={12} className="text-orange-500 dark:text-orange-400 lya:text-[#78350F]" />}
            
            {/* 🔥 Aplicamos la variable curada aquí */}
            <span>{type === 'mesa' ? `Mesa ${numeroVisual}` : 'Llevar'}</span>
            
          </div>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 pt-0.5 -mx-6 px-6">
        {categories.map(cat => (
          <motion.button 
            whileTap={{ scale: 0.95 }} 
            key={cat.id} 
            onClick={() => setActiveCategory(cat.id)} 
            className={`whitespace-nowrap px-4 py-2 rounded-xl font-bold text-xs transition-colors border outline-none select-none touch-manipulation ${activeCategory === cat.id ? 'bg-orange-500 dark:bg-orange-600 lya:bg-[#78350F] text-white border-transparent shadow-md' : 'bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] text-gray-600 dark:text-gray-400 lya:text-[#7A6353] shadow-sm'}`}
          >
            {cat.name}
          </motion.button>
        ))}
      </div>
    </header>
  );
}