// src/modules/cafeteria/views/components/ticket/TicketBottomBar.jsx
import React from 'react';
// 🔥 AQUÍ ESTÁ EL FIX: Agregamos Trash2 a la importación
import { ChefHat, CreditCard, CheckCheck, Printer, XCircle, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import clsx from 'clsx';

export const TicketBottomBar = ({
  mesaTotal,
  unsentTotal,
  hasUnsentItems,
  activeCart,
  isVitrina,
  isLlevar,
  isCompletamentePagada,
  
  showDeliverAllBtn,
  hasReadyItems,
  hasCookingItems,
  isDeliveringAll,
  handleDeliverAll,
  openConfirmModal,
  
  onPrintTicket,
  onCancelFullOrder,
  onCancelAccount,
  setShowCancelModal,
  
  handleCloseTableClick,
  isClosingTable,
  
  handleSendToKitchenClick,
  isSendingToKitchen,
  
  handleCheckoutClick,
  isCheckingOut
}) => {
  return (
    <div className="p-3 sm:p-4 bg-white dark:bg-gray-900 lya:bg-lya-surface border-t border-gray-100 dark:border-gray-800 lya:border-lya-border/40 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-20 shrink-0 transition-colors">
      
      {showDeliverAllBtn && (
        <button
           disabled={!hasReadyItems || isDeliveringAll}
           onClick={() => openConfirmModal({
               title: (isVitrina || isLlevar) ? 'Entregar Todo el Pedido' : 'Entregar Toda la Mesa',
               message: hasCookingItems 
                 ? ((isVitrina || isLlevar) ? 'Aún hay productos en preparación. ¿Seguro que deseas marcar TODOS los productos del pedido como entregados?' : 'Aún hay productos en preparación. ¿Seguro que deseas marcar TODOS los productos de la mesa como entregados?')
                 : ((isVitrina || isLlevar) ? '¿Confirmas que ya entregaste los productos listos del pedido?' : '¿Confirmas que ya entregaste los productos listos a la mesa?'),
               icon: CheckCheck, color: 'green', confirmText: 'Sí, Entregar',
               onConfirm: async () => await handleDeliverAll()
           })}
           className={clsx(
             "w-full mb-3 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all shadow-sm border",
             isDeliveringAll ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 border-emerald-300 cursor-wait opacity-80" :
             hasReadyItems
               ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-800/40 active:scale-95 cursor-pointer lya:border-lya-primary lya:bg-lya-primary/10 lya:text-lya-primary"
               : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-transparent cursor-not-allowed opacity-70"
           )}
        >
           {isDeliveringAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
           {isDeliveringAll ? 'Entregando...' : (hasReadyItems ? ((isVitrina || isLlevar) ? 'Entregar Todo El Pedido' : 'Entregar Toda La Mesa') : 'Esperando a Cocina...')}
        </button>
      )}

      {isCompletamentePagada ? (
         <div className="flex gap-2 animate-fade-in">
            <button onClick={() => onPrintTicket()} className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl font-black text-[9px] uppercase bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg border border-transparent dark:border-gray-700 lya:border-lya-border/40 text-gray-700 dark:text-gray-300 lya:text-lya-text active:scale-95 transition-all hover:bg-gray-200 dark:hover:bg-gray-700 shadow-sm">
              <Printer size={14} /><span>Imprimir</span>
            </button>
            
            {isVitrina && onCancelFullOrder && (
                <button 
                  onClick={() => {
                      openConfirmModal({
                          title: 'Cancelar Venta Express',
                          message: '¿Estás seguro de cancelar esta venta de mostrador?',
                          icon: AlertTriangle,
                          color: 'red',
                          confirmText: 'Sí, Cancelar',
                          requireInput: true,
                          inputType: 'text',
                          inputPlaceholder: 'Motivo de cancelación (opcional)',
                          inputDefault: 'Cancelado desde POS',
                          onConfirm: async (reason) => {
                              await onCancelFullOrder(reason);
                          }
                      });
                  }} 
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl font-black text-[9px] uppercase bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 active:scale-95 transition-all hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/50 shadow-sm"
                >
                  <Trash2 size={14} /><span>Cancelar</span>
                </button>
            )}

            {!isVitrina && (onCancelFullOrder || onCancelAccount) && (
                <button 
                  onClick={() => setShowCancelModal(true)} 
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl font-black text-[9px] uppercase bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 active:scale-95 transition-all hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/50 shadow-sm"
                >
                  <AlertTriangle size={14} /><span>Cancelar</span>
                </button>
            )}

            <button 
               onClick={handleCloseTableClick}
               disabled={isClosingTable}
               className={clsx(
                 "flex-[1.5] flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl font-black text-[9px] uppercase shadow-md transition-all",
                 isClosingTable ? "bg-red-400 text-white cursor-wait opacity-80 shadow-none" : "bg-red-500 text-white hover:bg-red-600 active:scale-95 shadow-red-500/30"
               )}
            >
              {isClosingTable ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              <span>
                 {isClosingTable ? 'Procesando...' : (isVitrina ? 'Siguiente Venta' : (isLlevar ? 'Finalizar Pedido' : 'Liberar Mesa'))}
              </span>
            </button>
         </div>
      ) : (
         <>
           <div className="space-y-2 mb-3">
             <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-[10px] font-bold uppercase tracking-wider"><span>{isVitrina ? 'Total de Productos' : (isLlevar ? 'Subtotal Pedido' : 'Subtotal Mesa')}</span><span>${isVitrina ? (mesaTotal + unsentTotal).toFixed(2) : mesaTotal.toFixed(2)}</span></div>
             {!isVitrina && hasUnsentItems && (<div className="flex justify-between items-center text-orange-500 dark:text-orange-400 lya:text-lya-primary text-[10px] font-black uppercase tracking-wider bg-orange-50 dark:bg-orange-500/10 lya:bg-lya-primary/10 p-1.5 rounded-md border border-orange-100 dark:border-orange-500/20 lya:border-lya-primary/20"><span>Por enviar a Cocina</span><span>+${unsentTotal.toFixed(2)}</span></div>)}
             <div className="flex justify-between items-end pt-1"><span className="text-gray-900 dark:text-white lya:text-lya-text font-black text-xs uppercase tracking-tight">Total a pagar</span><span className="text-3xl sm:text-4xl font-black text-orange-500 dark:text-orange-400 lya:text-lya-primary tracking-tighter drop-shadow-sm leading-none">${(mesaTotal + unsentTotal).toFixed(2)}</span></div>
           </div>
           
           <div className="flex gap-2">
             {!isVitrina && (
               <button onClick={handleSendToKitchenClick} disabled={!hasUnsentItems || isSendingToKitchen} className={clsx("flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 rounded-xl font-black text-[10px] sm:text-xs transition-all border-2 uppercase", isSendingToKitchen ? "bg-orange-100 dark:bg-orange-900/40 text-orange-400 border-orange-200 cursor-wait opacity-80" : hasUnsentItems ? "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 lya:border-lya-primary/30 lya:bg-lya-primary/10 text-orange-500 dark:text-orange-400 lya:text-lya-primary shadow-sm hover:bg-orange-100 dark:hover:bg-orange-500/20 active:scale-95"  : "bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border-transparent text-gray-400 dark:text-gray-600 lya:text-lya-text/40 cursor-not-allowed")}>
                 {isSendingToKitchen ? <Loader2 size={16} className="animate-spin" /> : <ChefHat size={16} strokeWidth={2.5} />}<span>Enviar Cocina</span>
               </button>
             )}
             <button onClick={handleCheckoutClick} disabled={(activeCart.length === 0 && mesaTotal === 0 && unsentTotal === 0) || isCheckingOut} className={clsx("flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 rounded-xl font-black text-[10px] sm:text-xs transition-all border uppercase", isVitrina ? "flex-1" : "flex-[1.5]", isCheckingOut ? "bg-emerald-400 border-emerald-500 text-white cursor-wait opacity-80" : (activeCart.length > 0 || mesaTotal > 0 || unsentTotal > 0) ? "bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-500/30 dark:shadow-emerald-900/30 hover:bg-emerald-600 lya:bg-lya-secondary lya:border-lya-secondary lya:hover:bg-lya-secondary/90 lya:shadow-lya-secondary/30 active:scale-95" : "bg-gray-200 dark:bg-gray-800 lya:bg-lya-bg border-transparent text-gray-400 dark:text-gray-600 lya:text-lya-text/40 cursor-not-allowed shadow-none")}>
               {isCheckingOut ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} strokeWidth={2.5} />}<span>{isVitrina ? 'Cobrar Express' : (isLlevar ? 'Cobrar Pedido' : 'Cobrar Mesa')}</span>
             </button>
           </div>
         </>
      )}

      {(!isVitrina) && activeCart.some(i => i.enviadoCocina) && (onCancelFullOrder || onCancelAccount) && !isCompletamentePagada && (
          <button 
             onClick={() => setShowCancelModal(true)} 
             className="w-full mt-3 py-1.5 text-[9px] font-black text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors uppercase tracking-widest flex items-center justify-center gap-1"
          >
             <AlertTriangle size={12}/> Opciones de Cancelación
          </button>
      )}
    </div>
  );
};