// src/modules/cafeteria/controllers/usePosMutations.js
import { useState, useRef } from 'react';
import client from '../../../api/client.js';

const parseAccountName = (str) => {
  if (!str) return 'General';
  const s = String(str);
  if (s.includes(' | ')) return s.split(' | ')[0].trim();
  if (s.includes(' - ')) {
    const parts = s.split(' - ');
    const possiblePhone = parts[parts.length - 1].replace(/\D/g, '');
    if (possiblePhone.length >= 10) return parts.slice(0, -1).join(' - ').trim();
  }
  return s;
};

export const usePosMutations = ({
  cart, setCart,
  activeOrderId, setActiveOrderId,
  mesaActual,
  setCuentasTelefonos,
  setPaidAccounts,
  setOrderStatus,
  cuentasPagadasReales,
  triggerNotification
}) => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); 
  
  // 🔥 PILAR 3: Candado asíncrono infalible a nivel de hook
  const lockRef = useRef(false);

  const mapDBItemToLocal = (dbItem, itemsNuevos = []) => {
      let parsedPreps = [];
      if (dbItem.notes) { 
        try { parsedPreps = JSON.parse(dbItem.notes); } 
        catch(e) { parsedPreps = [{ detalles: "Personalización" }]; } 
      }
      if (!Array.isArray(parsedPreps)) parsedPreps = [parsedPreps || {}];
      
      return { 
        id: dbItem.productId, 
        nombre: dbItem.product?.name || dbItem.product?.nombre || 'Producto', 
        imagen: dbItem.product?.imageUrl || null, 
        precio: parseFloat(dbItem.subtotal) / (dbItem.quantity || 1), // 🔥 Prevención NaN
        qty: dbItem.quantity, 
        preparaciones: parsedPreps, 
        enviadoCocina: true, 
        kitchenStatus: dbItem.kitchenStatus, 
        status: dbItem.status || 'ACTIVE', 
        cuenta: dbItem.cuenta || 'General', 
        isTakeaway: dbItem.isTakeaway || false, 
        backendItemId: String(dbItem.id), // 🛡️ Blindado como String
        requiereCocina: itemsNuevos.find(n => String(n.id) === String(dbItem.productId))?.requiereCocina !== false,
        isAutoPromo: dbItem.isAutoPromo || false,
        promoLabel: dbItem.promoLabel || null,
        precioOriginal: dbItem.precioOriginal || null
      };
  };

  const simulateKitchenSend = async (onComplete = null) => {
    const itemsNuevos = cart.filter(p => !p.enviadoCocina);
    if (itemsNuevos.length === 0) { 
      if (onComplete) onComplete(); 
      return; 
    }
    
    // 🔥 BLOQUEO DE DOBLE CLIC
    if (lockRef.current) return;
    lockRef.current = true;
    setIsProcessing(true);
    setIsSuccess(true);
    
    try {
      let orderId = activeOrderId;
      if (!orderId) {
        const isLlevarMode = mesaActual?.zona === 'llevar';
        const res = await client.post('/pos/orders', { 
          orderType: isLlevarMode ? 'LLEVAR' : 'SALON', 
          tableId: isLlevarMode ? null : mesaActual?.id, 
          ticketId: isLlevarMode ? mesaActual?.numero : null 
        });
        orderId = res.data.order.id;
        setActiveOrderId(orderId);

        setCuentasTelefonos(prev => {
            if (Object.keys(prev).length > 0) {
                localStorage.setItem(`lya_phones_${orderId}`, JSON.stringify(prev));
            }
            return prev;
        });
      }

      const payload = itemsNuevos.map(item => ({ 
        productId: item.id, 
        quantity: item.qty, 
        subtotal: item.precio * item.qty, 
        cuenta: item.cuenta || 'General', 
        notes: JSON.stringify(item.preparaciones), 
        isTakeaway: item.isTakeaway || false,
        isAutoPromo: item.isAutoPromo || false,
        promoLabel: item.promoLabel || null,
        precioOriginal: item.precioOriginal || null
      }));

      const response = await client.post(`/pos/orders/${orderId}/items`, { items: payload });
      
      // 🔥 ATRAPAMOS LA CURA: Si el backend nos generó un ID nuevo, lo actualizamos
      if (response.data.newOrderId && response.data.newOrderId !== orderId) {
          setActiveOrderId(response.data.newOrderId);
      }

      let allItemsFromDB = response.data.orderItems || [];
      
      const updatedCart = allItemsFromDB.map(dbItem => mapDBItemToLocal(dbItem, itemsNuevos));

      setCart(prev => {
          const unsentLocal = prev.filter(p => !p.enviadoCocina && !itemsNuevos.includes(p));
          return [...updatedCart, ...unsentLocal];
      });
      
      setTimeout(() => { 
        setIsSuccess(false); 
        if (onComplete) onComplete(); 
      }, 1500);

    } catch (error) { 
        setIsSuccess(false); 
        console.error("Error al enviar a cocina:", error);
        throw error;
    } finally {
        lockRef.current = false;
        setIsProcessing(false);
    }
  };

  const moveItemToCuenta = async (item, target, qtyToMove = item.qty) => { 
    if (cuentasPagadasReales.includes(target)) {
        triggerNotification(`La cuenta "${parseAccountName(target)}" ya está cobrada. No puedes moverle más productos.`, 'error');
        return;
    }

    if (lockRef.current) return;
    lockRef.current = true;
    setIsProcessing(true);
    const itemsToProcess = item._groupedItems || [item];
    
    try {
        let remainingToMove = qtyToMove;
        let allItemsFromDB = null;
        let dbMoveMade = false;
        
        for (const subItem of itemsToProcess) {
            if (remainingToMove <= 0) break;
            const qtyFromThis = Math.min(subItem.qty, remainingToMove);
            
            if (subItem.enviadoCocina) {
                const response = await client.put(`/pos/orders/items/${subItem.backendItemId}/move`, { 
                  targetCuenta: target, 
                  qtyToMove: qtyFromThis 
                });
                allItemsFromDB = response.data.orderItems || [];
                dbMoveMade = true;
            } else {
                setCart(prev => {
                   const newCart = [...prev];
                   const prepStr = JSON.stringify(subItem.preparaciones[0] || {});
                   let idx = newCart.indexOf(subItem);
                   
                   if (idx === -1) { 
                     idx = newCart.findIndex(p => 
                       p.id === subItem.id && p.precio === subItem.precio && 
                       p.cuenta === (subItem.cuenta || 'General') && !!p.isTakeaway === !!subItem.isTakeaway && 
                       !p.enviadoCocina && JSON.stringify(p.preparaciones[0] || {}) === prepStr
                     ); 
                   }
                   
                   if(idx !== -1) {
                       const existingIdx = newCart.findIndex(p => 
                         p.id === subItem.id && p.precio === subItem.precio && 
                         p.cuenta === target && !!p.isTakeaway === !!subItem.isTakeaway && 
                         !p.enviadoCocina && JSON.stringify(p.preparaciones[0] || {}) === prepStr
                       );
                       
                       if (existingIdx !== -1) {
                           newCart[existingIdx] = { 
                             ...newCart[existingIdx], 
                             qty: newCart[existingIdx].qty + qtyFromThis, 
                             preparaciones: [...newCart[existingIdx].preparaciones, ...subItem.preparaciones.slice(0, qtyFromThis)] 
                           };
                           
                           if (qtyFromThis < newCart[idx].qty) { 
                             newCart[idx] = { ...newCart[idx], qty: newCart[idx].qty - qtyFromThis, preparaciones: newCart[idx].preparaciones.slice(qtyFromThis) }; 
                           } else { 
                             newCart.splice(idx, 1); 
                           }
                       } else {
                           if (qtyFromThis < newCart[idx].qty) { 
                             newCart[idx] = { ...newCart[idx], qty: newCart[idx].qty - qtyFromThis, preparaciones: newCart[idx].preparaciones.slice(qtyFromThis) }; 
                             newCart.push({ ...subItem, cuenta: target, qty: qtyFromThis, preparaciones: subItem.preparaciones.slice(0, qtyFromThis) }); 
                           } else { 
                             newCart[idx] = { ...newCart[idx], cuenta: target }; 
                           }
                       }
                   }
                   return newCart;
                });
            }
            remainingToMove -= qtyFromThis;
        }
        
        if (dbMoveMade && allItemsFromDB) {
            const updatedCart = allItemsFromDB.map(dbItem => mapDBItemToLocal(dbItem));
            setCart(prev => { 
              const unsentLocal = prev.filter(p => !p.enviadoCocina); 
              return [...updatedCart, ...unsentLocal]; 
            });
        }
    } catch (error) { 
      triggerNotification("Error al mover los ítems de cuenta.", "error");
      throw error;
    } finally {
      lockRef.current = false;
      setIsProcessing(false);
    }
  };

  const toggleDeliveredStatus = async (groupedItem) => {
    if (!groupedItem) return;
    const itemsToUpdate = groupedItem._groupedItems || [groupedItem];
    if (itemsToUpdate.length === 0) return;
    
    const currentStatus = itemsToUpdate[0].kitchenStatus;
    if (currentStatus !== 'READY' && currentStatus !== 'DELIVERED') return;
    const newStatus = currentStatus === 'DELIVERED' ? 'READY' : 'DELIVERED';
    
    if (lockRef.current) return;
    lockRef.current = true;
    setIsProcessing(true);

    try {
        await Promise.all(itemsToUpdate.map(async (subItem) => { 
          if (subItem.backendItemId) { 
            await client.put(`/kitchen/tickets/${subItem.backendItemId}/status`, { status: newStatus }); 
          } 
        }));
        
        setCart(prev => { 
          const newCart = [...prev]; 
          itemsToUpdate.forEach(subItem => { 
            const idx = newCart.findIndex(p => String(p.backendItemId) === String(subItem.backendItemId)); 
            if (idx !== -1) newCart[idx] = { ...newCart[idx], kitchenStatus: newStatus }; 
          }); 
          return newCart; 
        });
    } catch (e) { 
      triggerNotification("No se pudo actualizar el estado de entrega.", "error");
      throw e;
    } finally {
      lockRef.current = false;
      setIsProcessing(false);
    }
  };

  const deliverAllActiveItems = async () => {
    if (!activeOrderId) return;
    if (lockRef.current) return;
    lockRef.current = true;
    setIsProcessing(true);
    
    try {
        const itemsListos = cart.filter(item => 
          item.enviadoCocina && 
          item.kitchenStatus === 'READY' && 
          item.status !== 'CANCELLED'
        );

        if (itemsListos.length === 0) {
            triggerNotification("No hay productos listos para entregar en cocina.", "warning");
            lockRef.current = false;
            setIsProcessing(false);
            return;
        }

        await Promise.all(itemsListos.map(item => 
          client.put(`/kitchen/tickets/${item.backendItemId}/status`, { status: 'DELIVERED' })
        ));

        setCart(prev => prev.map(item => 
          itemsListos.some(listo => String(listo.backendItemId) === String(item.backendItemId))
          ? { ...item, kitchenStatus: 'DELIVERED' } 
          : item
        ));
        
        triggerNotification("Productos entregados a la mesa.", "success");
    } catch (error) { 
      triggerNotification("Hubo un error al entregar los productos.", "error");
      console.error("Error en deliverAllActiveItems:", error);
      throw error; 
    } finally {
      lockRef.current = false;
      setIsProcessing(false);
    }
  };

  // 🔥 NUEVA LÓGICA INTELIGENTE: Cancelación Individual (Promos vs Normal)
  const cancelItem = async (item, cancelReason = 'Cancelación desde POS', cancelQty = item.qty) => {
    // Si no ha ido a cocina, lo borramos en local directamente
    if (!item.enviadoCocina) { 
      setCart(prev => prev.filter(p => !(p === item))); 
      return; 
    }
    
    if (!activeOrderId || !item.backendItemId) return;
    
    if (lockRef.current) return;
    lockRef.current = true;
    setIsProcessing(true);

    try {
        const response = await client.put(`/pos/orders/${activeOrderId}/items/${item.backendItemId}/cancel`, { cancelReason, cancelQty });
        
        // Si el backend nos devuelve el carrito actualizado, lo mapeamos
        if (response.data.orderItems) {
            const updatedCart = response.data.orderItems.map(dbItem => mapDBItemToLocal(dbItem));
            setCart(prev => { 
              const unsentLocal = prev.filter(p => !p.enviadoCocina); 
              return [...updatedCart, ...unsentLocal]; 
            });
        } else {
            // Si no, matamos el producto en local marcándolo como CANCELLED
            setCart(prev => prev.map(p => String(p.backendItemId) === String(item.backendItemId) ? { ...p, status: 'CANCELLED' } : p));
        }
        
        // Notificaciones diferenciadas según si era promo o producto normal cobrado
        if (item.isAutoPromo) {
            triggerNotification('Promoción eliminada correctamente.', 'success');
        } else if (response.data.wasRefunded) {
            triggerNotification('Cancelado. Reembolso registrado en caja.', 'success');
        } else {
            triggerNotification('Item cancelado de la orden.', 'success');
        }
    } catch (error) { 
      triggerNotification(error?.response?.data?.message || "Error al cancelar el ítem.", "error");
      throw error; 
    } finally {
      lockRef.current = false;
      setIsProcessing(false);
    }
  };

  const cancelAccountItems = async (cuentaName, cancelReason = 'Cancelación de cuenta') => {
    // 🔥 Aseguramos que atrape la cuenta General correctamente aunque sea undefined
    const itemsToCancel = cart.filter(item => (item.cuenta || 'General') === cuentaName && item.enviadoCocina && item.status !== 'CANCELLED');
    if (itemsToCancel.length === 0) return;
    
    if (lockRef.current) return;
    lockRef.current = true;
    setIsProcessing(true);

    try {
        for (const item of itemsToCancel) {
            await client.put(`/pos/orders/${activeOrderId}/items/${item.backendItemId}/cancel`, { cancelReason, cancelQty: item.qty });
        }
        setCart(prev => prev.map(item => itemsToCancel.some(i => String(i.backendItemId) === String(item.backendItemId)) ? { ...item, status: 'CANCELLED' } : item));
        
        triggerNotification(`Ítems de la cuenta ${parseAccountName(cuentaName)} cancelados.`, 'success');
    } catch (error) { 
      triggerNotification("Error al cancelar los ítems de la cuenta.", "error");
      throw error; 
    } finally {
      lockRef.current = false;
      setIsProcessing(false);
    }
  };

  const cancelFullOrder = async (cancelReason = 'Cancelación de cuenta completa') => {
    if (!activeOrderId) return;

    if (lockRef.current) return;
    lockRef.current = true;
    setIsProcessing(true);

    try {
        const response = await client.put(`/pos/orders/${activeOrderId}/cancel`, { cancelReason });
        setOrderStatus('CANCELLED');
        setCart(prev => prev.map(item => item.enviadoCocina ? { ...item, status: 'CANCELLED' } : item));
        
        localStorage.removeItem(`lya_paid_${activeOrderId}`); 
        localStorage.removeItem(`lya_phones_${activeOrderId}`);

        if (response.data.refundedAmount > 0) triggerNotification(`Orden cancelada. Reembolso de $${response.data.refundedAmount}.`, 'success');
        else triggerNotification(`Orden anulada correctamente.`, 'success');
    } catch (error) { 
      triggerNotification("Error crítico al anular la orden.", "error");
      throw error; 
    } finally {
      lockRef.current = false;
      setIsProcessing(false);
    }
  };

  const validateAllDelivered = (cuentaName = null) => { 
    const itemsToCheck = cart.filter(c => (cuentaName ? c.cuenta === cuentaName : true) && c.status !== 'CANCELLED'); 
    if (itemsToCheck.length === 0) return false;
    const hasPendingDelivery = itemsToCheck.some(item => !item.enviadoCocina || ['PENDING', 'PREPARING', 'READY'].includes(item.kitchenStatus));
    return !hasPendingDelivery;
  };

  const payCuenta = async (nombreCuenta, paymentDetails, onComplete) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setIsProcessing(true);

    try {
      const method = paymentDetails?.method || 'efectivo'; 
      if(activeOrderId) {
        await client.put(`/pos/orders/${activeOrderId}/pay`, { cuentaName: nombreCuenta, isFullPayment: false, paymentMethod: method });
      }
      setPaidAccounts(prev => {
          const newArr = Array.from(new Set([...prev, nombreCuenta]));
          if (activeOrderId) localStorage.setItem(`lya_paid_${activeOrderId}`, JSON.stringify(newArr));
          return newArr;
      });
      if (onComplete) onComplete();
    } catch (error) { 
      throw error; 
    } finally {
      lockRef.current = false;
      setIsProcessing(false);
    }
  };

  const handleCheckout = async (paymentDetails, onComplete) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setIsProcessing(true);

    try {
      if (cart.some(p => !p.enviadoCocina)) {
        await new Promise((resolve, reject) => simulateKitchenSend(resolve).catch(reject));
      }
      const method = paymentDetails?.method || 'efectivo';
      if(activeOrderId) {
        await client.put(`/pos/orders/${activeOrderId}/pay`, { isFullPayment: true, paymentMethod: method });
      }
      setOrderStatus('PAID');
      
      setPaidAccounts(prev => {
        const todasLasCuentas = Array.from(new Set(cart.map(i => i.cuenta || 'General')));
        const newArr = Array.from(new Set([...prev, ...todasLasCuentas]));
        if (activeOrderId) localStorage.setItem(`lya_paid_${activeOrderId}`, JSON.stringify(newArr));
        return newArr;
      });
      if (onComplete) onComplete();
    } catch (error) { 
      throw error; 
    } finally {
      lockRef.current = false;
      setIsProcessing(false);
    }
  };

  const handleCloseTable = async (onComplete) => {
      if (lockRef.current) return;
      lockRef.current = true;
      setIsProcessing(true);

      try {
        if(activeOrderId) { 
          await client.put(`/pos/orders/${activeOrderId}/close`); 
          localStorage.removeItem(`lya_phones_${activeOrderId}`); 
          localStorage.removeItem(`lya_paid_${activeOrderId}`); 
        }
        setCart([]); setActiveOrderId(null); setOrderStatus('OPEN'); setPaidAccounts([]);
        if(onComplete) onComplete();
      } catch (error) { throw error; } 
      finally { 
        lockRef.current = false;
        setIsProcessing(false); 
      }
  };

  const releaseAccount = async (cuentaName) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setIsProcessing(true);

    try {
      if (activeOrderId) {
        await client.put(`/pos/orders/${activeOrderId}/close-account`, { cuentaName });
      }
    } catch (error) {
      throw error;
    } finally {
      lockRef.current = false;
      setIsProcessing(false);
    }
  };

  const handlePrintTicket = async (cuentaName = null) => {
    if (!activeOrderId) return;
    try { await client.post(`/pos/orders/${activeOrderId}/print`, { cuentaName }); } catch (error) {}
  };

  return {
    isSuccess, isProcessing,
    simulateKitchenSend, moveItemToCuenta, toggleDeliveredStatus, deliverAllActiveItems,
    cancelItem, cancelAccountItems, cancelFullOrder, payCuenta, handleCheckout, handleCloseTable, handlePrintTicket,
    validateAllDelivered, releaseAccount
  };
};