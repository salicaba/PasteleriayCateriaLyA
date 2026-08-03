// frontend/src/modules/client/controllers/useClientCart.js
import { useState, useMemo, useEffect, useRef } from 'react';
import { socket } from '../../../api/socket.js';
import api from '../../../api/client.js';

// 🔥 Inyectamos el helper para obtener los detalles base del Gestor de Menú
import { getDefaultCustomizations } from '../views/utils/clientMenuUtils';

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
  const notifiedPromos = useRef({});

  const [promoWarning, setPromoWarning] = useState({
    isOpen: false, message: '', onConfirm: null, onCancel: null
  });

  // 1. CARGA INICIAL Y ESCUCHA DE SOCKETS
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

    // 🔥 FIX: Suscripción exacta al canal del backend
    socket.on('menu:promotions_updated', handlePromoUpdate);
    socket.on('pos:update', handlePromoUpdate); // Refresco por si apagan el producto base

    return () => {
      socket.off('menu:promotions_updated', handlePromoUpdate);
      socket.off('pos:update', handlePromoUpdate);
    };
  }, []);

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

  const getPromoBadge = (productId, originalPrice = 0) => {
    const activePromo = getActivePromo(productId, null, false, promotions);
    if (!activePromo) return null;
    
    let text = 'OFERTA';
    if (activePromo.type === 'NxM') text = `${activePromo.buyQty}x${activePromo.payQty}`;
    if (activePromo.type === 'NTH_FIXED') text = `${activePromo.buyQty}º a $${activePromo.discountValue}`;
    
    if (activePromo.type === 'FIXED') {
      const discountVal = Number(activePromo.discountValue || 0);
      
      if (originalPrice > 0 && discountVal < originalPrice) {
        const discountPercentage = Math.round((1 - (discountVal / originalPrice)) * 100);
        text = `-${discountPercentage}% OFF`;
      } else {
        text = `A $${discountVal}`;
      }
    }
    
    return {
      text,
      type: activePromo.type,
      discountValue: Number(activePromo.discountValue || 0)
    };
  };

  const syncPromotions = (cartState, promosList) => {
    let cleanCart = [...cartState];
    const normalQtys = {};
    const ghostQtys = {};
    const normalItemsMap = {};

    cleanCart.forEach(item => {
      const key = String(item.id);
      const isTrueGhost = item.isAutoPromo && item.promoLabel !== 'OFERTA';
      
      if (isTrueGhost || Number(item.precioUnitario) === 0) {
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
          ghostLabel = 'GRATIS';
        } else if (activePromo.type === 'NTH_FIXED') {
          const nth = Number(activePromo.buyQty || 2);
          const totalItems = (normalQtys[productId] || 0) + (ghostQtys[productId] || 0);
          expectedGhosts = Math.floor(totalItems / nth);
          ghostPrice = Number(activePromo.discountValue || 0);
          ghostLabel = `${nth}º REBAJADO`;
        }
      }

      const currentGhosts = ghostQtys[productId] || 0;

      if (currentGhosts > expectedGhosts) {
        let toRemove = currentGhosts - expectedGhosts;
        for (let i = cleanCart.length - 1; i >= 0; i--) {
          const item = cleanCart[i];
          const isTrueGhost = item.isAutoPromo && item.promoLabel !== 'OFERTA';

          if ((isTrueGhost || Number(item.precioUnitario) === 0) && String(item.id) === String(productId)) {
            
            if (activePromo?.type === 'NTH_FIXED' || (item.promoLabel && item.promoLabel.includes('º REBAJADO'))) {
              const originalPrice = item.precioOriginal || item.precioUnitario;
              const detailStr = JSON.stringify(item.detalles || {});
              const takeawayStr = item.isTakeaway ? '-llevar' : '';
              const normalCartItemId = `${item.id}-${detailStr}${takeawayStr}`;
              const existingNormalIdx = cleanCart.findIndex(p => p.cartItemId === normalCartItemId && !p.isAutoPromo);

              if (toRemove >= item.qty) {
                toRemove -= item.qty;
                if (existingNormalIdx !== -1 && existingNormalIdx !== i) {
                  cleanCart[existingNormalIdx] = { ...cleanCart[existingNormalIdx], qty: cleanCart[existingNormalIdx].qty + item.qty };
                  cleanCart.splice(i, 1);
                } else {
                  cleanCart[i] = { ...item, cartItemId: normalCartItemId, precioUnitario: originalPrice, isAutoPromo: false, promoLabel: undefined, precioOriginal: undefined, promoId: undefined, promoType: undefined };
                }
              } else {
                cleanCart[i] = { ...item, qty: item.qty - toRemove };
                if (existingNormalIdx !== -1) {
                  cleanCart[existingNormalIdx] = { ...cleanCart[existingNormalIdx], qty: cleanCart[existingNormalIdx].qty + toRemove };
                } else {
                  const revertedItem = { ...item, cartItemId: normalCartItemId, qty: toRemove, precioUnitario: originalPrice, isAutoPromo: false, promoLabel: undefined, precioOriginal: undefined, promoId: undefined, promoType: undefined };
                  cleanCart.push(revertedItem);
                }
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
      else if (currentGhosts < expectedGhosts && activePromo && sampleItem) {
        let missing = expectedGhosts - currentGhosts;

        if (activePromo.type === 'NTH_FIXED') {
          for (let i = cleanCart.length - 1; i >= 0; i--) {
            const item = cleanCart[i];
            if (!item.isAutoPromo && Number(item.precioUnitario) > 0 && String(item.id) === String(productId)) {
              
              const baseOriginal = parseFloat(item.precioBase || item.precio || 0);
              const costoExtras = parseFloat(item.precioOriginal || item.precioUnitario) - baseOriginal;
              const finalGhostPrice = ghostPrice + (costoExtras > 0 ? costoExtras : 0);

              const detailStr = JSON.stringify(item.detalles || {});
              const takeawayStr = item.isTakeaway ? '-llevar' : '';
              const promoCartItemId = `${item.id}-${detailStr}${takeawayStr}-promo`;
              const existingPromoIdx = cleanCart.findIndex(p => p.cartItemId === promoCartItemId && p.isAutoPromo);

              const promoMetadata = { promoId: activePromo.id, promoType: activePromo.type };

              if (item.qty <= missing) {
                missing -= item.qty;
                if (existingPromoIdx !== -1 && existingPromoIdx !== i) {
                  cleanCart[existingPromoIdx] = { ...cleanCart[existingPromoIdx], qty: cleanCart[existingPromoIdx].qty + item.qty };
                  cleanCart.splice(i, 1);
                } else {
                  cleanCart[i] = { ...item, cartItemId: promoCartItemId, precioOriginal: item.precioUnitario, precioUnitario: finalGhostPrice, isAutoPromo: true, promoLabel: ghostLabel, ...promoMetadata };
                }
              } else {
                cleanCart[i] = { ...item, qty: item.qty - missing };
                if (existingPromoIdx !== -1) {
                  cleanCart[existingPromoIdx] = { ...cleanCart[existingPromoIdx], qty: cleanCart[existingPromoIdx].qty + missing };
                } else {
                  const convertedItem = { ...item, cartItemId: promoCartItemId, qty: missing, precioOriginal: item.precioUnitario, precioUnitario: finalGhostPrice, isAutoPromo: true, promoLabel: ghostLabel, ...promoMetadata };
                  cleanCart.push(convertedItem);
                }
                missing = 0;
              }
              if (missing === 0) break;
            }
          }
        } else if (activePromo.type === 'NxM') {
          let ghostOriginalPrice = parseFloat(sampleItem.precioBase || sampleItem.precioOriginal || sampleItem.precioUnitario || sampleItem.precio || 0);
          let ghostDetails = null;

          const defaultCustoms = getDefaultCustomizations(sampleItem);
          if (defaultCustoms) {
              ghostDetails = defaultCustoms.detalles;
              if (defaultCustoms.precioFinal) {
                  ghostOriginalPrice = defaultCustoms.precioFinal;
              }
          }
          
          const existingGhostIdx = cleanCart.findIndex(i => 
            String(i.id) === String(productId) && 
            i.isAutoPromo === true && 
            i.promoLabel === ghostLabel
          );

          if (existingGhostIdx !== -1) {
            cleanCart[existingGhostIdx] = {
              ...cleanCart[existingGhostIdx],
              qty: cleanCart[existingGhostIdx].qty + missing
            };
          } else {
            cleanCart.push({
              ...sampleItem,
              cartItemId: `${sampleItem.id}-ghost-promo`, 
              precioOriginal: ghostOriginalPrice,
              precioUnitario: 0,
              promoLabel: ghostLabel,
              qty: missing,
              isAutoPromo: true,
              detalles: ghostDetails,
              promoId: activePromo.id,
              promoType: activePromo.type
            });
          }
        }
      }
    });

    cleanCart = cleanCart.map(item => {
      if (item.isAutoPromo && item.promoLabel !== 'OFERTA') return item; 
      const activePromo = getActivePromo(item.id, item.stock, item.controlarStock, promosList);
      
      if (activePromo && activePromo.type === 'FIXED') {
        const baseOriginal = parseFloat(item.precioBase || item.precio || 0);
        const discountFixed = Number(activePromo.discountValue || 0);
        
        const costoExtras = parseFloat(item.precioOriginal || item.precioUnitario) - baseOriginal;
        const expectedPrice = discountFixed + (costoExtras > 0 ? costoExtras : 0);

        if (item.precioUnitario !== expectedPrice) {
          return { 
            ...item, 
            precioOriginal: item.precioOriginal || item.precioUnitario, 
            precioUnitario: expectedPrice, 
            promoLabel: 'OFERTA', 
            isAutoPromo: true,
            promoId: activePromo.id,
            promoType: activePromo.type 
          };
        }
      } else if (item.promoLabel === 'OFERTA' && (!activePromo || activePromo.type !== 'FIXED')) {
        return { 
          ...item, 
          precioUnitario: item.precioOriginal || item.precioUnitario, 
          precioOriginal: undefined, 
          promoLabel: undefined, 
          isAutoPromo: false,
          promoId: undefined,
          promoType: undefined 
        };
      }
      return item;
    });

    const currentPromoQtys = {};
    cleanCart.forEach(item => {
      if (item.isAutoPromo && item.promoId) {
        currentPromoQtys[item.promoId] = (currentPromoQtys[item.promoId] || 0) + item.qty;
      }
    });

    if (triggerNotification) {
      Object.keys(currentPromoQtys).forEach(promoId => {
        const newQty = currentPromoQtys[promoId];
        const oldQty = notifiedPromos.current[promoId] || 0;

        if (newQty > oldQty) {
          const promoItem = cleanCart.find(item => item.promoId === promoId);
          const multiplierText = newQty > 1 ? ` x${newQty}` : '';
          
          setTimeout(() => {
            if (promoItem.promoType === 'NxM') {
              triggerNotification(`Promo Activada: ¡${promoItem.nombre} GRATIS!${multiplierText}`, 'success');
            } else if (promoItem.promoType === 'NTH_FIXED') {
              triggerNotification(`Descuento aplicado en ${promoItem.nombre}${multiplierText}`, 'success');
            } else if (promoItem.promoType === 'FIXED') {
              triggerNotification(`Rebaja directa en ${promoItem.nombre}${multiplierText}`, 'success');
            }
          }, 50);
        }
      });
      notifiedPromos.current = currentPromoQtys;
    }

    return cleanCart;
  };

  // 🔥 EL CEREBRO DE LA REACTIVIDAD: Auto-sincronización del carrito
  // Si las promociones cambian en el servidor, recalcula el carrito de forma pasiva e instantánea.
  useEffect(() => {
    _setCart(prevCart => {
      if (prevCart.length === 0) return prevCart;
      return syncPromotions(prevCart, promotions);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promotions]); 

  const setCart = (action) => {
    _setCart(prev => {
      const nextCart = typeof action === 'function' ? action(prev) : action;
      return syncPromotions(nextCart, promotions);
    });
  };

  const checkRuptureAndExecute = (actionToCalculateNextCart) => {
    setCart(prev => {
      const nextCart = actionToCalculateNextCart(prev);
      let needsWarning = false;
      let ruptureProductName = '';

      const getNormalQtys = (cartState) => {
        const qtys = {};
        cartState.forEach(item => {
          const isTrueGhost = item.isAutoPromo && item.promoLabel !== 'OFERTA';
          if (isTrueGhost || Number(item.precioUnitario) === 0) return;
          const key = String(item.id);
          qtys[key] = (qtys[key] || 0) + item.qty;
        });
        return qtys;
      };

      const prevQtys = getNormalQtys(prev);
      const nextQtys = getNormalQtys(nextCart);

      for (const key of Object.keys(prevQtys)) {
        const productId = key;
        const sampleItem = prev.find(p => String(p.id) === String(productId));
        const activePromo = getActivePromo(productId, sampleItem?.stock, sampleItem?.controlarStock, promotions);

        if (activePromo) {
           let prevExpectedGhosts = 0;
           let nextExpectedGhosts = 0;
           const currentGhosts = prev.filter(p => String(p.id) === String(productId) && (p.isAutoPromo && p.promoLabel !== 'OFERTA')).reduce((a, b) => a + b.qty, 0);

           if (activePromo.type === 'NTH_FIXED') {
              const nth = Number(activePromo.buyQty || 2);
              prevExpectedGhosts = Math.floor((prevQtys[key] || 0) / (nth - 1));
              nextExpectedGhosts = Math.floor((nextQtys[key] || 0) / (nth - 1));
           } else if (activePromo.type === 'NxM') {
              const buy = Number(activePromo.buyQty || 2);
              const pay = Number(activePromo.payQty || 1);
              prevExpectedGhosts = Math.floor((prevQtys[key] || 0) / pay) * (buy - pay);
              nextExpectedGhosts = Math.floor((nextQtys[key] || 0) / pay) * (buy - pay);
           }

           if (activePromo.type === 'NTH_FIXED' || activePromo.type === 'NxM') {
               if (nextExpectedGhosts < currentGhosts && nextExpectedGhosts < prevExpectedGhosts) {
                 needsWarning = true;
                 ruptureProductName = prev.find(p => String(p.id) === String(productId))?.nombre || 'Producto';
                 break;
               }
           }
        }
      }

      if (needsWarning) {
        setPromoWarning({
          isOpen: true,
          message: `Al reducir esta cantidad, perderás la promoción vigente en "${ruptureProductName}". El artículo de regalo/descuento será eliminado. ¿Deseas continuar?`,
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

  const addToCart = (product, customizations = null) => {
    if (isProcessingRef.current) return false;
    isProcessingRef.current = true;

    try {
      const currentTotalQty = _cart.filter(item => item.id === product.id).reduce((acc, item) => acc + item.qty, 0);

      if (product.controlarStock && currentTotalQty >= product.stock) {
        if (triggerNotification) triggerNotification(`Límite alcanzado: Solo hay ${product.stock} en stock.`, 'warning');
        return false;
      }

      setCart(prev => {
        let newItem = { ...product, qty: 1, precioUnitario: product.precio, precioBase: product.precio, isAutoPromo: false };
        let uniqueCartId = product.id.toString();

        if (customizations) {
          newItem = { ...newItem, precioUnitario: customizations.precioFinal, detalles: customizations.detalles, isTakeaway: customizations.isTakeaway };
          const detailStr = JSON.stringify(customizations.detalles) + (customizations.isTakeaway ? '-llevar' : '');
          uniqueCartId = `${product.id}-${detailStr}`;
        }

        newItem.cartItemId = uniqueCartId;
        
        const existing = prev.find(item => item.cartItemId === uniqueCartId && (!item.isAutoPromo || item.promoLabel === 'OFERTA'));
        
        if (existing) {
          return prev.map(item => item.cartItemId === uniqueCartId && (!item.isAutoPromo || item.promoLabel === 'OFERTA') ? { ...item, qty: item.qty + 1 } : item);
        }
        return [...prev, newItem];
      });
      
      return true;
    } finally {
      isProcessingRef.current = false;
    }
  };

  const removeFromCart = (cartItemId) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      checkRuptureAndExecute(prev => {
        const existing = prev.find(item => item.cartItemId === cartItemId);
        if (!existing || (existing.isAutoPromo && existing.promoLabel !== 'OFERTA')) return prev; 
        
        if (existing.qty === 1) return prev.filter(item => item.cartItemId !== cartItemId);
        return prev.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty - 1 } : item);
      });
    } finally {
      isProcessingRef.current = false;
    }
  };

  const deleteLine = (cartItemId) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      checkRuptureAndExecute(prev => {
        const existing = prev.find(item => item.cartItemId === cartItemId);
        if (!existing || (existing.isAutoPromo && existing.promoLabel !== 'OFERTA')) return prev; 
        
        const baseId = String(cartItemId).replace('-promo', '');
        return prev.filter(item => String(item.cartItemId).replace('-promo', '') !== baseId);
      });
    } finally {
      isProcessingRef.current = false;
    }
  };

  const incrementInCart = (cartItemId) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const existing = _cart.find(item => item.cartItemId === cartItemId);
      if (!existing || (existing.isAutoPromo && existing.promoLabel !== 'OFERTA')) return; 

      const currentTotalQty = _cart.filter(item => item.id === existing.id).reduce((acc, item) => acc + item.qty, 0);
      if (existing.controlarStock && currentTotalQty >= existing.stock) {
        if (triggerNotification) triggerNotification(`Límite alcanzado: Solo hay ${existing.stock} en stock.`, 'warning');
        return;
      }

      setCart(prev => prev.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty + 1 } : item));
    } finally {
      isProcessingRef.current = false;
    }
  };

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
    deleteLine,
    totalCart,
    totalItems,
    getPromoBadge,
    promoWarning,
    confirmPromoRupture: () => promoWarning.onConfirm && promoWarning.onConfirm(),
    cancelPromoRupture: () => promoWarning.onCancel && promoWarning.onCancel()
  };
};