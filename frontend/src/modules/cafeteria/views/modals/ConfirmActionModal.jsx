// src/modules/cafeteria/views/modals/ConfirmActionModal.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

const modalColors = {
  blue: { icon: "text-blue-500 lya:text-lya-secondary", bg: "bg-blue-100 dark:bg-blue-900/30 lya:bg-lya-secondary/20", btn: "bg-blue-500 hover:bg-blue-600 lya:bg-lya-secondary lya:hover:bg-lya-secondary/90 text-white" },
  green: { icon: "text-emerald-500 lya:text-lya-primary", bg: "bg-emerald-100 dark:bg-emerald-900/30 lya:bg-lya-primary/20", btn: "bg-emerald-500 hover:bg-emerald-600 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white" },
  red: { icon: "text-red-500", bg: "bg-red-100 dark:bg-red-900/30", btn: "bg-red-500 hover:bg-red-600 text-white" }
};

export const ConfirmActionModal = ({
  modalConfig,
  setModalConfig,
  modalInputValue,
  setModalInputValue,
  isModalProcessing,
  setIsModalProcessing
}) => {
  if (!modalConfig) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/40 dark:bg-black/60 lya:bg-lya-dark/50 backdrop-blur-sm transition-colors">
        <motion.div 
          initial={{ scale: 0.95, y: 20, opacity: 0 }} 
          animate={{ scale: 1, y: 0, opacity: 1 }} 
          exit={{ scale: 0.95, y: 20, opacity: 0 }} 
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2rem] p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 transition-colors"
        >
          <div className={clsx("w-14 h-14 rounded-full flex items-center justify-center mb-4 shadow-sm", modalColors[modalConfig.color].bg)}>
            <modalConfig.icon size={28} strokeWidth={1.5} className={modalColors[modalConfig.color].icon} />
          </div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white lya:text-lya-text mb-2 tracking-tight">
            {modalConfig.title}
          </h3>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/70 mb-5 leading-relaxed">
            {modalConfig.message}
          </p>

          {modalConfig.requireInput && (
            <div className="w-full mb-5">
              <input 
                type={modalConfig.inputType || 'text'} 
                min={modalConfig.inputType === 'number' ? 1 : undefined} 
                max={modalConfig.inputMax}
                value={modalInputValue} 
                onChange={(e) => setModalInputValue(e.target.value)} 
                placeholder={modalConfig.inputPlaceholder}
                disabled={isModalProcessing}
                className="w-full bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg text-gray-900 dark:text-white lya:text-lya-text text-xs rounded-xl py-3 px-4 outline-none focus:ring-4 focus:ring-orange-500/10 lya:focus:ring-lya-primary/20 transition-all border-2 border-transparent focus:border-orange-500 dark:focus:border-orange-500 lya:focus:border-lya-primary text-center font-bold shadow-inner disabled:opacity-50"
              />
            </div>
          )}

          <div className="flex gap-2 w-full">
            <button 
              onClick={() => setModalConfig(null)} 
              disabled={isModalProcessing}
              className="flex-[1] bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg hover:bg-gray-200 dark:hover:bg-gray-700 lya:hover:bg-lya-border/50 border border-transparent dark:border-gray-700 lya:border-lya-border/30 text-gray-600 dark:text-gray-300 lya:text-lya-text py-3 rounded-xl font-bold text-xs transition-colors active:scale-95 disabled:opacity-50"
            >
              Volver
            </button>
            <button 
              onClick={async () => { 
                setIsModalProcessing(true);
                try {
                  await modalConfig.onConfirm(modalConfig.requireInput ? modalInputValue : undefined); 
                } catch (e) {
                  console.error(e);
                } finally {
                  setIsModalProcessing(false);
                  setModalConfig(null); 
                }
              }} 
              disabled={isModalProcessing || (modalConfig.requireInput && !modalInputValue.toString().trim())}
              className={clsx("flex-[1.5] py-3 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5", 
                isModalProcessing || (modalConfig.requireInput && !modalInputValue.toString().trim()) ? "opacity-60 cursor-not-allowed shadow-none" : "active:scale-95 shadow-md shadow-black/10", 
                modalColors[modalConfig.color].btn)}
            >
              {isModalProcessing && <Loader2 size={14} className="animate-spin" />}
              {isModalProcessing ? 'Procesando...' : modalConfig.confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};