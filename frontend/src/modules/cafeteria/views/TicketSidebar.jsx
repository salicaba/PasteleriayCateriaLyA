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
  isLlevar, toggleItemTakeaway // 🔥 NUEVO: Prop para alternar
}) => {
  const [newCuentaName, setNewCuentaName] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverCuenta, setDragOverCuenta] = useState(null);
  const [transferModeItemId, setTransferModeItemId] = useState(null);
  const [transferQty, setTransferQty] = useState(1); 
  const [dragPrompt, setDragPrompt] = useState(null);
  const scrollContainerRef = useRef(null);

  const activeAcc = cuentaActiva || 'General';
  const availableAccs = isLlevar ? ['General'] : (cuentasDisponibles || ['General']);

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
      
      {!isLlevar && (
        <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/40 p-4 shadow-sm z-20 shrink-0 sticky top-0 transition-colors">
          <form onSubmit={handleAddCuenta} className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={newCuentaName} 
                onChange={(e) => setNewCuentaName(e.target.value)}
                disabled={orderStatus === 'PAID'}
                placeholder="Dividir cuenta (Nombre)..."
                className="w-full bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg text-gray-800 dark:text-white lya:text-lya-text text-sm rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-orange-500/50 lya:focus:ring-lya-primary/50 transition-all border border-transparent focus:border-orange-500/20 lya:focus:border-lya-primary/30 disabled:opacity-50"
              />
              <UserPlus size={18} className="absolute left-3 top-3.5 text-gray-400 lya:text-lya-text/40" />
            </div>
            <button 
              type="submit" 
              disabled={!newCuentaName.trim() || orderStatus === 'PAID'}
              className="bg-orange-500 hover:bg-orange-600 lya:bg-lya-primary lya:hover:bg-lya-primary/90 disabled:bg-gray-200 dark:disabled:bg-gray-800 lya:disabled:bg-lya-border/30 text-white lya:text-lya-surface px-5 rounded-2xl font-bold text-xs transition-all active:scale-95 shadow-lg shadow-orange-500/20 lya:shadow-lya-primary/20 flex items-center justify-center shrink-0 disabled:opacity-50"
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
          <div className="flex flex-col items-center justify-center h-full text-gray-300 dark:text-gray-700 lya:text-lya-text/30 opacity-60">
            <ShoppingBag size={64} strokeWidth={1} className="mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest">Orden vacía</p>
            <p className="text-xs">Añade productos del menú</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout"> 
            {groupedCart.map(({ cuentaName, items }) => {
              const isActive = activeAcc === cuentaName;
              const isDragTarget = dragOverCuenta === cuentaName;
              const subtotalCuenta = items.reduce((acc, curr) => acc + (Number(curr.precio) * curr.qty), 0);
              const isCuentaPagada = paidAccounts?.includes(cuentaName);

              return (
                <motion.div 
                  key={cuentaName} layout 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  onDragOver={(e) => { 
                    e.preventDefault(); 
                    if (draggedItem && draggedItem.cuentaName !== cuentaName && !isCuentaPagada && !isLlevar) setDragOverCuenta(cuentaName);
                  }}
                  onDragLeave={() => setDragOverCuenta(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverCuenta(null);
                    if (draggedItem && draggedItem.cuentaName !== cuentaName && !isCuentaPagada && !isLlevar) {
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
                      ? "border-green-500/50 bg-green-50/30 dark:bg-green-900/10 opacity-70"
                      : isDragTarget 
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-inner scale-[1.02]" 
                        : isActive 
                          ? "border-orange-500/30 lya:border-lya-primary/40 bg-white dark:bg-gray-900 lya:bg-lya-surface shadow-xl shadow-orange-500/5 lya:shadow-lya-primary/10" 
                          : "border-transparent bg-gray-100/50 dark:bg-gray-800/30 lya:bg-lya-bg/50"
                  )}
                >
                  <div 
                    onClick={() => { if(!isCuentaPagada && !isLlevar && setCuentaActiva) setCuentaActiva(cuentaName); }}
                    className={clsx("flex justify-between items-center p-4", (!isCuentaPagada && !isLlevar) ? "cursor-pointer" : "")}
                  >
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "p-2 rounded-xl transition-colors",
                        isCuentaPagada ? "bg-green-500 text-white"
                        : isDragTarget ? "bg-blue-500 text-white" 
                        : isActive ? "bg-orange-500 lya:bg-lya-primary text-white lya:text-lya-surface" 
                        : "bg-gray-200 dark:bg-gray-700 lya:bg-lya-border/50 text-gray-500 lya:text-lya-text/50"
                      )}>
                        {isCuentaPagada ? <CheckCircle size={18}/> : <User size={18} className={isDragTarget ? "animate-bounce" : ""} />}
                      </div>
                      <div>
                        <h4 className={clsx("font-black text-sm uppercase tracking-tight", 
                          isCuentaPagada ? "text-gray-800 dark:text-gray-200 lya:text-lya-text"
                          : isDragTarget ? "text-blue-600 dark:text-blue-400" 
                          : isActive ? "text-orange-500 lya:text-lya-primary" 
                          : "text-gray-600 dark:text-gray-400 lya:text-lya-text/70"
                        )}>
                          {cuentaName}
                        </h4>
                        {isCuentaPagada ? (
                           <span className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider">Pagada</span>
                        ) : (
                           <span className="text-[10px] font-bold text-gray-400 lya:text-lya-text/50 uppercase">{items.length} productos</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right pointer-events-none">
                      <span className="block text-lg font-black text-gray-900 dark:text-white lya:text-lya-text">
                        ${subtotalCuenta.toFixed(2)}
                      </span>
                      {!isCuentaPagada && orderStatus !== 'PAID' && availableAccs.length > 1 && subtotalCuenta > 0 && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onPayCuenta && onPayCuenta(cuentaName); }}
                          className="pointer-events-auto text-[9px] font-black bg-blue-500 lya:bg-lya-secondary text-white lya:text-lya-surface px-2 py-1 rounded-lg shadow-md shadow-blue-500/20 lya:shadow-lya-secondary/20 active:scale-90 transition-transform uppercase mt-1 inline-block"
                        >
                          Cobrar este
                        </button>
                      )}
                      {isCuentaPagada && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onPrintTicket(cuentaName); }} 
                          className="pointer-events-auto text-[9px] font-black bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-lg uppercase mt-1 flex gap-1 items-center active:scale-95 transition-transform"
                        >
                          <Printer size={10}/> Ticket
                        </button>
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
                        draggable={!isCuentaPagada && !isLlevar}
                        onDragStart={(e) => {
                          if (isCuentaPagada || isLlevar) return;
                          setDraggedItem({ item, cuentaName });
                          e.dataTransfer.effectAllowed = 'move';
                          setTransferModeItemId(null);
                        }}
                        onDragEnd={() => setDraggedItem(null)}
                        className={clsx(
                          "relative group flex flex-col p-3 rounded-2xl border transition-all overflow-hidden",
                          (!isCuentaPagada && !isLlevar) ? "cursor-grab active:cursor-grabbing" : "",
                          draggedItem?.item === item ? "opacity-40 scale-95" : "opacity-100",
                          item.enviadoCocina 
                            ? "bg-gray-50 dark:bg-gray-800/40 lya:bg-lya-bg/60 border-gray-100 dark:border-gray-700/50 lya:border-lya-border/30" 
                            : "bg-white dark:bg-gray-800 lya:bg-lya-surface border-transparent lya:border-lya-border/20 shadow-sm hover:shadow-md lya:hover:border-lya-secondary/30"
                        )}
                      >
                        <AnimatePresence>
                          {isTransferMode && (
                            <motion.div 
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className="absolute inset-0 z-20 bg-white/95 dark:bg-gray-900/95 lya:bg-lya-surface/95 backdrop-blur-sm flex flex-col justify-center p-2 rounded-2xl"
                            >
                              {item.qty > 1 && (
                                <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg rounded-lg p-1 px-3 mb-2 mx-2 shadow-inner">
                                    <span className="text-xs font-bold text-gray-500">Mover:</span>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setTransferQty(Math.max(1, transferQty - 1))} className="p-1 text-gray-500 hover:text-orange-500 lya:hover:text-lya-primary font-black active:scale-90">-</button>
                                        <span className="font-black text-sm text-gray-800 dark:text-white lya:text-lya-text">{transferQty}</span>
                                        <button onClick={() => setTransferQty(Math.min(item.qty, transferQty + 1))} className="p-1 text-gray-500 hover:text-orange-500 lya:hover:text-lya-primary font-black active:scale-90">+</button>
                                    </div>
                                </div>
                              )}
                              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar w-full px-2">
                                <span className="text-xs font-bold text-gray-500 whitespace-nowrap">A:</span>
                                {availableAccs.filter(c => c !== cuentaName && !paidAccounts?.includes(c)).map(c => (
                                  <button 
                                    key={c} 
                                    onClick={() => { onMoveItem(item, c, transferQty); setTransferModeItemId(null); }}
                                    className="bg-blue-100 dark:bg-blue-900/30 lya:bg-lya-secondary/20 text-blue-700 dark:text-blue-300 lya:text-lya-secondary px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap active:scale-95"
                                  >
                                    {c}
                                  </button>
                                ))}
                                <button onClick={() => setTransferModeItemId(null)} className="p-1.5 bg-gray-200 dark:bg-gray-800 rounded-full ml-auto text-gray-600"><X size={14}/></button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="flex gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-950 lya:bg-lya-bg flex-shrink-0 border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 flex items-center justify-center relative group-hover:shadow-inner transition-shadow">
                            {item.imagen || item.image ? (
                              <img src={item.imagen || item.image} alt="" className="w-full h-full object-contain" />
                            ) : <span className="text-xl">🧁</span>}
                            
                            {!isCuentaPagada && availableAccs.length > 1 && (
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <GripVertical size={18} className="text-white drop-shadow-md" />
                              </div>
                            )}

                            {item.enviadoCocina && availableAccs.length <= 1 && (
                              <div className="absolute inset-0 bg-orange-500/20 lya:bg-lya-primary/20 backdrop-blur-[1px] flex items-center justify-center">
                                <Lock size={14} className="text-orange-600 lya:text-lya-primary" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <h5 className="text-sm font-bold text-gray-800 dark:text-gray-100 lya:text-lya-text truncate pr-2">
                                {item.qty > 1 && <span className="text-orange-500 lya:text-lya-primary mr-1">{item.qty}x</span>}
                                {item.nombre}
                              </h5>
                              <span className="text-sm font-black text-gray-900 dark:text-white lya:text-lya-text">
                                ${(Number(item.precio) * item.qty).toFixed(2)}
                              </span>
                            </div>

                            {/* 🔥 ETIQUETA VISUAL SOLO CUANDO YA ESTÁ EN COCINA */}
                            {item.isTakeaway && item.enviadoCocina && (
                              <div className="mb-1">
                                <span className="text-[10px] font-black bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-md uppercase border border-orange-500/20 inline-flex items-center gap-1">
                                  <ShoppingBag size={10} /> Empacar Llevar
                                </span>
                              </div>
                            )}

                            <div className="space-y-1 pointer-events-none">
                              {item.preparaciones?.map((prep, pIdx) => {
                                if (!prep || (prep.tamano === 'Estándar' && !prep.leche && (!prep.extras || prep.extras.length === 0))) return null;
                                return (
                                  <div key={pIdx} className="bg-gray-100 dark:bg-gray-900/50 lya:bg-lya-bg/50 rounded-lg px-2 py-1 flex flex-col gap-0.5 border border-gray-200/50 dark:border-gray-700/30 lya:border-lya-border/30">
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 uppercase flex items-center gap-1">
                                      <Info size={10} /> {prep.tamano} {prep.leche && `• ${prep.leche}`}
                                    </span>
                                    {prep.extras?.length > 0 && (
                                      <span className="text-[9px] font-black text-orange-500 dark:text-orange-400 lya:text-lya-primary">
                                        + {prep.extras.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                {item.enviadoCocina ? (
                                  <button 
                                    onClick={() => toggleDeliveredStatus(item)} 
                                    disabled={
                                      orderStatus === 'PAID' || 
                                      isCuentaPagada || 
                                      (item.kitchenStatus !== 'READY' && item.kitchenStatus !== 'DELIVERED')
                                    } 
                                    className={clsx(
                                      "flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border uppercase transition-all duration-300", 
                                      item.kitchenStatus === 'DELIVERED' 
                                        ? "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20 cursor-pointer" 
                                        : item.kitchenStatus === 'READY'
                                        ? "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/40 shadow-sm shadow-blue-500/20 active:scale-95 cursor-pointer"
                                        : "text-orange-500 dark:text-orange-400 bg-orange-500/10 border-orange-500/20 opacity-60 cursor-not-allowed"
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
                                    <span className="flex items-center gap-1 text-[9px] font-black text-gray-500 dark:text-gray-400 lya:text-lya-text/60 bg-gray-100 dark:bg-gray-800 lya:bg-lya-border/30 px-2 py-0.5 rounded-full border border-transparent uppercase tracking-tighter">
                                      Listo
                                    </span>
                                    {/* 🔥 BOTÓN INTERACTIVO PARA EMPACAR */}
                                    {!isLlevar && toggleItemTakeaway && (
                                      <button
                                        onClick={() => toggleItemTakeaway(item)}
                                        className={clsx(
                                          "flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-tighter transition-all active:scale-95 cursor-pointer",
                                          item.isTakeaway
                                            ? "text-orange-600 bg-orange-50 border-orange-300 dark:bg-orange-500/20 dark:border-orange-500/50 shadow-sm"
                                            : "text-gray-400 bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:text-orange-500 hover:border-orange-300"
                                        )}
                                        title={item.isTakeaway ? "Quitar empaque" : "Empacar para llevar"}
                                      >
                                        <ShoppingBag size={10} className={item.isTakeaway ? "text-orange-600" : "text-gray-400"} />
                                        {item.isTakeaway ? 'Empacar' : 'Mesa'}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-1">
                                {availableAccs.length > 1 && !isCuentaPagada && (
                                  <button 
                                    onClick={() => { setTransferModeItemId(currentItemKey); setTransferQty(item.qty); }}
                                    className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-500/10 lya:hover:bg-blue-500/10 rounded-lg text-gray-400 hover:text-blue-500 transition-colors z-10 relative"
                                    title="Mover de cuenta"
                                  >
                                    <ArrowRightLeft size={14} />
                                  </button>
                                )}

                                {!item.enviadoCocina && !isCuentaPagada && (
                                  <>
                                    <button 
                                      onClick={() => onRemove(item)}
                                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 lya:hover:bg-lya-bg/80 rounded-lg text-gray-400 lya:text-lya-text/40 hover:text-red-500 lya:hover:text-red-500 transition-colors"
                                    >
                                      <Minus size={14} />
                                    </button>
                                    <span className="text-xs font-black text-gray-600 dark:text-gray-300 lya:text-lya-text w-4 text-center">{item.qty}</span>
                                    <button 
                                      onClick={() => onAdd(item, cuentaName)}
                                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 lya:hover:bg-lya-bg/80 rounded-lg text-orange-500 lya:text-lya-primary transition-colors"
                                    >
                                      <Plus size={14} />
                                    </button>
                                    <div className="w-px h-3 bg-gray-200 dark:bg-gray-700 lya:bg-lya-border/30 mx-1" />
                                    <button 
                                      onClick={() => onDelete(item)}
                                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 lya:hover:bg-red-500/10 rounded-lg text-gray-300 lya:text-lya-text/30 hover:text-red-500 lya:hover:text-red-500 transition-colors"
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

      <div className="p-5 bg-white dark:bg-gray-900 lya:bg-lya-surface border-t border-gray-100 dark:border-gray-800 lya:border-lya-border/40 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-30 shrink-0 transition-colors">
        
        {orderStatus === 'PAID' ? (
           <div className="flex gap-3 animate-fade-in">
              <button 
                onClick={() => onPrintTicket()} 
                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl font-black text-[10px] uppercase bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-gray-700 dark:text-gray-300 lya:text-lya-text border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 active:scale-95 transition-transform"
              >
                <Printer size={18} /><span>Ticket</span>
              </button>
              <button 
                onClick={onCloseTable} 
                className="flex-[1.5] flex flex-col items-center justify-center gap-1 py-3 rounded-2xl font-black text-[10px] uppercase bg-red-500 text-white shadow-xl hover:bg-red-600 active:scale-95 transition-transform"
              >
                <XCircle size={18} />
                <span>{isLlevar ? 'Finalizar Pedido' : 'Cerrar / Liberar Mesa'}</span>
              </button>
           </div>
        ) : (
           <>
             <div className="space-y-2 mb-4">
               <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-xs font-bold uppercase tracking-wider">
                 <span>{isLlevar ? 'Subtotal Pedido' : 'Subtotal Mesa'}</span>
                 <span>${mesaTotal.toFixed(2)}</span>
               </div>
               {hasUnsentItems && (
                 <div className="flex justify-between items-center text-orange-500 lya:text-lya-secondary text-xs font-black uppercase tracking-wider">
                   <span>Por enviar</span>
                   <span>+${unsentTotal.toFixed(2)}</span>
                 </div>
               )}
               <div className="flex justify-between items-end pt-2">
                 <span className="text-gray-900 dark:text-white lya:text-lya-text font-black text-sm uppercase">Total a pagar</span>
                 <span className="text-3xl font-black text-orange-600 dark:text-orange-500 lya:text-lya-primary tracking-tighter">
                   ${(mesaTotal + unsentTotal).toFixed(2)}
                 </span>
               </div>
             </div>
             
             <div className="flex gap-3">
               <button 
                 onClick={onSendToKitchen} 
                 disabled={!hasUnsentItems}
                 className={clsx(
                   "flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl font-black text-[10px] transition-all active:scale-95 border-2 uppercase",
                   hasUnsentItems 
                     ? "bg-orange-50 dark:bg-orange-500/10 lya:bg-lya-secondary/10 border-orange-200 dark:border-orange-500/30 lya:border-lya-secondary/30 text-orange-600 dark:text-orange-400 lya:text-lya-secondary shadow-lg shadow-orange-500/10 lya:shadow-lya-secondary/10" 
                     : "bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg border-transparent text-gray-400 lya:text-lya-text/40 cursor-not-allowed"
                 )}
               >
                 <ChefHat size={18} />
                 <span>Enviar Cocina</span>
               </button>
               
               <button 
                 onClick={onCheckout} 
                 disabled={cart.length === 0 && mesaTotal === 0}
                 className={clsx(
                   "flex-[1.5] flex flex-col items-center justify-center gap-1 py-3 rounded-2xl font-black text-[10px] transition-all active:scale-95 border-2 uppercase",
                   (cart.length > 0 || mesaTotal > 0)
                     ? "bg-green-500 border-green-600 lya:bg-lya-primary lya:border-lya-primary text-white lya:text-lya-surface shadow-xl shadow-green-500/30 lya:shadow-lya-primary/30 hover:bg-green-600 lya:hover:bg-lya-primary/90"
                     : "bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/40 border-transparent text-gray-400 lya:text-lya-text/40 cursor-not-allowed shadow-none"
                 )}
               >
                 <CreditCard size={18} />
                 <span>{isLlevar ? 'Cobrar Pedido' : 'Cobrar Mesa'}</span>
               </button>
             </div>
           </>
        )}
      </div>

      <AnimatePresence>
        {dragPrompt && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
             <motion.div 
               initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} 
               className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 text-center"
             >
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 lya:bg-lya-secondary/10 text-blue-500 lya:text-lya-secondary rounded-full flex items-center justify-center mb-4 shadow-inner">
                   <ArrowRightLeft size={32} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-2">Mover Producto</h3>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/70 mb-6 leading-relaxed">
                   ¿Cuántos <strong className="text-gray-800 dark:text-gray-200 lya:text-lya-text">{dragPrompt.item.nombre}</strong> deseas mover a <strong className="text-blue-600 dark:text-blue-400 lya:text-lya-secondary uppercase">{dragPrompt.cuentaName}</strong>?
                </p>
                
                <div className="flex items-center gap-4 mb-6 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg rounded-2xl p-2 border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 w-full justify-center">
                   <button 
                     onClick={() => setTransferQty(Math.max(1, transferQty - 1))} 
                     className="w-12 h-12 rounded-xl bg-white dark:bg-gray-700 lya:bg-lya-surface shadow-sm flex items-center justify-center text-gray-500 dark:text-gray-300 hover:text-orange-500 lya:hover:text-lya-primary font-black text-xl active:scale-95 transition-all"
                   >-</button>
                   <span className="text-3xl font-black w-16 text-center text-gray-900 dark:text-white lya:text-lya-text">{transferQty}</span>
                   <button 
                     onClick={() => setTransferQty(Math.min(dragPrompt.maxQty, transferQty + 1))} 
                     className="w-12 h-12 rounded-xl bg-white dark:bg-gray-700 lya:bg-lya-surface shadow-sm flex items-center justify-center text-gray-500 dark:text-gray-300 hover:text-orange-500 lya:hover:text-lya-primary font-black text-xl active:scale-95 transition-all"
                   >+</button>
                </div>

                <div className="flex gap-3 w-full">
                   <button 
                     onClick={() => setDragPrompt(null)} 
                     className="flex-1 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-95"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={() => { onMoveItem(dragPrompt.item, dragPrompt.cuentaName, transferQty); setDragPrompt(null); }} 
                     className="flex-1 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider text-white lya:text-lya-surface bg-blue-500 hover:bg-blue-600 lya:bg-lya-secondary lya:hover:bg-lya-secondary/90 transition-all active:scale-95 shadow-lg shadow-blue-500/20 lya:shadow-lya-secondary/20"
                   >
                     Confirmar
                   </button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};