// src/modules/cafeteria/views/components/ticket/TicketBottomBar.jsx
import React from 'react';
import { ChefHat, CreditCard, CheckCheck, Printer, XCircle, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export const TicketBottomBar = ({
  mesaTotal,
  unsentTotal,
  hasUnsentItems,
  activeCart,
  isVitrina,
  isLlevar,
  paidAccounts = [],
  cuentasOcultas = [],
  orderStatus, 
  cuentasPagadasReales = [], 
  
  showDeliverAllBtn,
  hasReadyItems,
  hasCookingItems,
  isDeliveringAll,
  handleDeliverAll,
  openConfirmModal,
  
  onCancelFullOrder,
  onCancelAccount,
  setShowCancelModal,
  
  onOpenReleaseModal,
  // 🔥 ELIMINAMOS onOpenPrintModal de aquí
  
  onPrintTicket, // Usamos la función de imprimir original
  
  handleCloseTableClick,
  isClosingTable,
  
  handleSendToKitchenClick,
  isSendingToKitchen,
  
  handleCheckoutClick,
  isCheckingOut
}) => {

  const cuentasPagadasVisibles = cuentasPagadasReales.filter(acc => !cuentasOcultas.includes(acc));
  const hasCuentasPagadas = cuentasPagadasVisibles.length > 0;
  
  const allCartAccounts = Array.from(new Set(activeCart.map(i => i.cuenta || 'General')));
  const cuentasActivasArray = allCartAccounts.filter(acc => !cuentasPagadasReales.includes(acc));
  const hasCuentasActivas = cuentasActivasArray.length > 0;

  const isAnyCuentaReadyToPay = cuentasActivasArray.some(cuenta => {
    const itemsDeCuenta = activeCart.filter(i => (i.cuenta || 'General') === cuenta);
    if (itemsDeCuenta.length === 0) return false;
    return itemsDeCuenta.every(i => i.enviadoCocina && i.kitchenStatus === 'DELIVERED');
  });

  const totalPendiente = activeCart
    .filter(item => !cuentasPagadasReales.includes(item.cuenta || 'General'))
    .reduce((acc, curr) => acc + (curr.precio * curr.qty), 0);

  return (
    <div className="p-3 sm:p-4 bg-white dark:bg-gray-900 lya:bg-lya-surface border-t border-gray-100 dark:border-gray-800 lya:border-lya-border/40 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-20 shrink-0 transition-colors flex flex-col gap-3">
      
      <AnimatePresence>
        {hasCuentasPagadas && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 4 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="flex gap-2 overflow-hidden"
          >
            {/* 🔥 FIX: Ahora abre el Comprobante Digital DIRECTO */}
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => onPrintTicket(cuentasPagadasVisibles.length === 1 ? cuentasPagadasVisibles[0] : null)} 
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[10px] uppercase bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg border border-transparent dark:border-gray-700 lya:border-lya-border/40 text-gray-700 dark:text-gray-300 lya:text-lya-text transition-all md:hover:bg-gray-200 dark:md:hover:bg-gray-700 shadow-sm outline-none"
            >
              <Printer size={14} /><span>Tickets ({cuentasPagadasVisibles.length})</span>
            </motion.button>
            
            <motion.button 
               whileTap={{ scale: 0.95 }}
               onClick={isVitrina || isLlevar ? handleCloseTableClick : onOpenReleaseModal}
               disabled={isClosingTable}
               className={clsx(
                 "flex-[1.5] flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-md transition-all outline-none",
                 isClosingTable ? "bg-blue-400 text-white cursor-wait opacity-80" : "bg-blue-500 text-white md:hover:bg-blue-600 shadow-blue-500/30 lya:bg-lya-secondary lya:md:hover:bg-lya-secondary/90 lya:shadow-lya-secondary/30"
               )}
            >
              {isClosingTable ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              <span>{isClosingTable ? 'Procesando...' : (isVitrina ? 'Siguiente Venta' : isLlevar ? 'Finalizar Pedido' : 'Liberar Cuentas')}</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {showDeliverAllBtn && (
        <motion.button
           whileTap={!isDeliveringAll && hasReadyItems ? { scale: 0.95 } : {}}
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
             "w-full py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all shadow-sm border outline-none",
             isDeliveringAll ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 border-emerald-300 cursor-wait opacity-80" :
             hasReadyItems
               ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50 md:hover:bg-emerald-100 dark:md:hover:bg-emerald-800/40 cursor-pointer lya:border-lya-primary lya:bg-lya-primary/10 lya:text-lya-primary"
               : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-transparent cursor-not-allowed opacity-70 shadow-none"
           )}
        >
           {isDeliveringAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
           {isDeliveringAll ? 'Entregando...' : (hasReadyItems ? ((isVitrina || isLlevar) ? 'Entregar Todo El Pedido' : 'Entregar Toda La Mesa') : 'Esperando a Cocina...')}
        </motion.button>
      )}

      <AnimatePresence>
        {hasCuentasActivas && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
             <div className="space-y-1.5">
               <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-[10px] font-bold uppercase tracking-wider">
                 <span>{isVitrina ? 'Total de Productos' : (isLlevar ? 'Subtotal Pedido' : 'Pendiente por Pagar')}</span>
                 <span>${totalPendiente.toFixed(2)}</span>
               </div>
               
               {!isVitrina && hasUnsentItems && (
                 <div className="flex justify-between items-center text-orange-500 dark:text-orange-400 lya:text-lya-primary text-[10px] font-black uppercase tracking-wider bg-orange-50 dark:bg-orange-500/10 lya:bg-lya-primary/10 p-1.5 rounded-md border border-orange-100 dark:border-orange-500/20 lya:border-lya-primary/20">
                   <span>Por enviar a Cocina</span>
                   <span>+${unsentTotal.toFixed(2)}</span>
                 </div>
               )}
               
               <div className="flex justify-between items-end pt-1">
                 <span className="text-gray-900 dark:text-white lya:text-lya-text font-black text-xs uppercase tracking-tight">Total Activo</span>
                 <span className="text-3xl sm:text-4xl font-black text-orange-500 dark:text-orange-400 lya:text-lya-primary tracking-tighter drop-shadow-sm leading-none">
                   ${(totalPendiente + unsentTotal).toFixed(2)}
                 </span>
               </div>
             </div>
             
             <div className="flex gap-2">
               {!isVitrina && (
                 <motion.button 
                   whileTap={(!isSendingToKitchen && hasUnsentItems) ? { scale: 0.95 } : {}}
                   onClick={handleSendToKitchenClick} 
                   disabled={!hasUnsentItems || isSendingToKitchen} 
                   className={clsx("flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 rounded-xl font-black text-[10px] sm:text-xs transition-all border-2 uppercase outline-none", 
                     isSendingToKitchen ? "bg-orange-100 dark:bg-orange-900/40 text-orange-400 border-orange-200 cursor-wait opacity-80" : 
                     hasUnsentItems ? "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 lya:border-lya-primary/30 lya:bg-lya-primary/10 text-orange-500 dark:text-orange-400 lya:text-lya-primary shadow-sm md:hover:bg-orange-100 dark:md:hover:bg-orange-500/20"  : 
                     "bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border-transparent text-gray-400 dark:text-gray-600 lya:text-lya-text/40 cursor-not-allowed shadow-none"
                   )}
                 >
                   {isSendingToKitchen ? <Loader2 size={16} className="animate-spin" /> : <ChefHat size={16} strokeWidth={2.5} />}
                   <span>Enviar Cocina</span>
                 </motion.button>
               )}

               <motion.button 
                 whileTap={(!isCheckingOut && ((isVitrina && activeCart.length > 0) || (!isVitrina && isAnyCuentaReadyToPay))) ? { scale: 0.95 } : {}}
                 onClick={handleCheckoutClick} 
                 disabled={isCheckingOut || (!isVitrina && !isAnyCuentaReadyToPay) || activeCart.length === 0} 
                 className={clsx("flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 rounded-xl font-black text-[10px] sm:text-xs transition-all border uppercase outline-none", 
                   isVitrina ? "flex-1" : "flex-[1.5]", 
                   isCheckingOut ? "bg-emerald-400 border-emerald-500 text-white cursor-wait opacity-80" : 
                   ((isVitrina && activeCart.length > 0) || (!isVitrina && isAnyCuentaReadyToPay)) ? "bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-500/30 dark:shadow-emerald-900/30 md:hover:bg-emerald-600 lya:bg-lya-secondary lya:border-lya-secondary lya:md:hover:bg-lya-secondary/90 lya:shadow-lya-secondary/30" : 
                   "bg-gray-200 dark:bg-gray-800 lya:bg-lya-bg border-transparent text-gray-400 dark:text-gray-600 lya:text-lya-text/40 cursor-not-allowed shadow-none"
                 )}
               >
                 {isCheckingOut ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} strokeWidth={2.5} />}
                 <span>{isVitrina ? 'Cobrar Express' : (isLlevar ? 'Cobrar Pedido' : 'Cobrar')}</span>
               </motion.button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(!isVitrina) && activeCart.some(i => i.enviadoCocina) && (onCancelFullOrder || onCancelAccount) && hasCuentasActivas && (
          <motion.button 
             whileTap={{ scale: 0.95 }}
             onClick={() => setShowCancelModal(true)} 
             className="w-full pt-1 pb-1.5 text-[9px] font-black text-red-400 md:hover:text-red-500 md:hover:bg-red-50 dark:md:hover:bg-red-900/20 rounded-lg transition-colors uppercase tracking-widest flex items-center justify-center gap-1 outline-none"
          >
             <AlertTriangle size={12}/> Opciones de Cancelación
          </motion.button>
      )}
    </div>
  );
};