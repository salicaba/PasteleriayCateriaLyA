// src/modules/cafeteria/views/components/ticket/TicketCancelledItems.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export const TicketCancelledItems = ({
  cancelledCart,
  showCancelled,
  setShowCancelled,
  isLlevar,
  nombreCliente
}) => {
  if (cancelledCart.length === 0) return null;

  return (
    <div className="mt-4 mb-2 border-2 border-dashed border-red-200 dark:border-red-900/50 lya:border-red-500/30 rounded-2xl p-3 bg-red-50/50 dark:bg-red-950/20 lya:bg-red-500/5 transition-colors">
        <button onClick={() => setShowCancelled(!showCancelled)} className="flex justify-between items-center w-full text-red-500 dark:text-red-400 font-black text-[9px] uppercase tracking-widest hover:text-red-600 transition-colors">
            <span className="flex items-center gap-1.5"><Trash2 size={12}/> Cancelados ({cancelledCart.reduce((sum, i) => sum + i.qty, 0)})</span>
            <ChevronDown size={12} className={clsx("transition-transform duration-300", showCancelled ? "rotate-180" : "")}/>
        </button>
        <AnimatePresence>
            {showCancelled && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3 space-y-1.5">
                    {cancelledCart.map((cItem, i) => (
                        <div key={i} className="flex justify-between items-center bg-white dark:bg-gray-900 lya:bg-lya-surface p-2 rounded-xl border border-red-100 dark:border-red-900/50 opacity-80 shadow-sm transition-colors">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[9px] font-black text-red-600 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800/50">{cItem.qty}x</span>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 lya:text-lya-text truncate">{cItem.nombre}</span>
                                  <span className="text-[8px] text-gray-500 dark:text-gray-500 uppercase font-medium">{isLlevar && nombreCliente ? nombreCliente : cItem.cuenta}</span>
                                </div>
                            </div>
                            <span className="text-[9px] font-black text-gray-400 line-through shrink-0">${(cItem.precio * cItem.qty).toFixed(2)}</span>
                        </div>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};