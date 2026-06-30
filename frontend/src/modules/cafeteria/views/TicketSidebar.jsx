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
  nombreCliente, showToast 
}) => {
  const toast = showToast || (() => {}); 

  const [newCuentaName, setNewCuentaName] = useState('');
  const [newCuentaPhone, setNewCuentaPhone] = useState('');
  
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverCuenta, setDragOverCuenta] = useState(null);
  const scrollContainerRef = useRef(null);
  const [cuentasOcultas, setCuentasOcultas] = useState([]);
  
  const [showCancelled, setShowCancelled] = useState(false);
  const [modalConfig, setModalConfig] = useState(null);
  const [modalInputValue, setModalInputValue] = useState('');
  
  // ESTADOS DE CARGA (Prevención de Doble Clic)
  const [isModalProcessing, setIsModalProcessing] = useState(false);
  const [isClosingTable, setIsClosingTable] = useState(false);
  const [isDeliveringAll, setIsDeliveringAll] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isSendingToKitchen, setIsSendingToKitchen] = useState(false);
  const [processingItems, setProcessingItems] = useState({});
  
  const [showCancelModal, setShowCancelModal] = useState(false);

  const activeAcc = cuentaActiva || 'General';
  const availableAccs = (isLlevar || isVitrina) ? ['General'] : (cuentasDisponibles || ['General']);

  const activeCart = cart.filter(item => item.status !== 'CANCELLED');
  const cancelledCart = cart.filter(item => item.status === 'CANCELLED');

  // LÓGICA CORREGIDA Y A PRUEBA DE BALAS PARA SABER SI ESTÁ TODO PAGADO
  let isCompletamentePagada = false;

  if (orderStatus === 'PAID') {
      isCompletamentePagada = true;
  } else if (activeCart.length > 0) {
      // Comprobamos si queda algún producto activo que NO pertenezca a una cuenta pagada
      const unpaidActiveItems = activeCart.filter(item => {
          const cuentaDelItem = item.cuenta || 'General';
          return !(paidAccounts?.includes(cuentaDelItem));
      });
      
      // Si no hay productos sin pagar, significa que TODAS las cuentas ya están cobradas
      if (unpaidActiveItems.length === 0) {
          isCompletamentePagada = true;
      }
  }

  const handleAddCuenta = (e) => {
    e.preventDefault();
    const name = newCuentaName.trim();
    if (name && addNewCuenta) {
      addNewCuenta(name, newCuentaPhone);
      toast(`Cuenta "${name}" creada exitosamente`, 'success');
    }
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
      if (g.items.length === 0 && g.cuentaName === 'General') {
          const otherGroupsWithItems = groupedCart.some(other => other.cuentaName !== 'General' && other.items.length > 0);
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
      toast('Estado actualizado a entregado', 'success');
    } catch (e) {
      toast('Error al actualizar el estado', 'error');
    } finally {
      setProcessingItems(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleDeliverAll = async () => {
    setIsDeliveringAll(true);
    try {
      if (onDeliverAll) await onDeliverAll();
      toast('Todos los productos entregados exitosamente', 'success');
    } catch (e) {
      toast('Error al entregar productos', 'error');
    } finally {
      setIsDeliveringAll(false);
    }
  };

  const handleCloseTableClick = async () => {
    setIsClosingTable(true);
    try {
      if (onCloseTable) await onCloseTable();
      toast('Mesa liberada exitosamente', 'success');
    } catch (error) {
      console.error("Error cerrando mesa", error);
      toast('Error al liberar la mesa', 'error');
    } finally {
      setIsClosingTable(false);
    }
  };

  const handleCheckoutClick = async () => {
    setIsCheckingOut(true);
    try {
      if (onCheckout) await onCheckout();
    } finally {
      // Breve retraso para que la animación del modal termine de abrirse
      setTimeout(() => setIsCheckingOut(false), 500);
    }
  };

  const handleSendToKitchenClick = async () => {
    setIsSendingToKitchen(true);
    try {
      if (onSendToKitchen) await onSendToKitchen();
    } finally {
      setTimeout(() => setIsSendingToKitchen(false), 500);
    }
  };

  const totalItemsInCart = activeCart.reduce((acc, curr) => acc + curr.qty, 0);

  const handleDeleteUnsent = (item) => {
    const accountActiveItems = activeCart.filter(i => (i.cuenta || 'General') === (item.cuenta || 'General'));
    const totalItemsInAccount = accountActiveItems.reduce((acc, curr) => acc + curr.qty, 0);
    
    const isLastInCart = totalItemsInCart === item.qty;
    const isLastInAccount = totalItemsInAccount === item.qty;

    if (isLastInCart) {
        openConfirmModal({
            title: 'Vaciar Orden',
            message: `¿Seguro que deseas eliminar este producto? La orden quedará completamente vacía.`,
            icon: Trash2,
            color: 'red',
            confirmText: 'Sí, Vaciar',
            onConfirm: () => { onDelete(item); toast('Orden vaciada', 'success'); }
        });
    } else if (isLastInAccount) {
        openConfirmModal({
            title: 'Eliminar Último Producto',
            message: `¿Seguro que deseas eliminar el producto "${item.nombre}"? Al ser el último, la cuenta "${item.cuenta || 'General'}" quedará vacía.`,
            icon: Trash2,
            color: 'red',
            confirmText: 'Sí, Eliminar',
            onConfirm: () => { onDelete(item); toast('Producto eliminado', 'success'); }
        });
    } else {
        onDelete(item);
    }
  };

  const handleRemoveUnsent = (item) => {
    const isLastInCart = totalItemsInCart === 1;
    const accountActiveItems = activeCart.filter(i => (i.cuenta || 'General') === (item.cuenta || 'General'));
    const isLastInAccount = accountActiveItems.reduce((acc, curr) => acc + curr.qty, 0) === 1;

    if (isLastInCart) {
         openConfirmModal({
            title: 'Vaciar Orden',
            message: `Al quitar este producto, la orden quedará completamente vacía. ¿Deseas continuar?`,
            icon: Minus,
            color: 'red',
            confirmText: 'Sí, Quitar',
            onConfirm: () => { onRemove(item); toast('Orden vaciada', 'success'); }
        });
    } else if (isLastInAccount) {
         openConfirmModal({
            title: 'Quitar Último Producto',
            message: `Al quitar este producto, la cuenta "${item.cuenta || 'General'}" quedará vacía. ¿Deseas continuar?`,
            icon: Minus,
            color: 'red',
            confirmText: 'Sí, Quitar',
            onConfirm: () => { onRemove(item); toast('Producto removido', 'success'); }
        });
    } else {
        onRemove(item);
    }
  };

  const handleCancelItem = (item) => {
    const accountActiveItems = activeCart.filter(i => (i.cuenta || 'General') === (item.cuenta || 'General'));
    const totalItemsInAccount = accountActiveItems.reduce((acc, curr) => acc + curr.qty, 0);

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
                    try {
                      const isCancellingAllInCart = totalItemsInCart === qtyToCancel;
                      const isCancellingAllInAccount = totalItemsInAccount === qtyToCancel;

                      if (isCancellingAllInCart && onCancelFullOrder) {
                          await onCancelFullOrder(`Cancelación de la totalidad de productos (${qtyToCancel}x)`);
                          toast('Orden completa cancelada', 'success');
                      } else if (isCancellingAllInAccount && onCancelAccount) {
                          await onCancelAccount(item.cuenta || 'General', `Cancelación parcial que vacía la cuenta (${qtyToCancel}x)`);
                          toast(`Cuenta cancelada exitosamente`, 'success');
                      } else {
                          await onCancelItem(item._groupedItems ? item._groupedItems[0] : item, 'Cancelación parcial desde POS', qtyToCancel);
                          toast('Producto cancelado', 'success');
                      }
                    } catch (error) {
                      toast('Error al cancelar el producto', 'error');
                      throw error;
                    }
                }
            }
        });
    } else {
        const isLastInCart = totalItemsInCart === 1;
        const isLastInAccount = totalItemsInAccount === 1;

        if (isLastInCart && onCancelFullOrder) {
            openConfirmModal({
                title: isVitrina ? 'Cancelar Venta Express' : (isLlevar ? 'Cancelar Pedido Completo' : 'Cancelar Toda la Mesa'),
                message: `Al cancelar este último producto, se cancelará ${isVitrina ? 'la venta' : (isLlevar ? 'el pedido' : 'la mesa')} por completo en el sistema. ¿Deseas continuar?`,
                icon: AlertTriangle, 
                color: 'red', 
                confirmText: 'Sí, Cancelar Todo',
                requireInput: true, 
                inputType: 'text', 
                inputPlaceholder: 'Motivo (opcional)', 
                inputDefault: 'Cancelado desde POS',
                onConfirm: async (reason) => {
                    try {
                      await onCancelFullOrder(reason);
                      toast('Orden completa cancelada', 'success');
                    } catch (e) {
                      toast('Error al cancelar la orden', 'error');
                      throw e;
                    }
                }
            });
        } else {
            openConfirmModal({
                title: isLastInAccount ? 'Cancelar Último Producto' : 'Cancelar Producto',
                message: isLastInAccount 
                    ? `¿Seguro que deseas cancelar "${item.nombre}"? Al ser el último producto, la cuenta "${item.cuenta || 'General'}" se limpiará de las activas.`
                    : `¿Seguro que deseas cancelar 1x ${item.nombre}?`,
                icon: XCircle, 
                color: 'red', 
                confirmText: isLastInAccount ? 'Cancelar y Limpiar Cuenta' : 'Cancelar Producto',
                requireInput: true, 
                inputType: 'text', 
                inputPlaceholder: 'Motivo (opcional)', 
                inputDefault: 'Cancelado desde POS',
                onConfirm: async (reason) => {
                    try {
                      await onCancelItem(item._groupedItems ? item._groupedItems[0] : item, reason, 1);
                      toast('Producto cancelado exitosamente', 'success');
                    } catch (e) {
                      toast('Error al cancelar el producto', 'error');
                      throw e;
                    }
                }
            });
        }
    }
  };

  const modalColors = {
      blue: { icon: "text-blue-500 lya:text-lya-secondary", bg: "bg-blue-100 dark:bg-blue-900/30 lya:bg-lya-secondary/20", btn: "bg-blue-500 hover:bg-blue-600 lya:bg-lya-secondary lya:hover:bg-lya-secondary/90 text-white" },
      green: { icon: "text-emerald-500 lya:text-lya-primary", bg: "bg-emerald-100 dark:bg-emerald-900/30 lya:bg-lya-primary/20", btn: "bg-emerald-500 hover:bg-emerald-600 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white" },
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
        <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/40 p-3 sm:p-4 shadow-sm z-20 shrink-0 sticky top-0 transition-colors">
          <form onSubmit={handleAddCuenta} className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={newCuentaName} 
                onChange={(e) => setNewCuentaName(e.target.value)} 
                disabled={isCompletamentePagada} 
                placeholder="Nombre" 
                className="w-full bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg text-gray-800 dark:text-white lya:text-lya-text text-xs rounded-xl py-2 pl-9 pr-2 outline-none focus:ring-4 focus:ring-orange-500/10 lya:focus:ring-lya-primary/20 border-2 border-transparent focus:border-orange-500 lya:focus:border-lya-primary transition-all disabled:opacity-50" 
              />
              <UserPlus size={16} className="absolute left-2.5 top-2.5 text-gray-400 lya:text-lya-text/40" />
            </div>
            
            <div className="relative w-28 md:w-32">
              <input 
                type="tel" 
                value={newCuentaPhone} 
                onChange={(e) => setNewCuentaPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                disabled={isCompletamentePagada} 
                placeholder="Celular (Opc.)" 
                className="w-full bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg text-gray-800 dark:text-white lya:text-lya-text text-xs rounded-xl py-2 pl-8 pr-2 outline-none focus:ring-4 focus:ring-orange-500/10 lya:focus:ring-lya-primary/20 border-2 border-transparent focus:border-orange-500 lya:focus:border-lya-primary transition-all disabled:opacity-50" 
              />
              <Phone size={14} className="absolute left-2.5 top-2.5 text-gray-400 lya:text-lya-text/40" />
            </div>

            <button 
                type="submit" 
                disabled={!newCuentaName.trim() || isCompletamentePagada} 
                className="bg-orange-500 hover:bg-orange-600 lya:bg-lya-primary lya:hover:bg-lya-primary/90 disabled:bg-gray-300 dark:disabled:bg-gray-800 text-white px-3 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center shrink-0 disabled:opacity-50 border border-transparent dark:border-gray-700 shadow-sm"
            >
              Añadir
            </button>
          </form>
        </div>
      )}

      <div ref={scrollContainerRef} onDragOver={handleContainerDragOver} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 custom-scrollbar relative z-10">
        {activeCart.length === 0 && availableAccs.length === 1 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 lya:text-lya-text/40 opacity-70">
            <ShoppingBag size={48} strokeWidth={1.5} className="mb-3" />
            <p className="text-xs font-black uppercase tracking-widest">{isVitrina ? 'Mostrador Libre' : 'Orden vacía'}</p>
            <p className="text-[10px] font-medium mt-1">Añade productos del menú</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout"> 
            {visibleGroups.map(({ cuentaName, items }) => {
              const isActive = activeAcc === cuentaName;
              const isDragTarget = dragOverCuenta === cuentaName;
              const subtotalCuenta = items.reduce((acc, curr) => acc + (Number(curr.precio) * curr.qty), 0);
              const isCuentaPagada = paidAccounts?.includes(cuentaName);
              const isStatusLocked = isCuentaPagada || isCompletamentePagada;

              const isTodoEntregadoEnCuenta = items.length > 0 && items.every(i => i.enviadoCocina && i.kitchenStatus === 'DELIVERED');

              return (
                <motion.div 
                  key={cuentaName} layout 
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
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
                              onConfirm: async (val) => { 
                                  const qty = parseInt(val, 10); 
                                  if (qty > 0 && qty <= qtyToMove) { 
                                      try {
                                        await onMoveItem(draggedItem.item, cuentaName, qty); 
                                        toast(`Movido a ${cuentaName}`, 'success');
                                      } catch (error) {
                                        toast('Error al mover el producto', 'error');
                                      }
                                  } 
                              }
                          });
                      } else {
                          try {
                            onMoveItem(draggedItem.item, cuentaName, 1);
                            toast(`Movido a ${cuentaName}`, 'success');
                          } catch (error) {
                            toast('Error al mover el producto', 'error');
                          }
                      }
                    }
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
                            {isVitrina ? 'Cuenta Express' : (isLlevar && nombreCliente ? nombreCliente : cuentaName)}
                          </h4>
                          {cuentasTelefonos?.[cuentaName] && (
                            <span className="flex items-center gap-1 text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 lya:bg-lya-primary/10 lya:text-lya-primary px-1.5 py-0.5 rounded-md font-bold tracking-wider shadow-sm shrink-0 border border-emerald-200 dark:border-emerald-800/50 lya:border-lya-primary/20">
                              <Phone size={8} /> {cuentasTelefonos[cuentaName]}
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
                          <button 
                              onClick={(e) => { e.stopPropagation(); setCuentasOcultas(prev => [...prev, cuentaName]); }} 
                              className="text-[9px] font-black bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg border border-transparent dark:border-gray-700 lya:border-lya-border/40 hover:border-red-200 dark:hover:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20 lya:hover:bg-red-500/10 text-gray-500 hover:text-red-500 px-2 py-1 rounded-lg uppercase flex gap-1 items-center active:scale-95 transition-all shadow-sm"
                          >
                            <Trash2 size={10}/> Ocultar
                          </button>
                        )}

                        {!isCuentaPagada && !isCompletamentePagada && availableAccs.length > 1 && subtotalCuenta > 0 && !isVitrina && (
                          <button 
                              disabled={!isTodoEntregadoEnCuenta} 
                              onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (isTodoEntregadoEnCuenta && onPayCuenta) onPayCuenta(cuentaName); 
                              }} 
                              className={clsx(
                                  "text-[9px] font-black px-2 py-1 rounded-lg uppercase transition-all shadow-sm border", 
                                  isTodoEntregadoEnCuenta 
                                      ? "bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white border-emerald-600 dark:border-emerald-700 active:scale-95 lya:bg-lya-primary lya:border-lya-primary" 
                                      : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-80"
                              )}
                          >
                            Cobrar
                          </button>
                        )}
                        
                        {!isVitrina && !isLlevar && (isCuentaPagada || isCompletamentePagada) && items.length > 0 && (
                          <button 
                              onClick={(e) => { e.stopPropagation(); onPrintTicket(cuentaName); }} 
                              className="text-[9px] font-black bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 uppercase flex gap-1 items-center active:scale-95 transition-all shadow-sm"
                          >
                            <Printer size={10}/> Ticket
                          </button>
                        )}

                        {!isVitrina && !isLlevar && isCuentaPagada && items.length > 0 && (
                          <button 
                              onClick={(e) => { e.stopPropagation(); setCuentasOcultas(prev => [...prev, cuentaName]); }} 
                              className="text-[9px] font-black bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/50 px-2 py-1 rounded-lg uppercase flex gap-1 items-center active:scale-95 transition-all shadow-sm"
                          >
                            <XCircle size={10}/> Ocultar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="px-2 pb-2 space-y-1.5">
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
                            "relative group flex flex-col p-2.5 rounded-xl transition-all overflow-hidden border", 
                            (!isCuentaPagada && !isLlevar && !isVitrina) ? "cursor-grab active:cursor-grabbing" : "", 
                            draggedItem?.item === item ? "opacity-40 scale-95" : "opacity-100", 
                            item.enviadoCocina ? "bg-gray-50/80 dark:bg-gray-800/50 lya:bg-lya-bg/50 border-gray-100 dark:border-gray-800/50 lya:border-lya-border/20" : "bg-white dark:bg-gray-800 lya:bg-lya-bg border-gray-100 dark:border-gray-700 lya:border-lya-border/40 shadow-sm"
                        )}
                      >
                        <div className="flex gap-2.5">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-white dark:bg-gray-900 lya:bg-lya-surface flex-shrink-0 border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 flex items-center justify-center relative group-hover:shadow-inner shadow-sm transition-shadow">
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
                            <div className="flex justify-between items-start mb-0.5">
                              <h5 className="text-xs font-black text-gray-800 dark:text-gray-100 lya:text-lya-text truncate pr-2 tracking-tight">{item.nombre}</h5>
                              <span className="text-xs font-black text-gray-900 dark:text-white lya:text-lya-text">${(Number(item.precio) * item.qty).toFixed(2)}</span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-bold mb-0.5">
                                {item.qty > 1 && <span className="text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 lya:text-lya-primary lya:bg-lya-primary/10 px-1 py-0.5 rounded border border-orange-200 dark:border-orange-800/50 lya:border-lya-primary/20">{item.qty}x</span>}
                                {item.isTakeaway && item.enviadoCocina && !isVitrina && (
                                    <span className="text-[8px] font-black bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 lya:bg-lya-secondary/10 lya:text-lya-secondary px-1 py-0.5 rounded uppercase border border-orange-200/50 dark:border-orange-800/50 inline-flex items-center gap-1 shadow-sm">
                                        <ShoppingBag size={8} /> Empacar
                                    </span>
                                )}
                            </div>

                            <div className="space-y-0.5 pointer-events-none mt-1">
                              {item.preparaciones?.map((prep, pIdx) => {
                                if (!prep || (prep.tamano === 'Estándar' && !prep.leche && (!prep.extras || prep.extras.length === 0))) return null;
                                return (
                                  <div key={pIdx} className="bg-gray-100/80 dark:bg-gray-900/60 lya:bg-lya-surface rounded p-1 flex flex-col gap-0.5 border border-gray-200/50 dark:border-gray-800/50 lya:border-lya-border/40">
                                    <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 uppercase flex items-center gap-1"><Info size={8} /> {prep.tamano} {prep.leche && `• ${prep.leche}`}</span>
                                    {prep.extras?.length > 0 && <span className="text-[8px] font-black text-orange-500 dark:text-orange-400 lya:text-lya-primary">+ {prep.extras.join(', ')}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {(!isVitrina || (!item.enviadoCocina && !isCuentaPagada) || (item.enviadoCocina && onCancelItem)) && (
                          <div className="flex items-center justify-between gap-1.5 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800/60 lya:border-lya-border/30">
                            
                            {!isVitrina && (
                              <div className="flex-1 flex items-center gap-1.5">
                                {item.enviadoCocina ? (
                                  <button 
                                    onClick={() => handleToggleStatus(item)} 
                                    disabled={isProcessing || isStatusLocked || (item.kitchenStatus !== 'READY' && item.kitchenStatus !== 'DELIVERED')} 
                                    className={clsx(
                                        "flex items-center justify-center gap-1 text-[9px] font-black px-2 py-1.5 rounded-lg border uppercase transition-all duration-300 w-full text-center shadow-sm", 
                                        isProcessing ? "bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg border-gray-200 dark:border-gray-700 text-gray-400 opacity-70 cursor-wait" :
                                        item.kitchenStatus === 'DELIVERED' ? clsx("text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50", isStatusLocked ? "cursor-default opacity-70" : "cursor-pointer") 
                                        : item.kitchenStatus === 'READY' ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 lya:text-lya-secondary lya:bg-lya-secondary/10 lya:border-lya-secondary/30 shadow-md active:scale-95 cursor-pointer animate-pulse" 
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
                                  </button>
                                ) : (
                                  <>
                                    <span className={clsx(
                                      "flex items-center justify-center gap-1 text-[8px] font-black text-gray-500 dark:text-gray-400 lya:text-lya-text/50 bg-gray-100 dark:bg-gray-800 lya:bg-lya-surface px-1.5 py-1.5 rounded-lg uppercase border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 text-center shadow-inner",
                                      (isLlevar || !toggleItemTakeaway) ? "w-full" : "flex-1"
                                    )}>
                                      Por enviar
                                    </span>
                                    {!isLlevar && toggleItemTakeaway && (
                                      <button 
                                          onClick={() => toggleItemTakeaway(item)} 
                                          className={clsx(
                                              "flex items-center justify-center gap-1 text-[8px] font-black px-1.5 py-1.5 rounded-lg border uppercase tracking-tighter transition-all active:scale-95 cursor-pointer flex-1 text-center shadow-sm", 
                                              item.isTakeaway ? "text-orange-600 bg-orange-50 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700/50 lya:text-lya-secondary lya:bg-lya-secondary/10 lya:border-lya-secondary/30" : "text-gray-400 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:text-orange-500 hover:border-orange-300"
                                          )} 
                                      >
                                        <ShoppingBag size={10} className={item.isTakeaway ? "text-orange-600 lya:text-lya-secondary" : "text-gray-400"} /> {item.isTakeaway ? 'Empacar' : 'Mesa'}
                                      </button>
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
                                    <button onClick={() => handleRemoveUnsent(item)} className={clsx("hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-gray-400 hover:text-red-500 transition-colors active:scale-90", isVitrina ? "flex-1 py-1.5 flex justify-center" : "p-1")}><Minus size={isVitrina ? 16 : 12} /></button>
                                    <button onClick={() => onAdd(item, cuentaName)} className={clsx("hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-orange-500 lya:text-lya-primary transition-colors active:scale-90", isVitrina ? "flex-1 py-1.5 flex justify-center" : "p-1")}><Plus size={isVitrina ? 16 : 12} /></button>
                                    <div className={clsx("bg-gray-200 dark:bg-gray-700 lya:bg-lya-border/40 mx-0.5", isVitrina ? "w-px h-5" : "w-px h-3")} />
                                    <button onClick={() => handleDeleteUnsent(item)} className={clsx("hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-gray-400 hover:text-red-500 transition-colors active:scale-90", isVitrina ? "flex-1 py-1.5 flex justify-center" : "p-1")}><Trash2 size={isVitrina ? 16 : 12} /></button>
                                  </>
                                )}
                                {item.enviadoCocina && onCancelItem && (
                                    <button onClick={() => handleCancelItem(item)} className={clsx("hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-red-400 hover:text-red-600 transition-colors active:scale-95", isVitrina ? "w-full py-1.5 flex justify-center items-center gap-1.5" : "p-1")} title="Cancelar Producto">
                                      <XCircle size={isVitrina ? 14 : 12} />
                                      {isVitrina && <span className="text-[9px] font-black uppercase tracking-wider">Cancelar</span>}
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
          <div className="mt-4 mb-2 border-2 border-dashed border-red-200 dark:border-red-900/50 lya:border-red-500/30 rounded-2xl p-3 bg-red-50/50 dark:bg-red-950/20 lya:bg-red-500/5 transition-colors">
              <button onClick={() => setShowCancelled(!showCancelled)} className="flex justify-between items-center w-full text-red-500 dark:text-red-400 font-black text-[9px] uppercase tracking-widest hover:text-red-600 transition-colors">
                  <span className="flex items-center gap-1.5"><Trash2 size={12}/> Cancelados ({cancelledCart.reduce((sum, i) => sum + i.qty, 0)})</span>
                  <ChevronDown size={12} className={clsx("transition-transform duration-300", showCancelled ? "rotate-180" : "")}/>
              </button>
              <AnimatePresence>
                  {showCancelled && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3 space-y-1.5">
                          {cancelledCart.map((cItem, i) => (
                              <div key={i} className="flex justify-between items-center bg-white dark:bg-gray-900 lya:bg-lya-surface p-2 rounded-xl border border-red-100 dark:border-red-900/50 opacity-80 shadow-sm transition-colors">
                                  <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-[9px] font-black text-red-600 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800/50">{cItem.qty}x</span>
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 lya:text-lya-text truncate">{cItem.nombre}</span>
                                        <span className="text-[8px] text-gray-500 dark:text-gray-500 uppercase font-medium">{isLlevar && nombreCliente ? nombreCliente : cItem.cuenta}</span>
                                      </div>
                                  </div>
                                  <span className="text-[9px] font-black text-gray-400 line-through shrink-0">${(cItem.precio * cItem.qty).toFixed(2)}</span>
                              </div>
                          ))}
                      </motion.div>
                  )}
              </AnimatePresence>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4 bg-white dark:bg-gray-900 lya:bg-lya-surface border-t border-gray-100 dark:border-gray-800 lya:border-lya-border/40 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-20 shrink-0 transition-colors">
        
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
                                try {
                                  if (onCancelFullOrder) await onCancelFullOrder(reason);
                                  toast('Venta cancelada exitosamente', 'success');
                                } catch (e) {
                                  toast('Error al cancelar la venta', 'error');
                                  throw e;
                                }
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

      <AnimatePresence>
        {modalConfig && (
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
                toast('Orden completa cancelada', 'success');
            } else {
                if (onCancelAccount) await onCancelAccount(cuenta, motivo);
                toast(`Cuenta ${cuenta} cancelada exitosamente`, 'success');
            }
          } catch (e) {
            toast('Error durante la cancelación', 'error');
            throw e;
          } finally {
            setShowCancelModal(false);
          }
        }}
      />
    </div>
  );
};