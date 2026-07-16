// src/modules/cafeteria/views/TicketSidebar.jsx
import React, { useState, useRef } from 'react';
import { Trash2, Minus, ArrowRightLeft, XCircle, ShoppingBag, AlertTriangle, Printer, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import OpcionesCancelacionModal from './OpcionesCancelacionModal'; 
import { TicketAccountForm } from './components/ticket/TicketAccountForm';
import { TicketCancelledItems } from './components/ticket/TicketCancelledItems';
import { TicketBottomBar } from './components/ticket/TicketBottomBar';
import { TicketCartGroup } from './components/ticket/TicketCartGroup';
import { ConfirmActionModal } from './modals/ConfirmActionModal';

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
  
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

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

  // 🔥 MAPA GLOBAL DE STOCK SIN ENVIAR
  const globalUnsentQtyMap = activeCart
    .filter(item => !item.enviadoCocina)
    .reduce((acc, item) => {
      acc[item.id] = (acc[item.id] || 0) + item.qty;
      return acc;
    }, {});

  const cuentasPagadasReales = Array.from(new Set([...(paidAccounts || [])]));
  const cuentasPagadasVisibles = cuentasPagadasReales.filter(acc => !cuentasOcultas.includes(acc));

  const handleAddCuenta = (e) => {
    if (e && e.preventDefault) e.preventDefault();
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
  }).sort((a, b) => {
      const aPagada = cuentasPagadasReales.includes(a.cuentaName);
      const bPagada = cuentasPagadasReales.includes(b.cuentaName);
      if (aPagada && !bPagada) return 1;  
      if (!aPagada && bPagada) return -1; 
      return 0; 
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
      let successMsg = 'Mesa liberada exitosamente';
      if (isVitrina) successMsg = 'Venta en mostrador finalizada exitosamente';
      else if (isLlevar) successMsg = 'Pedido para llevar finalizado exitosamente';
      toast(successMsg, 'success');
    } catch (error) {
      toast('Error al liberar', 'error');
    } finally {
      setIsClosingTable(false);
    }
  };

  const handleReleaseAccounts = async (cuentasALiberar) => {
    setIsReleasing(true); 

    const updatedOcultas = [...cuentasOcultas, ...cuentasALiberar];
    const unhiddenAccounts = activeCart.filter(item => {
      const c = item.cuenta || 'General';
      return !updatedOcultas.includes(c);
    });

    setCuentasOcultas(updatedOcultas);
    setShowReleaseModal(false);

    try {
      if (unhiddenAccounts.length === 0 && onCloseTable) {
        await onCloseTable();
        toast('Todas las cuentas finalizadas. Mesa liberada.', 'success');
      } else {
        toast(`Cuentas liberadas exitosamente.`, 'success');
      }
    } catch (error) {
      toast('Error al procesar la liberación', 'error');
      const revertOcultas = cuentasOcultas.filter(c => !cuentasALiberar.includes(c));
      setCuentasOcultas(revertOcultas);
    } finally {
      setIsReleasing(false);
    }
  };

  const handleCheckoutClick = async () => {
    setIsCheckingOut(true);
    try {
      if (onCheckout) await onCheckout();
    } finally {
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
            icon: Trash2, color: 'red', confirmText: 'Sí, Vaciar',
            onConfirm: () => { onDelete(item); toast('Orden vaciada', 'success'); }
        });
    } else if (isLastInAccount) {
        openConfirmModal({
            title: 'Eliminar Último Producto',
            message: `¿Seguro que deseas eliminar el producto "${item.nombre}"? Al ser el último, la cuenta "${item.cuenta || 'General'}" quedará vacía.`,
            icon: Trash2, color: 'red', confirmText: 'Sí, Eliminar',
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
            icon: Minus, color: 'red', confirmText: 'Sí, Quitar',
            onConfirm: () => { onRemove(item); toast('Orden vaciada', 'success'); }
        });
    } else if (isLastInAccount) {
         openConfirmModal({
            title: 'Quitar Último Producto',
            message: `Al quitar este producto, la cuenta "${item.cuenta || 'General'}" quedará vacía. ¿Deseas continuar?`,
            icon: Minus, color: 'red', confirmText: 'Sí, Quitar',
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
            icon: XCircle, color: 'red', confirmText: 'Cancelar',
            requireInput: true, inputType: 'number', inputMax: item.qty, inputDefault: item.qty.toString(),
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
                icon: AlertTriangle, color: 'red', confirmText: 'Sí, Cancelar Todo',
                requireInput: true, inputType: 'text', inputPlaceholder: 'Motivo (opcional)', inputDefault: 'Cancelado desde POS',
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
                icon: XCircle, color: 'red', confirmText: isLastInAccount ? 'Cancelar y Limpiar Cuenta' : 'Cancelar Producto',
                requireInput: true, inputType: 'text', inputPlaceholder: 'Motivo (opcional)', inputDefault: 'Cancelado desde POS',
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

  const handleDropOnCuenta = async (cuentaName) => {
    setDragOverCuenta(null);
    if (draggedItem && draggedItem.cuentaName !== cuentaName && !cuentasPagadasReales.includes(cuentaName) && !isLlevar && !isVitrina) {
      let qtyToMove = draggedItem.item.qty;
      const itemIdToProcess = draggedItem.item.backendItemId || draggedItem.item.id;

      if (qtyToMove > 1) {
          openConfirmModal({
              title: 'Mover Producto',
              message: `¿Cuántos "${draggedItem.item.nombre}" deseas mover a la cuenta de ${cuentaName}? (Máx: ${qtyToMove})`,
              icon: ArrowRightLeft, color: 'blue', confirmText: 'Mover Producto',
              requireInput: true, inputType: 'number', inputMax: qtyToMove, inputDefault: qtyToMove.toString(),
              onConfirm: async (val) => { 
                  const qty = parseInt(val, 10); 
                  if (qty > 0 && qty <= qtyToMove) { 
                      setProcessingItems(prev => ({ ...prev, [itemIdToProcess]: true }));
                      try {
                        await onMoveItem(draggedItem.item, cuentaName, qty); 
                        toast(`Movido a ${cuentaName}`, 'success');
                      } catch (error) {
                        toast('Error al mover el producto', 'error');
                      } finally {
                        setProcessingItems(prev => ({ ...prev, [itemIdToProcess]: false }));
                      }
                  } 
              }
          });
      } else {
          setProcessingItems(prev => ({ ...prev, [itemIdToProcess]: true }));
          try {
            await onMoveItem(draggedItem.item, cuentaName, 1);
            toast(`Movido a ${cuentaName}`, 'success');
          } catch (error) {
            toast('Error al mover el producto', 'error');
          } finally {
            setProcessingItems(prev => ({ ...prev, [itemIdToProcess]: false }));
          }
      }
    }
  }

  const cuentasCancelables = Array.from(new Set(activeCart.filter(i => i.enviadoCocina).map(i => i.cuenta || 'General')));
  
  const sentItems = activeCart.filter(i => i.enviadoCocina);
  const itemsNeedingDelivery = sentItems.filter(i => ['PENDING', 'PREPARING', 'READY'].includes(i.kitchenStatus));
  
  const hasReadyItems = sentItems.some(i => i.kitchenStatus === 'READY');
  const hasCookingItems = sentItems.some(i => ['PENDING', 'PREPARING'].includes(i.kitchenStatus));
  
  const showDeliverAllBtn = !isVitrina && itemsNeedingDelivery.length > 0;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg transition-colors relative">
      
      {!(isLlevar || isVitrina) && (
        <TicketAccountForm 
          newCuentaName={newCuentaName} setNewCuentaName={setNewCuentaName}
          newCuentaPhone={newCuentaPhone} setNewCuentaPhone={setNewCuentaPhone}
          handleAddCuenta={handleAddCuenta}
          isCompletamentePagada={false} 
        />
      )}

      <div ref={scrollContainerRef} onDragOver={handleContainerDragOver} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 custom-scrollbar relative z-10">
        
        {activeCart.length === 0 && availableAccs.length === 1 && !isLlevar ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 lya:text-lya-text/40 opacity-70">
            <ShoppingBag size={48} strokeWidth={1.5} className="mb-3" />
            <p className="text-xs font-black uppercase tracking-widest">{isVitrina ? 'Mostrador Libre' : 'Mesa vacía'}</p>
            <p className="text-[10px] font-medium mt-1">Añade productos del menú</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout"> 
            {visibleGroups.map(({ cuentaName, items }) => {
              const isActive = activeAcc === cuentaName;
              const isDragTarget = dragOverCuenta === cuentaName;
              const subtotalCuenta = items.reduce((acc, curr) => acc + (Number(curr.precio) * curr.qty), 0);
              
              const isCuentaPagada = cuentasPagadasReales.includes(cuentaName);
              const isTodoEntregadoEnCuenta = items.length > 0 && !items.some(i => !i.enviadoCocina || ['PENDING', 'PREPARING', 'READY'].includes(i.kitchenStatus));

              return (
                <TicketCartGroup 
                  key={cuentaName}
                  cuentaName={cuentaName} items={items}
                  isActive={isActive} isDragTarget={isDragTarget} subtotalCuenta={subtotalCuenta}
                  isCuentaPagada={isCuentaPagada} isCompletamentePagada={false} 
                  isTodoEntregadoEnCuenta={isTodoEntregadoEnCuenta}
                  globalUnsentQtyMap={globalUnsentQtyMap}
                  draggedItem={draggedItem} setDragOverCuenta={setDragOverCuenta} handleDropOnCuenta={handleDropOnCuenta}
                  openConfirmModal={openConfirmModal} setCuentaActiva={setCuentaActiva} cuentasTelefonos={cuentasTelefonos}
                  isVitrina={isVitrina} isLlevar={isLlevar} nombreCliente={nombreCliente} setCuentasOcultas={setCuentasOcultas}
                  onPayCuenta={onPayCuenta} onPrintTicket={onPrintTicket} availableAccs={availableAccs}
                  processingItems={processingItems} handleToggleStatus={handleToggleStatus} handleRemoveUnsent={handleRemoveUnsent}
                  onAdd={onAdd} handleDeleteUnsent={handleDeleteUnsent} handleCancelItem={handleCancelItem}
                  toggleItemTakeaway={toggleItemTakeaway} onCancelItem={onCancelItem}
                  onDragStart={(item, cName) => setDraggedItem({ item, cuentaName: cName })}
                  onDragEnd={() => setDraggedItem(null)}
                  showToast={toast} // 🚀 ¡PASAMOS LA FUNCIÓN AQUÍ!
                />
              );
            })}
          </AnimatePresence>
        )}

        <TicketCancelledItems 
          cancelledCart={cancelledCart}
          showCancelled={showCancelled} setShowCancelled={setShowCancelled}
          isLlevar={isLlevar} nombreCliente={nombreCliente}
        />
      </div>

      <TicketBottomBar 
        mesaTotal={mesaTotal} unsentTotal={unsentTotal} hasUnsentItems={hasUnsentItems}
        activeCart={activeCart} isVitrina={isVitrina} isLlevar={isLlevar} 
        paidAccounts={paidAccounts} cuentasOcultas={cuentasOcultas}
        orderStatus={orderStatus} 
        cuentasPagadasReales={cuentasPagadasReales} 
        
        showDeliverAllBtn={showDeliverAllBtn} hasReadyItems={hasReadyItems} hasCookingItems={hasCookingItems}
        isDeliveringAll={isDeliveringAll} handleDeliverAll={handleDeliverAll} openConfirmModal={openConfirmModal}
        
        onCancelFullOrder={onCancelFullOrder} onCancelAccount={onCancelAccount}
        setShowCancelModal={setShowCancelModal}
        
        onOpenReleaseModal={() => setShowReleaseModal(true)}
        
        onPrintTicket={onPrintTicket}

        handleCloseTableClick={handleCloseTableClick}
        isClosingTable={isClosingTable}

        handleSendToKitchenClick={handleSendToKitchenClick} isSendingToKitchen={isSendingToKitchen}
        handleCheckoutClick={handleCheckoutClick} isCheckingOut={isCheckingOut}
      />

      <AnimatePresence>
        {showReleaseModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/40 dark:bg-black/60 lya:bg-lya-dark/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} className="w-full max-w-sm bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 flex flex-col">
              
              <div className="p-5 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 text-center">
                <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/40 lya:bg-lya-secondary/20 text-blue-500 lya:text-lya-secondary rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="font-black text-lg text-gray-900 dark:text-white lya:text-lya-text">Liberar Cuentas</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">Selecciona las cuentas pagadas que deseas cerrar y ocultar de la mesa.</p>
              </div>

              <div className="p-4 max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-2">
                
                {cuentasPagadasVisibles.length > 1 && (
                  <motion.button
                    whileTap={!isReleasing ? { scale: 0.95 } : {}}
                    onClick={() => handleReleaseAccounts(cuentasPagadasVisibles)}
                    disabled={isReleasing}
                    className="w-full p-3 mb-2 text-center rounded-xl border-2 border-blue-200 dark:border-blue-900 lya:border-lya-secondary/40 bg-blue-50 dark:bg-blue-900/20 lya:bg-lya-secondary/10 font-black text-blue-600 dark:text-blue-400 lya:text-lya-secondary md:hover:bg-blue-100 dark:md:hover:bg-blue-900/40 transition-colors flex justify-center items-center gap-2 outline-none shadow-sm disabled:opacity-50"
                  >
                    {isReleasing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} strokeWidth={2.5} />}
                    Liberar Todas las Cuentas
                  </motion.button>
                )}

                {cuentasPagadasVisibles.map(acc => (
                  <motion.button 
                    whileTap={!isReleasing ? { scale: 0.95 } : {}}
                    key={acc} onClick={() => handleReleaseAccounts([acc])} disabled={isReleasing}
                    className="w-full p-3 text-left rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text md:hover:border-blue-300 dark:md:hover:border-blue-700 transition-colors flex justify-between items-center outline-none disabled:opacity-50"
                  >
                    <span>{acc}</span> 
                    {isReleasing ? <Loader2 size={16} className="text-gray-400 animate-spin" /> : <ArrowRightLeft size={16} className="text-gray-400 dark:text-gray-500" />}
                  </motion.button>
                ))}

              </div>
              
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 lya:border-lya-border/30">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowReleaseModal(false)} className="w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-gray-600 dark:text-gray-300 lya:text-lya-text font-bold md:hover:bg-gray-200 dark:md:hover:bg-gray-700 transition-colors outline-none">Cancelar</motion.button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmActionModal 
        modalConfig={modalConfig} setModalConfig={setModalConfig}
        modalInputValue={modalInputValue} setModalInputValue={setModalInputValue}
        isModalProcessing={isModalProcessing} setIsModalProcessing={setIsModalProcessing}
      />

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