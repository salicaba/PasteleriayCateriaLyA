// src/modules/cafeteria/views/TicketSidebar.jsx
import React, { useState, useRef } from 'react';
import { Trash2, Minus, ArrowRightLeft, XCircle, ShoppingBag, AlertTriangle } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

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

  let isCompletamentePagada = false;

  if (orderStatus === 'PAID') {
      isCompletamentePagada = true;
  } else if (activeCart.length > 0) {
      const unpaidActiveItems = activeCart.filter(item => {
          const cuentaDelItem = item.cuenta || 'General';
          return !(paidAccounts?.includes(cuentaDelItem));
      });
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
      let successMsg = 'Mesa liberada exitosamente';
      if (isVitrina) successMsg = 'Venta en mostrador finalizada exitosamente';
      else if (isLlevar) successMsg = 'Pedido para llevar finalizado exitosamente';
      toast(successMsg, 'success');
    } catch (error) {
      let errorMsg = 'Error al liberar la mesa';
      if (isVitrina) errorMsg = 'Error al finalizar la venta';
      else if (isLlevar) errorMsg = 'Error al finalizar el pedido';
      toast(errorMsg, 'error');
    } finally {
      setIsClosingTable(false);
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
    if (draggedItem && draggedItem.cuentaName !== cuentaName && !paidAccounts?.includes(cuentaName) && !isLlevar && !isVitrina) {
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
  const hasSentItems = sentItems.length > 0;
  const allSentItemsDelivered = hasSentItems && sentItems.every(i => i.kitchenStatus === 'DELIVERED');
  
  const hasReadyItems = sentItems.some(i => i.kitchenStatus === 'READY');
  const hasCookingItems = sentItems.some(i => ['PENDING', 'PREPARING'].includes(i.kitchenStatus));
  const showDeliverAllBtn = !isVitrina && hasSentItems && !allSentItemsDelivered;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg transition-colors relative">
      
      {!(isLlevar || isVitrina) && (
        <TicketAccountForm 
          newCuentaName={newCuentaName} setNewCuentaName={setNewCuentaName}
          newCuentaPhone={newCuentaPhone} setNewCuentaPhone={setNewCuentaPhone}
          handleAddCuenta={handleAddCuenta}
          isCompletamentePagada={isCompletamentePagada}
        />
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
              const isTodoEntregadoEnCuenta = items.length > 0 && items.every(i => i.enviadoCocina && i.kitchenStatus === 'DELIVERED');

              return (
                <TicketCartGroup 
                  key={cuentaName}
                  cuentaName={cuentaName} items={items}
                  isActive={isActive} isDragTarget={isDragTarget} subtotalCuenta={subtotalCuenta}
                  isCuentaPagada={isCuentaPagada} isCompletamentePagada={isCompletamentePagada}
                  isTodoEntregadoEnCuenta={isTodoEntregadoEnCuenta}
                  draggedItem={draggedItem} setDragOverCuenta={setDragOverCuenta} handleDropOnCuenta={handleDropOnCuenta}
                  openConfirmModal={openConfirmModal} setCuentaActiva={setCuentaActiva} cuentasTelefonos={cuentasTelefonos}
                  isVitrina={isVitrina} isLlevar={isLlevar} nombreCliente={nombreCliente} setCuentasOcultas={setCuentasOcultas}
                  onPayCuenta={onPayCuenta} onPrintTicket={onPrintTicket} availableAccs={availableAccs}
                  processingItems={processingItems} handleToggleStatus={handleToggleStatus} handleRemoveUnsent={handleRemoveUnsent}
                  onAdd={onAdd} handleDeleteUnsent={handleDeleteUnsent} handleCancelItem={handleCancelItem}
                  toggleItemTakeaway={toggleItemTakeaway} onCancelItem={onCancelItem}
                  onDragStart={(item, cName) => setDraggedItem({ item, cuentaName: cName })}
                  onDragEnd={() => setDraggedItem(null)}
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
        activeCart={activeCart} isVitrina={isVitrina} isLlevar={isLlevar} isCompletamentePagada={isCompletamentePagada}
        showDeliverAllBtn={showDeliverAllBtn} hasReadyItems={hasReadyItems} hasCookingItems={hasCookingItems}
        isDeliveringAll={isDeliveringAll} handleDeliverAll={handleDeliverAll} openConfirmModal={openConfirmModal}
        onPrintTicket={onPrintTicket} onCancelFullOrder={onCancelFullOrder} onCancelAccount={onCancelAccount}
        setShowCancelModal={setShowCancelModal}
        handleCloseTableClick={handleCloseTableClick} isClosingTable={isClosingTable}
        handleSendToKitchenClick={handleSendToKitchenClick} isSendingToKitchen={isSendingToKitchen}
        handleCheckoutClick={handleCheckoutClick} isCheckingOut={isCheckingOut}
      />

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