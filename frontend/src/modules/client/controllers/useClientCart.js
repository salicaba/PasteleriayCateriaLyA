// src/modules/client/controllers/useClientCart.js
import { useState, useMemo, useEffect, useRef } from 'react';
import { socket } from '../../../api/socket.js';
import api from '../../../api/client.js';
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

  // Evalúa si un producto es DISPARADOR de una promoción activa y cumple stock/día
  const getActivePromo = (productId, currentStock = null, controlarStock = false) => {
    if (!promotions || promotions.length === 0) return null;

    // Blindaje de zona horaria
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
      const isSingle = String(p.productId || p.product_id) === pIdStr;
      const isTrigger = Array.isArray(p.applyToProducts) && p.applyToProducts.length > 0
        ? p.applyToProducts.map(String).includes(pIdStr)
        : isSingle;

      // Ocultar ADN del Premio: solo activamos por disparador
      if (!isTrigger) return false;

      if (controlarStock && currentStock !== null) {
        const threshold = Number(p.minStockThreshold || p.min_stock_threshold || 0);
        let requiredQty = 1;
        if (p.type === 'NxM' || p.type === 'NTH_FIXED') {
          requiredQty = Number(p.buyQty || p.buy_qty || 2);
        } else if (p.type === 'BOGO') {
          requiredQty = Number(p.buyQty || p.buy_qty || 1);
        } else if (p.type === 'COMBO') {
          requiredQty = 1;
        }
        if (currentStock < requiredQty || currentStock <= threshold || currentStock <= 0) {
          return false;
        }
      }

      return true;
    });

    return promo || null;
  };

  // Devuelve toda la metadata visual para ClientProductCard (homologado con ProductCard del POS)
  const getPromoBadge = (productId, realBasePrice = 0, currentStock = null, controlarStock = false) => {
    const activePromo = getActivePromo(productId, currentStock, controlarStock);
    if (!activePromo) return null;

    const type = activePromo.type;
    const discountVal = Number(activePromo.discountValue || activePromo.discount_value || 0);
    let text = activePromo.name || 'OFERTA';

    if (type === 'NxM') {
      const buy = activePromo.buyQty || activePromo.buy_qty || 3;
      const pay = activePromo.payQty || activePromo.pay_qty || 2;
      text = `${buy}x${pay}`;
    } else if (type === 'FIXED') {
      if (realBasePrice > 0 && discountVal < realBasePrice) {
        const discountPercentage = Math.max(0, Math.round(((realBasePrice - discountVal) / realBasePrice) * 100));
        text = `-${discountPercentage}% OFF`;
      } else {
        text = `A $${discountVal}`;
      }
    } else if (type === 'NTH_FIXED') {
      const nth = Number(activePromo.buyQty || activePromo.buy_qty || 2);
      const finalPromoPrice = Math.max(0, realBasePrice - discountVal);
      const formattedPrice = finalPromoPrice % 1 === 0 ? finalPromoPrice : finalPromoPrice.toFixed(2);
      const ordinal = nth === 3 ? '3ª' : nth === 4 ? '4ª' : `${nth}ª`;
      text = `${ordinal} a $${formattedPrice}`;
    } else if (type === 'COMBO') {
      text = `COMBO A $${discountVal.toFixed(2)}`;
    } else if (type === 'BOGO') {
      const buy = activePromo.buyQty || activePromo.buy_qty || 1;
      const pay = activePromo.payQty || activePromo.pay_qty || 1;
      text = `COMPRA ${buy} LLÉVATE ${pay}`;
    }

    return {
      id: activePromo.id,
      name: activePromo.name,
      text,
      type,
      discountValue: discountVal,
      buyQty: Number(activePromo.buyQty || activePromo.buy_qty || 1),
      payQty: Number(activePromo.payQty || activePromo.pay_qty || 1)
    };
  };

  // Reclamo de recompensa desde el Modal (BOGO o NxM de Piscina) o Auto-Claim (NxM individual)
  const claimPromoReward = (baseProduct, promo, qty = 1, customizations = null) => {
    const defaultCustoms = getDefaultCustomizations(baseProduct);
    const finalDetails = customizations?.detalles || defaultCustoms?.detalles || {};
    const isTakeaway = customizations?.isTakeaway || false;
    const ghostOriginalPrice = parseFloat(
      customizations?.precioFinal || defaultCustoms?.precioFinal || baseProduct.precioBase || baseProduct.precio || 0
    );

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
    const takeawayStr = isTakeaway ? '-llevar' : '';
    const cartItemId = `${baseProduct.id}-${JSON.stringify(finalDetails)}${takeawayStr}-promo-${promo.id}`;

    setCart(prev => {
      const newCart = [...prev];
      const existingGhostIdx = newCart.findIndex(p =>
        p.cartItemId === cartItemId && p.isAutoPromo && p.promoId === promo.id && p.status !== 'CANCELLED'
      );

      if (existingGhostIdx !== -1) {
        newCart[existingGhostIdx] = {
          ...newCart[existingGhostIdx],
          qty: newCart[existingGhostIdx].qty + qty
        };
      } else {
        newCart.push({
          ...baseProduct,
          nombre: baseProduct.nombre || baseProduct.name || 'Producto',
          imagen: baseProduct.imagen || baseProduct.imageUrl || baseProduct.image || null,
          cartItemId,
          precioOriginal: ghostOriginalPrice,
          precioUnitario: finalPromoPrice,
          precioBase: baseProduct.precioBase || baseProduct.precio || 0,
          qty: qty,
          detalles: finalDetails,
          isTakeaway,
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
      const pName = baseProduct.nombre || baseProduct.name || 'Producto';
      if (finalPromoPrice === 0) {
        triggerNotification(`Promo: ¡${pName} GRATIS añadido a tu pedido!`, 'success');
      } else {
        triggerNotification(`Promo: ¡${pName} añadido con descuento a $${finalPromoPrice.toFixed(2)}!`, 'success');
      }
    }
    setPendingPromoReward(null);
  };

  // 🔥 MOTOR MULTI-ETAPA: Sincronización de las 6 Promociones
  const syncPromotions = (cartState) => {
    let cleanCart = [...cartState];

    // 1. Evaluar primero descuentos directos (FIXED / OFERTA)
    cleanCart = cleanCart.map(item => {
      if (item.isVirtualDiscount) return item;
      if (item.isAutoPromo && item.promoLabel !== 'OFERTA') return item;

      const activePromo = getActivePromo(item.id, item.stock, item.controlarStock);

      if (activePromo && activePromo.type === 'FIXED') {
        const baseOriginal = parseFloat(item.precioBase || item.precio || 0);
        const discountFixed = Number(activePromo.discountValue || activePromo.discount_value || 0);
        const currentRefPrice = parseFloat(item.precioOriginal ?? item.precioUnitario ?? baseOriginal);
        const costoExtras = Math.max(0, currentRefPrice - baseOriginal);
        const expectedPrice = discountFixed + costoExtras;

        if (item.precioUnitario !== expectedPrice || item.promoLabel !== 'OFERTA') {
          return {
            ...item,
            precioOriginal: currentRefPrice,
            precioUnitario: expectedPrice,
            promoLabel: 'OFERTA',
            isAutoPromo: true,
            promoId: activePromo.id,
            promoType: 'FIXED'
          };
        }
      } else if (item.promoLabel === 'OFERTA' && (!activePromo || activePromo.type !== 'FIXED')) {
        return {
          ...item,
          precioUnitario: item.precioOriginal ?? item.precioUnitario,
          precioOriginal: undefined,
          promoLabel: undefined,
          isAutoPromo: false,
          promoId: undefined,
          promoType: undefined
        };
      }
      return item;
    });

    // 2. Agrupación por Piscina (Pooling) para NxM, BOGO, NTH_FIXED y COMBO
    const promoGroups = {};

    cleanCart.forEach(item => {
      if (item.status === 'CANCELLED' || item.isVirtualDiscount) return;

      let activePromo = null;
      if (item.isAutoPromo && item.promoId && item.promoLabel !== 'OFERTA') {
        activePromo = promotions.find(p => p.id === item.promoId);
      } else {
        activePromo = getActivePromo(item.id, item.stock, item.controlarStock);
      }

      if (activePromo && ['NxM', 'BOGO', 'NTH_FIXED', 'COMBO'].includes(activePromo.type)) {
        const key = String(activePromo.id);
        if (!promoGroups[key]) {
          promoGroups[key] = { normalQty: 0, triggerQtys: {}, ghosts: [], activePromo };
        }

        if (item.isAutoPromo && item.promoId === activePromo.id && item.promoLabel !== 'OFERTA') {
          promoGroups[key].ghosts.push(item);
          if (activePromo.type === 'COMBO') {
            promoGroups[key].triggerQtys[item.id] = (promoGroups[key].triggerQtys[item.id] || 0) + item.qty;
          }
        } else if (!item.isAutoPromo || item.promoLabel === 'OFERTA') {
          const isTrigger = Array.isArray(activePromo.applyToProducts) && activePromo.applyToProducts.length > 0
            ? activePromo.applyToProducts.map(String).includes(String(item.id))
            : String(activePromo.productId || activePromo.product_id) === String(item.id);

          if (isTrigger) {
            promoGroups[key].normalQty += item.qty;
            promoGroups[key].triggerQtys[item.id] = (promoGroups[key].triggerQtys[item.id] || 0) + item.qty;
          }
        }
      }
    });

    // Podar fantasmas excedentes cuando se reducen disparadores
    Object.values(promoGroups).forEach(group => {
      let expectedGhosts = 0;

      if (group.activePromo.type === 'NxM') {
        const pay = Number(group.activePromo.payQty || group.activePromo.pay_qty || 1);
        const buy = Number(group.activePromo.buyQty || group.activePromo.buy_qty || 2);
        expectedGhosts = Math.floor(group.normalQty / pay) * (buy - pay);
      } else if (group.activePromo.type === 'BOGO') {
        const triggerIds = Array.isArray(group.activePromo.applyToProducts) && group.activePromo.applyToProducts.length > 0
          ? group.activePromo.applyToProducts.map(String)
          : [String(group.activePromo.productId || group.activePromo.product_id)];

        const buyReq = Number(group.activePromo.buyQty || group.activePromo.buy_qty || 1);
        const rewardGiven = Number(group.activePromo.payQty || group.activePromo.pay_qty || 1);

        if (triggerIds.length > 0) {
          const totalTriggerQty = triggerIds.reduce((sum, tId) => sum + (group.triggerQtys[tId] || 0), 0);
          const bundles = Math.floor(totalTriggerQty / buyReq);
          expectedGhosts = bundles * rewardGiven;
        }
      } else if (group.activePromo.type === 'NTH_FIXED') {
        const buyTotal = Number(group.activePromo.buyQty || group.activePromo.buy_qty || 2);
        const normalReq = Math.max(1, buyTotal - 1);
        if (normalReq > 0) {
          expectedGhosts = Math.floor(group.normalQty / normalReq);
        }
      } else if (group.activePromo.type === 'COMBO') {
        const triggerIds = Array.isArray(group.activePromo.applyToProducts)
          ? group.activePromo.applyToProducts.map(String)
          : [];
        if (triggerIds.length > 0) {
          expectedGhosts = Math.min(...triggerIds.map(id => group.triggerQtys[id] || 0));
        }
      }

      const currentGhostQty = group.ghosts.reduce((sum, g) => sum + g.qty, 0);

      if (currentGhostQty > expectedGhosts) {
        let toRemove = currentGhostQty - expectedGhosts;
        for (let i = cleanCart.length - 1; i >= 0; i--) {
          const item = cleanCart[i];
          if (item.isAutoPromo && item.promoId === group.activePromo.id && item.promoLabel !== 'OFERTA') {
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

    // 3. EVALUACIÓN DE ÚLTIMA MILLA (TICKET_DISCOUNT)
    const nowInChiapasStr = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
    const today = new Date(nowInChiapasStr).getDay();

    const ticketPromos = promotions.filter(p => {
      const rawActive = p.isActive ?? p.is_active ?? p.status;
      const isActive = rawActive === true || rawActive === 1 || rawActive === 'true' || rawActive === '1';
      const daysRaw = p.validDays || p.valid_days;
      const validDays = parseValidDays(daysRaw);
      const validToday = validDays.length === 0 || validDays.includes(today);
      return isActive && validToday && p.type === 'TICKET_DISCOUNT';
    });

    const existingTicketGhostIdx = cleanCart.findIndex(item => item.promoType === 'TICKET_DISCOUNT' || item.isVirtualDiscount);

    if (ticketPromos.length > 0) {
      const itemsCuenta = cleanCart.filter(item => item.status !== 'CANCELLED' && item.promoType !== 'TICKET_DISCOUNT' && !item.isVirtualDiscount);
      const subtotalCuenta = itemsCuenta.reduce((acc, item) => acc + ((item.precioUnitario || 0) * (item.qty || 0)), 0);

      const qualifyingPromos = ticketPromos
        .filter(p => subtotalCuenta > 0 && subtotalCuenta >= Number(p.minTicketAmount || p.min_ticket_amount || 0))
        .sort((a, b) => Number(b.minTicketAmount || b.min_ticket_amount || 0) - Number(a.minTicketAmount || a.min_ticket_amount || 0));

      const bestTicketPromo = qualifyingPromos[0];

      if (bestTicketPromo) {
        const rawDiscount = Number(bestTicketPromo.discountValue || bestTicketPromo.discount_value || 0);
        const isPercentage = bestTicketPromo.discountType === 'PERCENTAGE';

        let finalDiscountPrice = isPercentage ? (subtotalCuenta * (rawDiscount / 100)) : rawDiscount;
        finalDiscountPrice = -Math.abs(finalDiscountPrice);

        if (existingTicketGhostIdx !== -1) {
          if (cleanCart[existingTicketGhostIdx].precioUnitario !== finalDiscountPrice || cleanCart[existingTicketGhostIdx].promoId !== bestTicketPromo.id) {
            cleanCart[existingTicketGhostIdx] = {
              ...cleanCart[existingTicketGhostIdx],
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
            nombre: bestTicketPromo.name || 'Descuento Global',
            precioOriginal: finalDiscountPrice,
            precioUnitario: finalDiscountPrice,
            qty: 1,
            status: 'ACTIVE',
            isAutoPromo: true,
            isVirtualDiscount: true,
            promoId: bestTicketPromo.id,
            promoType: 'TICKET_DISCOUNT',
            promoLabel: 'DESCUENTO EXTRA'
          });
        }
      } else if (existingTicketGhostIdx !== -1) {
        cleanCart.splice(existingTicketGhostIdx, 1);
      }
    } else if (existingTicketGhostIdx !== -1) {
      cleanCart.splice(existingTicketGhostIdx, 1);
    }

    return cleanCart;
  };

  // Re-sincronizar si cambian las promociones en vivo por Socket
  useEffect(() => {
    _setCart(prevCart => {
      if (prevCart.length === 0) return prevCart;
      return syncPromotions(prevCart);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promotions]);

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

      const isRewardGhost = (p) => p.isAutoPromo && p.promoLabel !== 'OFERTA';
      const prevGhosts = prev.filter(isRewardGhost).reduce((sum, p) => sum + p.qty, 0);
      const nextGhosts = syncedNextCart.filter(isRewardGhost).reduce((sum, p) => sum + p.qty, 0);

      if (nextGhosts < prevGhosts && !explicitlyDeletedGhost) {
        setPromoWarning({
          isOpen: true,
          message: `Al reducir o eliminar este artículo, se romperá una promoción activa y perderás el beneficio asociado en tu orden. ¿Deseas continuar?`,
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
      const currentTotalQty = _cart
        .filter(item => item.id === product.id && item.status !== 'CANCELLED')
        .reduce((acc, item) => acc + item.qty, 0);

      if (product.controlarStock && currentTotalQty + 1 > product.stock) {
        if (triggerNotification) triggerNotification(`Límite alcanzado: Solo hay ${product.stock} en stock.`, 'warning');
        return false;
      }

      const activePromo = getActivePromo(product.id, product.stock, product.controlarStock);

      let finalDetails = customizations?.detalles || {};
      let finalPrice = parseFloat(customizations?.precioFinal ?? product.precioBase ?? product.precio ?? 0);
      let isTakeaway = Boolean(customizations?.isTakeaway || product.isTakeaway);

      if (!customizations) {
        const defaultCustoms = getDefaultCustomizations(product);
        if (defaultCustoms) {
          finalDetails = defaultCustoms.detalles;
          finalPrice = defaultCustoms.precioFinal;
        }
      }

      const detailStr = JSON.stringify(finalDetails) + (isTakeaway ? '-llevar' : '');
      const uniqueCartId = `${product.id}-${detailStr}`;

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
              const normalQtyInAccount = prev
                .filter(p => triggerIds.includes(String(p.id)) && (!p.isAutoPromo || p.promoLabel === 'OFERTA') && p.status !== 'CANCELLED')
                .reduce((a, b) => a + b.qty, 0);
              const ghostQtyInAccount = prev
                .filter(p => p.isAutoPromo && p.promoId === activePromo.id && p.promoLabel !== 'OFERTA' && p.status !== 'CANCELLED')
                .reduce((a, b) => a + b.qty, 0);

              const totalInCart = normalQtyInAccount + ghostQtyInAccount;
              const buyTotal = Number(activePromo.buyQty || activePromo.buy_qty || 2);

              if ((totalInCart + 1) % buyTotal === 0) {
                isNthGhost = true;
                finalPromoPrice = Math.max(0, finalPrice - safeDiscountValue);
              }
            }
          } else if (activePromo.type === 'COMBO') {
            const triggerIds = Array.isArray(activePromo.applyToProducts) && activePromo.applyToProducts.length > 0
              ? activePromo.applyToProducts.map(String)
              : [];

            if (triggerIds.includes(String(product.id))) {
              const currentBundles = Math.min(...triggerIds.map(id =>
                prev.filter(p => String(p.id) === id && p.status !== 'CANCELLED').reduce((a, b) => a + b.qty, 0)
              ));

              const triggerQtysAfter = {};
              triggerIds.forEach(id => {
                let qty = prev.filter(p => String(p.id) === id && p.status !== 'CANCELLED').reduce((a, b) => a + b.qty, 0);
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
                    if (item) otherItemsSum += Number(item.precioOriginal ?? item.precioUnitario ?? 0);
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
          const promoCartId = `${uniqueCartId}-promo-${safeActivePromo.id}-${Number(finalPromoPrice).toFixed(2)}`;
          const ghostIndex = newCart.findIndex(p => p.cartItemId === promoCartId && p.isAutoPromo);

          if (ghostIndex !== -1) {
            newCart[ghostIndex] = { ...newCart[ghostIndex], qty: newCart[ghostIndex].qty + 1 };
          } else {
            newCart.push({
              ...product,
              cartItemId: promoCartId,
              precioOriginal: finalPrice,
              precioUnitario: finalPromoPrice,
              precioBase: product.precioBase || product.precio || 0,
              qty: 1,
              detalles: finalDetails,
              status: 'ACTIVE',
              isTakeaway,
              isAutoPromo: true,
              promoLabel: finalPromoPrice === 0 ? 'GRATIS' : 'PROMO',
              promoId: safeActivePromo.id,
              promoType: safeActivePromo.type
            });
          }
          if (activePromo?.type === 'NTH_FIXED') {
            successNotification = `Promo: ¡${product.nombre} añadido con descuento a $${finalPromoPrice.toFixed(2)}!`;
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
              precioBase: product.precioBase || product.precio || 0,
              qty: 1,
              detalles: finalDetails,
              status: 'ACTIVE',
              isTakeaway,
              isAutoPromo: false
            });
          }
        }

        // Evaluación post-inserción para NxM, BOGO y avisos de NTH_FIXED
        if (activePromo && !isNthGhost) {
          const triggerIds = Array.isArray(activePromo.applyToProducts) && activePromo.applyToProducts.length > 0
            ? activePromo.applyToProducts.map(String)
            : [String(activePromo.productId || activePromo.product_id)];

          if (activePromo.type === 'NxM') {
            const normalQtyInAccount = newCart
              .filter(p => triggerIds.includes(String(p.id)) && (!p.isAutoPromo || p.promoLabel === 'OFERTA') && p.status !== 'CANCELLED')
              .reduce((a, b) => a + b.qty, 0);

            const pay = Number(activePromo.payQty || activePromo.pay_qty || 1);
            const buy = Number(activePromo.buyQty || activePromo.buy_qty || 2);

            if (normalQtyInAccount > 0 && normalQtyInAccount % pay === 0) {
              const earnedGhosts = buy - pay;
              if (triggerIds.length > 1) {
                rewardToTrigger = {
                  promo: safeActivePromo,
                  earnedGhosts,
                  poolProductIds: triggerIds,
                  discountValue: 0
                };
              } else {
                autoClaimNxM = {
                  productWithDetails: product,
                  activePromo: safeActivePromo,
                  earnedGhosts,
                  customizations: { precioFinal: finalPrice, detalles: finalDetails, isTakeaway }
                };
              }
            } else if (normalQtyInAccount % pay > 0) {
              const missing = pay - (normalQtyInAccount % pay);
              upsellNotification = `¡Agrega ${missing} más para completar la promo ${buy}x${pay}!`;
            }
          } else if (activePromo.type === 'BOGO') {
            const reqQty = Number(activePromo.buyQty || activePromo.buy_qty || 1);
            const rewardQty = Number(activePromo.payQty || activePromo.pay_qty || 1);
            const rewardIds = activePromo.rewardProducts || [];

            const totalTriggerQty = newCart
              .filter(p => triggerIds.includes(String(p.id)) && (!p.isAutoPromo || p.promoLabel === 'OFERTA') && p.status !== 'CANCELLED')
              .reduce((a, b) => a + b.qty, 0);

            const bundles = Math.floor(totalTriggerQty / reqQty);
            const expectedGhosts = bundles * rewardQty;

            const currentGhosts = newCart
              .filter(p => p.isAutoPromo && p.promoId === activePromo.id && p.promoLabel !== 'OFERTA')
              .reduce((a, b) => a + b.qty, 0);

            if (expectedGhosts > currentGhosts) {
              const earnedGhosts = expectedGhosts - currentGhosts;
              rewardToTrigger = {
                promo: safeActivePromo,
                earnedGhosts,
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
            const normalQtyInAccount = newCart
              .filter(p => triggerIds.includes(String(p.id)) && (!p.isAutoPromo || p.promoLabel === 'OFERTA') && p.status !== 'CANCELLED')
              .reduce((a, b) => a + b.qty, 0);
            const ghostQtyInAccount = newCart
              .filter(p => p.isAutoPromo && p.promoId === activePromo.id && p.promoLabel !== 'OFERTA' && p.status !== 'CANCELLED')
              .reduce((a, b) => a + b.qty, 0);

            const totalInCart = normalQtyInAccount + ghostQtyInAccount;
            const buyTotal = Number(activePromo.buyQty || activePromo.buy_qty || 2);
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

      if (rewardToTrigger) {
        setPendingPromoReward(rewardToTrigger);
      }
      if (autoClaimNxM) {
        setTimeout(() => {
          claimPromoReward(
            autoClaimNxM.productWithDetails,
            autoClaimNxM.activePromo,
            autoClaimNxM.earnedGhosts,
            autoClaimNxM.customizations
          );
        }, 0);
      }
      if (successNotification && triggerNotification) {
        triggerNotification(successNotification, 'success');
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
      if (!Array.isArray(updates)) return;
      setCart(prevCart => {
        let modifiedCart = [...prevCart];
        let notificationsToFire = new Set();

        modifiedCart = modifiedCart.map(item => {
          const update = updates.find(u => u.id === item.id);
          return update ? { ...item, stock: update.stock } : item;
        });

        for (const update of updates) {
          const itemsOfProduct = modifiedCart.filter(i => i.id === update.id && i.status !== 'CANCELLED');
          if (itemsOfProduct.length > 0 && itemsOfProduct[0].controlarStock) {
            let currentTotalQty = itemsOfProduct.reduce((sum, i) => sum + i.qty, 0);

            if (currentTotalQty > update.stock) {
              if (update.stock === 0) {
                notificationsToFire.add(JSON.stringify({ msg: `Un producto de tu carrito se agotó y fue retirado.`, type: 'error' }));
                modifiedCart = modifiedCart.filter(i => i.id !== update.id);
              } else {
                notificationsToFire.add(JSON.stringify({ msg: `Ajustamos la cantidad de un producto por disponibilidad de stock.`, type: 'warning' }));
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

          promotions.forEach(promo => {
            const rawActive = promo.isActive ?? promo.is_active ?? promo.status;
            const isPActive = rawActive === true || rawActive === 1 || rawActive === 'true' || rawActive === '1';

            if (isPActive) {
              const isTrigger = promo.applyToProducts?.map(String).includes(String(update.id)) || String(promo.productId) === String(update.id);
              const isReward = promo.rewardProducts?.map(String).includes(String(update.id));

              if (isTrigger || isReward) {
                const threshold = Number(promo.minStockThreshold || promo.min_stock_threshold || 0);
                if (update.stock <= threshold) {
                  setSuspendedPromos(prev => (!prev.find(p => p.id === promo.id) ? [...prev, promo] : prev));
                  alertedPromosRef.current.add(promo.id);
                } else {
                  setSuspendedPromos(prev => prev.filter(p => p.id !== promo.id));
                  alertedPromosRef.current.delete(promo.id);
                }
              }
            }
          });
        }

        if (triggerNotification) {
          setTimeout(() => {
            notificationsToFire.forEach(notifStr => {
              const notif = JSON.parse(notifStr);
              triggerNotification(notif.msg, notif.type);
            });
          }, 0);
        }
        return modifiedCart;
      });
    };

    socket.on('stock:update', handleStockAdjustment);
    return () => socket.off('stock:update', handleStockAdjustment);
  }, [triggerNotification, promotions]);

  const removeFromCart = (cartItemIdOrObj) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const cartItemId = typeof cartItemIdOrObj === 'object' ? cartItemIdOrObj.cartItemId : cartItemIdOrObj;
      const targetItem = _cart.find(i => i.cartItemId === cartItemId);
      if (!targetItem) return;

      const isDeletingPromo = Boolean(targetItem.isAutoPromo && targetItem.promoLabel !== 'OFERTA');

      checkRuptureAndExecute(prev => {
        const existing = prev.find(item => item.cartItemId === cartItemId);
        if (!existing) return prev;
        if (existing.qty <= 1) return prev.filter(item => item.cartItemId !== cartItemId);
        return prev.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty - 1 } : item);
      }, isDeletingPromo);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const deleteLine = (cartItemIdOrObj) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      let cartItemId = typeof cartItemIdOrObj === 'object' ? cartItemIdOrObj.cartItemId : cartItemIdOrObj;
      if (typeof cartItemId === 'string' && cartItemId.includes('::BREAK::')) {
        cartItemId = cartItemId.split('::BREAK::')[0];
      }

      const targetItem = _cart.find(i => i.cartItemId === cartItemId);
      if (!targetItem) return;

      const isDeletingPromo = Boolean(targetItem.isAutoPromo && targetItem.promoLabel !== 'OFERTA');

      checkRuptureAndExecute(prev => {
        return prev.filter(item => item.cartItemId !== cartItemId);
      }, isDeletingPromo);
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Delegamos el incremento a addToCart para que dispare NTH_FIXED, COMBO, BOGO y NxM también desde el modal del carrito
  const incrementInCart = (cartItemIdOrObj) => {
    const cartItemId = typeof cartItemIdOrObj === 'object' ? cartItemIdOrObj.cartItemId : cartItemIdOrObj;
    const existing = _cart.find(item => item.cartItemId === cartItemId);
    if (!existing || (existing.isAutoPromo && existing.promoLabel !== 'OFERTA')) return;

    const baseProductPrice = parseFloat(existing.precioOriginal ?? existing.precioUnitario ?? existing.precioBase ?? existing.precio ?? 0);

    addToCart(existing, {
      precioFinal: baseProductPrice,
      detalles: existing.detalles || {},
      isTakeaway: Boolean(existing.isTakeaway)
    });
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
    promotions,
    getPromoBadge,
    promoWarning,
    confirmPromoRupture: () => promoWarning.onConfirm && promoWarning.onConfirm(),
    cancelPromoRupture: () => promoWarning.onCancel && promoWarning.onCancel(),
    pendingPromoReward,
    setPendingPromoReward,
    claimPromoReward,
    suspendedPromos
  };
};