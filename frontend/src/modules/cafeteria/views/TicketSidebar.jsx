// src/modules/cafeteria/views/TicketSidebar.jsx
import React, { useState, useRef } from 'react';
import { 
  Trash2, Minus, Plus, ShoppingBag, ChefHat, 
  CreditCard, Lock, User, UserPlus, GripVertical, 
  ArrowRightLeft, Info, X, CheckCircle, Printer, XCircle, Phone,
  CheckCheck, AlertTriangle, ChevronDown, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import OpcionesCancelacionModal from './OpcionesCancelacionModal'; 

export const TicketSidebar = ({ 
  cart, total, hasUnsentItems, unsentTotal, mesaTotal, 
  onAdd, onRemove, onDelete, onSendToKitchen, onCheckout,
  cuentaActiva, setCuentaActiva, cuentasDisponibles, addNewCuenta, getSubtotalByCuenta, onPayCuenta, onMoveItem,
  orderStatus, paidAccounts, onPrintTicket, onCloseTable, toggleDeliveredStatus,
  isLlevar, isVitrina, toggleItemTakeaway, cuentasTelefonos,
  onDeliverAll, onDeliverAccount, onCancelItem, onCancelFullOrder, onCancelAccount,
  nombreCliente
}) => {
  const [newCuentaName, setNewCuentaName] = useState('');
  const [newCuentaPhone, setNewCuentaPhone] = useState('');
  
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverCuenta, setDragOverCuenta] = useState(null);
  const scrollContainerRef = useRef(null);
  const [cuentasOcultas, setCuentasOcultas] = useState([]);
  
  const [showCancelled, setShowCancelled] = useState(false);
  const [modalConfig, setModalConfig] = useState(null);
  const [modalInputValue, setModalInputValue] = useState('');
  
  // ESTADO DE CARGA PARA EL MODAL DE CONFIRMACIÓN INTERNO
  const [isModalProcessing, setIsModalProcessing] = useState(false);
  
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [isDeliveringAll, setIsDeliveringAll] = useState(false);
  const [processingItems, setProcessingItems] = useState({});

  const activeAcc = cuentaActiva || 'General';
  const availableAccs = (isLlevar || isVitrina) ? ['General'] : (cuentasDisponibles || ['General']);

  const activeCart = cart.filter(item => item.status !== 'CANCELLED');
  const cancelledCart = cart.filter(item => item.status === 'CANCELLED');

  let isCompletamentePagada = false;
  if (isVitrina) {
      isCompletamentePagada = orderStatus === 'PAID';
  } else if (activeCart.length === 0) {
      isCompletamentePagada = orderStatus === 'PAID';
  } else {
      const unpaidActiveItems = activeCart.filter(item => !(paidAccounts?.includes(item.cuenta || 'General')));
      const allItemsPaid = unpaidActiveItems.length === 0;
      
      if (orderStatus === 'PAID') {
          if (paidAccounts && paidAccounts.length > 0) {
              isCompletamentePagada = allItemsPaid;
          } else {
              isCompletamentePagada = true;
          }
      } else {
          isCompletamentePagada = allItemsPaid && activeCart.every(i => i.enviadoCocina);
      }
  }

  const handleAddCuenta = (e) => {
    e.preventDefault();
    const name = newCuentaName.trim();
    if (name && addNewCuenta) addNewCuenta(name, newCuentaPhone);
    setNewCuentaName('');
    setNewCuentaPhone('');
  };

  const getPrepStr = (item) => {
    if (!item?.preparaciones || item.preparaciones.length === 0) return "";
    const p = item.preparaciones[0];
    if (!p) return "";
    return `${p.tamano || 'Estándar'}-${p.leche || 'Ninguna'}-${(p.extras || []).slice().sort().join(',')}`;
  };

  const groupedCart = availableAccs.map(cuentaName => {
    const rawItems = activeCart.filter(item => (item.cuenta || 'General') === cuentaName);
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

  const visibleGroups = groupedCart.filter(g => {
      if (cuentasOcultas.includes(g.cuentaName)) return false;
      if (g.items.length === 0) {
          const otherGroupsWithItems = groupedCart.some(other => other.cuentaName !== g.cuentaName && other.items.length > 0);
          if (otherGroupsWithItems) return false;
      }
      return true;
  });

  const handleContainerDragOver = (e) => {
    e.preventDefault(); 
    if (!scrollContainerRef.current || !draggedItem) return;
    const container = scrollContainerRef.current;
    const { top, bottom } = container.getBoundingClientRect();
    const y = e.clientY;
    
    if (y - top < 80) container.scrollTop -= 5;
    else if (bottom - y < 80) container.scrollTop += 5;
  };

  const openConfirmModal = (config) => {
    setModalConfig(config);
    if (config.requireInput) setModalInputValue(config.inputDefault || '');
  };

  const handleToggleStatus = async (item) => {
    const itemId = item.backendItemId || item.id;
    setProcessingItems(prev => ({ ...prev, [itemId]: true }));
    try {
      if (toggleDeliveredStatus) await toggleDeliveredStatus(item);
    } finally {
      setProcessingItems(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleDeliverAll = async () => {
    setIsDeliveringAll(true);
    try {
      if (onDeliverAll) await onDeliverAll();
    } finally {
      setIsDeliveringAll(false);
    }
  };

  const handleCancelItem = (item) => {
    if (item.qty > 1) {
        openConfirmModal({
            title: 'Cancelar Producto',
            message: `¿Cuántos "${item.nombre}" deseas cancelar? (Máximo: ${item.qty})`,
            icon: XCircle, 
            color: 'red', 
            confirmText: 'Cancelar',
            requireInput: true, 
            inputType: 'number', 
            inputMax: item.qty, 
            inputDefault: item.qty.toString(),
            onConfirm: async (val) => {
                const qtyToCancel = parseInt(val, 10);
                if (qtyToCancel > 0 && qtyToCancel <= item.qty) {
                    if (onCancelItem) await onCancelItem(item._groupedItems ? item._groupedItems[0] : item, 'Cancelación parcial desde POS', qtyToCancel);
                }
            }
        });
    } else {
        openConfirmModal({
            title: 'Cancelar Producto',
            message: `¿Seguro que deseas cancelar 1x ${item.nombre}?`,
            icon: XCircle, 
            color: 'red', 
            confirmText: 'Cancelar Producto',
            requireInput: true, 
            inputType: 'text', 
            inputPlaceholder: 'Motivo (opcional)', 
            inputDefault: 'Cancelado desde POS',
            onConfirm: async (reason) => {
                if (onCancelItem) await onCancelItem(item._groupedItems ? item._groupedItems[0] : item, reason, 1);
            }
        });
    }
  };

  const modalColors = {
      blue: { icon: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30", btn: "bg-blue-500 hover:bg-blue-600 text-white" },
      green: { icon: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30", btn: "bg-[#24d366] hover:bg-[#20bd5c] text-white" },
      red: { icon: "text-red-500", bg: "bg-red-100 dark:bg-red-900/30", btn: "bg-red-500 hover:bg-red-600 text-white" }
  };

  const cuentasCancelables = Array.from(new Set(activeCart.filter(i => i.enviadoCocina).map(i => i.cuenta || 'General')));
  
  const sentItems = activeCart.filter(i => i.enviadoCocina);
  const hasSentItems = sentItems.length > 0;
  const allSentItemsDelivered = hasSentItems && sentItems.every(i => i.kitchenStatus === 'DELIVERED');
  
  const hasReadyItems = sentItems.some(i => i.kitchenStatus === 'READY');
  const hasCookingItems = sentItems.some(i => ['PENDING', 'PREPARING'].includes(i.kitchenStatus));
  
  const showDeliverAllBtn = !isVitrina && hasSentItems && !allSentItemsDelivered;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg transition-colors relative">
      
      {!(isLlevar || isVitrina) && (
        <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/40 p-4 shadow-sm z-20 shrink-0 sticky top-0 transition-colors">
          <form onSubmit={handleAddCuenta} className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={newCuentaName} 
                onChange={(e) => setNewCuentaName(e.target.value)} 
                disabled={isCompletamentePagada} 
                placeholder="Nombre" 
                className="w-full bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg text-gray-800 dark:text-white lya:text-lya-text text-sm rounded-2xl py-3 pl-10 pr-2 outline-none focus:ring-2 focus:ring-orange-500/50 transition-all border border-transparent disabled:opacity-50" 
              />
              <UserPlus size={18} className="absolute left-3 top-3.5 text-gray-400" />
            </div>
            
            <div className="relative w-32 md:w-36">
              <input 
                type="tel" 
                value={newCuentaPhone} 
                onChange={(e) => setNewCuentaPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                disabled={isCompletamentePagada} 
                placeholder="Celular (Opc.)" 
                className="w-full bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg text-gray-800 dark:text-white lya:text-lya-text text-sm rounded-2xl py-3 pl-8 pr-2 outline-none focus:ring-2 focus:ring-orange-500/50 transition-all border border-transparent disabled:opacity-50" 
              />
              <Phone size={14} className="absolute left-2.5 top-4 text-gray-400" />
            </div>

            <button 
                type="submit" 
                disabled={!newCuentaName.trim() || isCompletamentePagada} 
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white px-4 rounded-2xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center shrink-0 disabled:opacity-50"
            >
              Añadir
            </button>
          </form>
        </div>
      )}

      <div ref={scrollContainerRef} onDragOver={handleContainerDragOver} className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar relative z-10">
        {activeCart.length === 0 && availableAccs.length === 1 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 dark:text-gray-700 opacity-60">
            <ShoppingBag size={64} strokeWidth={1} className="mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest">{isVitrina ? 'Mostrador Libre' : 'Orden vacía'}</p>
            <p className="text-xs">Añade productos del menú</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout"> 
            {visibleGroups.map(({ cuentaName, items }) => {
              const isActive = activeAcc === cuentaName;
              const isDragTarget = dragOverCuenta === cuentaName;
              const subtotalCuenta = items.reduce((acc, curr) => acc + (Number(curr.precio) * curr.qty), 0);
              const isCuentaPagada = paidAccounts?.includes(cuentaName);

              const isTodoEntregadoEnCuenta = items.length > 0 && items.every(i => i.enviadoCocina && i.kitchenStatus === 'DELIVERED');

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
                          openConfirmModal({
                              title: 'Mover Producto',
                              message: `¿Cuántos "${draggedItem.item.nombre}" deseas mover a la cuenta de ${cuentaName}? (Máx: ${qtyToMove})`,
                              icon: ArrowRightLeft, 
                              color: 'blue', 
                              confirmText: 'Mover Producto',
                              requireInput: true, 
                              inputType: 'number', 
                              inputMax: qtyToMove, 
                              inputDefault: qtyToMove.toString(),
                              onConfirm: (val) => { 
                                  const qty = parseInt(val, 10); 
                                  if (qty > 0 && qty <= qtyToMove) { 
                                      onMoveItem(draggedItem.item, cuentaName, qty); 
                                  } 
                              }
                          });
                      } else {
                          onMoveItem(draggedItem.item, cuentaName, 1);
                      }
                    }
                  }}
                  className={clsx(
                    "rounded-[1.5rem] transition-all duration-300 overflow-hidden shadow-sm",
                    isCuentaPagada ? "border-2 border-green-500/50 bg-green-50/30 dark:bg-green-900/20 opacity-70"
                    : isDragTarget ? "border-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-inner scale-[1.02]" 
                    : isActive ? "border-2 border-transparent bg-white dark:bg-gray-900 shadow-md" 
                    : "border-2 border-transparent bg-white/80 dark:bg-gray-800/80 opacity-90"
                  )}
                >
                  <div 
                      onClick={() => { if(!isCuentaPagada && !isLlevar && !isVitrina && setCuentaActiva) setCuentaActiva(cuentaName); }} 
                      className={clsx("flex justify-between items-center p-4", (!isCuentaPagada && !isLlevar && !isVitrina) ? "cursor-pointer" : "")}
                  >
                    <div className="flex items-center gap-3">
                      <div className={clsx("p-2.5 rounded-xl transition-colors shrink-0", 
                          isCuentaPagada ? "bg-[#24d366] text-white" : isDragTarget ? "bg-blue-500 text-white" : isActive ? "bg-[#f48b31] text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                      )}>
                        {isCuentaPagada ? <CheckCircle size={20}/> : (isVitrina ? <ShoppingBag size={20}/> : <User size={20} className={isDragTarget ? "animate-bounce" : ""} />)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <h4 className={clsx("font-black text-sm uppercase tracking-tight truncate max-w-[120px] sm:max-w-none", 
                              isCuentaPagada ? "text-gray-800 dark:text-gray-200" : isDragTarget ? "text-blue-600 dark:text-blue-400" : isActive ? "text-[#f48b31]" : "text-gray-600 dark:text-gray-400"
                          )}>
                            {isVitrina ? 'Cuenta Express' : (isLlevar && nombreCliente ? nombreCliente : cuentaName)}
                          </h4>
                          {cuentasTelefonos?.[cuentaName] && (
                            <span className="flex items-center gap-1 text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-md font-bold tracking-wider shadow-sm shrink-0">
                              <Phone size={10} /> {cuentasTelefonos[cuentaName]}
                            </span>
                          )}
                        </div>
                        {isCuentaPagada 
                            ? <span className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider">Cobrada</span> 
                            : <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{items.length} productos</span>}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1.5 pointer-events-none">
                      <span className="block text-xl font-black text-gray-900 dark:text-white leading-none mb-1">
                          ${subtotalCuenta.toFixed(2)}
                      </span>
                      <div className="flex gap-1.5 flex-wrap justify-end pointer-events-auto">

                        {!isCuentaPagada && !isCompletamentePagada && availableAccs.length > 1 && subtotalCuenta > 0 && !isVitrina && (
                          <button 
                              disabled={!isTodoEntregadoEnCuenta} 
                              onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (isTodoEntregadoEnCuenta && onPayCuenta) onPayCuenta(cuentaName); 
                              }} 
                              className={clsx(
                                  "text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase transition-all", 
                                  isTodoEntregadoEnCuenta 
                                      ? "bg-blue-500 hover:bg-blue-600 text-white shadow-sm active:scale-95" 
                                      : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-80"
                              )}
                          >
                            Cobrar
                          </button>
                        )}
                        
                        {!isVitrina && !isLlevar && (isCuentaPagada || isCompletamentePagada) && items.length > 0 && (
                          <button 
                              onClick={(e) => { e.stopPropagation(); onPrintTicket(cuentaName); }} 
                              className="text-[10px] font-black bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-2.5 py-1.5 rounded-lg uppercase flex gap-1.5 items-center active:scale-95 transition-colors"
                          >
                            <Printer size={12}/> Ticket
                          </button>
                        )}

                        {!isVitrina && !isLlevar && isCuentaPagada && (
                          <button 
                              onClick={(e) => { e.stopPropagation(); setCuentasOcultas(prev => [...prev, cuentaName]); }} 
                              className="text-[10px] font-black bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/50 px-2.5 py-1.5 rounded-lg uppercase flex gap-1.5 items-center active:scale-95 transition-colors"
                          >
                            <XCircle size={12}/> Liberar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="px-3 pb-3 space-y-2">
                    {items.map((item, idx) => {
                      const currentItemKey = `group-${item.id}-${Number(item.precio).toFixed(2)}-${item.enviadoCocina}-${item.kitchenStatus}-${idx}`;
                      
                      const isProcessing = processingItems[item.backendItemId || item.id];

                      return (
                      <motion.div 
                        key={currentItemKey} layout
                        draggable={!isCuentaPagada && !isLlevar && !isVitrina}
                        onDragStart={(e) => { 
                            if (isCuentaPagada || isLlevar || isVitrina) return; 
                            setDraggedItem({ item, cuentaName }); 
                            e.dataTransfer.effectAllowed = 'move'; 
                        }}
                        onDragEnd={() => setDraggedItem(null)}
                        className={clsx(
                            "relative group flex flex-col p-3 rounded-2xl transition-all overflow-hidden border", 
                            (!isCuentaPagada && !isLlevar && !isVitrina) ? "cursor-grab active:cursor-grabbing" : "", 
                            draggedItem?.item === item ? "opacity-40 scale-95" : "opacity-100", 
                            item.enviadoCocina ? "bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700" : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm"
                        )}
                      >
                        <div className="flex gap-3">
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-white dark:bg-gray-900 flex-shrink-0 border border-gray-100 dark:border-gray-800 flex items-center justify-center relative group-hover:shadow-inner shadow-sm">
                            {item.imagen || item.image ? <img src={item.imagen || item.image} alt="" className="w-full h-full object-cover" /> : <span className="text-xl">🧁</span>}
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

                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="flex justify-between items-start mb-0.5">
                              <h5 className="text-sm font-black text-gray-800 dark:text-gray-100 truncate pr-2">{item.nombre}</h5>
                              <span className="text-sm font-black text-gray-900 dark:text-white">${(Number(item.precio) * item.qty).toFixed(2)}</span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-bold mb-1">
                                {item.qty > 1 && <span className="text-orange-500 bg-orange-50 dark:bg-orange-500/10 px-1.5 py-0.5 rounded">{item.qty}x</span>}
                                {item.isTakeaway && item.enviadoCocina && !isVitrina && (
                                    <span className="text-[9px] font-black bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-md uppercase border border-orange-500/20 dark:border-orange-500/30 inline-flex items-center gap-1">
                                        <ShoppingBag size={10} /> Empacar
                                    </span>
                                )}
                            </div>

                            <div className="space-y-1 pointer-events-none">
                              {item.preparaciones?.map((prep, pIdx) => {
                                if (!prep || (prep.tamano === 'Estándar' && !prep.leche && (!prep.extras || prep.extras.length === 0))) return null;
                                return (
                                  <div key={pIdx} className="bg-gray-100 dark:bg-gray-900 rounded-lg px-2 py-1 flex flex-col gap-0.5 border border-gray-200/50 dark:border-gray-700/50">
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1"><Info size={10} /> {prep.tamano} {prep.leche && `• ${prep.leche}`}</span>
                                    {prep.extras?.length > 0 && <span className="text-[9px] font-black text-orange-500">+ {prep.extras.join(', ')}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {(!isVitrina || (!item.enviadoCocina && !isCuentaPagada) || (item.enviadoCocina && onCancelItem)) && (
                          <div className="flex items-center justify-between gap-2 mt-2 pt-3 border-t border-gray-100 dark:border-gray-800/60">
                            
                            {!isVitrina && (
                              <div className="flex-1 flex items-center gap-2">
                                {item.enviadoCocina ? (
                                  <button 
                                    onClick={() => handleToggleStatus(item)} 
                                    disabled={isProcessing || (item.kitchenStatus !== 'READY' && item.kitchenStatus !== 'DELIVERED')} 
                                    className={clsx(
                                        "flex items-center justify-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-xl border uppercase transition-all duration-300 w-full text-center shadow-sm", 
                                        isProcessing ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 opacity-70 cursor-wait" :
                                        item.kitchenStatus === 'DELIVERED' ? "text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50 cursor-pointer" 
                                        : item.kitchenStatus === 'READY' ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 shadow-md active:scale-95 cursor-pointer animate-pulse" 
                                        : "text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-70 cursor-not-allowed"
                                    )}
                                  >
                                    {isProcessing ? (
                                       <><Loader2 size={12} className="animate-spin" /> Cargando...</>
                                    ) : item.kitchenStatus === 'DELIVERED' ? (
                                       <><CheckCircle size={12} /> Entregado</>
                                    ) : item.kitchenStatus === 'READY' ? (
                                       <><CheckCircle size={12} /> Listo Entregar</>
                                    ) : (
                                       <><ChefHat size={12} /> En Preparación</>
                                    )}
                                  </button>
                                ) : (
                                  <>
                                    <span className={clsx(
                                      "flex items-center justify-center gap-1 text-[9px] font-black text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1.5 rounded-xl uppercase border border-gray-200 dark:border-gray-700 text-center",
                                      (isLlevar || !toggleItemTakeaway) ? "w-full" : "flex-1"
                                    )}>
                                      Por enviar
                                    </span>
                                    {!isLlevar && toggleItemTakeaway && (
                                      <button 
                                          onClick={() => toggleItemTakeaway(item)} 
                                          className={clsx(
                                              "flex items-center justify-center gap-1 text-[9px] font-black px-2 py-1.5 rounded-xl border uppercase tracking-tighter transition-all active:scale-95 cursor-pointer flex-1 text-center shadow-sm", 
                                              item.isTakeaway ? "text-orange-600 bg-orange-50 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700/50" : "text-gray-400 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:text-orange-500 hover:border-orange-300"
                                          )} 
                                      >
                                        <ShoppingBag size={10} className={item.isTakeaway ? "text-orange-600" : "text-gray-400"} /> {item.isTakeaway ? 'Empacar' : 'Mesa'}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                            
                            {((!item.enviadoCocina && !isCuentaPagada) || (item.enviadoCocina && onCancelItem)) && (
                              <div className={clsx(
                                "flex items-center gap-1 bg-white dark:bg-gray-900 rounded-xl p-0.5 shadow-sm border border-gray-100 dark:border-gray-800",
                                isVitrina ? "w-full justify-between" : "shrink-0"
                              )}>
                                {!item.enviadoCocina && !isCuentaPagada && (
                                  <>
                                    <button onClick={() => onRemove(item)} className={clsx("hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-red-500 transition-colors", isVitrina ? "flex-1 py-2 flex justify-center" : "p-1")}><Minus size={isVitrina ? 18 : 14} /></button>
                                    <button onClick={() => onAdd(item, cuentaName)} className={clsx("hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-orange-500 transition-colors", isVitrina ? "flex-1 py-2 flex justify-center" : "p-1")}><Plus size={isVitrina ? 18 : 14} /></button>
                                    <div className={clsx("bg-gray-200 dark:bg-gray-700 mx-0.5", isVitrina ? "w-px h-6" : "w-px h-3")} />
                                    <button onClick={() => onDelete(item)} className={clsx("hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-400 hover:text-red-500 transition-colors", isVitrina ? "flex-1 py-2 flex justify-center" : "p-1")}><Trash2 size={isVitrina ? 18 : 14} /></button>
                                  </>
                                )}
                                {item.enviadoCocina && onCancelItem && (
                                    <button onClick={() => handleCancelItem(item)} className={clsx("hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-400 hover:text-red-600 transition-colors", isVitrina ? "w-full py-2 flex justify-center items-center gap-2" : "p-1")} title="Cancelar / Eliminar Producto">
                                      <XCircle size={isVitrina ? 18 : 16} />
                                      {isVitrina && <span className="text-[10px] font-black uppercase tracking-wider">Cancelar Producto</span>}
                                    </button>
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
            })}
          </AnimatePresence>
        )}

        {cancelledCart.length > 0 && (
          <div className="mt-6 mb-2 border-2 border-dashed border-red-200 dark:border-red-900/30 rounded-3xl p-4 bg-red-50/50 dark:bg-red-950/20">
              <button onClick={() => setShowCancelled(!showCancelled)} className="flex justify-between items-center w-full text-red-500 font-black text-[10px] uppercase tracking-widest hover:text-red-600 transition-colors">
                  <span className="flex items-center gap-2"><Trash2 size={14}/> Cancelados ({cancelledCart.reduce((sum, i) => sum + i.qty, 0)})</span>
                  <ChevronDown size={14} className={clsx("transition-transform duration-300", showCancelled ? "rotate-180" : "")}/>
              </button>
              <AnimatePresence>
                  {showCancelled && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3 space-y-2">
                          {cancelledCart.map((cItem, i) => (
                              <div key={i} className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-red-100 dark:border-red-900/50 opacity-70 grayscale shadow-sm">
                                  <div className="flex items-center gap-3 min-w-0">
                                      <span className="text-[10px] font-black text-red-500 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">{cItem.qty}x</span>
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">{cItem.nombre}</span>
                                        <span className="text-[9px] text-gray-500 uppercase">{isLlevar && nombreCliente ? nombreCliente : cItem.cuenta}</span>
                                      </div>
                                  </div>
                                  <span className="text-[10px] font-black text-gray-400 line-through shrink-0">${(cItem.precio * cItem.qty).toFixed(2)}</span>
                              </div>
                          ))}
                      </motion.div>
                  )}
              </AnimatePresence>
          </div>
        )}
      </div>

      <div className="p-5 bg-white dark:bg-gray-900 lya:bg-lya-surface border-t border-gray-100 dark:border-gray-800 lya:border-lya-border/40 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-20 shrink-0 transition-colors">
        
        {onDeliverAll && showDeliverAllBtn && (
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
               "w-full mb-4 py-2.5 rounded-xl text-[11px] font-black uppercase flex items-center justify-center gap-2 transition-all shadow-sm",
               isDeliveringAll ? "bg-green-100 dark:bg-green-800/40 text-green-700 border border-green-300 dark:border-green-700 cursor-wait opacity-80" :
               hasReadyItems
                 ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800/50 hover:bg-green-100 dark:hover:bg-green-800/40 active:scale-95 cursor-pointer"
                 : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-transparent cursor-not-allowed opacity-70"
             )}
          >
             {isDeliveringAll ? <Loader2 size={16} className="animate-spin" /> : <CheckCheck size={16} />}
             {isDeliveringAll ? 'Entregando...' : (hasReadyItems ? ((isVitrina || isLlevar) ? 'Entregar Todo El Pedido' : 'Entregar Toda La Mesa') : 'Esperando a Cocina...')}
          </button>
        )}

        {isCompletamentePagada ? (
           <div className="flex gap-2 animate-fade-in">
              <button onClick={() => onPrintTicket()} className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl font-black text-[10px] uppercase bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 active:scale-95 transition-transform hover:bg-gray-200 dark:hover:bg-gray-700">
                <Printer size={16} /><span>Imprimir</span>
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
                                if (onCancelFullOrder) await onCancelFullOrder(reason);
                            }
                        });
                    }} 
                    className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl font-black text-[10px] uppercase bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 active:scale-95 transition-transform hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/50"
                  >
                    <Trash2 size={16} /><span>Cancelar</span>
                  </button>
              )}

              {/* Botón CANCELAR al lado de imprimir (solo sale cuando TODO está cobrado) */}
              {!isVitrina && (onCancelFullOrder || onCancelAccount) && (
                  <button 
                    onClick={() => setShowCancelModal(true)} 
                    className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl font-black text-[10px] uppercase bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 active:scale-95 transition-transform hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/50"
                  >
                    <AlertTriangle size={16} /><span>Cancelar</span>
                  </button>
              )}

              <button onClick={onCloseTable} className="flex-[1.5] flex flex-col items-center justify-center gap-1 py-3 rounded-2xl font-black text-[10px] uppercase bg-red-500 text-white shadow-xl hover:bg-red-600 active:scale-95 transition-transform">
                <XCircle size={16} /><span>{isVitrina ? 'Siguiente Venta' : (isLlevar ? 'Finalizar Pedido' : 'Cerrar / Liberar Mesa')}</span>
              </button>
           </div>
        ) : (
           <>
             <div className="space-y-2 mb-4">
               <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider"><span>{isVitrina ? 'Total de Productos' : (isLlevar ? 'Subtotal Pedido' : 'Subtotal Mesa')}</span><span>${isVitrina ? (mesaTotal + unsentTotal).toFixed(2) : mesaTotal.toFixed(2)}</span></div>
               {!isVitrina && hasUnsentItems && (<div className="flex justify-between items-center text-orange-500 text-xs font-black uppercase tracking-wider"><span>Por enviar</span><span>+${unsentTotal.toFixed(2)}</span></div>)}
               <div className="flex justify-between items-end pt-2"><span className="text-gray-900 dark:text-white font-black text-sm uppercase">Total a pagar</span><span className="text-3xl font-black text-[#f48b31] tracking-tighter">${(mesaTotal + unsentTotal).toFixed(2)}</span></div>
             </div>
             
             <div className="flex gap-3">
               {!isVitrina && (
                 <button onClick={onSendToKitchen} disabled={!hasUnsentItems} className={clsx("flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl font-black text-[10px] transition-all active:scale-95 border-2 uppercase", hasUnsentItems ? "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 text-[#f48b31] shadow-lg"  : "bg-gray-50 dark:bg-gray-800 border-transparent text-gray-400 dark:text-gray-500 cursor-not-allowed")}>
                   <ChefHat size={18} /><span>Enviar Cocina</span>
                 </button>
               )}
               <button onClick={onCheckout} disabled={activeCart.length === 0 && mesaTotal === 0 && unsentTotal === 0} className={clsx("flex flex-col items-center justify-center gap-1 py-3 rounded-2xl font-black text-[10px] transition-all active:scale-95 border-2 uppercase", isVitrina ? "flex-1" : "flex-[1.5]", (activeCart.length > 0 || mesaTotal > 0 || unsentTotal > 0) ? "bg-[#24d366] border-[#20bd5c] text-white shadow-xl hover:bg-[#20bd5c]" : "bg-gray-200 dark:bg-gray-800 border-transparent text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none")}>
                 <CreditCard size={18} /><span>{isVitrina ? 'Cobrar Express' : (isLlevar ? 'Cobrar Pedido' : 'Cobrar Mesa')}</span>
               </button>
             </div>
           </>
        )}

        {(!isVitrina) && activeCart.some(i => i.enviadoCocina) && (onCancelFullOrder || onCancelAccount) && !isCompletamentePagada && (
            <button 
               onClick={() => setShowCancelModal(true)} 
               className="w-full mt-3 py-2 text-[10px] font-black text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors uppercase tracking-widest flex items-center justify-center gap-1.5"
            >
               <AlertTriangle size={14}/> Opciones de Cancelación
            </button>
        )}
      </div>

      <AnimatePresence>
        {modalConfig && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }} 
              animate={{ scale: 1, y: 0, opacity: 1 }} 
              exit={{ scale: 0.9, y: 20, opacity: 0 }} 
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl flex flex-col items-center text-center border border-gray-100 dark:border-gray-800 lya:border-lya-border/40"
            >
              <div className={clsx("w-16 h-16 rounded-full flex items-center justify-center mb-4", modalColors[modalConfig.color].bg)}>
                <modalConfig.icon size={32} className={modalColors[modalConfig.color].icon} />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-2 tracking-tight">
                {modalConfig.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/70 mb-6 leading-relaxed">
                {modalConfig.message}
              </p>

              {modalConfig.requireInput && (
                <div className="w-full mb-6">
                  <input 
                    type={modalConfig.inputType || 'text'} 
                    min={modalConfig.inputType === 'number' ? 1 : undefined} 
                    max={modalConfig.inputMax}
                    value={modalInputValue} 
                    onChange={(e) => setModalInputValue(e.target.value)} 
                    placeholder={modalConfig.inputPlaceholder}
                    disabled={isModalProcessing}
                    className="w-full bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg text-gray-800 dark:text-gray-200 lya:text-lya-text text-sm rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-orange-500/50 transition-all border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 text-center font-medium shadow-inner disabled:opacity-50"
                  />
                </div>
              )}

              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setModalConfig(null)} 
                  disabled={isModalProcessing}
                  className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-2xl font-bold uppercase text-[11px] tracking-wider transition-colors active:scale-95 disabled:opacity-50"
                >
                  Volver
                </button>
                <button 
                  onClick={async () => { 
                    setIsModalProcessing(true);
                    try {
                      await modalConfig.onConfirm(modalConfig.requireInput ? modalInputValue : undefined); 
                    } finally {
                      setIsModalProcessing(false);
                      setModalConfig(null); 
                    }
                  }} 
                  disabled={isModalProcessing}
                  className={clsx("flex-[1.5] py-3 rounded-2xl font-black uppercase text-[11px] tracking-wider transition-transform shadow-md flex items-center justify-center gap-2", 
                    isModalProcessing ? "opacity-80 cursor-wait" : "active:scale-95", 
                    modalColors[modalConfig.color].btn)}
                >
                  {isModalProcessing && <Loader2 size={14} className="animate-spin" />}
                  {isModalProcessing ? 'Procesando...' : modalConfig.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <OpcionesCancelacionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        cuentas={cuentasCancelables}
        onConfirmar={async (tipo, cuenta, motivo) => {
          try {
            if (tipo === 'mesa') {
                if (onCancelFullOrder) await onCancelFullOrder(motivo);
            } else {
                if (onCancelAccount) await onCancelAccount(cuenta, motivo);
            }
          } finally {
            setShowCancelModal(false);
          }
        }}
      />
    </div>
  );
};