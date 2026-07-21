// src/modules/cafeteria/views/components/ticket/TicketCartGroup.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, User, ShoppingBag, CheckCircle, Lock, Phone, GripVertical, Info, Minus, Plus, XCircle, ChefHat, Loader2, Printer, Tag } from 'lucide-react';
import clsx from 'clsx';

export const TicketCartGroup = ({
  cuentaName, items, isActive, isDragTarget, subtotalCuenta,
  isCuentaPagada, isCompletamentePagada, isTodoEntregadoEnCuenta,
  globalUnsentQtyMap, 
  draggedItem, setDragOverCuenta, handleDropOnCuenta,
  openConfirmModal, setCuentaActiva, cuentasTelefonos,
  isVitrina, isLlevar, nombreCliente, setCuentasOcultas,
  onPayCuenta, onPrintTicket, availableAccs,
  processingItems, handleToggleStatus, handleRemoveUnsent, onAdd,
  handleDeleteUnsent, handleCancelItem, toggleItemTakeaway, onCancelItem,
  onDragStart, onDragEnd,
  showToast 
}) => {

  let rawDisplayName = isVitrina ? 'Cuenta Express' : (isLlevar && nombreCliente ? nombreCliente : cuentaName);
  let finalDisplayName = rawDisplayName;
  let finalDisplayPhone = cuentasTelefonos?.[cuentaName] || null;

  if (typeof rawDisplayName === 'string') {
      if (rawDisplayName.includes(' | ')) {
          const parts = rawDisplayName.split(' | ');
          finalDisplayName = parts[0].trim();
          if (!finalDisplayPhone && parts[1]) finalDisplayPhone = parts[1].trim();
      } else if (rawDisplayName.includes(' - ')) {
          const parts = rawDisplayName.split(' - ');
          const lastPart = parts[parts.length - 1].trim();
          if (lastPart.replace(/\D/g, '').length === 10) {
              if (!finalDisplayPhone) finalDisplayPhone = lastPart;
              finalDisplayName = parts.slice(0, -1).join(' - ').trim();
          }
      }
  }

  if (finalDisplayPhone) {
      const strPhone = String(finalDisplayPhone);
      if (strPhone.includes(' - ')) {
          finalDisplayPhone = strPhone.split(' - ')[0].trim();
      } else if (strPhone.includes(' | ')) {
          finalDisplayPhone = strPhone.split(' | ')[0].trim();
      }
  }

  return (
    <motion.div 
      layout 
      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
      onDragOver={(e) => { 
        e.preventDefault(); 
        if (draggedItem && draggedItem.cuentaName !== cuentaName && !isCuentaPagada && !isLlevar && !isVitrina) setDragOverCuenta(cuentaName);
      }}
      onDragLeave={() => setDragOverCuenta(null)}
      onDrop={(e) => {
        e.preventDefault();
        handleDropOnCuenta(cuentaName);
      }}
      className={clsx(
        "rounded-[1.25rem] transition-all duration-300 overflow-hidden shadow-sm",
        isCuentaPagada ? "border border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-900/10 lya:bg-lya-primary/5 opacity-80"
        : isDragTarget ? "border border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 lya:border-lya-secondary lya:bg-lya-secondary/10 shadow-inner scale-[1.02]" 
        : isActive ? "border-2 border-transparent bg-white dark:bg-gray-900 lya:bg-lya-surface shadow-md" 
        : "border border-transparent bg-white/80 dark:bg-gray-800/80 lya:bg-lya-surface/80 opacity-90"
      )}
    >
      <div 
          onClick={() => { 
              if (isCuentaPagada) {
                  openConfirmModal({
                      title: 'Cuenta Sellada',
                      message: `La cuenta "${cuentaName}" ya fue pagada. Si el cliente desea algo adicional, por favor crea una cuenta nueva para no alterar el cobro anterior.`,
                      icon: Lock,
                      color: 'blue',
                      confirmText: 'Entendido',
                      onConfirm: () => {}
                  });
                  return;
              }
              if(!isLlevar && !isVitrina && setCuentaActiva) setCuentaActiva(cuentaName); 
          }} 
          className="flex justify-between items-center p-3 sm:p-4 cursor-pointer"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={clsx("p-2 rounded-xl transition-colors shrink-0 shadow-sm border", 
              isCuentaPagada ? "bg-emerald-500 text-white border-emerald-600 lya:bg-lya-primary lya:border-lya-primary" : 
              isDragTarget ? "bg-blue-500 text-white border-blue-600 lya:bg-lya-secondary lya:border-lya-secondary" : 
              isActive ? "bg-orange-500 dark:bg-orange-600 text-white border-orange-600 dark:border-orange-700 lya:bg-lya-primary lya:border-lya-primary" : 
              "bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 lya:bg-lya-bg lya:border-lya-border/40"
          )}>
            {isCuentaPagada ? <CheckCircle size={16}/> : (isVitrina ? <ShoppingBag size={16}/> : <User size={16} className={isDragTarget ? "animate-bounce" : ""} />)}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <h4 className={clsx("font-black text-xs sm:text-sm uppercase tracking-tight truncate max-w-[100px] sm:max-w-none", 
                  isCuentaPagada ? "text-gray-800 dark:text-gray-200 lya:text-lya-text" : 
                  isDragTarget ? "text-blue-600 dark:text-blue-400 lya:text-lya-secondary" : 
                  isActive ? "text-orange-600 dark:text-orange-400 lya:text-lya-primary" : 
                  "text-gray-600 dark:text-gray-400 lya:text-lya-text/80"
              )}>
                {finalDisplayName}
              </h4>
              
              {finalDisplayPhone && (
                <span className="flex items-center gap-1 text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 lya:bg-lya-primary/10 lya:text-lya-primary px-1.5 py-0.5 rounded-md font-bold tracking-wider shadow-sm shrink-0 border border-emerald-200 dark:border-emerald-800/50 lya:border-lya-primary/20">
                  <Phone size={8} /> {finalDisplayPhone}
                </span>
              )}
            </div>
            {isCuentaPagada 
                ? <span className="text-[9px] text-emerald-600 dark:text-emerald-400 lya:text-lya-primary font-bold uppercase tracking-wider flex items-center gap-1"><Lock size={8}/> Cobrada</span> 
                : <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 lya:text-lya-text/60 uppercase tracking-wide">{items.length} productos</span>}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1 pointer-events-none">
          <span className="block text-lg font-black text-gray-900 dark:text-white lya:text-lya-text leading-none">
              ${subtotalCuenta.toFixed(2)}
          </span>
          <div className="flex gap-1.5 flex-wrap justify-end pointer-events-auto">
            {items.length === 0 && cuentaName !== 'General' && (
              <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); setCuentasOcultas(prev => [...prev, cuentaName]); }} 
                  className="text-[9px] font-black bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg border border-transparent dark:border-gray-700 lya:border-lya-border/40 md:hover:border-red-200 dark:md:hover:border-red-900 md:hover:bg-red-50 dark:md:hover:bg-red-900/20 lya:md:hover:bg-red-500/10 text-gray-500 md:hover:text-red-500 px-2 py-1 rounded-lg uppercase flex gap-1 items-center transition-colors shadow-sm outline-none touch-manipulation"
              >
                <Trash2 size={10}/> Ocultar
              </motion.button>
            )}

            {!isCuentaPagada && !isCompletamentePagada && availableAccs.length > 1 && subtotalCuenta > 0 && !isVitrina && (
              <motion.button 
                  whileTap={isTodoEntregadoEnCuenta ? { scale: 0.95 } : {}}
                  disabled={!isTodoEntregadoEnCuenta} 
                  onClick={(e) => { 
                      e.stopPropagation(); 
                      if (isTodoEntregadoEnCuenta && onPayCuenta) onPayCuenta(cuentaName); 
                  }} 
                  className={clsx(
                      "text-[9px] font-black px-2 py-1 rounded-lg uppercase transition-colors shadow-sm border outline-none touch-manipulation", 
                      isTodoEntregadoEnCuenta 
                          ? "bg-emerald-500 md:hover:bg-emerald-600 dark:bg-emerald-600 dark:md:hover:bg-emerald-500 text-white border-emerald-600 dark:border-emerald-700 lya:bg-lya-primary lya:border-lya-primary" 
                          : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-80"
                  )}
              >
                Cobrar
              </motion.button>
            )}
            
            {!isVitrina && !isLlevar && (isCuentaPagada || isCompletamentePagada) && items.length > 0 && (
              <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); onPrintTicket(cuentaName); }} 
                  className="text-[9px] font-black bg-gray-100 dark:bg-gray-800 md:hover:bg-gray-200 dark:md:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 uppercase flex gap-1 items-center transition-colors shadow-sm outline-none touch-manipulation"
              >
                <Printer size={10}/> Ticket
              </motion.button>
            )}

            {!isVitrina && !isLlevar && isCuentaPagada && items.length > 0 && (
              <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); setCuentasOcultas(prev => [...prev, cuentaName]); }} 
                  className="text-[9px] font-black bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 md:hover:bg-red-100 dark:md:hover:bg-red-900/40 border border-red-200 dark:border-red-800/50 px-2 py-1 rounded-lg uppercase flex gap-1 items-center transition-colors shadow-sm outline-none touch-manipulation"
              >
                <XCircle size={10}/> Ocultar
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* LISTA DE ITEMS */}
      <div className="px-2 pb-2 space-y-1.5">
        {items.map((item, idx) => {
          const currentItemKey = `group-${item.id}-${Number(item.precio).toFixed(2)}-${item.enviadoCocina}-${item.kitchenStatus}-${idx}-${item.isAutoPromo}`;
          const isProcessing = processingItems[item.backendItemId || item.id];
          const isStatusLocked = isCuentaPagada || isCompletamentePagada;

          const isLimitReached = item.controlarStock && globalUnsentQtyMap?.[item.id] >= item.stock && item.stock > 0;

          // 🔥 BANDERA DE RENDERIZADO VISUAL PARA PREPARACIONES
          const hasRealPreparations = item.preparaciones?.some(prep => {
            if (!prep) return false;
            // Si el objeto está vacío `{}`, o si solo tiene los valores por defecto "limpios" sin extras.
            if (Object.keys(prep).length === 0) return false;
            if (prep.tamano === 'Estándar' && !prep.leche && (!prep.extras || prep.extras.length === 0)) return false;
            return true;
          });

          return (
          <motion.div 
            key={currentItemKey} layout
            draggable={!isCuentaPagada && !isLlevar && !isVitrina && !isProcessing}
            onDragStart={(e) => { 
                if (isCuentaPagada || isLlevar || isVitrina || isProcessing) return; 
                onDragStart(item, cuentaName); 
                e.dataTransfer.effectAllowed = 'move'; 
            }}
            onDragEnd={onDragEnd}
            className={clsx(
                "relative group flex flex-col p-2.5 rounded-xl transition-all overflow-hidden border", 
                (!isCuentaPagada && !isLlevar && !isVitrina && !isProcessing) ? "cursor-grab active:cursor-grabbing" : "", 
                draggedItem?.item === item ? "opacity-40 scale-95" : "opacity-100", 
                // 🔥 RESALTE DE PROMOCIONES EN EL CARRITO
                item.isAutoPromo ? "bg-rose-50/80 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800/30" 
                : item.enviadoCocina ? "bg-gray-50/80 dark:bg-gray-800/50 lya:bg-lya-bg/50 border-gray-100 dark:border-gray-800/50 lya:border-lya-border/20" 
                : "bg-white dark:bg-gray-800 lya:bg-lya-bg border-gray-100 dark:border-gray-700 lya:border-lya-border/40 shadow-sm",
                isProcessing && "pointer-events-none opacity-60"
            )}
          >
            {isProcessing && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/40 dark:bg-black/40 lya:bg-lya-bg/40 backdrop-blur-[2px] rounded-xl">
                    <Loader2 size={24} className="animate-spin text-orange-500 lya:text-lya-primary drop-shadow-md" />
                    <span className="text-[9px] font-black mt-1 text-orange-700 dark:text-orange-400 lya:text-lya-primary drop-shadow-sm uppercase tracking-wider">Cargando...</span>
                </div>
            )}

            <div className="flex gap-2.5">
              <div className={clsx(
                "w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center relative group-hover:shadow-inner shadow-sm transition-shadow",
                item.isAutoPromo ? "bg-rose-100/50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800" : "bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-100 dark:border-gray-800 lya:border-lya-border/40"
              )}>
                {item.imagen || item.image ? <img src={item.imagen || item.image} alt="" className="w-full h-full object-cover" /> : <span className="text-lg opacity-80">🧁</span>}
                {!isCuentaPagada && availableAccs.length > 1 && !isVitrina && (
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                        <GripVertical size={16} className="text-white drop-shadow-md" />
                    </div>
                )}
                {item.enviadoCocina && availableAccs.length <= 1 && !isVitrina && (
                    <div className="absolute inset-0 bg-orange-500/20 backdrop-blur-[1px] flex items-center justify-center">
                        <Lock size={12} className="text-orange-600 drop-shadow-sm" />
                    </div>
                )}
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex justify-between items-start mb-0.5 gap-2">
                  <div className="flex flex-col min-w-0">
                    <h5 className="text-xs font-black text-gray-800 dark:text-gray-100 lya:text-lya-text truncate pr-2 tracking-tight">
                      {item.nombre}
                    </h5>
                    {/* 🔥 ETIQUETA DE PROMOCIÓN */}
                    {item.promoLabel && (
                       <span className="text-[8px] font-black text-rose-500 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30 px-1 py-0.5 rounded uppercase tracking-wider w-fit mt-0.5 flex items-center gap-1">
                         <Tag size={8} strokeWidth={3} /> {item.promoLabel}
                       </span>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end">
                    {/* 🔥 ANCLAJE DE PRECIO PARA REGALOS / OFERTAS */}
                    {item.precioOriginal && item.precioOriginal > item.precio && (
                      <span className="text-[9px] font-bold text-gray-400 line-through leading-none mb-0.5">
                        ${(Number(item.precioOriginal) * item.qty).toFixed(2)}
                      </span>
                    )}
                    <span className={clsx("text-xs font-black", item.isAutoPromo ? "text-rose-600 dark:text-rose-400" : "text-gray-900 dark:text-white lya:text-lya-text")}>
                      ${(Number(item.precio) * item.qty).toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-bold mb-0.5 mt-1">
                    {item.qty > 1 && <span className={clsx("px-1 py-0.5 rounded border", item.isAutoPromo ? "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-900/30 dark:border-rose-800" : "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 lya:text-lya-primary lya:bg-lya-primary/10 border-orange-200 dark:border-orange-800/50 lya:border-lya-primary/20")}>{item.qty}x</span>}
                    {item.isTakeaway && item.enviadoCocina && !isVitrina && (
                        <span className="text-[8px] font-black bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 lya:bg-lya-secondary/10 lya:text-lya-secondary px-1 py-0.5 rounded uppercase border border-orange-200/50 dark:border-orange-800/50 lya:border-lya-secondary/30 inline-flex items-center gap-1 shadow-sm">
                            <ShoppingBag size={8} /> Empacar
                        </span>
                    )}
                </div>

                {/* 🔥 DESTRUCCIÓN DEL RECUADRO VACÍO: Solo renderiza si hay opciones reales */}
                {hasRealPreparations && (
                  <div className="space-y-0.5 pointer-events-none mt-1">
                    {item.preparaciones?.map((prep, pIdx) => {
                      if (!prep || Object.keys(prep).length === 0 || (prep.tamano === 'Estándar' && !prep.leche && (!prep.extras || prep.extras.length === 0))) return null;
                      return (
                        <div key={pIdx} className="bg-gray-100/80 dark:bg-gray-900/60 lya:bg-lya-surface rounded p-1 flex flex-col gap-0.5 border border-gray-200/50 dark:border-gray-800/50 lya:border-lya-border/40">
                          <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 uppercase flex items-center gap-1"><Info size={8} /> {prep.tamano} {prep.leche && `• ${prep.leche}`}</span>
                          {prep.extras?.length > 0 && <span className="text-[8px] font-black text-orange-500 dark:text-orange-400 lya:text-lya-primary">+ {prep.extras.join(', ')}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* CONTROLES: Los ítems de Auto-Promo NO se pueden sumar ni restar ni ocultar. Solo se atan al producto padre. */}
            {!item.isAutoPromo && (!isVitrina || (!item.enviadoCocina && !isCuentaPagada) || (item.enviadoCocina && onCancelItem)) && (
              <div className="flex items-center justify-between gap-1.5 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800/60 lya:border-lya-border/30">
                
                {!isVitrina && (
                  <div className="flex-1 flex items-center gap-1.5">
                    {item.enviadoCocina ? (
                      <motion.button 
                        whileTap={!isProcessing && !isStatusLocked && (item.kitchenStatus === 'READY' || item.kitchenStatus === 'DELIVERED') ? { scale: 0.95 } : {}}
                        onClick={() => handleToggleStatus(item)} 
                        disabled={isProcessing || isStatusLocked || (item.kitchenStatus !== 'READY' && item.kitchenStatus !== 'DELIVERED')} 
                        className={clsx(
                            "flex items-center justify-center gap-1 text-[9px] font-black px-2 py-1.5 rounded-lg border uppercase transition-colors w-full text-center shadow-sm outline-none touch-manipulation", 
                            isProcessing ? "bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg border-gray-200 dark:border-gray-700 text-gray-400 opacity-70 cursor-wait" :
                            item.kitchenStatus === 'DELIVERED' ? clsx("text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50", isStatusLocked ? "cursor-default opacity-70" : "cursor-pointer") 
                            : item.kitchenStatus === 'READY' ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 lya:text-lya-secondary lya:bg-lya-secondary/10 lya:border-lya-secondary/30 shadow-md cursor-pointer animate-pulse" 
                            : "text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-70 cursor-not-allowed"
                        )}
                      >
                        {isProcessing ? (
                            <><Loader2 size={10} className="animate-spin" /> ...</>
                        ) : item.kitchenStatus === 'DELIVERED' ? (
                            <><CheckCircle size={10} /> Entregado</>
                        ) : item.kitchenStatus === 'READY' ? (
                            <><CheckCircle size={10} /> Entregar</>
                        ) : (
                            <><ChefHat size={10} /> Cocina</>
                        )}
                      </motion.button>
                    ) : (
                      <>
                        <span className={clsx(
                          "flex items-center justify-center gap-1 text-[8px] font-black text-gray-500 dark:text-gray-400 lya:text-lya-text/50 bg-gray-100 dark:bg-gray-800 lya:bg-lya-surface px-1.5 py-1.5 rounded-lg uppercase border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 text-center shadow-inner",
                          (isLlevar || !toggleItemTakeaway) ? "w-full" : "flex-1"
                        )}>
                          Por enviar
                        </span>
                        {!isLlevar && toggleItemTakeaway && (
                          <motion.button 
                              whileTap={{ scale: 0.95 }}
                              onClick={() => toggleItemTakeaway(item)} 
                              className={clsx(
                                  "flex items-center justify-center gap-1 text-[8px] font-black px-1.5 py-1.5 rounded-lg border uppercase tracking-tighter transition-colors cursor-pointer flex-1 text-center shadow-sm outline-none touch-manipulation", 
                                  item.isTakeaway ? "text-orange-600 bg-orange-50 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700/50 lya:text-lya-secondary lya:bg-lya-secondary/10 lya:border-lya-secondary/30" : "text-gray-400 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 md:hover:text-orange-500 dark:md:hover:text-orange-400 lya:md:hover:text-lya-primary md:hover:border-orange-300 dark:md:hover:border-orange-700 lya:md:hover:border-lya-primary/50"
                              )} 
                          >
                            <ShoppingBag size={10} className={item.isTakeaway ? "text-orange-600 lya:text-lya-secondary" : "text-gray-400"} /> {item.isTakeaway ? 'Empacar' : 'Mesa'}
                          </motion.button>
                        )}
                      </>
                    )}
                  </div>
                )}
                
                {((!item.enviadoCocina && !isCuentaPagada) || (item.enviadoCocina && onCancelItem)) && (
                  <div className={clsx(
                    "flex items-center gap-1 bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-lg p-0.5 shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/40",
                    isVitrina ? "w-full justify-between" : "shrink-0"
                  )}>
                    {!item.enviadoCocina && !isCuentaPagada && (
                      <>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleRemoveUnsent(item)} className={clsx("md:hover:bg-gray-100 dark:md:hover:bg-gray-800 rounded-md text-gray-400 md:hover:text-red-500 transition-colors outline-none", isVitrina ? "flex-1 py-1.5 flex justify-center" : "p-1")}><Minus size={isVitrina ? 16 : 12} /></motion.button>
                        
                        <motion.button 
                          whileTap={!isLimitReached ? { scale: 0.9 } : {}}
                          onClick={() => {
                            if (isLimitReached) {
                              if (showToast) showToast(`Límite en carrito: Solo quedan ${item.stock} en stock.`, 'warning');
                              return; 
                            }
                            onAdd(item, cuentaName);
                          }} 
                          className={clsx(
                            "rounded-md transition-colors flex items-center justify-center outline-none", 
                            isVitrina ? "flex-1 py-1.5" : "p-1",
                            isLimitReached 
                              ? "text-amber-500 md:hover:bg-amber-50 dark:md:hover:bg-amber-900/20" 
                              : "text-orange-500 dark:text-orange-400 lya:text-lya-primary md:hover:bg-orange-50 dark:md:hover:bg-orange-900/20 lya:md:hover:bg-lya-primary/10" 
                          )}
                          title={isLimitReached ? `Límite de stock alcanzado (${item.stock})` : "Añadir otro"}
                        >
                          {isLimitReached ? <Lock size={isVitrina ? 16 : 12} /> : <Plus size={isVitrina ? 16 : 12} />}
                        </motion.button>

                        <div className={clsx("bg-gray-200 dark:bg-gray-700 lya:bg-lya-border/40 mx-0.5", isVitrina ? "w-px h-5" : "w-px h-3")} />
                        
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleDeleteUnsent(item)} className={clsx("md:hover:bg-red-50 dark:md:hover:bg-red-900/20 rounded-md text-gray-400 md:hover:text-red-500 transition-colors outline-none", isVitrina ? "flex-1 py-1.5 flex justify-center" : "p-1")}><Trash2 size={isVitrina ? 16 : 12} /></motion.button>
                      </>
                    )}
                    {item.enviadoCocina && onCancelItem && (
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleCancelItem(item)} className={clsx("md:hover:bg-red-50 dark:md:hover:bg-red-900/20 rounded-md text-red-400 md:hover:text-red-600 transition-colors outline-none", isVitrina ? "w-full py-1.5 flex justify-center items-center gap-1.5" : "p-1")} title="Cancelar Producto">
                          <XCircle size={isVitrina ? 14 : 12} />
                          {isVitrina && <span className="text-[9px] font-black uppercase tracking-wider">Cancelar</span>}
                        </motion.button>
                    )}
                  </div>
                )}
              </div>
            )}

          </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};