// src/modules/client/controllers/useClientCart.js
import { useState, useMemo, useEffect, useRef } from 'react';
import { socket } from '../../../api/socket.js';
import api from '../../../api/client.js';
import { getDefaultCustomizations } from '../views/utils/clientMenuUtils';

const parseValidDays = (daysData) => {
  if (!daysData) return [];
  if (Array.isArray(daysData)) return daysData.map(Number);
  if (typeof daysData === 'string') {
    try { return JSON.parse(daysData).map(Number); } 
    catch (e) { return daysData.replace(/[\[\]]/g, '').split(',').map(n => Number(n.trim())); }
  }
  return [];
};

const getConfirmedItems = () => {
  try {
    const saved = localStorage.getItem('lya_client_snapshot');
    if (saved) {
      const parsed = JSON.parse(saved);
      return (parsed.items || []).filter(i => i.status !== 'CANCELLED');
    }
  } catch(e) {}
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

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const res = await api.get('/promotions');
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : (raw?.data || raw?.promotions || []);
        
        const nowInChiapasStr = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
        const today = new Date(nowInChiapasStr).getDay();

        const activeToday = list.filter(p => {
          const rawActive = p.isActive ?? p.is_active ?? p.status;
          if (rawActive !== true && rawActive !== 1 && rawActive !== 'true' && rawActive !== '1') return false;
          
          const validDays = parseValidDays(p.validDays || p.valid_days);
          return validDays.length === 0 || validDays.includes(today);
        });

        setPromotions(activeToday);
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
    socket.on('pos:update', handlePromoUpdate);

    return () => {
      socket.off('menu:promotions_updated', handlePromoUpdate);
      socket.off('promotion_created', handlePromoUpdate);
      socket.off('promotion_updated', handlePromoUpdate);
      socket.off('promotion_deleted', handlePromoUpdate);
      socket.off('pos:update', handlePromoUpdate);
    };
  }, []);

  const getPromoBadge = (productId, originalPrice = 0) => {
    const promo = promotions.find(p => (p.applyToProducts || []).includes(productId));
    if (!promo) return null;
    
    let text = 'OFERTA';
    if (promo.type === 'NxM') text = `${promo.buyQty}x${promo.payQty}`;
    if (promo.type === 'BOGO') text = `COMPRA ${promo.buyQty} LLEVA PREMIO`;
    if (promo.type === 'NTH_FIXED') text = `${promo.buyQty}º a $${promo.discountValue}`;
    if (promo.type === 'COMBO') text = `EN COMBO`;
    
    if (promo.type === 'FIXED') {
      const discountVal = Number(promo.discountValue || 0);
      if (originalPrice > 0 && discountVal < originalPrice) {
        const discountPercentage = Math.round((1 - (discountVal / originalPrice)) * 100);
        text = `-${discountPercentage}% OFF`;
      } else {
        text = `-$${discountVal}`;
      }
    }
    
    return {
      text,
      type: promo.type,
      discountValue: Number(promo.discountValue || 0)
    };
  };

  const syncPromotions = (cartState, promosList) => {
    if (!promosList || !promosList.length) return cartState;

    let freshCart = [];
    cartState.forEach(item => {
        if (item.status === 'CANCELLED') { freshCart.push(item); return; }
        if (item.isAutoPromo && item.precioOriginal !== undefined && Number(item.precioUnitario) === 0 && item.promoLabel !== 'PREMIO') return;

        let restoredItem = { ...item };
        if (item.isAutoPromo && item.precioOriginal !== undefined) {
            restoredItem.precioUnitario = item.precioOriginal;
            restoredItem.precioOriginal = undefined;
            restoredItem.promoLabel = undefined;
            restoredItem.isAutoPromo = false;
            restoredItem.promoId = undefined;
        }
        freshCart.push(restoredItem);
    });

    const confirmedItems = getConfirmedItems().map(i => ({ ...i, _isConfirmed: true }));
    
    let expandedFresh = [];
    freshCart.forEach(item => {
        if (item.status === 'CANCELLED') { expandedFresh.push(item); return; }
        for(let i=0; i<item.qty; i++) expandedFresh.push({ ...item, qty: 1, _isConfirmed: false });
    });

    let expandedConfirmed = [];
    confirmedItems.forEach(item => {
        if (item.status === 'CANCELLED') return;
        for(let i=0; i<item.qty; i++) expandedConfirmed.push({ ...item, qty: 1, _isConfirmed: true });
    });

    let allItems = [...expandedConfirmed, ...expandedFresh.filter(i => i.status !== 'CANCELLED')];
    allItems.sort((a,b) => Number(b.precioUnitario) - Number(a.precioUnitario));

    let newlyAppliedPromos = new Set();

    promosList.forEach(promo => {
        const applyTo = promo.applyToProducts || [];
        const rewards = promo.rewardProducts || [];
        const buyQty = Number(promo.buyQty || 1);
        const payQty = Number(promo.payQty || 1);
        const discountVal = Number(promo.discountValue || 0);

        if (promo.type === 'BOGO') {
            let triggers = allItems.filter(i => !i._promoLocked && applyTo.includes(i.id));
            let rewardPool = allItems.filter(i => !i._promoLocked && rewards.includes(i.id));

            while(triggers.length >= buyQty && rewardPool.length >= payQty) {
                for(let i=0; i<buyQty; i++) triggers[i]._promoLocked = true;
                let cheapRewards = [...rewardPool].reverse();
                for(let i=0; i<payQty; i++) {
                    let r = cheapRewards[i];
                    if (!r._isConfirmed) {
                        r.precioOriginal = r.precioUnitario;
                        r.precioUnitario = discountVal;
                        r.isAutoPromo = true;
                        r.promoLabel = 'PREMIO';
                        r.promoId = promo.id;
                    }
                    r._promoLocked = true;
                }
                newlyAppliedPromos.add(promo.id);
                triggers = allItems.filter(i => !i._promoLocked && applyTo.includes(i.id));
                rewardPool = allItems.filter(i => !i._promoLocked && rewards.includes(i.id));
            }
        }

        // 🔥 MAGIA DE AUTO-AGREGADO (NxM) PARA EL CLIENTE
        if (promo.type === 'NxM') {
            let eligible = allItems.filter(i => !i._promoLocked && applyTo.includes(i.id));
            while(eligible.length >= payQty) {
                for(let i=0; i<payQty; i++) eligible[i]._promoLocked = true;
                
                let missingGhosts = buyQty - payQty;
                let ghostCandidates = allItems.filter(i => !i._promoLocked && applyTo.includes(i.id));
                
                for(let i=0; i<missingGhosts; i++) {
                    if (ghostCandidates.length > 0) {
                        let r = ghostCandidates[0];
                        if (!r._isConfirmed) {
                            r.precioOriginal = r.precioUnitario;
                            r.precioUnitario = 0;
                            r.isAutoPromo = true;
                            r.promoLabel = 'GRATIS';
                            r.promoId = promo.id;
                        }
                        r._promoLocked = true;
                        ghostCandidates.shift();
                    } else {
                        const template = eligible[0];
                        allItems.push({
                            ...template,
                            cartItemId: template.cartItemId, // Usa la misma firma para agruparse mágicamente
                            precioOriginal: template.precioUnitario,
                            precioUnitario: 0,
                            isAutoPromo: true,
                            promoLabel: 'GRATIS',
                            promoId: promo.id,
                            _promoLocked: true,
                            _isConfirmed: false 
                        });
                    }
                }
                newlyAppliedPromos.add(promo.id);
                eligible = allItems.filter(i => !i._promoLocked && applyTo.includes(i.id));
            }
        }
        
        if (promo.type === 'NTH_FIXED') {
            let eligible = allItems.filter(i => !i._promoLocked && applyTo.includes(i.id));
            while (eligible.length >= buyQty) {
                for(let i=0; i < buyQty - 1; i++) eligible[i]._promoLocked = true;
                let lastItem = eligible[buyQty - 1];
                if (!lastItem._isConfirmed) {
                    lastItem.precioOriginal = lastItem.precioUnitario;
                    lastItem.precioUnitario = Math.max(0, Number(lastItem.precioUnitario) - discountVal);
                    lastItem.isAutoPromo = true;
                    lastItem.promoLabel = 'REBAJA';
                    lastItem.promoId = promo.id;
                }
                lastItem._promoLocked = true;
                newlyAppliedPromos.add(promo.id);
                eligible = allItems.filter(i => !i._promoLocked && applyTo.includes(i.id));
            }
        }

        if (promo.type === 'COMBO') {
            const hasAll = applyTo.every(id => allItems.some(i => !i._promoLocked && i.id === id));
            if (hasAll) {
                let comboItems = [];
                let originalComboTotal = 0;
                applyTo.forEach(id => {
                    const item = allItems.find(i => !i._promoLocked && i.id === id);
                    if(item) {
                        comboItems.push(item);
                        originalComboTotal += Number(item.precioUnitario);
                        item._promoLocked = true;
                    }
                });
                comboItems.forEach(item => {
                    if (!item._isConfirmed) {
                        item.precioOriginal = item.precioUnitario;
                        item.precioUnitario = (Number(item.precioUnitario) / originalComboTotal) * discountVal;
                        item.isAutoPromo = true;
                        item.promoLabel = 'COMBO';
                        item.promoId = promo.id;
                    }
                });
                newlyAppliedPromos.add(promo.id);
            }
        }

        if (promo.type === 'FIXED') {
            let eligible = allItems.filter(i => !i._promoLocked && !i._isConfirmed && applyTo.includes(i.id));
            eligible.forEach(item => {
                item.precioOriginal = item.precioUnitario;
                item.precioUnitario = Math.max(0, Number(item.precioUnitario) - discountVal);
                item.isAutoPromo = true;
                item.promoLabel = 'OFERTA';
                item.promoId = promo.id;
                item._promoLocked = true;
            });
            if (eligible.length > 0) newlyAppliedPromos.add(promo.id);
        }
    });

    let finalUnconfirmed = [];
    let activeExpanded = allItems.filter(i => !i._isConfirmed && i.status !== 'CANCELLED');
    
    activeExpanded.forEach(item => {
        const existing = finalUnconfirmed.find(g => 
            g.cartItemId === item.cartItemId &&
            Number(g.precioUnitario).toFixed(2) === Number(item.precioUnitario).toFixed(2) && 
            g.isAutoPromo === item.isAutoPromo &&
            g.promoId === item.promoId
        );

        if (existing) {
            existing.qty += 1;
        } else {
            delete item._promoLocked;
            delete item._isConfirmed;
            finalUnconfirmed.push({ ...item, qty: 1 });
        }
    });

    const ticketPromo = promosList.find(p => p.type === 'TICKET_DISCOUNT');
    if (ticketPromo) {
        const minAmount = Number(ticketPromo.minTicketAmount || 0);
        const discountVal = Number(ticketPromo.discountValue || 0);
        
        const confirmedTotal = expandedConfirmed.reduce((sum, i) => sum + Number(i.precioUnitario), 0);
        const unconfirmedTotal = finalUnconfirmed.reduce((sum, i) => sum + (Number(i.precioUnitario) * i.qty), 0);
        const globalTotal = confirmedTotal + unconfirmedTotal;

        if (globalTotal >= minAmount && unconfirmedTotal > 0) {
            finalUnconfirmed.forEach(item => {
                const weight = (Number(item.precioUnitario) * item.qty) / unconfirmedTotal;
                const discountShare = (discountVal * weight) / item.qty;
                if (!item.precioOriginal) item.precioOriginal = item.precioUnitario;
                item.precioUnitario = Math.max(0, Number(item.precioUnitario) - discountShare);
                item.isAutoPromo = true;
                item.promoLabel = 'DESC. TOTAL';
                item.promoId = ticketPromo.id;
            });
            newlyAppliedPromos.add(ticketPromo.id);
        }
    }

    const cancelledItems = freshCart.filter(i => i.status === 'CANCELLED');
    let newCartState = [...finalUnconfirmed, ...cancelledItems];

    if (triggerNotification) {
        newlyAppliedPromos.forEach(promoId => {
            if (!notifiedPromos.current[promoId]) {
                const promoInfo = promosList.find(p => p.id === promoId);
                setTimeout(() => triggerNotification(`¡Promo Aplicada Automáticamente! ${promoInfo?.name || 'Oferta'}`, 'success'), 50);
                notifiedPromos.current[promoId] = true;
            }
        });
        
        Object.keys(notifiedPromos.current).forEach(id => {
           if (!newlyAppliedPromos.has(id)) delete notifiedPromos.current[id];
        });
    }

    return newCartState;
  };

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

  const checkRuptureAndExecute = (actionToCalculateRawNextCart) => {
    _setCart(prev => {
      const rawNextCart = actionToCalculateRawNextCart(prev);
      const futureCart = syncPromotions(rawNextCart, promotions);
      
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

  const removeFromCart = (cartItemIdOrObj) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      let cartItemId = typeof cartItemIdOrObj === 'object' ? cartItemIdOrObj.cartItemId : cartItemIdOrObj;
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

  const deleteLine = (cartItemIdOrObj) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      let cartItemId = typeof cartItemIdOrObj === 'object' ? cartItemIdOrObj.cartItemId : cartItemIdOrObj;
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

  useEffect(() => {
    const handleStockAdjustment = (updates) => {
      setCart(prevCart => {
        let modifiedCart = [...prevCart];
        let notificationsToFire = new Set();

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