// src/modules/cafeteria/views/TicketSidebar.jsx
import React, { useState, useRef } from 'react';
import { 
  Trash2, Minus, Plus, ShoppingBag, ChefHat, 
  CreditCard, Lock, User, UserPlus, GripVertical, 
  ArrowRightLeft, Info, X, CheckCircle, Printer, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export const TicketSidebar = ({ 
  cart, total, hasUnsentItems, unsentTotal, mesaTotal, 
  onAdd, onRemove, onDelete, onSendToKitchen, onCheckout,
  cuentaActiva, setCuentaActiva, cuentasDisponibles, addNewCuenta, getSubtotalByCuenta, onPayCuenta, onMoveItem,
  orderStatus, paidAccounts, onPrintTicket, onCloseTable, toggleDeliveredStatus,
  isLlevar, isVitrina, toggleItemTakeaway 
}) => {
  const [newCuentaName, setNewCuentaName] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverCuenta, setDragOverCuenta] = useState(null);
  const [transferModeItemId, setTransferModeItemId] = useState(null);
  const [transferQty, setTransferQty] = useState(1); 
  const [dragPrompt, setDragPrompt] = useState(null);
  const scrollContainerRef = useRef(null);
  const [cuentasOcultas, setCuentasOcultas] = useState([]);

  // Si es Vitrina, forzamos que solo haya 'General'
  const activeAcc = cuentaActiva || 'General';
  const availableAccs = (isLlevar || isVitrina) ? ['General'] : (cuentasDisponibles || ['General']);

  const allItemsPaid = cart.length > 0 && cart.every(item => item.enviadoCocina && paidAccounts?.includes(item.cuenta || 'General'));
  const isCompletamentePagada = orderStatus === 'PAID' || allItemsPaid;

  const handleAddCuenta = (e) => {
    e.preventDefault();
    const name = newCuentaName.trim();
    if (name && addNewCuenta) addNewCuenta(name);
    setNewCuentaName('');
  };

  const getPrepStr = (item) => {
    if (!item?.preparaciones || item.preparaciones.length === 0) return "";
    const p = item.preparaciones[0];
    if (!p) return "";
    return `${p.tamano || 'Estándar'}-${p.leche || 'Ninguna'}-${(p.extras || []).slice().sort().join(',')}`;
  };

  const groupedCart = availableAccs.map(cuentaName => {
    const rawItems = cart.filter(item => (item.cuenta || 'General') === cuentaName);
    const displayItems = [];
    
    rawItems.forEach(item => {
        const existing = displayItems.find(d => 
            d.id === item.id && 
            Number(d.precio).toFixed(2) === Number(item.precio).toFixed(2) && 
            d.enviadoCocina === item.enviadoCocina &&
            d.kitchenStatus === item.kitchenStatus &&
            !!d.isTakeaway === !!item.isTakeaway && 
            getPrepStr(d) === getPrepStr(item)
        );
        if (existing) {
            existing.qty += item.qty;
            existing.preparaciones = [...existing.preparaciones, ...(item.preparaciones || [])];
            existing._groupedItems.push(item);
        } else {
            displayItems.push({ ...item, _groupedItems: [item] });
        }
    });
    return { cuentaName, items: displayItems };
  });

  const handleContainerDragOver = (e) => {
    e.preventDefault(); 
    if (!scrollContainerRef.current || !draggedItem) return;
    const container = scrollContainerRef.current;
    const { top, bottom } = container.getBoundingClientRect();
    const y = e.clientY;
    const scrollZone = 80;
    const scrollSpeed = 5; 

    if (y - top < scrollZone) {
      container.scrollTop -= scrollSpeed;
    } else if (bottom - y < scrollZone) {
      container.scrollTop += scrollSpeed;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg transition-colors">
      
      {!(isLlevar || isVitrina) && (
        <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/40 p-4 shadow-sm z-20 shrink-0 sticky top-0 transition-colors">
          <form onSubmit={handleAddCuenta} className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={newCuentaName} 
                onChange={(e) => setNewCuentaName(e.target.value)}
                disabled={isCompletamentePagada}
                placeholder="Dividir cuenta (Nombre)..."
                className="w-full bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg text-gray-800 dark:text-white lya:text-lya-text text-sm rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-orange-500/50 transition-all border border-transparent disabled:opacity-50"
              />
              <UserPlus size={18} className="absolute left-3 top-3.5 text-gray-400" />
            </div>
            <button 
              type="submit" 
              disabled={!newCuentaName.trim() || isCompletamentePagada}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white px-5 rounded-2xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center shrink-0 disabled:opacity-50"
            >
              Añadir
            </button>
          </form>
        </div>
      )}

      <div 
        ref={scrollContainerRef}
        onDragOver={handleContainerDragOver}
        className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar relative"
      >
        {cart.length === 0 && availableAccs.length === 1 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 dark:text-gray-700 opacity-60">
            <ShoppingBag size={64} strokeWidth={1} className="mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest">{isVitrina ? 'Mostrador Libre' : 'Orden vacía'}</p>
            <p className="text-xs">Añade productos del menú</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout"> 
            {groupedCart.filter(g => !cuentasOcultas.includes(g.cuentaName)).map(({ cuentaName, items }) => {
              const isActive = activeAcc === cuentaName;
              const isDragTarget = dragOverCuenta === cuentaName;
              const subtotalCuenta = items.reduce((acc, curr) => acc + (Number(curr.precio) * curr.qty), 0);
              const isCuentaPagada = paidAccounts?.includes(cuentaName);

              return (
                <motion.div 
                  key={cuentaName} layout 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: 0 }}
                  onDragOver={(e) => { 
                    e.preventDefault(); 
                    if (draggedItem && draggedItem.cuentaName !== cuentaName && !isCuentaPagada && !isLlevar && !isVitrina) setDragOverCuenta(cuentaName);
                  }}
                  onDragLeave={() => setDragOverCuenta(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverCuenta(null);
                    if (draggedItem && draggedItem.cuentaName !== cuentaName && !isCuentaPagada && !isLlevar && !isVitrina) {
                      let qtyToMove = draggedItem.item.qty;
                      if (qtyToMove > 1) {
                         setTransferQty(qtyToMove); 
                         setDragPrompt({ item: draggedItem.item, cuentaName, maxQty: qtyToMove });
                      } else {
                         onMoveItem(draggedItem.item, cuentaName, 1);
                      }
                    }
                  }}
                  className={clsx(
                    "rounded-3xl transition-all duration-300 border-2 overflow-hidden",
                    isCuentaPagada 
                      ? "border-green-500/50 bg-green-50/30 opacity-70"
                      : isDragTarget 
                        ? "border-blue-500 bg-blue-50/50 shadow-inner scale-[1.02]" 
                        : isActive 
                          ? "border-orange-500/30 bg-white dark:bg-gray-900 shadow-xl" 
                          : "border-transparent bg-gray-100/50 dark:bg-gray-800/30"
                  )}
                >
                  <div 
                    onClick={() => { if(!isCuentaPagada && !isLlevar && !isVitrina && setCuentaActiva) setCuentaActiva(cuentaName); }}
                    className={clsx("flex justify-between items-center p-4", (!isCuentaPagada && !isLlevar && !isVitrina) ? "cursor-pointer" : "")}
                  >
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "p-2 rounded-xl transition-colors",
                        isCuentaPagada ? "bg-green-500 text-white"
                        : isDragTarget ? "bg-blue-500 text-white" 
                        : isActive ? "bg-orange-500 text-white" 
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                      )}>
                        {isCuentaPagada ? <CheckCircle size={18}/> : (isVitrina ? <ShoppingBag size={18}/> : <User size={18} className={isDragTarget ? "animate-bounce" : ""} />)}
                      </div>
                      <div>
                        <h4 className={clsx("font-black text-sm uppercase tracking-tight", 
                          isCuentaPagada ? "text-gray-800 dark:text-gray-200"
                          : isDragTarget ? "text-blue-600 dark:text-blue-400" 
                          : isActive ? "text-orange-500" 
                          : "text-gray-600 dark:text-gray-400"
                        )}>
                          {isVitrina ? 'Cuenta Express' : cuentaName}
                        </h4>
                        {isCuentaPagada ? (
                           <span className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider">Cobrada</span>
                        ) : (
                           <span className="text-[10px] font-bold text-gray-400 uppercase">{items.length} productos</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right pointer-events-none">
                      <span className="block text-lg font-black text-gray-900 dark:text-white">
                        ${subtotalCuenta.toFixed(2)}
                      </span>
                      {!isCuentaPagada && !isCompletamentePagada && availableAccs.length > 1 && subtotalCuenta > 0 && !isVitrina && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onPayCuenta && onPayCuenta(cuentaName); }}
                          className="pointer-events-auto text-[9px] font-black bg-blue-500 text-white px-2 py-1 rounded-lg shadow-md active:scale-90 transition-transform uppercase mt-1 inline-block"
                        >
                          Cobrar este
                        </button>
                      )}
                      {isCuentaPagada && (
                        <div className="flex justify-end gap-1 mt-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); onPrintTicket(cuentaName); }} 
                            className="pointer-events-auto text-[9px] font-black bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-lg uppercase flex gap-1 items-center active:scale-95"
                          >
                            <Printer size={10}/> Ticket
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setCuentasOcultas(prev => [...prev, cuentaName]); }} 
                            className="pointer-events-auto text-[9px] font-black bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded-lg uppercase flex gap-1 items-center active:scale-95 hover:bg-red-100"
                          >
                            <XCircle size={10}/> Liberar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-3 pb-3 space-y-2">
                    {items.map((item, idx) => {
                      const currentItemKey = `group-${item.id}-${Number(item.precio).toFixed(2)}-${item.enviadoCocina}-${item.kitchenStatus}-${idx}`;
                      const isTransferMode = transferModeItemId === currentItemKey;

                      return (
                      <motion.div 
                        key={currentItemKey} layout
                        draggable={!isCuentaPagada && !isLlevar && !isVitrina}
                        onDragStart={(e) => {
                          if (isCuentaPagada || isLlevar || isVitrina) return;
                          setDraggedItem({ item, cuentaName });
                          e.dataTransfer.effectAllowed = 'move';
                          setTransferModeItemId(null);
                        }}
                        onDragEnd={() => setDraggedItem(null)}
                        className={clsx(
                          "relative group flex flex-col p-3 rounded-2xl border transition-all overflow-hidden",
                          (!isCuentaPagada && !isLlevar && !isVitrina) ? "cursor-grab active:cursor-grabbing" : "",
                          draggedItem?.item === item ? "opacity-40 scale-95" : "opacity-100",
                          item.enviadoCocina 
                            ? "bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700/50" 
                            : "bg-white dark:bg-gray-800 border-transparent shadow-sm hover:shadow-md"
                        )}
                      >
                        <AnimatePresence>
                          {isTransferMode && !isVitrina && (
                            <motion.div 
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className="absolute inset-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm flex flex-col justify-center p-2 rounded-2xl"
                            >
                              {/* Lógica de mover omitida para brevedad si es Vitrina */}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="flex gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-950 flex-shrink-0 border border-gray-100 dark:border-gray-700 flex items-center justify-center relative group-hover:shadow-inner">
                            {item.imagen || item.image ? (
                              <img src={item.imagen || item.image} alt="" className="w-full h-full object-contain" />
                            ) : <span className="text-xl">🧁</span>}
                            
                            {!isCuentaPagada && availableAccs.length > 1 && !isVitrina && (
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <GripVertical size={18} className="text-white drop-shadow-md" />
                              </div>
                            )}

                            {item.enviadoCocina && availableAccs.length <= 1 && !isVitrina && (
                              <div className="absolute inset-0 bg-orange-500/20 backdrop-blur-[1px] flex items-center justify-center">
                                <Lock size={14} className="text-orange-600" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <h5 className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate pr-2">
                                {item.qty > 1 && <span className="text-orange-500 mr-1">{item.qty}x</span>}
                                {item.nombre}
                              </h5>
                              <span className="text-sm font-black text-gray-900 dark:text-white">
                                ${(Number(item.precio) * item.qty).toFixed(2)}
                              </span>
                            </div>

                            {item.isTakeaway && item.enviadoCocina && !isVitrina && (
                              <div className="mb-1">
                                <span className="text-[10px] font-black bg-orange-50 text-orange-600 px-2 py-0.5 rounded-md uppercase border border-orange-500/20 inline-flex items-center gap-1">
                                  <ShoppingBag size={10} /> Empacar Llevar
                                </span>
                              </div>
                            )}

                            <div className="space-y-1 pointer-events-none">
                              {item.preparaciones?.map((prep, pIdx) => {
                                if (!prep || (prep.tamano === 'Estándar' && !prep.leche && (!prep.extras || prep.extras.length === 0))) return null;
                                return (
                                  <div key={pIdx} className="bg-gray-100 dark:bg-gray-900/50 rounded-lg px-2 py-1 flex flex-col gap-0.5 border border-gray-200/50">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                      <Info size={10} /> {prep.tamano} {prep.leche && `• ${prep.leche}`}
                                    </span>
                                    {prep.extras?.length > 0 && (
                                      <span className="text-[9px] font-black text-orange-500">
                                        + {prep.extras.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                {/* 🔥 AQUI OCULTAMOS TODAS LAS ETIQUETAS DE COCINA SI ES VITRINA */}
                                {!isVitrina && (
                                  item.enviadoCocina ? (
                                    <button 
                                      onClick={() => toggleDeliveredStatus(item)} 
                                      disabled={
                                        isCompletamentePagada || 
                                        isCuentaPagada || 
                                        (item.kitchenStatus !== 'READY' && item.kitchenStatus !== 'DELIVERED')
                                      } 
                                      className={clsx(
                                        "flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border uppercase transition-all duration-300", 
                                        item.kitchenStatus === 'DELIVERED' 
                                          ? "text-green-600 bg-green-500/10 border-green-500/20 cursor-pointer" 
                                          : item.kitchenStatus === 'READY'
                                          ? "text-blue-600 bg-blue-500/10 border-blue-500/40 shadow-sm active:scale-95 cursor-pointer"
                                          : "text-orange-500 bg-orange-500/10 border-orange-500/20 opacity-60 cursor-not-allowed"
                                      )}
                                    >
                                      {item.kitchenStatus === 'DELIVERED' ? (
                                        <><CheckCircle size={12} /> Entregado</>
                                      ) : item.kitchenStatus === 'READY' ? (
                                        <><CheckCircle size={12} className="animate-pulse" /> Listo Entregar</>
                                      ) : (
                                        <><ChefHat size={12} /> En Preparación</>
                                      )}
                                    </button>
                                  ) : (
                                    <>
                                      <span className="flex items-center gap-1 text-[9px] font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full uppercase">
                                        Listo
                                      </span>
                                      {!isLlevar && toggleItemTakeaway && (
                                        <button
                                          onClick={() => toggleItemTakeaway(item)}
                                          className={clsx(
                                            "flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-tighter transition-all active:scale-95 cursor-pointer",
                                            item.isTakeaway
                                              ? "text-orange-600 bg-orange-50 border-orange-300"
                                              : "text-gray-400 bg-white border-gray-200 hover:text-orange-500 hover:border-orange-300"
                                          )}
                                        >
                                          <ShoppingBag size={10} className={item.isTakeaway ? "text-orange-600" : "text-gray-400"} />
                                          {item.isTakeaway ? 'Empacar' : 'Mesa'}
                                        </button>
                                      )}
                                    </>
                                  )
                                )}
                              </div>
                              
                              <div className="flex items-center gap-1">
                                {!item.enviadoCocina && !isCuentaPagada && (
                                  <>
                                    <button 
                                      onClick={() => onRemove(item)}
                                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                      <Minus size={14} />
                                    </button>
                                    <span className="text-xs font-black text-gray-600 dark:text-gray-300 w-4 text-center">{item.qty}</span>
                                    <button 
                                      onClick={() => onAdd(item, cuentaName)}
                                      className="p-1.5 hover:bg-gray-100 rounded-lg text-orange-500 transition-colors"
                                    >
                                      <Plus size={14} />
                                    </button>
                                    <div className="w-px h-3 bg-gray-200 mx-1" />
                                    <button 
                                      onClick={() => onDelete(item)}
                                      className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <div className="p-5 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-30 shrink-0 transition-colors">
        
        {isCompletamentePagada ? (
           <div className="flex gap-3 animate-fade-in">
              <button 
                onClick={() => onPrintTicket()} 
                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl font-black text-[10px] uppercase bg-gray-100 text-gray-700 active:scale-95 transition-transform"
              >
                <Printer size={18} /><span>Ticket</span>
              </button>
              <button 
                onClick={onCloseTable} 
                className="flex-[1.5] flex flex-col items-center justify-center gap-1 py-3 rounded-2xl font-black text-[10px] uppercase bg-red-500 text-white shadow-xl hover:bg-red-600 active:scale-95 transition-transform"
              >
                <XCircle size={18} />
                <span>{isVitrina ? 'Siguiente Venta' : (isLlevar ? 'Finalizar Pedido' : 'Cerrar / Liberar Mesa')}</span>
              </button>
           </div>
        ) : (
           <>
             <div className="space-y-2 mb-4">
               <div className="flex justify-between items-center text-gray-500 text-xs font-bold uppercase tracking-wider">
                 <span>{isVitrina ? 'Total de Productos' : (isLlevar ? 'Subtotal Pedido' : 'Subtotal Mesa')}</span>
                 <span>${isVitrina ? (mesaTotal + unsentTotal).toFixed(2) : mesaTotal.toFixed(2)}</span>
               </div>
               {/* 🔥 OCULTAMOS LA ETIQUETA 'Por Enviar' EN VITRINA */}
               {!isVitrina && hasUnsentItems && (
                 <div className="flex justify-between items-center text-orange-500 text-xs font-black uppercase tracking-wider">
                   <span>Por enviar</span>
                   <span>+${unsentTotal.toFixed(2)}</span>
                 </div>
               )}
               <div className="flex justify-between items-end pt-2">
                 <span className="text-gray-900 dark:text-white font-black text-sm uppercase">Total a pagar</span>
                 <span className="text-3xl font-black text-orange-600 dark:text-orange-500 tracking-tighter">
                   ${(mesaTotal + unsentTotal).toFixed(2)}
                 </span>
               </div>
             </div>
             
             {/* 🔥 CONTENEDOR DE BOTONES INFERIORES */}
             <div className="flex gap-3">
               
               {/* 🔥 OCULTAMOS EL BOTÓN 'Enviar a Cocina' SI ES VITRINA */}
               {!isVitrina && (
                 <button 
                   onClick={onSendToKitchen} 
                   disabled={!hasUnsentItems}
                   className={clsx(
                     "flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl font-black text-[10px] transition-all active:scale-95 border-2 uppercase",
                     hasUnsentItems 
                       ? "bg-orange-50 border-orange-200 text-orange-600 shadow-lg" 
                       : "bg-gray-50 border-transparent text-gray-400 cursor-not-allowed"
                   )}
                 >
                   <ChefHat size={18} />
                   <span>Enviar Cocina</span>
                 </button>
               )}
               
               {/* 🔥 EL BOTÓN DE COBRAR SE ESTIRA AL 100% SI ES VITRINA */}
               <button 
                 onClick={onCheckout} 
                 disabled={cart.length === 0 && mesaTotal === 0 && unsentTotal === 0}
                 className={clsx(
                   "flex flex-col items-center justify-center gap-1 py-3 rounded-2xl font-black text-[10px] transition-all active:scale-95 border-2 uppercase",
                   isVitrina ? "flex-1" : "flex-[1.5]",
                   (cart.length > 0 || mesaTotal > 0 || unsentTotal > 0)
                     ? "bg-green-500 border-green-600 text-white shadow-xl hover:bg-green-600"
                     : "bg-gray-200 border-transparent text-gray-400 cursor-not-allowed shadow-none"
                 )}
               >
                 <CreditCard size={18} />
                 <span>{isVitrina ? 'Cobrar Express' : (isLlevar ? 'Cobrar Pedido' : 'Cobrar Mesa')}</span>
               </button>
             </div>
           </>
        )}
      </div>
    </div>
  );
};