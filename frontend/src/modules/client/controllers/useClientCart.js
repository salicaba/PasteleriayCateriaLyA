// frontend/src/modules/client/controllers/useClientCart.js
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

export const useClientCart = (triggerNotification) => {
  const [_cart, _setCart] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const isProcessingRef = useRef(false);

  const [pendingPromoReward, setPendingPromoReward] = useState(null);
  const [suspendedPromos, setSuspendedPromos] = useState([]);
  const alertedPromosRef = useRef(new Set());

  const [promoWarning, setPromoWarning] = useState({
    isOpen: false, message: '', onConfirm: null, onCancel: null
  });

  // 1. CARGA INICIAL Y LISTENERS DE PROMO POR SOCKET
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
    socket.on('pos:update', handlePromoUpdate);

    return () => {
      socket.off('menu:promotions_updated', handlePromoUpdate);
      socket.off('promotion_created', handlePromoUpdate);
      socket.off('promotion_updated', handlePromoUpdate);
      socket.off('promotion_deleted', handlePromoUpdate);
      socket.off('pos:update', handlePromoUpdate);
    };
  }, []);

  const getActivePromo = (productId, currentStock = null, controlarStock = false) => {
    if (!promotions || promotions.length === 0) return null;
    
    // Blindaje de zona horaria para promociones
    const nowInChiapasStr = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
    const today = new Date(nowInChiapasStr).getDay();

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

  const getPromoBadge = (productId, originalPrice = 0) => {
    const activePromo = getActivePromo(productId, null, false);
    if (!activePromo) return null;
    
    let text = 'OFERTA';
    if (activePromo.type === 'NxM') text = `${activePromo.buyQty}x${activePromo.payQty}`;
    if (activePromo.type === 'NTH_FIXED') text = `${activePromo.buyQty}º a $${activePromo.discountValue}`;
    if (activePromo.type === 'COMBO') text = `COMBO APLICA`;
    
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

  const claimPromoReward = (baseProduct, promo, qty, customizations = null) => {
    const finalDetails = customizations?.detalles || getDefaultCustomizations(baseProduct)?.detalles || {};
    const ghostOriginalPrice = customizations?.precioFinal || baseProduct.precioBase || baseProduct.precio || 0;

    const finalPromoPrice = (() => {
        if (promo.type === 'BOGO') {
            return parseFloat(promo.discountValue || promo.discount_value || 0);
        } else if (promo.type === 'NTH_FIXED') {
            const rawDiscount = parseFloat(promo.discountValue || promo.discount_value || 0);
            return Math.max(0, ghostOriginalPrice - rawDiscount); 
        }
        return 0; 
    })();

    const promoLabelStr = finalPromoPrice === 0 ? 'GRATIS' : 'PROMO';
    const cartItemId = `${baseProduct.id}-${JSON.stringify(finalDetails)}-promo-${promo.id}`;

    setCart(prev => {
        const newCart = [...prev];
        const existingGhostIdx = newCart.findIndex(p => p.cartItemId === cartItemId && p.isAutoPromo);

        if (existingGhostIdx !== -1) {
            newCart[existingGhostIdx] = { 
                ...newCart[existingGhostIdx], 
                qty: newCart[existingGhostIdx].qty + qty
            };
        } else {
            newCart.push({
                ...baseProduct,
                cartItemId,
                precioOriginal: ghostOriginalPrice,
                precioUnitario: finalPromoPrice,
                qty: qty,
                detalles: finalDetails,
                status: 'ACTIVE',
                isAutoPromo: true,
                promoLabel: promoLabelStr,
                promoId: promo.id,
                promoType: promo.type
            });
        }
        return newCart;
    });

    if (triggerNotification) {
        if (finalPromoPrice === 0) {
            triggerNotification(`Promo: ¡${baseProduct.nombre} GRATIS añadido a tu carrito!`, 'success');
        } else {
            triggerNotification(`Promo: ¡${baseProduct.nombre} añadido con descuento a $${finalPromoPrice.toFixed(2)}!`, 'success');
        }
    }
    setPendingPromoReward(null);
  };

  // 🔥 MOTOR MULTI-ETAPA: Pooling, Combos y Descuento por Ticket
  const syncPromotions = (cartState) => {
    let cleanCart = [...cartState];
    const promoGroups = {}; 

    cleanCart.forEach(item => {
        if (item.status === 'CANCELLED' || item.isVirtualDiscount) return;
        
        let activePromo = null;
        if (item.isAutoPromo && item.promoId) {
            activePromo = promotions.find(p => p.id === item.promoId);
        } else {
            activePromo = getActivePromo(item.id, item.stock, item.controlarStock);
        }
        
        if (activePromo && ['NxM', 'BOGO', 'NTH_FIXED', 'COMBO'].includes(activePromo.type)) {
            const key = String(activePromo.id);
            if (!promoGroups[key]) promoGroups[key] = { normalQty: 0, triggerQtys: {}, ghosts: [], activePromo };
            
            if (item.isAutoPromo && item.promoId === activePromo.id) {
                promoGroups[key].ghosts.push(item);
                if (activePromo.type === 'COMBO') {
                    promoGroups[key].triggerQtys[item.id] = (promoGroups[key].triggerQtys[item.id] || 0) + item.qty;
                }
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
        } else if (group.activePromo.type === 'NTH_FIXED') {
            const buyTotal = Number(group.activePromo.buyQty || 2);
            const normalReq = Math.max(1, buyTotal - 1);
            if (normalReq > 0) {
                expectedGhosts = Math.floor(group.normalQty / normalReq);
            }
        } else if (group.activePromo.type === 'COMBO') {
            const triggerIds = Array.isArray(group.activePromo.applyToProducts) ? group.activePromo.applyToProducts.map(String) : [];
            if (triggerIds.length > 0) {
                expectedGhosts = Math.min(...triggerIds.map(id => group.triggerQtys[id] || 0));
            }
        }

        const currentGhostQty = group.ghosts.reduce((sum, g) => sum + g.qty, 0);

        if (currentGhostQty > expectedGhosts) {
            let toRemove = currentGhostQty - expectedGhosts;
            for (let i = cleanCart.length - 1; i >= 0; i--) {
                const item = cleanCart[i];
                if (item.isAutoPromo && item.promoId === group.activePromo.id) {
                    if (item.qty <= toRemove) {
                        toRemove -= item.qty;
                        cleanCart.splice(i, 1);
                    } else {
                        cleanCart[i] = { ...item, qty: item.qty - toRemove };
                        toRemove = 0;
                    }
                }
                if (toRemove <= 0) break;
            }
        }
    });

    // EVALUACIÓN TICKET_DISCOUNT
    const ticketPromos = promotions.filter(p => {
        const rawActive = p.isActive ?? p.is_active ?? p.status;
        const isActive = rawActive === true || rawActive === 1 || rawActive === 'true' || rawActive === '1';
        const daysRaw = p.validDays || p.valid_days;
        const validDays = parseValidDays(daysRaw);
        const today = new Date().getDay();
        const validToday = validDays.length === 0 || validDays.includes(today);
        return isActive && validToday && p.type === 'TICKET_DISCOUNT';
    });

    if (ticketPromos.length > 0) {
        const itemsCuenta = cleanCart.filter(item => item.status !== 'CANCELLED' && item.promoType !== 'TICKET_DISCOUNT');
        const subtotalCuenta = itemsCuenta.reduce((acc, item) => acc + (item.precioUnitario * item.qty), 0);

        const qualifyingPromos = ticketPromos
            .filter(p => subtotalCuenta >= Number(p.minTicketAmount || p.min_ticket_amount || 0))
            .sort((a, b) => Number(b.minTicketAmount || b.min_ticket_amount || 0) - Number(a.minTicketAmount || a.min_ticket_amount || 0));

        const bestTicketPromo = qualifyingPromos[0];
        const ghostIdx = cleanCart.findIndex(item => item.promoType === 'TICKET_DISCOUNT');

        if (bestTicketPromo) {
            const rawDiscount = Number(bestTicketPromo.discountValue || bestTicketPromo.discount_value || 0);
            const isPercentage = bestTicketPromo.discountType === 'PERCENTAGE';
            
            let finalDiscountPrice = isPercentage ? (subtotalCuenta * (rawDiscount / 100)) : rawDiscount;
            finalDiscountPrice = -Math.abs(finalDiscountPrice); // Blindaje negativo

            if (ghostIdx !== -1) {
                if (cleanCart[ghostIdx].precioUnitario !== finalDiscountPrice || cleanCart[ghostIdx].promoId !== bestTicketPromo.id) {
                    cleanCart[ghostIdx] = {
                        ...cleanCart[ghostIdx],
                        nombre: bestTicketPromo.name || 'Descuento Global',
                        precioUnitario: finalDiscountPrice,
                        precioOriginal: finalDiscountPrice,
                        promoId: bestTicketPromo.id
                    };
                }
            } else {
                cleanCart.push({
                    id: `GLOBAL_DISCOUNT_${bestTicketPromo.id}`,
                    cartItemId: `GLOBAL_DISCOUNT_${bestTicketPromo.id}`,
                    nombre: bestTicketPromo.name || 'Descuento Extra',
                    precioOriginal: finalDiscountPrice,
                    precioUnitario: finalDiscountPrice,
                    qty: 1,
                    status: 'ACTIVE',
                    isAutoPromo: true,
                    isVirtualDiscount: true,
                    promoId: bestTicketPromo.id,
                    promoType: 'TICKET_DISCOUNT',
                    promoLabel: 'DESCUENTO APLICADO'
                });
            }
        } else {
            if (ghostIdx !== -1) {
                cleanCart.splice(ghostIdx, 1);
            }
        }
    }

    return cleanCart;
  };

  const setCart = (action) => {
    _setCart(prev => {
       const nextCart = typeof action === 'function' ? action(prev) : action;
       return syncPromotions(nextCart);
    });
  };

  const checkRuptureAndExecute = (actionToCalculateNextCart, explicitlyDeletedGhost = false) => {
    setCart(prev => {
      const rawNextCart = actionToCalculateNextCart(prev);
      const syncedNextCart = syncPromotions(rawNextCart);
      
      const ghostLabels = ['GRATIS', 'PROMO', 'DESCUENTO APLICADO'];
      const isNthOrCombo = (p) => p.promoLabel?.includes('º') || p.promoLabel?.includes('REBAJADO');
      
      const prevGhosts = prev.filter(p => p.isAutoPromo && (ghostLabels.includes(p.promoLabel) || isNthOrCombo(p))).reduce((sum, p) => sum + p.qty, 0);
      const nextGhosts = syncedNextCart.filter(p => p.isAutoPromo && (ghostLabels.includes(p.promoLabel) || isNthOrCombo(p))).reduce((sum, p) => sum + p.qty, 0);

      if (nextGhosts < prevGhosts && !explicitlyDeletedGhost) {
        setPromoWarning({
          isOpen: true,
          message: `Al reducir o eliminar este artículo, se romperá una promoción y perderás un beneficio asociado en tu carrito. ¿Deseas continuar?`,
          onConfirm: () => {
            _setCart(syncedNextCart); 
            setPromoWarning({ isOpen: false, message: '', onConfirm: null, onCancel: null });
          },
          onCancel: () => setPromoWarning({ isOpen: false, message: '', onConfirm: null, onCancel: null })
        });
        return prev; 
      }
      return rawNextCart;
    });
  };

  const addToCart = (product, customizations = null) => {
    if (isProcessingRef.current) return false;
    isProcessingRef.current = true;

    try {
      if (product.controlarStock) {
        const currentUnsent = _cart.filter(p => p.id === product.id && p.status !== 'CANCELLED').reduce((acc, item) => acc + item.qty, 0);
        if (currentUnsent + 1 > product.stock) {
            if (triggerNotification) triggerNotification(`Stock insuficiente. Solo quedan ${product.stock}.`, 'warning');
            return false; 
        }
      }

      const activePromo = getActivePromo(product.id, product.stock, product.controlarStock);
      
      let finalDetails = customizations?.detalles || {};
      let finalPrice = parseFloat(customizations?.precioFinal || product.precioBase || product.precio || 0);
      let isTakeaway = customizations?.isTakeaway || false;

      if (!customizations) {
        const defaultCustoms = getDefaultCustomizations(product);
        if (defaultCustoms) {
            finalDetails = defaultCustoms.detalles;
            finalPrice = defaultCustoms.precioFinal;
        }
      }

      const detailStr = JSON.stringify(finalDetails) + (isTakeaway ? '-llevar' : '');
      let uniqueCartId = `${product.id}-${detailStr}`;

      let rewardToTrigger = null;
      let autoClaimNxM = null;
      let upsellNotification = null;
      let successNotification = null;

      setCart(prev => {
        let newCart = [...prev];
        let isNthGhost = false;
        let finalPromoPrice = 0;
        let safeActivePromo = null;

        if (activePromo) {
            const safeDiscountValue = Number(activePromo.discountValue || activePromo.discount_value || 0);
            safeActivePromo = { ...activePromo, discountValue: safeDiscountValue };

            if (activePromo.type === 'NTH_FIXED') {
                const triggerIds = Array.isArray(activePromo.applyToProducts) && activePromo.applyToProducts.length > 0 
                    ? activePromo.applyToProducts.map(String) 
                    : [String(activePromo.productId || activePromo.product_id)];

                if (triggerIds.includes(String(product.id))) {
                    const normalQtyInAccount = prev.filter(p => triggerIds.includes(String(p.id)) && !p.isAutoPromo && p.status !== 'CANCELLED').reduce((a, b) => a + b.qty, 0);
                    const ghostQtyInAccount = prev.filter(p => p.isAutoPromo && p.promoId === activePromo.id && p.status !== 'CANCELLED').reduce((a, b) => a + b.qty, 0);
                    
                    const totalInCart = normalQtyInAccount + ghostQtyInAccount;
                    const buyTotal = Number(activePromo.buyQty || 2);

                    if ((totalInCart + 1) % buyTotal === 0) {
                        isNthGhost = true;
                        finalPromoPrice = Math.max(0, finalPrice - safeDiscountValue);
                    }
                }
            } 
            else if (activePromo.type === 'COMBO') {
                const triggerIds = Array.isArray(activePromo.applyToProducts) && activePromo.applyToProducts.length > 0 
                    ? activePromo.applyToProducts.map(String) : [];

                if (triggerIds.includes(String(product.id))) {
                    const currentBundles = Math.min(...triggerIds.map(id => 
                        prev.filter(p => String(p.id) === id && p.status !== 'CANCELLED').reduce((a,b)=>a+b.qty, 0)
                    ));

                    const triggerQtysAfter = {};
                    triggerIds.forEach(id => {
                        let qty = prev.filter(p => String(p.id) === id && p.status !== 'CANCELLED').reduce((a,b)=>a+b.qty, 0);
                        if (id === String(product.id)) qty += 1;
                        triggerQtysAfter[id] = qty;
                    });
                    
                    const newBundles = Math.min(...triggerIds.map(id => triggerQtysAfter[id]));

                    if (newBundles > currentBundles) {
                        isNthGhost = true;
                        
                        let otherItemsSum = 0;
                        triggerIds.forEach(id => {
                            if (id !== String(product.id)) {
                                const item = prev.find(p => String(p.id) === id && p.status !== 'CANCELLED');
                                if (item) otherItemsSum += Number(item.precioOriginal || item.precioUnitario);
                            }
                        });

                        finalPromoPrice = safeDiscountValue - otherItemsSum;
                        successNotification = `Promo: ¡Combo "${activePromo.name}" completado por $${safeDiscountValue.toFixed(2)}!`;
                    } else {
                        const missingIds = triggerIds.filter(id => triggerQtysAfter[id] === 0);
                        if (missingIds.length > 0) {
                            upsellNotification = `¡Agrega los productos faltantes para llevarte el combo "${activePromo.name}" por $${safeDiscountValue.toFixed(2)}!`;
                        }
                    }
                }
            }
        }

        if (isNthGhost) {
            const promoCartId = `${uniqueCartId}-promo-${safeActivePromo.id}`;
            const ghostIndex = newCart.findIndex(p => p.cartItemId === promoCartId);

            if (ghostIndex !== -1) {
                newCart[ghostIndex] = { ...newCart[ghostIndex], qty: newCart[ghostIndex].qty + 1 };
            } else {
                newCart.push({ 
                    ...product, 
                    cartItemId: promoCartId,
                    precioOriginal: finalPrice, 
                    precioUnitario: finalPromoPrice, 
                    qty: 1, 
                    detalles: finalDetails, 
                    status: 'ACTIVE', 
                    isTakeaway, 
                    isAutoPromo: true,
                    promoLabel: finalPromoPrice <= 0 ? 'GRATIS' : (safeActivePromo.type === 'COMBO' ? 'COMBO' : 'PROMO'),
                    promoId: safeActivePromo.id,
                    promoType: safeActivePromo.type
                });
            }
            if (activePromo?.type === 'NTH_FIXED') {
                successNotification = `Promo: ¡${product.nombre} añadido con descuento a $${Math.max(0, finalPromoPrice).toFixed(2)}!`;
            }
        } else {
            const index = newCart.findIndex(p => p.cartItemId === uniqueCartId && (!p.isAutoPromo || p.promoLabel === 'OFERTA'));

            if (index !== -1) {
                newCart[index] = { ...newCart[index], qty: newCart[index].qty + 1 };
            } else {
                newCart.push({ 
                  ...product, 
                  cartItemId: uniqueCartId,
                  precioUnitario: finalPrice, 
                  precioBase: product.precioBase || product.precio,
                  qty: 1, 
                  detalles: finalDetails, 
                  status: 'ACTIVE', 
                  isTakeaway, 
                  isAutoPromo: false 
                });
            }
        }

        if (activePromo && !isNthGhost) {
            const triggerIds = Array.isArray(activePromo.applyToProducts) && activePromo.applyToProducts.length > 0 
                ? activePromo.applyToProducts.map(String) 
                : [String(activePromo.productId || activePromo.product_id)];

            if (activePromo.type === 'NxM') {
                const normalQtyInAccount = newCart.filter(p => triggerIds.includes(String(p.id)) && !p.isAutoPromo && p.status !== 'CANCELLED').reduce((a, b) => a + b.qty, 0);
                const pay = Number(activePromo.payQty || 1);
                const buy = Number(activePromo.buyQty || 2);
                
                if (normalQtyInAccount > 0 && normalQtyInAccount % pay === 0) {
                    const earnedGhosts = buy - pay;
                    if (triggerIds.length > 1) {
                        rewardToTrigger = { promo: safeActivePromo, earnedGhosts, poolProductIds: triggerIds };
                    } else {
                        autoClaimNxM = { productWithDetails: product, activePromo: safeActivePromo, earnedGhosts, customizations };
                    }
                } else if (normalQtyInAccount % pay > 0) {
                    const missing = pay - (normalQtyInAccount % pay);
                    upsellNotification = `¡Agrega ${missing} más para completar la promo ${buy}x${pay}!`;
                }
            } else if (activePromo.type === 'BOGO') {
                const reqQty = Number(activePromo.buyQty || 1);
                const rewardQty = Number(activePromo.payQty || 1);
                const rewardIds = activePromo.rewardProducts || [];

                const totalTriggerQty = newCart.filter(p => triggerIds.includes(String(p.id)) && !p.isAutoPromo && p.status !== 'CANCELLED').reduce((a, b) => a + b.qty, 0);
                
                const bundles = Math.floor(totalTriggerQty / reqQty);
                const expectedGhosts = bundles * rewardQty;
                
                const currentGhosts = newCart.filter(p => p.isAutoPromo && p.promoId === activePromo.id).reduce((a, b) => a + b.qty, 0);

                if (expectedGhosts > currentGhosts) {
                    const earnedGhosts = expectedGhosts - currentGhosts;
                    rewardToTrigger = {
                        promo: safeActivePromo, earnedGhosts,
                        poolProductIds: rewardIds.map(String),
                        discountValue: safeActivePromo.discountValue
                    };
                } else {
                    const remainder = totalTriggerQty % reqQty;
                    if (remainder > 0) {
                        const missing = reqQty - remainder;
                        upsellNotification = `¡Agrega ${missing} producto(s) más para desbloquear el premio de "${activePromo.name}"!`;
                    }
                }
            } else if (activePromo.type === 'NTH_FIXED') {
                const normalQtyInAccount = newCart.filter(p => triggerIds.includes(String(p.id)) && !p.isAutoPromo && p.status !== 'CANCELLED').reduce((a, b) => a + b.qty, 0);
                const ghostQtyInAccount = newCart.filter(p => p.isAutoPromo && p.promoId === activePromo.id && p.status !== 'CANCELLED').reduce((a, b) => a + b.qty, 0);
                
                const totalInCart = normalQtyInAccount + ghostQtyInAccount;
                const buyTotal = Number(activePromo.buyQty || 2);
                const remainder = totalInCart % buyTotal;
                
                if (remainder > 0) {
                    const missing = buyTotal - remainder;
                    const ordinal = buyTotal === 3 ? '3ª' : buyTotal === 4 ? '4ª' : `${buyTotal}ª`;
                    upsellNotification = `¡Agrega ${missing} producto(s) más para llevarte la ${ordinal} unidad con $${safeActivePromo.discountValue.toFixed(2)} de descuento!`;
                }
            }
        }

        return newCart;
      });

      if (rewardToTrigger) setPendingPromoReward(rewardToTrigger);
      if (autoClaimNxM) setTimeout(() => claimPromoReward(autoClaimNxM.productWithDetails, autoClaimNxM.activePromo, autoClaimNxM.earnedGhosts, autoClaimNxM.customizations), 0);
      if (successNotification && triggerNotification) triggerNotification(successNotification, 'success');
      if (upsellNotification && triggerNotification) triggerNotification(upsellNotification, 'info');

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
          let totalUnsentQty = modifiedCart.filter(p => p.id === update.id && p.status !== 'CANCELLED').reduce((acc, item) => acc + item.qty, 0);
          if (totalUnsentQty > update.stock) {
            if (update.stock === 0) {
              notificationsToFire.add(JSON.stringify({ msg: `El producto se agotó y fue retirado de tu carrito.`, type: 'error' }));
              modifiedCart = modifiedCart.filter(item => !(item.id === update.id && item.status !== 'CANCELLED'));
            } else {
              notificationsToFire.add(JSON.stringify({ msg: `Se redujo la cantidad en tu carrito por disponibilidad de stock.`, type: 'warning' }));
              for (let i = modifiedCart.length - 1; i >= 0; i--) {
                const item = modifiedCart[i];
                if (item.id === update.id && item.status !== 'CANCELLED') {
                  const excess = totalUnsentQty - update.stock;
                  if (excess >= item.qty) {
                    totalUnsentQty -= item.qty;
                    modifiedCart.splice(i, 1);
                  } else {
                    modifiedCart[i] = { ...item, qty: item.qty - excess };
                    totalUnsentQty -= excess;
                  }
                  if (totalUnsentQty <= update.stock) break;
                }
              }
            }
          }

          promotions.forEach(promo => {
            const rawActive = promo.isActive ?? promo.is_active ?? promo.status;
            if (rawActive === true || rawActive === 1 || rawActive === 'true' || rawActive === '1') {
              const isTrigger = promo.applyToProducts?.map(String).includes(String(update.id)) || String(promo.productId) === String(update.id);
              const isReward = promo.rewardProducts?.map(String).includes(String(update.id));
              
              if (isTrigger || isReward) {
                const threshold = Number(promo.minStockThreshold || promo.min_stock_threshold || 0);
                if (update.stock <= threshold) {
                  setSuspendedPromos(prev => (!prev.find(p => p.id === promo.id) ? [...prev, promo] : prev));
                  if (!alertedPromosRef.current.has(promo.id)) {
                    notificationsToFire.add(JSON.stringify({ msg: `🚨 Promoción Suspendida: "${promo.name}" se ocultó por stock de seguridad.`, type: 'error' }));
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

  const breakPromoItems = (prevCart, cartItemIdBase, qtyToRemove) => {
      let newCart = [...prevCart];
      const itemToRemove = prevCart.find(i => i.cartItemId === cartItemIdBase);
      if (!itemToRemove) return prevCart;

      const productId = itemToRemove.id;
      const activePromo = getActivePromo(productId, itemToRemove.stock, itemToRemove.controlarStock);

      if (activePromo && activePromo.type === 'NxM') {
          const payQty = Number(activePromo.payQty || 1);
          const buyQty = Number(activePromo.buyQty || 2);
          const ghostsPerPromo = buyQty - payQty;
          const promosToBreak = Math.ceil(qtyToRemove / ghostsPerPromo);
          let parentsToRemove = promosToBreak * payQty;

          for (let i = newCart.length - 1; i >= 0; i--) {
              if (parentsToRemove <= 0) break;
              const item = newCart[i];
              if (String(item.id) === String(productId) && !item.isAutoPromo) {
                  if (item.qty <= parentsToRemove) {
                      parentsToRemove -= item.qty;
                      newCart.splice(i, 1);
                  } else {
                      newCart[i] = { ...item, qty: item.qty - parentsToRemove };
                      parentsToRemove = 0;
                  }
              }
          }
      } else {
          let toRemove = qtyToRemove;
          for (let i = newCart.length - 1; i >= 0; i--) {
              if (toRemove <= 0) break;
              const item = newCart[i];
              if (item.cartItemId === cartItemIdBase && item.isAutoPromo) {
                  if (item.qty <= toRemove) {
                      toRemove -= item.qty;
                      newCart.splice(i, 1);
                  } else {
                      newCart[i] = { ...item, qty: item.qty - toRemove };
                      toRemove = 0;
                  }
              }
          }
      }
      return newCart;
  };

  const removeFromCart = (itemToRemove) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    try {
      const isDeletingPromo = Boolean(itemToRemove.isAutoPromo);
      let cartItemId = itemToRemove.cartItemId;
      let breakQty = itemToRemove._breakPromoQty || null;

      if (typeof cartItemId === 'string' && cartItemId.includes('::BREAK::')) {
          const parts = cartItemId.split('::BREAK::');
          cartItemId = parts[0];
          breakQty = parseInt(parts[1], 10);
      }

      if (breakQty) {
          setCart(prev => breakPromoItems(prev, cartItemId, breakQty));
          return;
      }

      checkRuptureAndExecute(prev => {
        const existing = prev.find(item => item.cartItemId === cartItemId);
        if (!existing) return prev; 
        
        if (existing.qty === 1) return prev.filter(item => item.cartItemId !== cartItemId);
        return prev.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty - 1 } : item);
      }, isDeletingPromo);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const deleteLine = (itemToRemove) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    try {
      const isDeletingPromo = Boolean(itemToRemove.isAutoPromo);
      let cartItemId = itemToRemove.cartItemId;
      let breakQty = itemToRemove._breakPromoQty || null;

      if (breakQty) {
          setCart(prev => breakPromoItems(prev, cartItemId, breakQty));
          return;
      }

      checkRuptureAndExecute(prev => {
        return prev.filter(item => item.cartItemId !== cartItemId);
      }, isDeletingPromo);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const incrementInCart = (itemToIncrement) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const cartItemId = itemToIncrement.cartItemId;
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
    _cart.filter(i => !i.isVirtualDiscount).reduce((acc, item) => acc + (item.qty || 0), 0), 
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