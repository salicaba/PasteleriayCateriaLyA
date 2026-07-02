// src/modules/cafeteria/views/modals/VentasHoyModal.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X, RotateCcw, Banknote, CreditCard, ArrowRightLeft, ShoppingBag } from 'lucide-react';

export const VentasHoyModal = ({ isOpen, onClose, ingresosTotales }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9990] flex justify-end overflow-hidden">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0" />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative z-10 w-full max-w-md h-[100dvh] bg-white dark:bg-gray-900 lya:bg-lya-surface shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/40 shrink-0">
              <div className="flex items-center gap-3 text-[#24d366]">
                <div className="p-2 bg-[#24d366]/10 rounded-xl"><CheckCircle size={24} /></div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text">Flujo de Caja Hoy</h2>
              </div>
              <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar pb-10">
              {ingresosTotales.length > 0 ? (
                ingresosTotales.map(tx => {
                  const esReembolso = Number(tx.amount) < 0;
                  return (
                  <div key={tx.id} className={`p-4 border rounded-2xl flex justify-between items-start group transition-colors shadow-sm ${esReembolso ? 'border-red-100 dark:border-red-900/30 lya:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 lya:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20' : 'border-green-100 dark:border-green-900/30 lya:border-emerald-900/50 bg-green-50/50 dark:bg-green-900/10 lya:bg-emerald-900/10 hover:bg-green-50 dark:hover:bg-green-900/20'}`}>
                    <div className="flex gap-3 w-full pr-3">
                      <div className={`p-2.5 rounded-xl shadow-sm shrink-0 h-10 w-10 flex items-center justify-center border ${esReembolso ? 'bg-white dark:bg-gray-800 lya:bg-lya-bg text-red-500 border-red-100 dark:border-red-900/50 lya:border-red-900/50' : 'bg-white dark:bg-gray-800 lya:bg-lya-bg text-[#24d366] border-green-100 dark:border-green-900/50 lya:border-emerald-900/50'}`}>
                        {esReembolso ? <RotateCcw size={20} /> : tx.paymentMethod === 'CASH' ? <Banknote size={20} /> : tx.paymentMethod === 'CARD' ? <CreditCard size={20} /> : <ArrowRightLeft size={20} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-black mb-0.5 text-sm tracking-tight ${esReembolso ? 'text-red-600 dark:text-red-400 lya:text-red-400' : 'text-gray-900 dark:text-white lya:text-lya-text'}`}>
                          {tx.folio || (esReembolso ? 'Reembolso' : 'Cobro Exitoso')}
                        </p>
                        {(() => {
                          const partes = (tx.description || '').split(' | ');
                          const descOriginal = partes[0];
                          const modificaciones = partes.slice(1);
                          return (
                            <div className="flex flex-col gap-1 mb-1">
                              <p className="text-[10px] text-gray-500 font-medium leading-snug">{descOriginal}</p>
                              {modificaciones.length > 0 && (
                                <div className="flex flex-col gap-1 mt-0.5">
                                  {modificaciones.map((mod, i) => {
                                    const isRestaurado = mod.includes('📈');
                                    return (
                                      <span key={i} className={`text-[9px] font-black px-2 py-0.5 rounded-md border w-fit flex items-center shadow-sm ${
                                        isRestaurado 
                                          ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50' 
                                          : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50'
                                      }`}>
                                        {mod}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${esReembolso ? 'text-red-500 bg-red-500/10' : 'text-[#24d366] bg-[#24d366]/10'}`}>
                            {esReembolso ? 'Cancelación' : (tx.paymentMethod === 'CASH' ? 'Efectivo' : tx.paymentMethod === 'CARD' ? 'Tarjeta' : 'Transferencia')}
                          </span>
                          <span className="text-[9px] text-gray-400 font-bold">
                            {new Date(tx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-lg font-black shrink-0 ${esReembolso ? 'text-red-500' : 'text-[#24d366]'}`}>
                      {esReembolso ? `-$${Math.abs(tx.amount).toFixed(2)}` : `+$${Number(tx.amount).toFixed(2)}`}
                    </span>
                  </div>
                )})
              ) : (
                <div className="text-center text-gray-400 mt-10">
                  <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold">Aún no hay ventas</p>
                  <p className="text-xs">Los cobros y reembolsos aparecerán aquí detallados.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};