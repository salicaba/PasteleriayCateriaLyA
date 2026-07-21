// src/modules/cafeteria/controllers/usePosCart.js
import { useState, useMemo, useEffect } from 'react';
import { getDefaultCustomizations } from '../utils/posHelpers.js';
import { socket } from '../../../api/socket.js';
import api from '../../../api/client.js'; 

export const usePosCart = (cuentaActiva, cuentasPagadasReales, triggerNotification) => {
  const [cart, setCart] = useState([]);
  const [promotions, setPromotions] = useState([]);

  const [promoWarning, setPromoWarning] = useState({
    isOpen: false,
    message: '',
    onConfirm: null,
    onCancel: null
  });

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const res = await api.get('/promotions');
        if (res.data.success) setPromotions(res.data.data);
      } catch (error) {
        console.error("Error cargando promociones:", error);
      }
    };
    fetchPromos();

    const handlePromoUpdate = (data) => {
      setPromotions(prev => {
        const filtered = prev.filter(p => p.productId !== data.productId);
        if (data.promotion) filtered.push(data.promotion);
        return filtered;
      });
    };
    
    socket.on('menu:promotions_updated', handlePromoUpdate);
    return () => socket.off('menu:promotions_updated', handlePromoUpdate);
  }, []);

  const getActivePromo = (productId) => {
    const promo = promotions.find(p => p.productId === productId);
    if (!promo || !promo.isActive) return null;
    const today = new Date().getDay();
    if (!promo.validDays.includes(today)) return null;
    return promo;
  };

  const getUnsentQtyOfProduct = (cartState, productId) => {
    return cartState
      .filter(p => p.id === productId && !p.enviadoCocina && p.status !== 'CANCELLED')
      .reduce((acc, item) => acc + item.qty, 0);
  };

  const cleanupGhosts = (cartState) => {
    let cleanCart = [...cartState];
    const normalQtys = {};
    const ghostQtys = {};

    cleanCart.forEach(item => {
      if (item.status === 'CANCELLED') return;
      const key = `${item.id}-${item.cuenta}`;
      if (item.isAutoPromo) ghostQtys[key] = (ghostQtys[key] || 0) + item.qty;
      else normalQtys[key] = (normalQtys[key] || 0) + item.qty;
    });

    Object.keys(ghostQtys).forEach(key => {
      const [productId, cuenta] = key.split('-');
      const activePromo = getActivePromo(productId);
      let expectedGhosts = 0;

      if (activePromo && (activePromo.type === 'NxM' || activePromo.type === 'NTH_FIXED')) {
        const triggerQty = activePromo.type === 'NxM' ? activePromo.payQty : (activePromo.buyQty - 1);
        const ghostQtyPerBundle = activePromo.type === 'NxM' ? (activePromo.buyQty - activePromo.payQty) : 1;
        expectedGhosts = Math.floor((normalQtys[key] || 0) / triggerQty) * ghostQtyPerBundle;
      }

      if (ghostQtys[key] > expectedGhosts) {
        let toRemove = ghostQtys[key] - expectedGhosts;
        for (let i = cleanCart.length - 1; i >= 0; i--) {
          const item = cleanCart[i];
          if (item.isAutoPromo && item.id === productId && item.cuenta === cuenta) {
            if (toRemove >= item.qty) {
              toRemove -= item.qty;
              cleanCart.splice(i, 1);
            } else {
              cleanCart[i] = { ...item, qty: item.qty - toRemove, preparaciones: item.preparaciones.slice(0, item.qty - toRemove) };
              toRemove = 0;
            }
            if (toRemove === 0) break;
          }
        }
      }
    });
    return cleanCart;
  };

  const checkRuptureAndExecute = (actionToCalculateNextCart) => {
    setCart(prev => {
      const nextCart = actionToCalculateNextCart(prev);
      let ruptureDetected = false;
      let ruptureProductName = '';

      const getNormalQtys = (cartState) => {
        const qtys = {};
        cartState.forEach(item => {
          if (item.status === 'CANCELLED' || item.isAutoPromo) return;
          const key = `${item.id}-${item.cuenta}`;
          qtys[key] = (qtys[key] || 0) + item.qty;
        });
        return qtys;
      };

      const prevQtys = getNormalQtys(prev);
      const nextQtys = getNormalQtys(nextCart);

      for (const key of Object.keys(prevQtys)) {
        const [productId, cuenta] = key.split('-');
        const activePromo = getActivePromo(productId);
        
        if (activePromo && (activePromo.type === 'NxM' || activePromo.type === 'NTH_FIXED')) {
          const triggerQty = activePromo.type === 'NxM' ? activePromo.payQty : (activePromo.buyQty - 1);
          const ghostQtyPerBundle = activePromo.type === 'NxM' ? (activePromo.buyQty - activePromo.payQty) : 1;

          const prevNormalQty = prevQtys[key] || 0;
          const nextNormalQty = nextQtys[key] || 0;

          const prevExpectedGhosts = Math.floor(prevNormalQty / triggerQty) * ghostQtyPerBundle;
          const nextExpectedGhosts = Math.floor(nextNormalQty / triggerQty) * ghostQtyPerBundle;
          const currentGhosts = prev.filter(p => p.id === productId && p.cuenta === cuenta && p.isAutoPromo && p.status !== 'CANCELLED').reduce((a, b) => a + b.qty, 0);

          if (nextExpectedGhosts < currentGhosts && nextExpectedGhosts < prevExpectedGhosts) {
            ruptureDetected = true;
            ruptureProductName = prev.find(p => p.id === productId)?.nombre || 'Producto';
            break;
          }
        }
      }

      if (ruptureDetected) {
        setPromoWarning({
          isOpen: true,
          message: `Al modificar esta cuenta, perderás la promoción vigente en "${ruptureProductName}". Los artículos volverán a su precio normal. ¿Deseas continuar?`,
          onConfirm: () => {
            setCart(currentCart => cleanupGhosts(actionToCalculateNextCart(currentCart)));
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
    const targetCuenta = forceCuenta || cuentaActiva;

    if (cuentasPagadasReales.includes(targetCuenta)) {
        triggerNotification(`La cuenta "${targetCuenta}" está sellada. Selecciona una nueva.`, 'error');
        return false; 
    }

    const activePromo = getActivePromo(productWithDetails.id);
    let qtyToAdd = 1;
    let willAddGhost = false;
    let ghostPrice = 0;
    let ghostLabel = '';

    if (activePromo && (activePromo.type === 'NxM' || activePromo.type === 'NTH_FIXED')) {
      const normalQtyInAccount = cart.filter(p => p.id === productWithDetails.id && p.cuenta === targetCuenta && !p.isAutoPromo && p.status !== 'CANCELLED').reduce((a, b) => a + b.qty, 0);
      const triggerQty = activePromo.type === 'NxM' ? activePromo.payQty : (activePromo.buyQty - 1);
      
      if ((normalQtyInAccount + 1) % triggerQty === 0) {
        willAddGhost = true;
        const ghostQtyPerBundle = activePromo.type === 'NxM' ? (activePromo.buyQty - activePromo.payQty) : 1;
        qtyToAdd += ghostQtyPerBundle;
        ghostPrice = activePromo.type === 'NxM' ? 0 : parseFloat(activePromo.discountValue);
        ghostLabel = activePromo.type === 'NxM' ? 'GRATIS' : 'OFERTA';
      }
    }

    if (productWithDetails.controlarStock) {
      const currentUnsent = getUnsentQtyOfProduct(cart, productWithDetails.id);
      if (currentUnsent + qtyToAdd > productWithDetails.stock) {
         triggerNotification(`Stock insuficiente. Intentas añadir ${qtyToAdd} (incluyendo promociones) pero quedan ${productWithDetails.stock - currentUnsent}.`, 'warning');
         return false; 
      }
    }
    
    let finalDetails = productWithDetails.detalles || {};
    let finalPrice = productWithDetails.precioFinal || productWithDetails.precioBase || productWithDetails.precio || 0;
    
    if (activePromo && activePromo.type === 'FIXED') {
      const baseOriginal = parseFloat(productWithDetails.precioBase || productWithDetails.precio || 0);
      const costoExtras = finalPrice - baseOriginal;
      finalPrice = parseFloat(activePromo.discountValue) + (costoExtras > 0 ? costoExtras : 0);
    } else if (!productWithDetails.detalles) {
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
         p.id === productWithDetails.id && p.precio === finalPrice && !p.enviadoCocina && 
         p.cuenta === targetCuenta && !!p.isTakeaway === !!productWithDetails.isTakeaway && !p.isAutoPromo &&
         p.preparaciones.every(prep => JSON.stringify(prep) === detailStr)
      );

      if (index !== -1) {
          newCart[index] = { ...newCart[index], qty: newCart[index].qty + 1, preparaciones: [...newCart[index].preparaciones, finalDetails] };
      } else {
          newCart.push({ 
            ...productWithDetails, 
            precio: finalPrice, 
            qty: 1, 
            preparaciones: [finalDetails], 
            enviadoCocina: false, 
            status: 'ACTIVE', 
            cuenta: targetCuenta, 
            isTakeaway: productWithDetails.isTakeaway || false, 
            requiereCocina: productWithDetails.requiereCocina !== false, 
            isAutoPromo: false
          });
      }

      // 🔥 AUTO-AÑADIDO DEL ITEM FANTASMA (El Regalo o Descuento)
      if (willAddGhost) {
        const ghostQtyToAdd = qtyToAdd - 1;
        const baseOriginal = parseFloat(productWithDetails.precioBase || productWithDetails.precio || 0);

        // 🔥 OBTENER EXACTAMENTE LOS PREDETERMINADOS DEL GESTOR DE MENÚ
        let ops = productWithDetails.opciones;
        if (typeof ops === 'string') {
          try { ops = JSON.parse(ops); } catch (e) { ops = null; }
        }
        
        // Extraemos solo lo que explícitamente se marcó como default
        let ghostDetails = {};
        if (ops && typeof ops === 'object') {
           if (ops.defaults?.tamano) ghostDetails.tamano = ops.defaults.tamano;
           if (ops.defaults?.leche) ghostDetails.leche = ops.defaults.leche;
           // Aseguramos que no lleva extras (para no cobrarle ni regalarle ingredientes premium)
           ghostDetails.extras = []; 
        }

        newCart.push({
          ...productWithDetails,
          nombre: productWithDetails.nombre, 
          precioOriginal: baseOriginal,      
          promoLabel: ghostLabel,            
          precio: ghostPrice,
          qty: ghostQtyToAdd,
          // 🔥 Hereda SOLO lo que el admin puso como predeterminado
          preparaciones: Array(ghostQtyToAdd).fill(ghostDetails), 
          enviadoCocina: false,
          status: 'ACTIVE',
          cuenta: targetCuenta,
          isAutoPromo: true,
          requiereCocina: productWithDetails.requiereCocina !== false
        });
        setTimeout(() => triggerNotification(`¡Promo Activada! +${ghostQtyToAdd} ${productWithDetails.nombre} (${ghostLabel})`, 'success'), 50);
      }

      return newCart;
    });

    if (!willAddGhost) triggerNotification(`¡${productWithDetails.nombre} agregado!`, 'success');
    return true; 
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
        notificationsToFire.forEach(notif => triggerNotification(notif.msg, notif.type));
        return cleanupGhosts(modifiedCart); 
      });
    };

    socket.on('stock:update', handleStockAdjustment);
    return () => socket.off('stock:update', handleStockAdjustment);
  }, [triggerNotification, promotions]); 

  const removeFromCart = (itemToRemove) => { 
    if(itemToRemove.enviadoCocina) return;
    checkRuptureAndExecute((prev) => {
        const newCart = [...prev];
        const prepStr = JSON.stringify(itemToRemove.preparaciones[0] || {});
        const idx = newCart.findIndex(p => 
          p.id === itemToRemove.id && p.precio === itemToRemove.precio && p.cuenta === itemToRemove.cuenta && 
          !!p.isTakeaway === !!itemToRemove.isTakeaway && !p.enviadoCocina && !!p.isAutoPromo === !!itemToRemove.isAutoPromo &&
          JSON.stringify(p.preparaciones[0] || {}) === prepStr
        );
        
        if (idx !== -1) {
            newCart[idx] = { ...newCart[idx], qty: newCart[idx].qty - 1, preparaciones: newCart[idx].preparaciones.slice(0, -1) };
            if (newCart[idx].qty <= 0) newCart.splice(idx, 1);
        }
        return newCart;
    });
  };

  const deleteLine = (itemToRemove) => { 
    if(itemToRemove.enviadoCocina) return;
    checkRuptureAndExecute((prev) => {
      const prepStr = JSON.stringify(itemToRemove.preparaciones[0] || {});
      return prev.filter(p => !(
        p.id === itemToRemove.id && p.precio === itemToRemove.precio && p.cuenta === itemToRemove.cuenta && 
        !!p.isTakeaway === !!itemToRemove.isTakeaway && !p.enviadoCocina && !!p.isAutoPromo === !!itemToRemove.isAutoPromo &&
        JSON.stringify(p.preparaciones[0] || {}) === prepStr
      ));
    });
  };

  const toggleItemTakeaway = (itemToToggle) => {
    if (itemToToggle.enviadoCocina) return;
    setCart(prev => {
      const newCart = [...prev];
      const prepStr = JSON.stringify(itemToToggle.preparaciones[0] || {});
      const idx = newCart.findIndex(p => 
        p.id === itemToToggle.id && p.precio === itemToToggle.precio && p.cuenta === itemToToggle.cuenta && 
        !!p.isTakeaway === !!itemToToggle.isTakeaway && !p.enviadoCocina && !!p.isAutoPromo === !!itemToToggle.isAutoPromo &&
        JSON.stringify(p.preparaciones[0] || {}) === prepStr
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
            !!p.isTakeaway === targetTakeawayState && !p.enviadoCocina && !!p.isAutoPromo === !!currentItem.isAutoPromo &&
            JSON.stringify(p.preparaciones[0] || {}) === prepStr
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
    cart.filter(p => p.id === id && !p.enviadoCocina && p.cuenta === cuentaActiva && p.status !== 'CANCELLED' && !p.isAutoPromo)
        .reduce((acc, item) => acc + item.qty, 0);

  return {
    cart, setCart,
    addToCart, removeFromCart, deleteLine, toggleItemTakeaway,
    total, unsentTotal, hasUnsentItems,
    getSubtotalByCuenta, getProductQty,
    promoWarning,
    confirmPromoRupture: () => promoWarning.onConfirm && promoWarning.onConfirm(),
    cancelPromoRupture: () => promoWarning.onCancel && promoWarning.onCancel()
  };
};