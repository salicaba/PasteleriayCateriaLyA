// frontend/src/modules/client/views/components/ClientCheckoutModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Minus, Plus, AlertTriangle, Loader2, CheckCircle, Lock, Tag, Trash2, BadgePercent, Gift } from 'lucide-react';
import clsx from 'clsx';

export default function ClientCheckoutModal({
  cart = [], 
  totalCart = 0,
  isSubmitting,
  onClose,
  onConfirmOrder,
  removeFromCart,
  incrementInCart,
  deleteLine,
  promoWarning,          
  confirmPromoRupture,   
  cancelPromoRupture     
}) {
  const [actionLoading, setActionLoading] = useState(null);
  
  const isProcessingRef = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleAction = async (e, cartItemId, actionType, item = null) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      
      if (isProcessingRef.current) return;
      
      isProcessingRef.current = true;
      if (isMounted.current) setActionLoading({ id: cartItemId, action: actionType });
      
      if (actionType === 'increment') {
        incrementInCart(item || cartItemId);
      } else if (actionType === 'decrement') {
        removeFromCart(item || cartItemId);
      } else if (actionType === 'delete') {
        if (item && item.isAutoPromo && item.promoLabel !== 'OFERTA' && item.promoType !== 'FIXED') {
          deleteLine({
            cartItemId: cartItemId,
            _breakPromoQty: item.qty
          });
        } else {
          deleteLine(item || cartItemId);
        }
      }

      setTimeout(() => {
        if (isMounted.current) {
          setActionLoading(null);
          isProcessingRef.current = false;
        }
      }, 300);

    } catch (err) {
      console.error(err);
      isProcessingRef.current = false;
      setActionLoading(null);
    }
  };

  const regularItems = cart.filter(i => !i.isVirtualDiscount && i.promoType !== 'TICKET_DISCOUNT');
  const ticketDiscounts = cart.filter(i => i.isVirtualDiscount || i.promoType === 'TICKET_DISCOUNT');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex flex-col justify-end p-4">
      <div className="absolute inset-0" onClick={() => !isSubmitting && !actionLoading && !promoWarning?.isOpen && onClose()} />
      <motion.div initial={{ y: '100%', scale: 0.95, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: '100%', scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 26, stiffness: 220 }} className="relative bg-gray-50 dark:bg-gray-900 lya:bg-[#FAF6F0] rounded-[2.5rem] p-6 pb-8 space-y-5 shadow-2xl max-w-md mx-auto w-full border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] flex flex-col max-h-[85vh] overflow-hidden">
        
        <div className="flex items-center justify-between shrink-0">
          <h3 className="text-3xl font-black text-gray-900 dark:text-white lya:text-[#3E2723] tracking-tight">Tu Orden</h3>
          <motion.button 
            whileTap={{ scale: 0.95 }} 
            onClick={onClose} 
            className="p-2 rounded-full bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] transition-colors text-gray-500 dark:text-gray-300 lya:text-[#7A6353] md:hover:bg-gray-100 outline-none select-none touch-manipulation"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </motion.button>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
          {regularItems.map(item => {
            if (!item) return null;
            
            const isThisItemLoading = actionLoading?.id === item.cartItemId;
            const precioUnitario = Number(item.precioUnitario || 0);
            const qty = Number(item.qty || 0);
            const precioTotalItem = precioUnitario * qty;
            
            // Homologado con TicketCartGroup.jsx del POS
            const isCero = precioUnitario === 0;
            const isGhostPromo = item.isAutoPromo && isCero && item.promoType !== 'COMBO';
            const isNthPromo = item.isAutoPromo && (item.promoType === 'NTH_FIXED' || item.promoLabel?.includes('º') || item.promoLabel?.includes('REBAJADO'));
            const isComboPromo = item.isAutoPromo && item.promoType === 'COMBO';
            const isBogoPromo = item.isAutoPromo && item.promoType === 'BOGO';
            const isNxMPromo = item.isAutoPromo && item.promoType === 'NxM';

            const isLockedPromo = Boolean(isGhostPromo || isNthPromo || isComboPromo || isBogoPromo || isNxMPromo || (item.isAutoPromo && item.promoLabel !== 'OFERTA' && item.promoType !== 'FIXED'));

            const pOriginal = item.precioOriginal || (isGhostPromo ? item.precioBase || null : null);
            let promoText = item.promoLabel || (isGhostPromo ? 'GRATIS' : 'OFERTA');

            if (pOriginal && Number(pOriginal) > precioUnitario && !isGhostPromo && !item.promoLabel?.includes('º')) {
              const originalNum = Number(pOriginal);
              const discountAmt = originalNum - precioUnitario;
              const percentage = Math.round((discountAmt / originalNum) * 100);
              if (percentage > 0) promoText = `-${percentage}% OFF`;
            }

            const currentTotalQty = cart.filter(i => i.id === item.id && (!i.isAutoPromo || i.promoLabel === 'OFERTA')).reduce((acc, i) => acc + i.qty, 0);
            const isLimitReached = item.controlarStock && currentTotalQty >= item.stock && item.stock > 0;

            return (
              <div key={item.cartItemId} className={clsx(
                "flex items-center justify-between p-4 rounded-3xl border shadow-sm transition-colors",
                isLockedPromo 
                  ? "bg-rose-50/70 dark:bg-rose-900/15 lya:bg-rose-50/80 border-rose-200 dark:border-rose-800/40" 
                  : "bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] border-gray-200 dark:border-gray-700 lya:border-[#EADCC9]"
              )}>
                <div className="min-w-0 flex-1 pr-3">
                  <h4 className="font-bold text-gray-900 dark:text-white lya:text-[#3E2723] text-sm truncate">
                    {item.nombre || 'Producto'}
                  </h4>
                  
                  {item.detalles && (
                    <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 lya:text-[#7A6353] mt-0.5 leading-tight text-justify">
                      {item.detalles.tamano && <span>{item.detalles.tamano}</span>}
                      {item.detalles.leche && <span>{item.detalles.tamano ? ' | ' : ''}{item.detalles.leche}</span>}
                      {item.detalles.extras && item.detalles.extras.length > 0 && <span> + {item.detalles.extras.join(', ')}</span>}
                      {item.isTakeaway && <span className="block text-orange-500 dark:text-orange-400 mt-0.5">Empaque P/Llevar</span>}
                    </div>
                  )}
                  
                  <div className="mt-1.5 flex items-baseline gap-2 h-5 relative overflow-hidden">
                    {isThisItemLoading && (
                      <div className="absolute inset-0 bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] z-10 flex items-center gap-1.5">
                        <Loader2 size={12} className="animate-spin text-orange-500 dark:text-orange-400" />
                        <span className="text-xs font-black text-orange-500 dark:text-orange-400">Calculando...</span>
                      </div>
                    )}
                    
                    {(item.isAutoPromo || item.promoLabel) && (
                      <span className="inline-flex items-center gap-1 bg-rose-500 dark:bg-rose-600 text-white px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase shrink-0 shadow-sm">
                        {isGhostPromo ? <Gift size={10} strokeWidth={2.5} /> : <Tag size={10} strokeWidth={3} />}
                        <span>{promoText}</span>
                      </span>
                    )}

                    <span className={clsx(
                      "text-sm font-black",
                      (item.isAutoPromo || item.promoLabel) ? "text-rose-600 dark:text-rose-400" : "text-gray-700 dark:text-gray-300 lya:text-[#5D4037]"
                    )}>
                      ${precioTotalItem.toFixed(2)}
                    </span>
                    
                    {pOriginal && Number(pOriginal) > precioUnitario && (
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 line-through shrink-0">
                        ${(Number(pOriginal) * qty).toFixed(2)}
                      </span>
                    )}
                    
                    <span className={clsx(
                      "text-[9px] font-bold text-gray-400 dark:text-gray-500 lya:text-[#7A6353] uppercase transition-opacity shrink-0",
                      qty > 1 && !isGhostPromo ? "opacity-100" : "opacity-0 select-none pointer-events-none"
                    )}>
                      Unit: ${precioUnitario.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                {isLockedPromo ? (
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => handleAction(e, item.cartItemId, 'delete', item)} 
                      className="flex flex-col items-center justify-center rounded-[1rem] bg-rose-100/80 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 md:hover:bg-rose-200/70 shadow-sm font-bold border border-rose-200 dark:border-rose-800/50 outline-none select-none touch-manipulation transition-colors relative overflow-hidden px-3.5 py-2 shrink-0 h-[48px]"
                    >
                      {isThisItemLoading && actionLoading?.action === 'delete' ? (
                        <Loader2 size={16} className="animate-spin text-rose-500 absolute" />
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                            <div className="flex items-center gap-1">
                                <Trash2 size={12} strokeWidth={3} />
                                <span className="text-[9px] font-black uppercase tracking-wider">Eliminar Promo</span>
                            </div>
                            <span className="text-[8px] font-bold opacity-80 mt-0.5">Cantidad: x{qty}</span>
                        </div>
                      )}
                    </motion.button>
                ) : (
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-900 lya:bg-white border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] rounded-[1.25rem] p-1.5 shrink-0">
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => handleAction(e, item.cartItemId, 'delete', item)} 
                      className="w-8 h-8 flex items-center justify-center rounded-[1rem] bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 md:hover:bg-red-100 shadow-sm font-bold border border-red-100 dark:border-red-900/30 outline-none select-none touch-manipulation transition-colors relative overflow-hidden"
                    >
                      {isThisItemLoading && actionLoading?.action === 'delete' ? (
                        <Loader2 size={16} className="animate-spin text-red-500 absolute" />
                      ) : (
                        <Trash2 size={16} strokeWidth={2.5} className="absolute" />
                      )}
                    </motion.button>

                    <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 lya:bg-[#EADCC9]" />

                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => handleAction(e, item.cartItemId, 'decrement', item)} 
                      className="w-8 h-8 flex items-center justify-center rounded-[1rem] bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] text-gray-600 dark:text-gray-300 lya:text-[#7A6353] md:hover:bg-gray-50 shadow-sm font-bold border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] outline-none select-none touch-manipulation transition-colors relative overflow-hidden"
                    >
                      {isThisItemLoading && actionLoading?.action === 'decrement' ? (
                        <Loader2 size={16} className="animate-spin text-orange-500 absolute" />
                      ) : (
                        <Minus size={16} strokeWidth={3} className="absolute" />
                      )}
                    </motion.button>
                    
                    <span className="font-black w-4 text-center text-sm text-gray-900 dark:text-white lya:text-[#3E2723]">{qty}</span>
                    
                    <motion.button 
                      whileTap={!isLimitReached ? { scale: 0.9 } : {}}
                      onClick={(e) => {
                        if (isLimitReached) {
                          e.preventDefault();
                          e.stopPropagation();
                          incrementInCart(item);
                          return;
                        }
                        handleAction(e, item.cartItemId, 'increment', item);
                      }} 
                      className={clsx(
                        "w-8 h-8 flex items-center justify-center rounded-[1rem] shadow-sm font-bold outline-none select-none touch-manipulation transition-colors relative overflow-hidden",
                        isLimitReached
                          ? "bg-amber-100 text-amber-500 dark:bg-amber-900/30 dark:text-amber-500" 
                          : "bg-gray-900 dark:bg-white lya:bg-[#78350F] text-white dark:text-gray-900 md:hover:bg-gray-800 dark:md:hover:bg-gray-200 lya:md:hover:bg-[#5C240A]"
                      )}
                    >
                      {isThisItemLoading && actionLoading?.action === 'increment' && !isLimitReached ? (
                        <Loader2 size={16} className="animate-spin text-white dark:text-gray-900 absolute" />
                      ) : isLimitReached ? (
                        <Lock size={14} strokeWidth={3} className="absolute" />
                      ) : (
                        <Plus size={16} strokeWidth={3} className="absolute" />
                      )}
                    </motion.button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* SECCIÓN DE TICKET DISCOUNT (DESCUENTO GLOBAL) */}
        {ticketDiscounts.map(discount => (
            <motion.div 
                key={discount.cartItemId} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-[1.5rem] p-4 flex items-center justify-between shadow-sm shrink-0"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-800/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
                        <BadgePercent size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h4 className="text-emerald-800 dark:text-emerald-300 font-black text-sm">{discount.nombre}</h4>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{discount.promoLabel || 'Descuento Extra'}</span>
                    </div>
                </div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                    -${Math.abs(Number(discount.precioUnitario || 0)).toFixed(2)}
                </div>
            </motion.div>
        ))}

        <div className="flex justify-between items-center py-4 border-y border-gray-200 dark:border-gray-800 lya:border-[#EADCC9] text-gray-900 dark:text-white lya:text-[#3E2723] shrink-0 relative overflow-hidden h-16">
          <span className="text-sm font-bold text-gray-400 dark:text-gray-500 lya:text-[#7A6353] z-10">Total a Pagar</span>
          
          <div className="flex items-center justify-end z-10">
            {actionLoading ? (
              <Loader2 size={24} className="animate-spin text-orange-500" />
            ) : (
              <span className="text-3xl font-black tracking-tight">${Math.max(0, totalCart || 0).toFixed(2)}</span>
            )}
          </div>
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
            "w-full py-5 rounded-[2rem] font-black text-lg shadow-xl transition-colors flex items-center justify-center gap-3 shrink-0 outline-none select-none touch-manipulation relative overflow-hidden", 
            isSubmitting || actionLoading 
              ? "bg-gray-400 dark:bg-gray-700 lya:bg-[#EADCC9] text-white/70 cursor-not-allowed shadow-none" 
              : "bg-orange-500 dark:bg-orange-600 lya:bg-[#78350F] text-white md:hover:brightness-105 shadow-orange-500/30 dark:shadow-orange-900/40"
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

      {/* MODAL DE ADVERTENCIA DE PÉRDIDA DE PROMOCIÓN */}
      <AnimatePresence>
        {promoWarning?.isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white dark:bg-gray-800 lya:bg-[#FAF6F0] rounded-[2.5rem] p-6 max-w-sm w-full shadow-2xl border border-rose-100 dark:border-rose-900/30 flex flex-col items-center relative overflow-hidden">
              
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-500"></div>
              
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-full flex items-center justify-center mb-4 shadow-inner">
                <AlertTriangle size={32} />
              </div>
              
              <h3 className="text-xl font-black text-gray-900 dark:text-white lya:text-[#3E2723] mb-2 tracking-tight text-center">
                ¿Romper Promoción?
              </h3>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-[#7A6353] font-medium mb-8 leading-relaxed px-2 text-justify">
                {promoWarning.message}
              </p>
              
              <div className="flex gap-3 w-full">
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={cancelPromoRupture} 
                  className="flex-1 py-3.5 rounded-xl font-bold bg-gray-100 dark:bg-gray-700 lya:bg-[#EADCC9] text-gray-700 dark:text-gray-300 lya:text-[#7A6353] md:hover:bg-gray-200 transition-colors outline-none touch-manipulation text-center"
                >
                  Mantenerla
                </motion.button>

                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={confirmPromoRupture} 
                  className="flex-1 py-3.5 rounded-xl font-bold bg-rose-500 text-white md:hover:bg-rose-600 shadow-lg shadow-rose-500/30 transition-colors outline-none touch-manipulation text-center"
                >
                  Sí, quitar
                </motion.button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}