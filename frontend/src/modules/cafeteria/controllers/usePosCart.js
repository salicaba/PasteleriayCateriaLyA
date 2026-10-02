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

  const [pendingPromoReward, setPendingPromoReward] = useState(null);

  const [promoWarning, setPromoWarning] = useState({
    isOpen: false, message: '', onConfirm: null, onCancel: null
  });

  const [suspendedPromos, setSuspendedPromos] = useState([]);
  const alertedPromosRef = useRef(new Set());

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const res = await api.get('/promotions');
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : (raw?.data || raw?.promotions || []);
        setPromotions(list);
      } catch (error) {
        console.error("Error cargando promociones:", error);
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
    const today = new Date().getDay();

    const promo = promotions.find(p => {
      const rawActive = p.isActive ?? p.is_active ?? p.status;
      const isActive = rawActive === true || rawActive === 1 || rawActive === 'true' || rawActive === '1';
      if (!isActive) return false;

      const daysRaw = p.validDays || p.valid_days;
      const validDaysAsNumbers = parseValidDays(daysRaw);
      if (validDaysAsNumbers.length > 0 && !validDaysAsNumbers.includes(today)) return false;

      const pIdStr = String(productId);
      const matchesSingle = String(p.productId || p.product_id) === pIdStr;
      const matchesMulti = Array.isArray(p.applyToProducts) && p.applyToProducts.map(String).includes(pIdStr);

      return matchesSingle || matchesMulti;
    });

    if (!promo) return null;
    
    if (controlarStock && currentStock !== null) {
      if (currentStock <= 0) return null; 
    }
    return promo;
  };

  const getUnsentQtyOfProduct = (cartState, productId) => {
    return cartState
      .filter(p => p.id === productId && !p.enviadoCocina && p.status !== 'CANCELLED')
      .reduce((acc, item) => acc + item.qty, 0);
  };

  const claimPromoReward = (baseProduct, promo, cuenta, qty) => {
    const defaultCustoms = getDefaultCustomizations(baseProduct);
    const finalDetails = defaultCustoms?.detalles || {};
    const ghostOriginalPrice = defaultCustoms?.precioFinal || baseProduct.precioBase || baseProduct.precio || 0;

    const finalPromoPrice = promo.type === 'BOGO' ? parseFloat(promo.discountValue || promo.discount_value || 0) : 0;
    const promoLabelStr = finalPromoPrice === 0 ? 'GRATIS' : 'PROMO';

    setCart(prev => {
        const newCart = [...prev];
        const existingGhostIdx = newCart.findIndex(p => 
            p.id === baseProduct.id && p.cuenta === cuenta && 
            p.isAutoPromo && p.promoId === promo.id && 
            !p.enviadoCocina && p.status !== 'CANCELLED'
        );

        if (existingGhostIdx !== -1) {
            newCart[existingGhostIdx] = { 
                ...newCart[existingGhostIdx], 
                qty: newCart[existingGhostIdx].qty + qty,
                preparaciones: [...newCart[existingGhostIdx].preparaciones, ...Array(qty).fill(finalDetails)]
            };
        } else {
            newCart.push({
                ...baseProduct,
                nombre: baseProduct.nombre,
                precioOriginal: ghostOriginalPrice,
                promoLabel: promoLabelStr,
                precio: finalPromoPrice,
                qty: qty,
                preparaciones: Array(qty).fill(finalDetails),
                enviadoCocina: false,
                status: 'ACTIVE',
                cuenta: cuenta,
                isAutoPromo: true,
                requiereCocina: baseProduct.requiereCocina !== false,
                promoId: promo.id,
                promoType: promo.type
            });
        }
        return newCart;
    });

    if (triggerNotification) {
        if (finalPromoPrice === 0) {
            triggerNotification(`Promo: ¡${baseProduct.nombre} GRATIS añadido a la cuenta!`, 'success');
        } else {
            triggerNotification(`Promo: ¡${baseProduct.nombre} añadido con descuento a $${finalPromoPrice.toFixed(2)}!`, 'success');
        }
    }
    setPendingPromoReward(null);
  };

  const syncPromotions = (cartState) => {
    let cleanCart = [...cartState];
    const promoGroups = {}; 

    cleanCart.forEach(item => {
        if (item.status === 'CANCELLED' || item.enviadoCocina) return;
        
        let activePromo = null;
        if (item.isAutoPromo && item.promoId) {
            activePromo = promotions.find(p => p.id === item.promoId);
        } else {
            activePromo = getActivePromo(item.id, item.stock, item.controlarStock);
        }
        
        if (activePromo && (activePromo.type === 'NxM' || activePromo.type === 'BOGO')) {
            const key = `${activePromo.id}::${item.cuenta}`;
            if (!promoGroups[key]) promoGroups[key] = { normalQty: 0, triggerQtys: {}, ghosts: [], activePromo, cuenta: item.cuenta };
            
            if (item.isAutoPromo && item.promoId === activePromo.id) {
                promoGroups[key].ghosts.push(item);
            } else if (!item.isAutoPromo || item.promoLabel === 'OFERTA') {
                const isTrigger = Array.isArray(activePromo.applyToProducts) 
                    ? activePromo.applyToProducts.map(String).includes(String(item.id))
                    : String(activePromo.productId || activePromo.product_id) === String(item.id);
                
                if (isTrigger) {
                    promoGroups[key].normalQty += item.qty;
                    promoGroups[key].triggerQtys[item.id] = (promoGroups[key].triggerQtys[item.id] || 0) + item.qty;
                }
            }
        }
    });

    Object.values(promoGroups).forEach(group => {
        let expectedGhosts = 0;

        if (group.activePromo.type === 'NxM') {
            const pay = Number(group.activePromo.payQty || 1);
            const buy = Number(group.activePromo.buyQty || 2);
            expectedGhosts = Math.floor(group.normalQty / pay) * (buy - pay);
        } else if (group.activePromo.type === 'BOGO') {
            const triggerIds = Array.isArray(group.activePromo.applyToProducts) && group.activePromo.applyToProducts.length > 0 
                ? group.activePromo.applyToProducts.map(String) 
                : [String(group.activePromo.productId || group.activePromo.product_id)];
            
            const buyReq = Number(group.activePromo.buyQty || 1);
            const rewardGiven = Number(group.activePromo.payQty || 1);
            
            if (triggerIds.length > 0) {
                const totalTriggerQty = triggerIds.reduce((sum, tId) => sum + (group.triggerQtys[tId] || 0), 0);
                const bundles = Math.floor(totalTriggerQty / buyReq);
                expectedGhosts = bundles * rewardGiven;
            }
        }

        const currentGhostQty = group.ghosts.reduce((sum, g) => sum + g.qty, 0);

        if (currentGhostQty > expectedGhosts) {
            let toRemove = currentGhostQty - expectedGhosts;
            for (let i = cleanCart.length - 1; i >= 0; i--) {
                const item = cleanCart[i];
                if (item.isAutoPromo && item.promoId === group.activePromo.id && String(item.cuenta) === String(group.cuenta) && !item.enviadoCocina) {
                    if (item.qty <= toRemove) {
                        toRemove -= item.qty;
                        cleanCart.splice(i, 1);
                    } else {
                        cleanCart[i] = { ...item, qty: item.qty - toRemove, preparaciones: item.preparaciones.slice(0, item.qty - toRemove) };
                        toRemove = 0;
                    }
                }
                if (toRemove <= 0) break;
            }
        }
    });

    return cleanCart;
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
      
      const prevGhosts = prev.filter(p => p.isAutoPromo && ['GRATIS', 'PROMO'].includes(p.promoLabel)).reduce((sum, p) => sum + p.qty, 0);
      const nextGhosts = nextCart.filter(p => p.isAutoPromo && ['GRATIS', 'PROMO'].includes(p.promoLabel)).reduce((sum, p) => sum + p.qty, 0);

      if (nextGhosts < prevGhosts) {
        setPromoWarning({
          isOpen: true,
          message: `Al reducir la cantidad de este artículo, se romperá una promoción y perderás un beneficio asociado. ¿Deseas continuar?`,
          onConfirm: () => {
            setCart(currentCart => actionToCalculateNextCart(currentCart));
            setPromoWarning({ isOpen: false, message: '', onConfirm: null, onCancel: null });
          },
          onCancel: () => setPromoWarning({ isOpen: false, message: '', onConfirm: null, onCancel: null })
        });
        return prev; 
      }
      return nextCart;
    });
  };

  const addToCart = (productWithDetails, forceCuenta = null) => {
    if (isProcessingRef.current) return false;
    isProcessingRef.current = true;

    try {
      const targetCuenta = forceCuenta || cuentaActiva;
      if (cuentasPagadasReales.includes(targetCuenta)) {
          if (triggerNotification) triggerNotification(`La cuenta "${targetCuenta}" está sellada.`, 'error');
          return false; 
      }

      if (productWithDetails.controlarStock) {
        const currentUnsent = getUnsentQtyOfProduct(_cart, productWithDetails.id);
        if (currentUnsent + 1 > productWithDetails.stock) {
            if (triggerNotification) triggerNotification(`Stock insuficiente. Solo quedan ${productWithDetails.stock - currentUnsent}.`, 'warning');
            return false; 
        }
      }

      const activePromo = getActivePromo(productWithDetails.id, productWithDetails.stock, productWithDetails.controlarStock);
      
      let finalDetails = productWithDetails.detalles || {};
      let finalPrice = parseFloat(productWithDetails.precioFinal || productWithDetails.precioBase || productWithDetails.precio || 0);
      
      if (!productWithDetails.detalles) {
        const defaultCustoms = getDefaultCustomizations(productWithDetails);
        if (defaultCustoms) {
            finalDetails = defaultCustoms.detalles;
            finalPrice = defaultCustoms.precioFinal;
        }
      }

      let rewardToTrigger = null;
      let autoClaimNxM = null;
      let upsellNotification = null;

      setCart(prev => {
        const detailStr = JSON.stringify(finalDetails);
        let newCart = [...prev];
        
        const index = newCart.findIndex(p => 
            p.id === productWithDetails.id && Number(p.precio).toFixed(2) === Number(finalPrice).toFixed(2) && !p.enviadoCocina && 
            p.cuenta === targetCuenta && !!p.isTakeaway === !!productWithDetails.isTakeaway && 
            (!p.isAutoPromo || p.promoLabel === 'OFERTA') && 
            p.preparaciones.every(prep => JSON.stringify(prep) === detailStr)
        );

        if (index !== -1) {
            newCart[index] = { ...newCart[index], qty: newCart[index].qty + 1, preparaciones: [...newCart[index].preparaciones, finalDetails] };
        } else {
            newCart.push({ 
              ...productWithDetails, precio: finalPrice, qty: 1, preparaciones: [finalDetails], 
              enviadoCocina: false, status: 'ACTIVE', cuenta: targetCuenta, 
              isTakeaway: productWithDetails.isTakeaway || false, requiereCocina: productWithDetails.requiereCocina !== false, 
              isAutoPromo: false
            });
        }

        if (activePromo) {
            const triggerIds = Array.isArray(activePromo.applyToProducts) && activePromo.applyToProducts.length > 0 
                ? activePromo.applyToProducts.map(String) 
                : [String(activePromo.productId || activePromo.product_id)];
            
            // 🔥 PARSEO SEGURO PARA EL MODAL: Convertimos discountValue a Number para evitar el TypeError
            const safeDiscountValue = Number(activePromo.discountValue || activePromo.discount_value || 0);

            // Creamos un objeto de promo sanitizado para pasarlo al Modal sin riesgos
            const safeActivePromo = {
              ...activePromo,
              discountValue: safeDiscountValue
            };

            if (activePromo.type === 'NxM') {
                const normalQtyInAccount = newCart
                    .filter(p => triggerIds.includes(String(p.id)) && p.cuenta === targetCuenta && !p.isAutoPromo && p.status !== 'CANCELLED')
                    .reduce((a, b) => a + b.qty, 0);

                const pay = Number(activePromo.payQty || 1);
                const buy = Number(activePromo.buyQty || 2);
                
                if (normalQtyInAccount > 0 && normalQtyInAccount % pay === 0) {
                    const earnedGhosts = buy - pay;
                    if (triggerIds.length > 1) {
                        rewardToTrigger = { promo: safeActivePromo, earnedGhosts, targetCuenta, poolProductIds: triggerIds };
                    } else {
                        autoClaimNxM = { productWithDetails, activePromo: safeActivePromo, targetCuenta, earnedGhosts };
                    }
                } else if (normalQtyInAccount % pay > 0) {
                    const missing = pay - (normalQtyInAccount % pay);
                    upsellNotification = `¡Agrega ${missing} más para completar la promo ${buy}x${pay}!`;
                }

            } else if (activePromo.type === 'BOGO') {
                const reqQty = Number(activePromo.buyQty || 1);
                const rewardQty = Number(activePromo.payQty || 1);
                const rewardIds = activePromo.rewardProducts || [];

                const totalTriggerQty = newCart
                    .filter(p => triggerIds.includes(String(p.id)) && p.cuenta === targetCuenta && !p.isAutoPromo && p.status !== 'CANCELLED')
                    .reduce((a, b) => a + b.qty, 0);
                
                const bundles = Math.floor(totalTriggerQty / reqQty);
                const expectedGhosts = bundles * rewardQty;
                
                const currentGhosts = newCart
                    .filter(p => p.isAutoPromo && p.promoId === activePromo.id && p.cuenta === targetCuenta)
                    .reduce((a, b) => a + b.qty, 0);

                if (expectedGhosts > currentGhosts) {
                    const earnedGhosts = expectedGhosts - currentGhosts;
                    rewardToTrigger = {
                        promo: safeActivePromo,
                        earnedGhosts: earnedGhosts,
                        targetCuenta,
                        poolProductIds: rewardIds.map(String),
                        discountValue: safeDiscountValue
                    };
                } else {
                    const remainder = totalTriggerQty % reqQty;
                    if (remainder > 0) {
                        const missing = reqQty - remainder;
                        upsellNotification = `¡Agrega ${missing} producto(s) más para desbloquear el premio de "${activePromo.name}"!`;
                    }
                }
            }
        }

        return newCart;
      });

      if (rewardToTrigger) {
          setPendingPromoReward(rewardToTrigger);
      }
      if (autoClaimNxM) {
          setTimeout(() => claimPromoReward(autoClaimNxM.productWithDetails, autoClaimNxM.activePromo, autoClaimNxM.targetCuenta, autoClaimNxM.earnedGhosts), 0);
      }
      if (upsellNotification && triggerNotification) {
          triggerNotification(upsellNotification, 'info');
      }

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
              notificationsToFire.add(JSON.stringify({ msg: `El producto se agotó y fue retirado de tu carrito.`, type: 'error' }));
              modifiedCart = modifiedCart.filter(item => !(item.id === update.id && !item.enviadoCocina && item.status !== 'CANCELLED'));
            } else {
              notificationsToFire.add(JSON.stringify({ msg: `Se redujo la cantidad en tu carrito por disponibilidad de stock.`, type: 'warning' }));
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

          promotions.forEach(promo => {
            const rawActive = promo.isActive ?? promo.is_active ?? promo.status;
            const isPActive = rawActive === true || rawActive === 1 || rawActive === 'true' || rawActive === '1';
            
            if (isPActive) {
              const isTrigger = promo.applyToProducts?.map(String).includes(String(update.id)) || String(promo.productId) === String(update.id);
              const isReward = promo.rewardProducts?.map(String).includes(String(update.id));
              
              if (isTrigger || isReward) {
                const threshold = Number(promo.minStockThreshold || promo.min_stock_threshold || 0);
                
                if (update.stock <= threshold) {
                  setSuspendedPromos(prev => {
                    if (!prev.find(p => p.id === promo.id)) return [...prev, promo];
                    return prev;
                  });

                  if (!alertedPromosRef.current.has(promo.id)) {
                    notificationsToFire.add(JSON.stringify({ 
                      msg: `🚨 Promoción Suspendida: "${promo.name}" se ocultó por llegar al límite de stock de seguridad.`, 
                      type: 'error' 
                    }));
                    alertedPromosRef.current.add(promo.id);
                  }
                } else {
                  setSuspendedPromos(prev => prev.filter(p => p.id !== promo.id));
                  alertedPromosRef.current.delete(promo.id);
                }
              }
            }
          });
        }
        
        if (triggerNotification) {
          notificationsToFire.forEach(notifStr => {
            const notif = JSON.parse(notifStr);
            triggerNotification(notif.msg, notif.type);
          });
        }
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
          const idx = newCart.findIndex(p => p.id === itemToRemove.id && Number(p.precio).toFixed(2) === Number(itemToRemove.precio).toFixed(2) && p.cuenta === itemToRemove.cuenta && !!p.isTakeaway === !!itemToRemove.isTakeaway && !p.enviadoCocina && JSON.stringify(p.preparaciones[0] || {}) === prepStr);
          if (idx !== -1) {
              if (newCart[idx].isAutoPromo && ['GRATIS', 'PROMO'].includes(newCart[idx].promoLabel)) return prev;
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
        if (itemToRemove.isAutoPromo && ['GRATIS', 'PROMO'].includes(itemToRemove.promoLabel)) return prev;
        const prepStr = JSON.stringify(itemToRemove.preparaciones[0] || {});
        return prev.filter(p => !(p.id === itemToRemove.id && p.cuenta === itemToRemove.cuenta && !!p.isTakeaway === !!itemToRemove.isTakeaway && !p.enviadoCocina && JSON.stringify(p.preparaciones[0] || {}) === prepStr));
      });
    } finally {
      isProcessingRef.current = false;
    }
  };

  const toggleItemTakeaway = (itemToToggle) => {
    if (isProcessingRef.current || itemToToggle.enviadoCocina) return;
    if (itemToToggle.isAutoPromo && ['GRATIS', 'PROMO'].includes(itemToToggle.promoLabel)) return;
    isProcessingRef.current = true;

    try {
      setCart(prev => {
        const newCart = [...prev];
        const prepStr = JSON.stringify(itemToToggle.preparaciones[0] || {});
        const idx = newCart.findIndex(p => p.id === itemToToggle.id && Number(p.precio).toFixed(2) === Number(itemToToggle.precio).toFixed(2) && p.cuenta === itemToToggle.cuenta && !!p.isTakeaway === !!itemToToggle.isTakeaway && !p.enviadoCocina && JSON.stringify(p.preparaciones[0] || {}) === prepStr);

        if (idx !== -1) {
          const currentItem = newCart[idx];
          const targetTakeawayState = !currentItem.isTakeaway;
          
          if (currentItem.qty === 1) { 
            newCart[idx] = { ...currentItem, isTakeaway: targetTakeawayState }; 
          } else {
            const prepToMove = currentItem.preparaciones[currentItem.preparaciones.length - 1];
            newCart[idx] = { ...currentItem, qty: currentItem.qty - 1, preparaciones: currentItem.preparaciones.slice(0, -1) };
            
            const existingTargetIdx = newCart.findIndex(p => p.id === currentItem.id && Number(p.precio).toFixed(2) === Number(currentItem.precio).toFixed(2) && p.cuenta === currentItem.cuenta && !!p.isTakeaway === targetTakeawayState && !p.enviadoCocina && JSON.stringify(p.preparaciones[0] || {}) === prepStr);
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

  const clearCartByAccount = (cuentaTarget) => setCart(prev => prev.filter(item => item.cuenta !== cuentaTarget));
  const clearEntireCart = () => setCart([]);

  return {
    cart: _cart, setCart, addToCart, removeFromCart, deleteLine, toggleItemTakeaway, total, unsentTotal, hasUnsentItems, getSubtotalByCuenta, getProductQty,
    clearCartByAccount, clearEntireCart,
    promoWarning, confirmPromoRupture: () => promoWarning.onConfirm && promoWarning.onConfirm(), cancelPromoRupture: () => promoWarning.onCancel && promoWarning.onCancel(),
    pendingPromoReward, setPendingPromoReward, claimPromoReward,
    suspendedPromos
  };
};