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

  // 🌟 NUEVO ESTADO: Controla el modal de selección para Promos Multi-Producto
  const [pendingPromoReward, setPendingPromoReward] = useState(null);

  const [promoWarning, setPromoWarning] = useState({
    isOpen: false, message: '', onConfirm: null, onCancel: null
  });

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

  // 🌟 NUEVO: Inyecta el premio asegurando que es 100% BASE
  const claimPromoReward = (baseProduct, promo, cuenta, qty) => {
    const defaultCustoms = getDefaultCustomizations(baseProduct);
    const finalDetails = defaultCustoms?.detalles || {};
    const ghostOriginalPrice = defaultCustoms?.precioFinal || baseProduct.precioBase || baseProduct.precio || 0;

    setCart(prev => {
        const newCart = [...prev];
        const existingGhostIdx = newCart.findIndex(p => 
            p.id === baseProduct.id && p.cuenta === cuenta && 
            p.isAutoPromo && p.promoLabel === 'GRATIS' && 
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
                promoLabel: 'GRATIS',
                precio: 0,
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
        triggerNotification(`Promo Automática: ¡${baseProduct.nombre} GRATIS añadido a la cuenta!`, 'success');
    }
    setPendingPromoReward(null);
  };

  // 🔥 MOTOR ANTI-ZOMBIE (Auto-Limpieza por Grupos)
  const syncPromotions = (cartState) => {
    let cleanCart = [...cartState];
    const promoGroups = {}; 

    cleanCart.forEach(item => {
        if (item.status === 'CANCELLED' || item.enviadoCocina) return;
        const activePromo = getActivePromo(item.id, item.stock, item.controlarStock);
        
        if (activePromo && activePromo.type === 'NxM') {
            const key = `${activePromo.id}::${item.cuenta}`;
            if (!promoGroups[key]) promoGroups[key] = { normalQty: 0, ghosts: [], activePromo, cuenta: item.cuenta };
            
            if (item.isAutoPromo && item.promoLabel === 'GRATIS' && item.promoId === activePromo.id) {
                promoGroups[key].ghosts.push(item);
            } else if (!item.isAutoPromo || item.promoLabel === 'OFERTA') {
                promoGroups[key].normalQty += item.qty;
            }
        }
    });

    Object.values(promoGroups).forEach(group => {
        const pay = Number(group.activePromo.payQty || 1);
        const buy = Number(group.activePromo.buyQty || 2);
        const expectedGhosts = Math.floor(group.normalQty / pay) * (buy - pay);
        const currentGhostQty = group.ghosts.reduce((sum, g) => sum + g.qty, 0);

        if (currentGhostQty > expectedGhosts) {
            let toRemove = currentGhostQty - expectedGhosts;
            for (let i = cleanCart.length - 1; i >= 0; i--) {
                const item = cleanCart[i];
                if (item.isAutoPromo && item.promoLabel === 'GRATIS' && item.promoId === group.activePromo.id && String(item.cuenta) === String(group.cuenta) && !item.enviadoCocina) {
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

  // 🔥 EVALUACIÓN EXTREMADAMENTE ROBUSTA PARA EVITAR BUGS
  const checkRuptureAndExecute = (actionToCalculateNextCart) => {
    setCart(prev => {
      const nextCart = actionToCalculateNextCart(prev);
      
      const prevGhosts = prev.filter(p => p.isAutoPromo && p.promoLabel === 'GRATIS').reduce((sum, p) => sum + p.qty, 0);
      const nextGhosts = nextCart.filter(p => p.isAutoPromo && p.promoLabel === 'GRATIS').reduce((sum, p) => sum + p.qty, 0);

      if (nextGhosts < prevGhosts) {
        setPromoWarning({
          isOpen: true,
          message: `Al reducir la cantidad de este artículo, se romperá una promoción y perderás un producto GRATIS. ¿Deseas continuar?`,
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

        // 🌟 EVALUADOR DE PROMOCIÓN DE GRUPOS (El corazón inteligente)
        if (activePromo && activePromo.type === 'NxM') {
            const poolProductIds = activePromo.applyToProducts?.length > 0 ? activePromo.applyToProducts : [activePromo.productId || activePromo.product_id];
            
            const normalQtyInAccount = newCart
                .filter(p => poolProductIds.includes(String(p.id)) && p.cuenta === targetCuenta && !p.isAutoPromo && p.status !== 'CANCELLED')
                .reduce((a, b) => a + b.qty, 0);
            
            const pay = Number(activePromo.payQty || 1);
            const buy = Number(activePromo.buyQty || 2);
            
            if (normalQtyInAccount > 0 && normalQtyInAccount % pay === 0) {
                const earnedGhosts = buy - pay;
                if (poolProductIds.length > 1) {
                    setPendingPromoReward({
                        promo: activePromo,
                        earnedGhosts,
                        targetCuenta,
                        poolProductIds: poolProductIds.map(String)
                    });
                } else {
                    setTimeout(() => claimPromoReward(productWithDetails, activePromo, targetCuenta, earnedGhosts), 0);
                }
            }
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
  }, [triggerNotification]); 

  const removeFromCart = (itemToRemove) => { 
    if (isProcessingRef.current || itemToRemove.enviadoCocina) return;
    isProcessingRef.current = true;
    try {
      checkRuptureAndExecute((prev) => {
          const newCart = [...prev];
          const prepStr = JSON.stringify(itemToRemove.preparaciones[0] || {});
          const idx = newCart.findIndex(p => p.id === itemToRemove.id && Number(p.precio).toFixed(2) === Number(itemToRemove.precio).toFixed(2) && p.cuenta === itemToRemove.cuenta && !!p.isTakeaway === !!itemToRemove.isTakeaway && !p.enviadoCocina && JSON.stringify(p.preparaciones[0] || {}) === prepStr);
          if (idx !== -1) {
              if (newCart[idx].isAutoPromo && newCart[idx].promoLabel !== 'OFERTA') return prev;
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
        if (itemToRemove.isAutoPromo && itemToRemove.promoLabel !== 'OFERTA') return prev;
        const prepStr = JSON.stringify(itemToRemove.preparaciones[0] || {});
        return prev.filter(p => !(p.id === itemToRemove.id && p.cuenta === itemToRemove.cuenta && !!p.isTakeaway === !!itemToRemove.isTakeaway && !p.enviadoCocina && JSON.stringify(p.preparaciones[0] || {}) === prepStr));
      });
    } finally {
      isProcessingRef.current = false;
    }
  };

  const toggleItemTakeaway = (itemToToggle) => {
    if (isProcessingRef.current || itemToToggle.enviadoCocina) return;
    if (itemToToggle.isAutoPromo && itemToToggle.promoLabel !== 'OFERTA') return;
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
    pendingPromoReward, setPendingPromoReward, claimPromoReward // <--- Exponiendo el Control del Modal
  };
};