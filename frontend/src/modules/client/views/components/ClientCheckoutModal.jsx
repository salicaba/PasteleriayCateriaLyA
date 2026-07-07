// src/modules/client/views/components/ClientCheckoutModal.jsx
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Minus, Plus, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

export default function ClientCheckoutModal({
  cart,
  totalCart,
  isSubmitting,
  onClose,
  onConfirmOrder,
  removeFromCart,
  incrementInCart
}) {
  const [actionLoading, setActionLoading] = useState(null);
  
  // 🔥 CANDADO SÍNCRONO: Aniquila los "clics fantasmas" de los móviles en el milisegundo cero
  const isProcessingRef = useRef(false);

  const handleIncrement = async (e, cartItemId) => {
    // Evitamos el comportamiento nativo de doble toque/zoom en móviles
    e.preventDefault();
    e.stopPropagation();
    
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    setActionLoading({ id: cartItemId, action: 'increment' });
    try {
      await new Promise(resolve => setTimeout(resolve, 150)); // Delay sutil de 150ms para UX
      incrementInCart(cartItemId);
    } finally {
      setActionLoading(null);
      isProcessingRef.current = false;
    }
  };

  const handleDecrement = async (e, cartItemId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    setActionLoading({ id: cartItemId, action: 'decrement' });
    try {
      await new Promise(resolve => setTimeout(resolve, 150));
      removeFromCart(cartItemId);
    } finally {
      setActionLoading(null);
      isProcessingRef.current = false;
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex flex-col justify-end p-4">
      <div className="absolute inset-0" onClick={() => !isSubmitting && !actionLoading && onClose()} />
      <motion.div initial={{ y: '100%', scale: 0.95, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: '100%', scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 26, stiffness: 220 }} className="relative bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-[2.5rem] p-6 pb-8 space-y-5 shadow-2xl max-w-md mx-auto w-full border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between shrink-0">
          <h3 className="text-3xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">Tu Orden</h3>
          <motion.button 
            whileTap={{ scale: 0.95 }} 
            disabled={isSubmitting || actionLoading !== null} 
            onClick={onClose} 
            className="p-2 rounded-full bg-white dark:bg-gray-800 lya:bg-lya-surface border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 transition-colors text-gray-500 dark:text-gray-300 lya:text-lya-text disabled:opacity-50 outline-none select-none touch-manipulation"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </motion.button>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
          {cart.map(item => {
            const isThisItemLoading = actionLoading?.id === item.cartItemId;

            return (
              <div key={item.cartItemId} className="flex items-center justify-between bg-white dark:bg-gray-800 lya:bg-lya-surface p-4 rounded-3xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 shadow-sm transition-colors">
                <div className="min-w-0 flex-1 pr-3">
                  <h4 className="font-bold text-gray-900 dark:text-white lya:text-lya-text text-sm truncate">{item.nombre}</h4>
                  {item.detalles && (
                    <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-0.5 leading-tight">
                      {item.detalles.tamano && <span>{item.detalles.tamano}</span>}
                      {item.detalles.leche && <span> • {item.detalles.leche}</span>}
                      {item.detalles.extras && item.detalles.extras.length > 0 && <span> • +{item.detalles.extras.join(', ')}</span>}
                      {item.isTakeaway && <span className="block text-orange-500 dark:text-orange-400 lya:text-lya-secondary mt-0.5">Empaque P/Llevar</span>}
                    </div>
                  )}
                  
                  {/* PRECIO CON ESTADO DE CARGA */}
                  <div className="mt-1.5 flex items-baseline gap-2 h-5">
                    {isThisItemLoading ? (
                      <span className="flex items-center gap-1.5 text-xs font-black text-orange-500 dark:text-orange-400 lya:text-lya-secondary">
                        <Loader2 size={12} className="animate-spin" /> Cargando...
                      </span>
                    ) : (
                      <>
                        <span className="text-sm font-black text-gray-700 dark:text-gray-300 lya:text-lya-text/80">${(item.precioUnitario * item.qty).toFixed(2)}</span>
                        {item.qty > 1 && <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 lya:text-lya-text/50 uppercase">Unit: ${item.precioUnitario.toFixed(2)}</span>}
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-900 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 rounded-[1.25rem] p-1.5 shrink-0">
                  {/* 🔥 SE USA <button> NATIVO CON active:scale-90 PARA PREVENIR CRASHEOS DE FRAMER MOTION */}
                  <button 
                    disabled={isSubmitting || actionLoading !== null} 
                    onClick={(e) => handleDecrement(e, item.cartItemId)} 
                    className="w-8 h-8 flex items-center justify-center rounded-[1rem] bg-white dark:bg-gray-800 lya:bg-lya-surface text-gray-600 dark:text-gray-300 lya:text-lya-text md:hover:bg-red-50 dark:md:hover:text-red-500 dark:md:hover:bg-red-900/20 shadow-sm font-bold border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 disabled:opacity-50 outline-none select-none touch-manipulation active:scale-90 active:bg-gray-100 dark:active:bg-gray-700 transition-all"
                  >
                    {isThisItemLoading && actionLoading.action === 'decrement' ? <Loader2 size={16} className="animate-spin text-orange-500 lya:text-lya-primary" /> : <Minus size={16} strokeWidth={3} />}
                  </button>
                  
                  <span className="font-black w-4 text-center text-sm text-gray-900 dark:text-white lya:text-lya-text">{item.qty}</span>
                  
                  <button 
                    disabled={isSubmitting || actionLoading !== null} 
                    onClick={(e) => handleIncrement(e, item.cartItemId)} 
                    className="w-8 h-8 flex items-center justify-center rounded-[1rem] bg-gray-900 dark:bg-white lya:bg-lya-primary text-white dark:text-gray-900 shadow-sm font-bold disabled:opacity-50 disabled:bg-gray-400 outline-none select-none touch-manipulation active:scale-90 transition-all"
                  >
                    {isThisItemLoading && actionLoading.action === 'increment' ? <Loader2 size={16} className="animate-spin text-white dark:text-gray-900" /> : <Plus size={16} strokeWidth={3} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center py-4 border-y border-gray-200 dark:border-gray-800 lya:border-lya-border/40 text-gray-900 dark:text-white lya:text-lya-text shrink-0">
          <span className="text-sm font-bold text-gray-400 dark:text-gray-500 lya:text-lya-text/60">Total Bruto</span>
          {actionLoading ? (
            <div className="flex items-center text-orange-500 lya:text-lya-secondary">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : (
            <span className="text-3xl font-black tracking-tight">${totalCart.toFixed(2)}</span>
          )}
        </div>

        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-[1.5rem] p-5 flex gap-4 text-red-600 dark:text-red-400 shrink-0">
          <AlertTriangle size={24} className="shrink-0 mt-0.5" />
          <div className="text-xs font-medium leading-relaxed text-center">
            <p className="font-bold uppercase tracking-wider mb-1 text-[10px]">Políticas de confirmación</p>
            Al confirmar la orden, el pedido entra de forma automática a producción en cocina. Por seguridad operacional, <b>no se permiten cancelaciones posteriores</b>.
          </div>
        </div>

        <motion.button 
          whileTap={isSubmitting || actionLoading ? {} : { scale: 0.98 }} 
          disabled={isSubmitting || actionLoading !== null} 
          onClick={onConfirmOrder} 
          className={clsx(
            "w-full py-5 rounded-[2rem] font-black text-lg shadow-xl md:hover:brightness-105 transition-colors flex items-center justify-center gap-3 shrink-0 outline-none select-none touch-manipulation", 
            isSubmitting || actionLoading 
              ? "bg-gray-400 dark:bg-gray-700 lya:bg-lya-border text-white/70 cursor-not-allowed shadow-none" 
              : "bg-orange-500 dark:bg-orange-600 lya:bg-lya-primary text-white shadow-orange-500/30 dark:shadow-orange-900/40 lya:shadow-lya-primary/30"
          )}
        >
          {isSubmitting ? (
            <><Loader2 className="animate-spin" size={22} /><span>Enviando a cocina...</span></>
          ) : actionLoading ? (
            <><Loader2 className="animate-spin" size={22} /><span>Calculando Total...</span></>
          ) : (
            <><span>Confirmar Orden</span><CheckCircle size={22} strokeWidth={2.5} /></>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}