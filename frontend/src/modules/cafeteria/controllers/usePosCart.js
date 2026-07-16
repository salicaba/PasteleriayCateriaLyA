// src/modules/cafeteria/controllers/usePosCart.js
import { useState, useMemo, useEffect } from 'react';
import { getDefaultCustomizations } from '../utils/posHelpers.js';
import { socket } from '../../../api/socket.js'; // ✅ FIX: Importación nombrada destructurada

export const usePosCart = (cuentaActiva, cuentasPagadasReales, triggerNotification) => {
  const [cart, setCart] = useState([]);

  // Utilidad interna para saber cuánto de un producto tenemos sin enviar
  const getUnsentQtyOfProduct = (cartState, productId) => {
    return cartState
      .filter(p => p.id === productId && !p.enviadoCocina && p.status !== 'CANCELLED')
      .reduce((acc, item) => acc + item.qty, 0);
  };

  const addToCart = (productWithDetails, forceCuenta = null) => {
    const targetCuenta = forceCuenta || cuentaActiva;

    if (cuentasPagadasReales.includes(targetCuenta)) {
        triggerNotification(`La cuenta "${targetCuenta}" está sellada y cobrada. Selecciona una cuenta nueva.`, 'error');
        return;
    }

    // 🚀 BARRERA DE STOCK MÁXIMO
    if (productWithDetails.controlarStock) {
      const currentUnsent = getUnsentQtyOfProduct(cart, productWithDetails.id);
      if (currentUnsent + 1 > productWithDetails.stock) {
         triggerNotification(`Stock límite alcanzado. Solo hay ${productWithDetails.stock} de ${productWithDetails.nombre}.`, 'warning');
         return;
      }
    }
    
    let finalDetails = productWithDetails.detalles || {};
    let finalPrice = productWithDetails.precioFinal || productWithDetails.precioBase || productWithDetails.precio || 0;
    
    if (!productWithDetails.detalles) {
        const defaultCustoms = getDefaultCustomizations(productWithDetails);
        if (defaultCustoms) {
            finalDetails = defaultCustoms.detalles;
            finalPrice = defaultCustoms.precioFinal;
        }
    }

    setCart(prev => {
      const detailStr = JSON.stringify(finalDetails);
      
      const index = prev.findIndex(p => {
         if (p.id !== productWithDetails.id || 
             p.precio !== finalPrice || 
             p.enviadoCocina || 
             p.cuenta !== targetCuenta || 
             !!p.isTakeaway !== !!productWithDetails.isTakeaway) {
             return false;
         }
         return p.preparaciones.every(prep => JSON.stringify(prep) === detailStr);
      });

      if (index !== -1) {
          const newCart = [...prev];
          newCart[index] = { 
            ...newCart[index], 
            qty: newCart[index].qty + 1, 
            preparaciones: [...newCart[index].preparaciones, finalDetails] 
          };
          return newCart;
        }
        
      return [...prev, { 
        ...productWithDetails, 
        precio: finalPrice, 
        qty: 1, 
        preparaciones: [finalDetails], 
        enviadoCocina: false, 
        status: 'ACTIVE', 
        cuenta: targetCuenta, 
        isTakeaway: productWithDetails.isTakeaway || false, 
        requiereCocina: productWithDetails.requiereCocina !== false 
      }];
    });
  };

  // 🚀 RECONCILIADOR AUTOMÁTICO EN TIEMPO REAL (La Poda de Carrito)
  useEffect(() => {
    const handleStockAdjustment = (updates) => {
      setCart(prevCart => {
        let modifiedCart = [...prevCart];
        let notificationsToFire = new Set();

        for (const update of updates) {
          let totalUnsentQty = getUnsentQtyOfProduct(modifiedCart, update.id);

          if (totalUnsentQty > update.stock) {
            if (update.stock === 0) {
              // Purga completa
              notificationsToFire.add({ msg: `El producto se agotó y fue retirado de tu carrito.`, type: 'error' });
              modifiedCart = modifiedCart.filter(item => !(item.id === update.id && !item.enviadoCocina && item.status !== 'CANCELLED'));
            } else {
              // Ajuste algorítmico progresivo (recortar excedentes desde los más recientes)
              notificationsToFire.add({ msg: `Se redujo la cantidad en tu carrito por disponibilidad de stock.`, type: 'warning' });
              
              for (let i = modifiedCart.length - 1; i >= 0; i--) {
                const item = modifiedCart[i];
                if (item.id === update.id && !item.enviadoCocina && item.status !== 'CANCELLED') {
                  const excess = totalUnsentQty - update.stock;
                  
                  if (excess >= item.qty) {
                    totalUnsentQty -= item.qty;
                    modifiedCart.splice(i, 1);
                  } else {
                    modifiedCart[i] = { 
                      ...item, 
                      qty: item.qty - excess, 
                      preparaciones: item.preparaciones.slice(0, item.qty - excess) 
                    };
                    totalUnsentQty -= excess;
                  }
                  
                  if (totalUnsentQty <= update.stock) break;
                }
              }
            }
          }
        }

        // Disparar las notificaciones únicas generadas
        notificationsToFire.forEach(notif => triggerNotification(notif.msg, notif.type));
        return modifiedCart;
      });
    };

    socket.on('stock:update', handleStockAdjustment);
    return () => socket.off('stock:update', handleStockAdjustment);
  }, [triggerNotification]);

  const removeFromCart = (itemToRemove) => { 
    if(!itemToRemove.enviadoCocina) setCart(prev => {
        const newCart = [...prev];
        const prepStr = JSON.stringify(itemToRemove.preparaciones[0] || {});
        const idx = newCart.findIndex(p => 
          p.id === itemToRemove.id && p.precio === itemToRemove.precio && p.cuenta === itemToRemove.cuenta && 
          !!p.isTakeaway === !!itemToRemove.isTakeaway && !p.enviadoCocina && JSON.stringify(p.preparaciones[0] || {}) === prepStr
        );
        
        if (idx !== -1) {
            newCart[idx] = { ...newCart[idx], qty: newCart[idx].qty - 1, preparaciones: newCart[idx].preparaciones.slice(0, -1) };
            if (newCart[idx].qty <= 0) newCart.splice(idx, 1);
        }
        return newCart;
    });
  };

  const deleteLine = (itemToRemove) => { 
    if(!itemToRemove.enviadoCocina) {
        const prepStr = JSON.stringify(itemToRemove.preparaciones[0] || {});
        setCart(prev => prev.filter(p => !(
          p.id === itemToRemove.id && p.precio === itemToRemove.precio && p.cuenta === itemToRemove.cuenta && 
          !!p.isTakeaway === !!itemToRemove.isTakeaway && !p.enviadoCocina && JSON.stringify(p.preparaciones[0] || {}) === prepStr
        )));
    }
  };

  const toggleItemTakeaway = (itemToToggle) => {
    if (itemToToggle.enviadoCocina) return;
    setCart(prev => {
      const newCart = [...prev];
      const prepStr = JSON.stringify(itemToToggle.preparaciones[0] || {});
      const idx = newCart.findIndex(p => 
        p.id === itemToToggle.id && p.precio === itemToToggle.precio && p.cuenta === itemToToggle.cuenta && 
        !!p.isTakeaway === !!itemToToggle.isTakeaway && !p.enviadoCocina && JSON.stringify(p.preparaciones[0] || {}) === prepStr
      );

      if (idx !== -1) {
        const currentItem = newCart[idx];
        const targetTakeawayState = !currentItem.isTakeaway;
        
        if (currentItem.qty === 1) { 
          newCart[idx] = { ...currentItem, isTakeaway: targetTakeawayState }; 
        } else {
          const prepToMove = currentItem.preparaciones[currentItem.preparaciones.length - 1];
          newCart[idx] = { ...currentItem, qty: currentItem.qty - 1, preparaciones: currentItem.preparaciones.slice(0, -1) };
          
          const existingTargetIdx = newCart.findIndex(p => 
            p.id === currentItem.id && p.precio === currentItem.precio && p.cuenta === currentItem.cuenta && 
            !!p.isTakeaway === targetTakeawayState && !p.enviadoCocina && JSON.stringify(p.preparaciones[0] || {}) === prepStr
          );
          
          if (existingTargetIdx !== -1) { 
            newCart[existingTargetIdx] = { ...newCart[existingTargetIdx], qty: newCart[existingTargetIdx].qty + 1, preparaciones: [...newCart[existingTargetIdx].preparaciones, prepToMove] }; 
          } else { 
            newCart.push({ ...currentItem, qty: 1, preparaciones: [prepToMove], isTakeaway: targetTakeawayState }); 
          }
        }
      }
      return newCart;
    });
  };

  const total = useMemo(() => 
    cart.filter(item => !cuentasPagadasReales.includes(item.cuenta || 'General') && item.status !== 'CANCELLED')
        .reduce((acc, curr) => acc + (curr.precio * curr.qty), 0), 
  [cart, cuentasPagadasReales]);

  const unsentTotal = useMemo(() => 
    cart.filter(p => !p.enviadoCocina && p.status !== 'CANCELLED')
        .reduce((acc, curr) => acc + (curr.precio * curr.qty), 0), 
  [cart]);

  const hasUnsentItems = useMemo(() => cart.some(p => !p.enviadoCocina), [cart]);

  const getSubtotalByCuenta = (nombreCuenta) => {
    if (cuentasPagadasReales.includes(nombreCuenta)) return 0;
    return cart.filter(item => item.cuenta === nombreCuenta && item.status !== 'CANCELLED')
        .reduce((acc, curr) => acc + (curr.precio * curr.qty), 0);
  };

  const getProductQty = (id) => 
    cart.filter(p => p.id === id && !p.enviadoCocina && p.cuenta === cuentaActiva && p.status !== 'CANCELLED')
        .reduce((acc, item) => acc + item.qty, 0);

  return {
    cart, setCart,
    addToCart, removeFromCart, deleteLine, toggleItemTakeaway,
    total, unsentTotal, hasUnsentItems,
    getSubtotalByCuenta, getProductQty
  };
};