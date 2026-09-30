// src/modules/pos/controllers/usePosCart.js
import { useState, useMemo, useEffect, useRef } from 'react';
import { getDefaultCustomizations } from '../utils/posHelpers.js';
import { socket } from '../../../api/socket.js';
import api from '../../../api/client.js'; 

const parseValidDays = (daysData) => {
  if (!daysData) return [];
  if (Array.isArray(daysData)) return daysData.map(Number);
  if (typeof daysData === 'string') {
    try { 
      return JSON.parse(daysData).map(Number); 
    } catch (e) { 
      return daysData.replace(/[\[\]]/g, '').split(',').map(n => Number(n.trim())); 
    }
  }
  return [];
};

export const usePosCart = (cuentaActiva, cuentasPagadasReales, triggerNotification) => {
  const [_cart, _setCart] = useState([]);
  const [promotions, setPromotions] = useState([]);

  const isProcessingRef = useRef(false);
  const notifiedPromos = useRef(new Set()); 

  const [promoWarning, setPromoWarning] = useState({
    isOpen: false, message: '', onConfirm: null, onCancel: null
  });

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const res = await api.get('/promotions');
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : (raw?.data || raw?.promotions || []);
        
        const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' })).getDay();
        const activeToday = list.filter(p => {
          const rawActive = p.isActive ?? p.is_active ?? p.status;
          if (rawActive !== true && rawActive !== 1 && rawActive !== 'true' && rawActive !== '1') return false;
          const validDays = parseValidDays(p.validDays || p.valid_days);
          return validDays.length === 0 || validDays.includes(today);
        });

        setPromotions(activeToday);
      } catch (error) {
        console.error("Error cargando promociones en el carrito:", error);
      }
    };
    
    fetchPromos();
    const handlePromoUpdate = () => fetchPromos(); 
    
    socket.on('menu:promotions_updated', handlePromoUpdate);
    socket.on('promotion_created', handlePromoUpdate);
    socket.on('promotion_updated', handlePromoUpdate);
    socket.on('promotion_deleted', handlePromoUpdate);
    
    return () => {
      socket.off('menu:promotions_updated', handlePromoUpdate);
      socket.off('promotion_created', handlePromoUpdate);
      socket.off('promotion_updated', handlePromoUpdate);
      socket.off('promotion_deleted', handlePromoUpdate);
    };
  }, []);

  const getActivePromo = (productId, currentStock = null, controlarStock = false) => {
    if (!promotions || promotions.length === 0) return null;
    const promo = promotions.find(p => String(p.productId || p.product_id) === String(productId));
    return promo || null;
  };

  const getUnsentQtyOfProduct = (cartState, productId) => {
    return cartState
      .filter(p => p.id === productId && !p.enviadoCocina && p.status !== 'CANCELLED')
      .reduce((acc, item) => acc + item.qty, 0);
  };

  const syncPromotions = (cartState) => {
    if (!promotions.length) return cartState;

    let freshCart = [];
    cartState.forEach(item => {
      if (item.status === 'CANCELLED') {
        freshCart.push(item);
        return;
      }
      if (item.isAutoPromo && item.precioOriginal !== undefined && Number(item.precio) === 0 && item.promoLabel !== 'PREMIO') {
        return; 
      }

      let restoredItem = { ...item };
      if (item.isAutoPromo && item.precioOriginal !== undefined) {
        restoredItem.precio = item.precioOriginal;
        restoredItem.precioOriginal = undefined;
        restoredItem.promoLabel = undefined;
        restoredItem.isAutoPromo = false;
        restoredItem.promoId = undefined;
      }
      freshCart.push(restoredItem);
    });

    const itemsByCuenta = freshCart.reduce((acc, item) => {
      if (item.status === 'CANCELLED' || item.enviadoCocina) return acc;
      const cuenta = item.cuenta || 'General';
      if (!acc[cuenta]) acc[cuenta] = [];
      
      for(let i = 0; i < item.qty; i++) {
        acc[cuenta].push({ ...item, qty: 1, preparaciones: [item.preparaciones[i] || item.preparaciones[0] || {}], _originalRef: item });
      }
      return acc;
    }, {});

    let finalCart = freshCart.filter(i => i.status === 'CANCELLED' || i.enviadoCocina);
    let newlyAppliedPromos = new Set();

    for (const cuenta in itemsByCuenta) {
      let cuentaItems = itemsByCuenta[cuenta];
      cuentaItems.sort((a, b) => Number(b.precio) - Number(a.precio));

      promotions.forEach(promo => {
        const applyTo = promo.applyToProducts || [];
        const rewards = promo.rewardProducts || [];
        const buyQty = Number(promo.buyQty || 1);
        const payQty = Number(promo.payQty || 1);
        const discountVal = Number(promo.discountValue || 0);

        if (promo.type === 'BOGO') {
            let triggerItems = cuentaItems.filter(i => !i._promoLocked && applyTo.includes(i.id));
            let rewardItems = cuentaItems.filter(i => !i._promoLocked && rewards.includes(i.id));
            
            while (triggerItems.length >= buyQty && rewardItems.length >= payQty) {
                for(let i=0; i<buyQty; i++) cuentaItems[cuentaItems.indexOf(triggerItems[i])]._promoLocked = true;
                let cheapRewards = [...rewardItems].reverse(); 
                for(let i=0; i<payQty; i++) {
                    const rIdx = cuentaItems.indexOf(cheapRewards[i]);
                    cuentaItems[rIdx].precioOriginal = cuentaItems[rIdx].precio;
                    cuentaItems[rIdx].precio = discountVal; 
                    cuentaItems[rIdx].isAutoPromo = true;
                    cuentaItems[rIdx].promoLabel = 'PREMIO';
                    cuentaItems[rIdx].promoId = promo.id;
                    cuentaItems[rIdx]._promoLocked = true;
                }
                newlyAppliedPromos.add(promo.id);
                triggerItems = cuentaItems.filter(i => !i._promoLocked && applyTo.includes(i.id));
                rewardItems = cuentaItems.filter(i => !i._promoLocked && rewards.includes(i.id));
            }
        }

        // 🔥 MAGIA DE AUTO-AGREGADO (NxM)
        if (promo.type === 'NxM') {
            let eligible = cuentaItems.filter(i => !i._promoLocked && applyTo.includes(i.id));
            while (eligible.length >= payQty) {
                // Cobramos
                for(let i=0; i<payQty; i++) cuentaItems[cuentaItems.indexOf(eligible[i])]._promoLocked = true;
                
                let missingGhosts = buyQty - payQty;
                let ghostCandidates = cuentaItems.filter(i => !i._promoLocked && applyTo.includes(i.id));
                
                for(let i=0; i<missingGhosts; i++) {
                    if (ghostCandidates.length > 0) {
                        const eIdx = cuentaItems.indexOf(ghostCandidates[0]);
                        cuentaItems[eIdx].precioOriginal = cuentaItems[eIdx].precio;
                        cuentaItems[eIdx].precio = 0;
                        cuentaItems[eIdx].isAutoPromo = true;
                        cuentaItems[eIdx].promoLabel = 'GRATIS';
                        cuentaItems[eIdx].promoId = promo.id;
                        cuentaItems[eIdx]._promoLocked = true;
                        ghostCandidates.shift();
                    } else {
                        // AUTO-AGREGADO CLONANDO EL ARTÍCULO
                        const template = eligible[0];
                        cuentaItems.push({
                            ...template,
                            precioOriginal: template.precio,
                            precio: 0,
                            isAutoPromo: true,
                            promoLabel: 'GRATIS',
                            promoId: promo.id,
                            _promoLocked: true,
                            _originalRef: undefined
                        });
                    }
                }
                newlyAppliedPromos.add(promo.id);
                eligible = cuentaItems.filter(i => !i._promoLocked && applyTo.includes(i.id));
            }
        }

        if (promo.type === 'NTH_FIXED') {
            let eligible = cuentaItems.filter(i => !i._promoLocked && applyTo.includes(i.id));
            while (eligible.length >= buyQty) {
                for(let i=0; i < buyQty - 1; i++) cuentaItems[cuentaItems.indexOf(eligible[i])]._promoLocked = true;
                const lastIdx = cuentaItems.indexOf(eligible[buyQty - 1]);
                cuentaItems[lastIdx].precioOriginal = cuentaItems[lastIdx].precio;
                cuentaItems[lastIdx].precio = Math.max(0, Number(cuentaItems[lastIdx].precio) - discountVal);
                cuentaItems[lastIdx].isAutoPromo = true;
                cuentaItems[lastIdx].promoLabel = 'REBAJA';
                cuentaItems[lastIdx].promoId = promo.id;
                cuentaItems[lastIdx]._promoLocked = true;
                newlyAppliedPromos.add(promo.id);
                eligible = cuentaItems.filter(i => !i._promoLocked && applyTo.includes(i.id));
            }
        }

        if (promo.type === 'COMBO') {
            const hasAll = applyTo.every(id => cuentaItems.some(i => !i._promoLocked && i.id === id));
            if (hasAll) {
                let comboItems = [];
                let originalComboTotal = 0;
                applyTo.forEach(id => {
                    const item = cuentaItems.find(i => !i._promoLocked && i.id === id);
                    if(item) {
                        comboItems.push(item);
                        originalComboTotal += Number(item.precio);
                        item._promoLocked = true;
                    }
                });
                comboItems.forEach(item => {
                    item.precioOriginal = item.precio;
                    item.precio = (Number(item.precio) / originalComboTotal) * discountVal;
                    item.isAutoPromo = true;
                    item.promoLabel = 'COMBO';
                    item.promoId = promo.id;
                });
                newlyAppliedPromos.add(promo.id);
            }
        }

        if (promo.type === 'FIXED') {
            let eligible = cuentaItems.filter(i => !i._promoLocked && applyTo.includes(i.id));
            eligible.forEach(item => {
                item.precioOriginal = item.precio;
                item.precio = Math.max(0, Number(item.precio) - discountVal);
                item.isAutoPromo = true;
                item.promoLabel = 'OFERTA';
                item.promoId = promo.id;
                item._promoLocked = true;
            });
            if (eligible.length > 0) newlyAppliedPromos.add(promo.id);
        }
      });

      const grouped = [];
      cuentaItems.forEach(item => {
          const detailStr = JSON.stringify(item.preparaciones?.[0] || {});
          const existing = grouped.find(g => 
              g.id === item.id && 
              Number(g.precio).toFixed(2) === Number(item.precio).toFixed(2) && 
              g.isAutoPromo === item.isAutoPromo &&
              g.promoId === item.promoId &&
              JSON.stringify(g.preparaciones?.[0] || {}) === detailStr &&
              !!g.isTakeaway === !!item.isTakeaway
          );

          if (existing) {
              existing.qty += 1;
              if (item.preparaciones && item.preparaciones[0]) existing.preparaciones.push(item.preparaciones[0]);
          } else {
              delete item._promoLocked;
              delete item._originalRef;
              grouped.push({ ...item, qty: 1 });
          }
      });

      const ticketPromo = promotions.find(p => p.type === 'TICKET_DISCOUNT');
      if (ticketPromo) {
          const minAmount = Number(ticketPromo.minTicketAmount || 0);
          const discountVal = Number(ticketPromo.discountValue || 0);
          const currentTotal = grouped.reduce((sum, item) => sum + (Number(item.precio) * item.qty), 0);

          if (currentTotal >= minAmount) {
              grouped.forEach(item => {
                  const weight = (Number(item.precio) * item.qty) / currentTotal;
                  const discountShare = (discountVal * weight) / item.qty;
                  if (!item.precioOriginal) item.precioOriginal = item.precio;
                  item.precio = Math.max(0, Number(item.precio) - discountShare);
                  item.isAutoPromo = true;
                  item.promoLabel = 'DESC. TOTAL';
                  item.promoId = ticketPromo.id;
              });
              newlyAppliedPromos.add(ticketPromo.id);
          }
      }
      finalCart = [...finalCart, ...grouped];
    }

    if (triggerNotification) {
      newlyAppliedPromos.forEach(promoId => {
        if (!notifiedPromos.current.has(promoId)) {
          const promoInfo = promotions.find(p => p.id === promoId);
          setTimeout(() => triggerNotification(`¡Promo Aplicada Automáticamente! ${promoInfo?.name || 'Oferta'}`, 'success'), 50);
          notifiedPromos.current.add(promoId);
        }
      });
      notifiedPromos.current.forEach(id => {
         if (!newlyAppliedPromos.has(id)) notifiedPromos.current.delete(id);
      });
    }

    return finalCart;
  };

  const setCart = (action) => {
    _setCart(prev => {
       const nextCart = typeof action === 'function' ? action(prev) : action;
       return syncPromotions(nextCart);
    });
  };

  const checkRuptureAndExecute = (actionToCalculateNextCart) => {
    setCart(prev => {
      const nextCart = actionToCalculateNextCart(prev);
      const futureCart = syncPromotions(nextCart); 
      
      const prevPromos = prev.filter(i => i.isAutoPromo && i.promoLabel !== 'OFERTA').reduce((a,b) => a + b.qty, 0);
      const futurePromos = futureCart.filter(i => i.isAutoPromo && i.promoLabel !== 'OFERTA').reduce((a,b) => a + b.qty, 0);

      if (futurePromos < prevPromos) {
        setPromoWarning({
          isOpen: true,
          message: `Al reducir o eliminar este producto, se romperá una promoción activa y perderás el beneficio en la cuenta. ¿Deseas continuar?`,
          onConfirm: () => {
            _setCart(futureCart); 
            setPromoWarning({ isOpen: false, message: '', onConfirm: null, onCancel: null });
          },
          onCancel: () => setPromoWarning({ isOpen: false, message: '', onConfirm: null, onCancel: null })
        });
        return prev; 
      }
      return futureCart;
    });
  };

  const addToCart = (productWithDetails, forceCuenta = null) => {
    if (isProcessingRef.current) return false;
    isProcessingRef.current = true;

    try {
      const targetCuenta = forceCuenta || cuentaActiva;

      if (cuentasPagadasReales.includes(targetCuenta)) {
          if (triggerNotification) triggerNotification(`La cuenta está sellada. Selecciona una nueva.`, 'error');
          return false; 
      }

      if (productWithDetails.controlarStock) {
        const currentUnsent = getUnsentQtyOfProduct(_cart, productWithDetails.id);
        if (currentUnsent + 1 > productWithDetails.stock) {
            if (triggerNotification) triggerNotification(`Stock insuficiente. Solo quedan ${productWithDetails.stock - currentUnsent}.`, 'warning');
            return false; 
        }
      }

      let finalDetails = productWithDetails.detalles || {};
      let finalPrice = parseFloat(productWithDetails.precioFinal || productWithDetails.precioBase || productWithDetails.precio || 0);

      if (!productWithDetails.detalles) {
        const defaultCustoms = getDefaultCustomizations(productWithDetails);
        if (defaultCustoms) {
            finalDetails = defaultCustoms.detalles;
            finalPrice = defaultCustoms.precioFinal;
        }
      }

      setCart(prev => {
        const detailStr = JSON.stringify(finalDetails);
        let newCart = [...prev];

        const index = newCart.findIndex(p => 
            p.id === productWithDetails.id && 
            Number(p.precio).toFixed(2) === Number(finalPrice).toFixed(2) && 
            !p.enviadoCocina && 
            p.cuenta === targetCuenta && 
            !!p.isTakeaway === !!productWithDetails.isTakeaway && 
            !p.isAutoPromo && 
            p.preparaciones.every(prep => JSON.stringify(prep) === detailStr)
        );

        if (index !== -1) {
            newCart[index] = { ...newCart[index], qty: newCart[index].qty + 1, preparaciones: [...newCart[index].preparaciones, finalDetails] };
        } else {
            newCart.push({ 
              ...productWithDetails, precio: finalPrice, qty: 1, preparaciones: [finalDetails], 
              enviadoCocina: false, status: 'ACTIVE', cuenta: targetCuenta, 
              isTakeaway: productWithDetails.isTakeaway || false, 
              requiereCocina: productWithDetails.requiereCocina !== false, 
              isAutoPromo: false
            });
        }
        return newCart;
      });
      return true; 
    } finally {
      isProcessingRef.current = false;
    }
  };

  useEffect(() => {
    const handleStockAdjustment = (updates) => {
      setCart(prevCart => {
        let modifiedCart = [...prevCart];
        let notificationsToFire = new Set();

        for (const update of updates) {
          let totalUnsentQty = getUnsentQtyOfProduct(modifiedCart, update.id);
          if (totalUnsentQty > update.stock) {
            if (update.stock === 0) {
              notificationsToFire.add({ msg: `El producto se agotó y fue retirado de tu carrito.`, type: 'error' });
              modifiedCart = modifiedCart.filter(item => !(item.id === update.id && !item.enviadoCocina && item.status !== 'CANCELLED'));
            } else {
              notificationsToFire.add({ msg: `Se redujo la cantidad en tu carrito por disponibilidad de stock.`, type: 'warning' });
              for (let i = modifiedCart.length - 1; i >= 0; i--) {
                const item = modifiedCart[i];
                if (item.id === update.id && !item.enviadoCocina && item.status !== 'CANCELLED') {
                  const excess = totalUnsentQty - update.stock;
                  if (excess >= item.qty) {
                    totalUnsentQty -= item.qty;
                    modifiedCart.splice(i, 1);
                  } else {
                    modifiedCart[i] = { ...item, qty: item.qty - excess, preparaciones: item.preparaciones.slice(0, item.qty - excess) };
                    totalUnsentQty -= excess;
                  }
                  if (totalUnsentQty <= update.stock) break;
                }
              }
            }
          }
        }
        if (triggerNotification) notificationsToFire.forEach(notif => triggerNotification(notif.msg, notif.type));
        return modifiedCart; 
      });
    };

    socket.on('stock:update', handleStockAdjustment);
    return () => socket.off('stock:update', handleStockAdjustment);
  }, [triggerNotification, promotions]); 

  const removeFromCart = (itemToRemove) => { 
    if (isProcessingRef.current || itemToRemove.enviadoCocina) return;
    isProcessingRef.current = true;

    try {
      checkRuptureAndExecute((prev) => {
          const newCart = [...prev];
          const prepStr = JSON.stringify(itemToRemove.preparaciones[0] || {});

          const idx = newCart.findIndex(p => 
            p.id === itemToRemove.id && Number(p.precio).toFixed(2) === Number(itemToRemove.precio).toFixed(2) && p.cuenta === itemToRemove.cuenta && 
            !!p.isTakeaway === !!itemToRemove.isTakeaway && !p.enviadoCocina && 
            JSON.stringify(p.preparaciones[0] || {}) === prepStr && p.isAutoPromo === itemToRemove.isAutoPromo
          );

          if (idx !== -1) {
              newCart[idx] = { ...newCart[idx], qty: newCart[idx].qty - 1, preparaciones: newCart[idx].preparaciones.slice(0, -1) };
              if (newCart[idx].qty <= 0) newCart.splice(idx, 1);
          }
          return newCart;
      });
    } finally {
      isProcessingRef.current = false;
    }
  };

  const deleteLine = (itemToRemove) => { 
    if (isProcessingRef.current || itemToRemove.enviadoCocina) return;
    isProcessingRef.current = true;

    try {
      checkRuptureAndExecute((prev) => {
        const prepStr = JSON.stringify(itemToRemove.preparaciones[0] || {});
        return prev.filter(p => !(
          p.id === itemToRemove.id && p.cuenta === itemToRemove.cuenta && 
          !!p.isTakeaway === !!itemToRemove.isTakeaway && !p.enviadoCocina && 
          JSON.stringify(p.preparaciones[0] || {}) === prepStr && p.isAutoPromo === itemToRemove.isAutoPromo
        ));
      });
    } finally {
      isProcessingRef.current = false;
    }
  };

  const toggleItemTakeaway = (itemToToggle) => {
    if (isProcessingRef.current || itemToToggle.enviadoCocina) return;
    isProcessingRef.current = true;

    try {
      checkRuptureAndExecute(prev => {
        const newCart = [...prev];
        const prepStr = JSON.stringify(itemToToggle.preparaciones[0] || {});
        const idx = newCart.findIndex(p => 
          p.id === itemToToggle.id && Number(p.precio).toFixed(2) === Number(itemToToggle.precio).toFixed(2) && p.cuenta === itemToToggle.cuenta && 
          !!p.isTakeaway === !!itemToToggle.isTakeaway && !p.enviadoCocina && JSON.stringify(p.preparaciones[0] || {}) === prepStr && p.isAutoPromo === itemToToggle.isAutoPromo
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
              p.id === currentItem.id && Number(p.precio).toFixed(2) === Number(currentItem.precio).toFixed(2) && p.cuenta === currentItem.cuenta && 
              !!p.isTakeaway === targetTakeawayState && !p.enviadoCocina && JSON.stringify(p.preparaciones[0] || {}) === prepStr && p.isAutoPromo === itemToToggle.isAutoPromo
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
    } finally {
      isProcessingRef.current = false;
    }
  };

  const total = useMemo(() => _cart.filter(item => !cuentasPagadasReales.includes(item.cuenta || 'General') && item.status !== 'CANCELLED').reduce((acc, curr) => acc + (curr.precio * curr.qty), 0), [_cart, cuentasPagadasReales]);
  const unsentTotal = useMemo(() => _cart.filter(p => !p.enviadoCocina && p.status !== 'CANCELLED').reduce((acc, curr) => acc + (curr.precio * curr.qty), 0), [_cart]);
  const hasUnsentItems = useMemo(() => _cart.some(p => !p.enviadoCocina), [_cart]);
  const getSubtotalByCuenta = (nombreCuenta) => {
    if (cuentasPagadasReales.includes(nombreCuenta)) return 0;
    return _cart.filter(item => item.cuenta === nombreCuenta && item.status !== 'CANCELLED').reduce((acc, curr) => acc + (curr.precio * curr.qty), 0);
  };
  const getProductQty = (id) => _cart.filter(p => p.id === id && !p.enviadoCocina && p.cuenta === cuentaActiva && p.status !== 'CANCELLED' && (!p.isAutoPromo || p.promoLabel === 'OFERTA')).reduce((acc, item) => acc + item.qty, 0);

  const clearCartByAccount = (cuentaTarget) => {
    setCart(prev => prev.filter(item => item.cuenta !== cuentaTarget));
  };

  const clearEntireCart = () => {
    setCart([]);
  };

  return {
    cart: _cart, setCart, addToCart, removeFromCart, deleteLine, toggleItemTakeaway, total, unsentTotal, hasUnsentItems, getSubtotalByCuenta, getProductQty,
    clearCartByAccount, clearEntireCart,
    promoWarning, confirmPromoRupture: () => promoWarning.onConfirm && promoWarning.onConfirm(), cancelPromoRupture: () => promoWarning.onCancel && promoWarning.onCancel()
  };
};