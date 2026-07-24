// frontend/src/modules/client/controllers/useClientCart.js
import { useState, useMemo, useEffect, useRef } from 'react';
import { socket } from '../../../api/socket.js';
import api from '../../../api/client.js';

// Helper local para decodificar días válidos
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

export const useClientCart = (triggerNotification) => {
  const [_cart, _setCart] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const isProcessingRef = useRef(false);

  // 1. CARGA DE PROMOCIONES Y WEBSOCKETS
  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const res = await api.get('/promotions');
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : (raw?.data || raw?.promotions || []);
        setPromotions(list);
      } catch (error) {
        console.error("Error cargando promociones en el carrito del cliente:", error);
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

  // 2. BUSCADOR DE PROMOS ACTIVAS
  const getActivePromo = (productId, currentStock = null, controlarStock = false, promosList) => {
    if (!promosList || promosList.length === 0) return null;

    const promo = promosList.find(p => {
      const matchesProduct = String(p.productId || p.product_id) === String(productId);
      if (!matchesProduct) return false;
      const rawActive = p.isActive ?? p.is_active ?? p.status;
      return rawActive === true || rawActive === 1 || rawActive === 'true' || rawActive === '1';
    });

    if (!promo) return null;

    if (controlarStock && currentStock !== null) {
      let requiredQty = 1;
      if (promo.type === 'NxM' || promo.type === 'NTH_FIXED') {
        requiredQty = Number(promo.buyQty || promo.buy_qty || 2);
      }
      if (currentStock < requiredQty) return null;
    }

    const today = new Date().getDay();
    const daysRaw = promo.validDays || promo.valid_days;
    const validDaysAsNumbers = parseValidDays(daysRaw);

    if (validDaysAsNumbers.length > 0 && !validDaysAsNumbers.includes(today)) return null;
    return promo;
  };

  // 3. AUTO-BALANCEADOR: Motor Matemático Poka-Yoke
  const syncPromotions = (cartState, promosList) => {
    let cleanCart = [...cartState];
    const normalQtys = {};
    const ghostQtys = {};
    const normalItemsMap = {};

    // Mapear el carrito
    cleanCart.forEach(item => {
      const key = String(item.id);
      if (item.isAutoPromo || Number(item.precioUnitario) === 0) {
        ghostQtys[key] = (ghostQtys[key] || 0) + item.qty;
      } else {
        normalQtys[key] = (normalQtys[key] || 0) + item.qty;
        if (!normalItemsMap[key]) normalItemsMap[key] = item;
      }
    });

    const allKeys = new Set([...Object.keys(normalQtys), ...Object.keys(ghostQtys)]);

    allKeys.forEach(productId => {
      const sampleItem = normalItemsMap[productId] || cleanCart.find(p => String(p.id) === String(productId));
      const activePromo = getActivePromo(productId, sampleItem?.stock, sampleItem?.controlarStock, promosList);

      let expectedGhosts = 0;
      let ghostPrice = 0;
      let ghostLabel = '';

      if (activePromo) {
        if (activePromo.type === 'NxM') {
          const buy = Number(activePromo.buyQty || 2);
          const pay = Number(activePromo.payQty || 1);
          expectedGhosts = Math.floor((normalQtys[productId] || 0) / pay) * (buy - pay);
          ghostLabel = '🎁 GRATIS';
        } else if (activePromo.type === 'NTH_FIXED') {
          const nth = Number(activePromo.buyQty || 2);
          const totalItems = (normalQtys[productId] || 0) + (ghostQtys[productId] || 0);
          expectedGhosts = Math.floor(totalItems / nth);
          ghostPrice = Number(activePromo.discountValue || 0);
          ghostLabel = `✨ Promo #${nth}`;
        }
      }

      const currentGhosts = ghostQtys[productId] || 0;

      // ELIMINAR BASURA FLOTANTE
      if (currentGhosts > expectedGhosts) {
        let toRemove = currentGhosts - expectedGhosts;
        for (let i = cleanCart.length - 1; i >= 0; i--) {
          const item = cleanCart[i];
          if ((item.isAutoPromo || Number(item.precioUnitario) === 0) && String(item.id) === String(productId)) {
            if (activePromo?.type === 'NTH_FIXED' || (item.promoLabel && item.promoLabel.includes('Promo #'))) {
              const originalPrice = item.precioOriginal || item.precioUnitario;
              if (toRemove >= item.qty) {
                cleanCart[i] = { ...item, precioUnitario: originalPrice, isAutoPromo: false, promoLabel: undefined, precioOriginal: undefined };
                toRemove -= item.qty;
              } else {
                const revertedItem = { ...item, cartItemId: `${item.cartItemId}-rev`, qty: toRemove, precioUnitario: originalPrice, isAutoPromo: false, promoLabel: undefined, precioOriginal: undefined };
                cleanCart[i] = { ...item, qty: item.qty - toRemove };
                cleanCart.push(revertedItem);
                toRemove = 0;
              }
            } else {
              if (toRemove >= item.qty) {
                toRemove -= item.qty;
                cleanCart.splice(i, 1);
              } else {
                cleanCart[i] = { ...item, qty: item.qty - toRemove };
                toRemove = 0;
              }
            }
            if (toRemove === 0) break;
          }
        }
      } 
      // AUTO-RELLENAR PREMIOS
      else if (currentGhosts < expectedGhosts && activePromo && sampleItem) {
        let missing = expectedGhosts - currentGhosts;

        if (activePromo.type === 'NTH_FIXED') {
          for (let i = cleanCart.length - 1; i >= 0; i--) {
            const item = cleanCart[i];
            if (!item.isAutoPromo && Number(item.precioUnitario) > 0 && String(item.id) === String(productId)) {
              const baseOriginal = parseFloat(item.precioBase || item.precioUnitario || 0);
              const costoExtras = parseFloat(item.precioUnitario) - baseOriginal;
              const finalGhostPrice = ghostPrice + (costoExtras > 0 ? costoExtras : 0);

              if (item.qty <= missing) {
                cleanCart[i] = { ...item, precioOriginal: item.precioUnitario, precioUnitario: finalGhostPrice, isAutoPromo: true, promoLabel: ghostLabel };
                missing -= item.qty;
              } else {
                const convertedItem = { ...item, cartItemId: `${item.cartItemId}-promo-${Date.now()}`, qty: missing, precioOriginal: item.precioUnitario, precioUnitario: finalGhostPrice, isAutoPromo: true, promoLabel: ghostLabel };
                cleanCart[i] = { ...item, qty: item.qty - missing };
                cleanCart.push(convertedItem);
                missing = 0;
              }
              if (missing === 0) break;
            }
          }
        } else if (activePromo.type === 'NxM') {
          let ghostOriginalPrice = parseFloat(sampleItem.precioBase || sampleItem.precioUnitario || 0);
          cleanCart.push({
            ...sampleItem,
            cartItemId: `${sampleItem.id}-ghost-${Date.now()}-${Math.random()}`,
            precioOriginal: ghostOriginalPrice,
            precioUnitario: 0,
            promoLabel: ghostLabel,
            qty: missing,
            isAutoPromo: true
          });
          if (triggerNotification) {
            setTimeout(() => triggerNotification(`¡Promo Activada! +${missing} ${sampleItem.nombre} (${ghostLabel})`, 'success'), 50);
          }
        }
      }
    });

    // Rebajas Directas (FIXED)
    cleanCart = cleanCart.map(item => {
      if (item.isAutoPromo && item.promoLabel !== '✨ OFERTA') return item; 
      const activePromo = getActivePromo(item.id, item.stock, item.controlarStock, promosList);
      
      if (activePromo && activePromo.type === 'FIXED') {
        const baseOriginal = parseFloat(item.precioBase || item.precioOriginal || item.precioUnitario || 0);
        const discountFixed = Number(activePromo.discountValue || 0);
        const costoExtras = parseFloat(item.precioOriginal || item.precioUnitario) - baseOriginal;
        const expectedPrice = discountFixed + (costoExtras > 0 ? costoExtras : 0);

        if (item.precioUnitario !== expectedPrice) {
          return { ...item, precioOriginal: item.precioOriginal || item.precioUnitario, precioUnitario: expectedPrice, promoLabel: '✨ OFERTA', isAutoPromo: true };
        }
      } else if (item.promoLabel === '✨ OFERTA' && (!activePromo || activePromo.type !== 'FIXED')) {
        return { ...item, precioUnitario: item.precioOriginal || item.precioUnitario, precioOriginal: undefined, promoLabel: undefined, isAutoPromo: false };
      }
      return item;
    });

    return cleanCart;
  };

  // INTERCEPTOR ABSOLUTO
  const setCart = (action) => {
    _setCart(prev => {
      const nextCart = typeof action === 'function' ? action(prev) : action;
      return syncPromotions(nextCart, promotions);
    });
  };

  // 4. FUNCIONES DE INTERFAZ DEL CARRITO
  const addToCart = (product, customizations = null) => {
    if (isProcessingRef.current) return false;
    isProcessingRef.current = true;

    try {
      const currentTotalQty = _cart.filter(item => item.id === product.id).reduce((acc, item) => acc + item.qty, 0);

      if (product.controlarStock && currentTotalQty >= product.stock) {
        if (triggerNotification) triggerNotification(`Límite en carrito: Solo hay ${product.stock} en stock.`, 'warning');
        return false;
      }

      setCart(prev => {
        let newItem = { ...product, qty: 1, precioUnitario: product.precio, isAutoPromo: false };
        let uniqueCartId = product.id.toString();

        if (customizations) {
          newItem = { ...newItem, precioUnitario: customizations.precioFinal, detalles: customizations.detalles, isTakeaway: customizations.isTakeaway };
          const detailStr = JSON.stringify(customizations.detalles) + (customizations.isTakeaway ? '-llevar' : '');
          uniqueCartId = `${product.id}-${detailStr}`;
        }

        newItem.cartItemId = uniqueCartId;
        const existing = prev.find(item => item.cartItemId === uniqueCartId && !item.isAutoPromo);
        
        if (existing) {
          return prev.map(item => item.cartItemId === uniqueCartId && !item.isAutoPromo ? { ...item, qty: item.qty + 1 } : item);
        }
        return [...prev, newItem];
      });
      
      return true;
    } finally {
      isProcessingRef.current = false;
    }
  };

  const removeFromCart = (cartItemId) => {
    setCart(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId);
      if (!existing || existing.isAutoPromo) return prev; // Protegido contra manipulación
      if (existing.qty === 1) return prev.filter(item => item.cartItemId !== cartItemId);
      return prev.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty - 1 } : item);
    });
  };

  const incrementInCart = (cartItemId) => {
    const existing = _cart.find(item => item.cartItemId === cartItemId);
    if (!existing || existing.isAutoPromo) return; // Protegido contra manipulación

    const currentTotalQty = _cart.filter(item => item.id === existing.id).reduce((acc, item) => acc + item.qty, 0);
    if (existing.controlarStock && currentTotalQty >= existing.stock) {
      if (triggerNotification) triggerNotification(`Límite en carrito: Solo hay ${existing.stock} en stock.`, 'warning');
      return;
    }

    setCart(prev => prev.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty + 1 } : item));
  };

  // 5. PERRO GUARDIÁN (WebSockets)
  useEffect(() => {
    const handleStockAdjustment = (updates) => {
      setCart(prevCart => {
        let modifiedCart = [...prevCart];
        let notificationsToFire = new Set();

        // Actualizamos stock localmente
        modifiedCart = modifiedCart.map(item => {
          const update = updates.find(u => u.id === item.id);
          return update ? { ...item, stock: update.stock } : item;
        });

        for (const update of updates) {
          const itemsOfProduct = modifiedCart.filter(i => i.id === update.id);
          if (itemsOfProduct.length === 0 || !itemsOfProduct[0].controlarStock) continue;

          let currentTotalQty = itemsOfProduct.reduce((sum, i) => sum + i.qty, 0);
          
          if (currentTotalQty > update.stock) {
            if (update.stock === 0) {
              notificationsToFire.add({ msg: `Un producto de tu carrito se agotó y fue removido.`, type: 'error' });
              modifiedCart = modifiedCart.filter(i => i.id !== update.id);
            } else {
              notificationsToFire.add({ msg: `Ajustamos la cantidad de un producto por disponibilidad.`, type: 'warning' });
              for (let i = modifiedCart.length - 1; i >= 0; i--) {
                const item = modifiedCart[i];
                if (item.id === update.id) {
                  const excess = currentTotalQty - update.stock;
                  if (excess >= item.qty) {
                    currentTotalQty -= item.qty;
                    modifiedCart.splice(i, 1);
                  } else {
                    modifiedCart[i] = { ...item, qty: item.qty - excess };
                    currentTotalQty -= excess;
                  }
                  if (currentTotalQty <= update.stock) break;
                }
              }
            }
          }
        }

        if (triggerNotification) {
          setTimeout(() => {
            notificationsToFire.forEach(notif => triggerNotification(notif.msg, notif.type));
          }, 0);
        }
        return modifiedCart;
      });
    };

    socket.on('stock:update', handleStockAdjustment);
    return () => socket.off('stock:update', handleStockAdjustment);
  }, [triggerNotification, promotions]); 

  // 6. TOTALES
  const totalCart = useMemo(() => 
    _cart.reduce((acc, item) => acc + ((item.precioUnitario || 0) * (item.qty || 0)), 0), 
  [_cart]);

  const totalItems = useMemo(() => 
    _cart.reduce((acc, item) => acc + (item.qty || 0), 0), 
  [_cart]);

  return {
    cart: _cart,
    setCart,
    addToCart,
    removeFromCart,
    incrementInCart,
    totalCart,
    totalItems
  };
};