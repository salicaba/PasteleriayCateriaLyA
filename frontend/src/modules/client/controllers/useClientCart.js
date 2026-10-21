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

const parseIdArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data.map(String).filter(Boolean);
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch (e) {
      return data
        .replace(/[\[\]"']/g, '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    }
  }
  return [];
};

export const useClientCart = (triggerNotification) => {
  const [_cart, _setCart] = useState([]);
  const cartRef = useRef([]);
  const [promotions, setPromotions] = useState([]);
  const promotionsRef = useRef([]);
  const isProcessingRef = useRef(false);

  const [pendingPromoReward, setPendingPromoReward] = useState(null);
  const [suspendedPromos, setSuspendedPromos] = useState([]);
  const alertedPromosRef = useRef(new Set());

  const [promoWarning, setPromoWarning] = useState({
    isOpen: false, message: '', onConfirm: null, onCancel: null
  });

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const res = await api.get(`/promotions?_t=${Date.now()}`);
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : (raw?.data || raw?.promotions || []);
        promotionsRef.current = list;
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

  const getActivePromo = (productId, currentStock = null, controlarStock = false, customPromosList = null) => {
    const promosList = customPromosList || promotionsRef.current || promotions;
    if (!promosList || promosList.length === 0) return null;

    const nowInChiapasStr = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
    const today = new Date(nowInChiapasStr).getDay();

    const promo = promosList.find(p => {
      const rawActive = p.isActive ?? p.is_active ?? p.status;
      const isActive = rawActive === true || rawActive === 1 || rawActive === 'true' || rawActive === '1';
      if (!isActive) return false;

      const daysRaw = p.validDays || p.valid_days;
      const validDaysAsNumbers = parseValidDays(daysRaw);
      if (validDaysAsNumbers.length > 0 && !validDaysAsNumbers.includes(today)) return false;

      const pIdStr = String(productId);
      const applyList = parseIdArray(p.applyToProducts || p.apply_to_products);
      const matchesSingle = String(p.productId || p.product_id) === pIdStr;
      const isTrigger = applyList.length > 0 ? applyList.includes(pIdStr) : matchesSingle;

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

  const getPromoBadge = (productId, realBasePrice = 0, currentStock = null, controlarStock = false) => {
    const activePromo = getActivePromo(productId, currentStock, controlarStock, promotions);
    if (!activePromo) return null;

    const type = activePromo.type;
    const discountVal = Number(activePromo.discountValue || activePromo.discount_value || 0);
    let text = activePromo.name || 'OFERTA';

    if (type === 'NxM') {
      const buy = activePromo.buyQty || activePromo.buy_qty || 2;
      const pay = activePromo.payQty || activePromo.pay_qty || 1;
      text = `${buy}x${pay}`;
    } else if (type === 'FIXED') {
      const finalFixedPrice = Math.max(0, realBasePrice - discountVal);
      if (realBasePrice > 0) {
        const discountPercentage = Math.max(0, Math.round(((realBasePrice - finalFixedPrice) / realBasePrice) * 100));
        text = `-${discountPercentage}% OFF`;
      } else {
        text = `-$${discountVal}`;
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
      discountValue: discountVal
    };
  };

  const buildGhostRewardItem = (baseProduct, promo, qty = 1, customizations = null) => {
    const defaultCustoms = getDefaultCustomizations(baseProduct);
    const finalDetails = customizations?.detalles || defaultCustoms?.detalles || {};
    const isTakeaway = Boolean(customizations?.isTakeaway || baseProduct.isTakeaway);
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

    return {
      item: {
        ...baseProduct,
        nombre: baseProduct.nombre || baseProduct.name || 'Producto',
        imagen: baseProduct.imagen || baseProduct.imageUrl || baseProduct.image || null,
        cartItemId,
        precioOriginal: ghostOriginalPrice,
        precioUnitario: finalPromoPrice,
        precioBase: baseProduct.precioBase || baseProduct.precio || 0,
        qty: Number(qty || 1),
        detalles: finalDetails,
        isTakeaway,
        status: 'ACTIVE',
        isAutoPromo: true,
        promoLabel: promoLabelStr,
        promoId: promo.id,
        promoType: promo.type
      },
      finalPromoPrice
    };
  };

  // 🔥 MOTOR MULTI-ETAPA: Sincronización de las 6 Promociones
  const syncPromotions = (cartState, customPromosList = null) => {
    const promosList = customPromosList || promotionsRef.current || promotions;
    let cleanCart = [...cartState];

    // 1. Evaluar primero descuentos directos por unidad (FIXED -> Resta $X pesos)
    cleanCart = cleanCart.map(item => {
      if (item.isVirtualDiscount) return item;
      if (item.isAutoPromo && item.promoLabel !== 'OFERTA') return item;

      const activePromo = getActivePromo(item.id, item.stock, item.controlarStock, promosList);

      if (activePromo && activePromo.type === 'FIXED') {
        const discountFixed = Number(activePromo.discountValue || activePromo.discount_value || 0);
        const originalRefPrice = parseFloat(item.precioOriginal ?? item.precioUnitario ?? item.precioBase ?? item.precio ?? 0);
        const expectedPrice = Math.max(0, originalRefPrice - discountFixed);

        if (item.precioUnitario !== expectedPrice || item.promoLabel !== 'OFERTA') {
          return {
            ...item,
            precioOriginal: originalRefPrice,
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
        activePromo = promosList.find(p => String(p.id) === String(item.promoId));
      } else {
        activePromo = getActivePromo(item.id, item.stock, item.controlarStock, promosList);
      }

      if (activePromo && ['NxM', 'BOGO', 'NTH_FIXED', 'COMBO'].includes(activePromo.type)) {
        const key = String(activePromo.id);
        if (!promoGroups[key]) {
          promoGroups[key] = { normalQty: 0, triggerQtys: {}, ghosts: [], activePromo };
        }

        if (item.isAutoPromo && String(item.promoId) === String(activePromo.id) && item.promoLabel !== 'OFERTA') {
          promoGroups[key].ghosts.push(item);
          if (activePromo.type === 'COMBO') {
            promoGroups[key].triggerQtys[item.id] = (promoGroups[key].triggerQtys[item.id] || 0) + item.qty;
          }
        } else if (!item.isAutoPromo || item.promoLabel === 'OFERTA') {
          const applyList = parseIdArray(activePromo.applyToProducts || activePromo.apply_to_products);
          const isTrigger = applyList.length > 0
            ? applyList.includes(String(item.id))
            : String(activePromo.productId || activePromo.product_id) === String(item.id);

          if (isTrigger) {
            promoGroups[key].normalQty += item.qty;
            promoGroups[key].triggerQtys[item.id] = (promoGroups[key].triggerQtys[item.id] || 0) + item.qty;
          }
        }
      }
    });

    // Podar fantasmas si el cliente redujo artículos disparadores
    Object.values(promoGroups).forEach(group => {
      let expectedGhosts = 0;
      const applyList = parseIdArray(group.activePromo.applyToProducts || group.activePromo.apply_to_products);
      const triggerIds = applyList.length > 0
        ? applyList
        : [String(group.activePromo.productId || group.activePromo.product_id)].filter(Boolean);

      if (group.activePromo.type === 'NxM') {
        const pay = Number(group.activePromo.payQty || group.activePromo.pay_qty || 1);
        const buy = Number(group.activePromo.buyQty || group.activePromo.buy_qty || 2);
        expectedGhosts = Math.floor(group.normalQty / pay) * (buy - pay);
      } else if (group.activePromo.type === 'BOGO') {
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
        if (triggerIds.length > 0) {
          expectedGhosts = Math.min(...triggerIds.map(id => group.triggerQtys[id] || 0));
        }
      }

      const currentGhostQty = group.ghosts.reduce((sum, g) => sum + g.qty, 0);

      if (currentGhostQty > expectedGhosts) {
        let toRemove = currentGhostQty - expectedGhosts;
        for (let i = cleanCart.length - 1; i >= 0; i--) {
          const item = cleanCart[i];
          if (item.isAutoPromo && String(item.promoId) === String(group.activePromo.id) && item.promoLabel !== 'OFERTA') {
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

    const ticketPromos = (promosList || []).filter(p => {
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

  const setCart = (action, customPromosList = null) => {
    const prev = cartRef.current;
    const rawNext = typeof action === 'function' ? action(prev) : action;
    const synced = syncPromotions(rawNext, customPromosList);
    cartRef.current = synced;
    _setCart(synced);
    return synced;
  };

  useEffect(() => {
    if (cartRef.current.length > 0) {
      setCart(cartRef.current, promotions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promotions]);

  const claimPromoReward = (baseProduct, promo, qty = 1, customizations = null) => {
    const { item: ghostItem, finalPromoPrice } = buildGhostRewardItem(baseProduct, promo, qty, customizations);

    setCart(prev => {
      const newCart = [...prev];
      const existingGhostIdx = newCart.findIndex(p =>
        p.cartItemId === ghostItem.cartItemId && p.isAutoPromo && String(p.promoId) === String(promo.id) && p.status !== 'CANCELLED'
      );

      if (existingGhostIdx !== -1) {
        newCart[existingGhostIdx] = {
          ...newCart[existingGhostIdx],
          qty: newCart[existingGhostIdx].qty + Number(qty || 1)
        };
      } else {
        newCart.push(ghostItem);
      }
      return newCart;
    });

    if (triggerNotification) {
      const pName = baseProduct.nombre || baseProduct.name || 'Producto';
      if (finalPromoPrice === 0) {
        triggerNotification(`Promo: ¡${pName} GRATIS añadido a tu carrito!`, 'success');
      } else {
        triggerNotification(`Promo: ¡${pName} añadido con descuento a $${finalPromoPrice.toFixed(2)}!`, 'success');
      }
    }
    setPendingPromoReward(null);
  };

  const breakPromoItems = (prevCart, cartItemIdBase, qtyToRemove) => {
    let newCart = [...prevCart];
    const itemToRemove = prevCart.find(i => i.cartItemId === cartItemIdBase);
    if (!itemToRemove) return prevCart;

    const promosList = promotionsRef.current || promotions;
    const activePromo = itemToRemove.promoId
      ? promosList.find(p => String(p.id) === String(itemToRemove.promoId))
      : getActivePromo(itemToRemove.id, itemToRemove.stock, itemToRemove.controlarStock, promosList);

    let remainingGhostToRemove = qtyToRemove;
    for (let i = newCart.length - 1; i >= 0; i--) {
      if (remainingGhostToRemove <= 0) break;
      const item = newCart[i];
      if (item.cartItemId === cartItemIdBase && item.isAutoPromo) {
        if (item.qty <= remainingGhostToRemove) {
          remainingGhostToRemove -= item.qty;
          newCart.splice(i, 1);
        } else {
          newCart[i] = { ...item, qty: item.qty - remainingGhostToRemove };
          remainingGhostToRemove = 0;
        }
      }
    }

    if (activePromo && (activePromo.type === 'NxM' || activePromo.type === 'BOGO')) {
      const applyList = parseIdArray(activePromo.applyToProducts || activePromo.apply_to_products);
      const triggerIds = applyList.length > 0
        ? applyList
        : [String(activePromo.productId || activePromo.product_id)].filter(Boolean);

      let parentsToRemove = 0;
      if (activePromo.type === 'NxM') {
        const payQty = Number(activePromo.payQty || activePromo.pay_qty || 1);
        const buyQty = Number(activePromo.buyQty || activePromo.buy_qty || 2);
        const ghostsPerPromo = Math.max(1, buyQty - payQty);
        const promosToBreak = Math.ceil(qtyToRemove / ghostsPerPromo);
        parentsToRemove = promosToBreak * payQty;
      } else if (activePromo.type === 'BOGO') {
        const reqQty = Number(activePromo.buyQty || activePromo.buy_qty || 1);
        const rewardQty = Number(activePromo.payQty || activePromo.pay_qty || 1);
        const promosToBreak = Math.ceil(qtyToRemove / Math.max(1, rewardQty));
        parentsToRemove = promosToBreak * reqQty;
      }

      for (let i = newCart.length - 1; i >= 0; i--) {
        if (parentsToRemove <= 0) break;
        const item = newCart[i];
        if (triggerIds.includes(String(item.id)) && (!item.isAutoPromo || item.promoLabel === 'OFERTA')) {
          if (item.qty <= parentsToRemove) {
            parentsToRemove -= item.qty;
            newCart.splice(i, 1);
          } else {
            newCart[i] = { ...item, qty: item.qty - parentsToRemove };
            parentsToRemove = 0;
          }
        }
      }
    }

    return newCart;
  };

  const checkRuptureAndExecute = (actionToCalculateNextCart, explicitlyDeletedGhost = false) => {
    const prev = cartRef.current;
    const rawNextCart = actionToCalculateNextCart(prev);
    const syncedNextCart = syncPromotions(rawNextCart);

    const isRewardGhost = (p) => p.isAutoPromo && p.promoLabel !== 'OFERTA';
    const prevGhosts = prev.filter(isRewardGhost).reduce((sum, p) => sum + p.qty, 0);
    const nextGhosts = syncedNextCart.filter(isRewardGhost).reduce((sum, p) => sum + p.qty, 0);

    if (nextGhosts < prevGhosts && !explicitlyDeletedGhost) {
      setPromoWarning({
        isOpen: true,
        message: `Al reducir o eliminar este artículo, se romperá una promoción y perderás un beneficio asociado. ¿Deseas continuar?`,
        onConfirm: () => {
          cartRef.current = syncedNextCart;
          _setCart(syncedNextCart);
          setPromoWarning({ isOpen: false, message: '', onConfirm: null, onCancel: null });
        },
        onCancel: () => setPromoWarning({ isOpen: false, message: '', onConfirm: null, onCancel: null })
      });
      return;
    }

    cartRef.current = syncedNextCart;
    _setCart(syncedNextCart);
  };

  const addToCart = (product, customizations = null) => {
    if (isProcessingRef.current) return false;
    isProcessingRef.current = true;

    try {
      const prev = cartRef.current;
      const currentTotalQty = prev
        .filter(item => String(item.id) === String(product.id) && item.status !== 'CANCELLED')
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
      let upsellNotification = null;
      let successNotification = null;

      let newCart = [...prev];
      let isNthGhost = false;
      let finalPromoPrice = 0;
      let safeActivePromo = null;

      if (activePromo) {
        const safeDiscountValue = Number(activePromo.discountValue || activePromo.discount_value || 0);
        safeActivePromo = { ...activePromo, discountValue: safeDiscountValue };

        const applyList = parseIdArray(activePromo.applyToProducts || activePromo.apply_to_products);
        const triggerIds = applyList.length > 0
          ? applyList
          : [String(activePromo.productId || activePromo.product_id)].filter(Boolean);

        if (activePromo.type === 'NTH_FIXED') {
          if (triggerIds.includes(String(product.id))) {
            const normalQtyInAccount = prev
              .filter(p => triggerIds.includes(String(p.id)) && (!p.isAutoPromo || p.promoLabel === 'OFERTA') && p.status !== 'CANCELLED')
              .reduce((a, b) => a + b.qty, 0);
            const ghostQtyInAccount = prev
              .filter(p => p.isAutoPromo && String(p.promoId) === String(activePromo.id) && p.promoLabel !== 'OFERTA' && p.status !== 'CANCELLED')
              .reduce((a, b) => a + b.qty, 0);

            const totalInCart = normalQtyInAccount + ghostQtyInAccount;
            const buyTotal = Number(activePromo.buyQty || activePromo.buy_qty || 2);

            if ((totalInCart + 1) % buyTotal === 0) {
              isNthGhost = true;
              finalPromoPrice = Math.max(0, finalPrice - safeDiscountValue);
            }
          }
        } else if (activePromo.type === 'COMBO') {
          if (triggerIds.includes(String(product.id)) && triggerIds.length > 0) {
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
        const isFixedPromo = activePromo?.type === 'FIXED';
        const discountFixed = isFixedPromo ? Number(activePromo.discountValue || activePromo.discount_value || 0) : 0;
        const unitPriceToCharge = isFixedPromo ? Math.max(0, finalPrice - discountFixed) : finalPrice;

        const index = newCart.findIndex(p => p.cartItemId === uniqueCartId && (!p.isAutoPromo || p.promoLabel === 'OFERTA'));

        if (index !== -1) {
          newCart[index] = {
            ...newCart[index],
            qty: newCart[index].qty + 1,
            precioUnitario: unitPriceToCharge,
            ...(isFixedPromo && {
              precioOriginal: finalPrice,
              promoLabel: 'OFERTA',
              isAutoPromo: true,
              promoId: activePromo.id,
              promoType: 'FIXED'
            })
          };
        } else {
          newCart.push({
            ...product,
            cartItemId: uniqueCartId,
            precioUnitario: unitPriceToCharge,
            precioBase: product.precioBase || product.precio || 0,
            qty: 1,
            detalles: finalDetails,
            status: 'ACTIVE',
            isTakeaway,
            isAutoPromo: isFixedPromo,
            ...(isFixedPromo && {
              precioOriginal: finalPrice,
              promoLabel: 'OFERTA',
              promoId: activePromo.id,
              promoType: 'FIXED'
            })
          });
        }

        if (isFixedPromo) {
          successNotification = `Promo: ¡${product.nombre} con -$${discountFixed.toFixed(2)} de descuento!`;
        }
      }

      if (activePromo && !isNthGhost) {
        const applyList = parseIdArray(activePromo.applyToProducts || activePromo.apply_to_products);
        const triggerIds = applyList.length > 0
          ? applyList
          : [String(activePromo.productId || activePromo.product_id)].filter(Boolean);

        if (activePromo.type === 'NxM') {
          const normalQtyInAccount = newCart
            .filter(p => triggerIds.includes(String(p.id)) && (!p.isAutoPromo || p.promoLabel === 'OFERTA') && p.status !== 'CANCELLED')
            .reduce((a, b) => a + b.qty, 0);

          const pay = Number(activePromo.payQty || activePromo.pay_qty || 1);
          const buy = Number(activePromo.buyQty || activePromo.buy_qty || 2);

          if (normalQtyInAccount > 0 && normalQtyInAccount % pay === 0) {
            const earnedGhosts = Math.max(1, buy - pay);

            if (triggerIds.length > 1) {
              rewardToTrigger = {
                promo: safeActivePromo,
                earnedGhosts,
                poolProductIds: triggerIds,
                discountValue: 0
              };
            } else {
              const { item: ghostItem } = buildGhostRewardItem(
                product,
                safeActivePromo,
                earnedGhosts,
                { precioFinal: finalPrice, detalles: finalDetails, isTakeaway }
              );

              const existingGhostIdx = newCart.findIndex(p =>
                p.cartItemId === ghostItem.cartItemId && p.isAutoPromo && String(p.promoId) === String(safeActivePromo.id) && p.status !== 'CANCELLED'
              );

              if (existingGhostIdx !== -1) {
                newCart[existingGhostIdx] = {
                  ...newCart[existingGhostIdx],
                  qty: newCart[existingGhostIdx].qty + earnedGhosts
                };
              } else {
                newCart.push(ghostItem);
              }

              successNotification = `Promo ${buy}x${pay}: ¡${product.nombre} GRATIS añadido a tu carrito!`;
            }
          } else if (normalQtyInAccount % pay > 0) {
            const missing = pay - (normalQtyInAccount % pay);
            upsellNotification = `¡Agrega ${missing} más para completar la promo ${buy}x${pay}!`;
          }
        } else if (activePromo.type === 'BOGO') {
          const reqQty = Number(activePromo.buyQty || activePromo.buy_qty || 1);
          const rewardQty = Number(activePromo.payQty || activePromo.pay_qty || 1);
          const parsedRewards = parseIdArray(activePromo.rewardProducts || activePromo.reward_products);
          const rewardIds = parsedRewards.length > 0 ? parsedRewards : triggerIds;

          const totalTriggerQty = newCart
            .filter(p => triggerIds.includes(String(p.id)) && (!p.isAutoPromo || p.promoLabel === 'OFERTA') && p.status !== 'CANCELLED')
            .reduce((a, b) => a + b.qty, 0);

          const bundles = Math.floor(totalTriggerQty / reqQty);
          const expectedGhosts = bundles * rewardQty;

          const currentGhosts = newCart
            .filter(p => p.isAutoPromo && String(p.promoId) === String(activePromo.id) && p.promoLabel !== 'OFERTA')
            .reduce((a, b) => a + b.qty, 0);

          if (expectedGhosts > currentGhosts) {
            const earnedGhosts = expectedGhosts - currentGhosts;
            rewardToTrigger = {
              promo: safeActivePromo,
              earnedGhosts,
              poolProductIds: rewardIds,
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
            .filter(p => p.isAutoPromo && String(p.promoId) === String(activePromo.id) && p.promoLabel !== 'OFERTA' && p.status !== 'CANCELLED')
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

      const hadTicketDiscountBefore = prev.some(i => i.isVirtualDiscount || i.promoType === 'TICKET_DISCOUNT');
      const finalSyncedCart = setCart(newCart);
      const newTicketDiscount = finalSyncedCart.find(i => i.isVirtualDiscount || i.promoType === 'TICKET_DISCOUNT');

      if (!hadTicketDiscountBefore && newTicketDiscount && !successNotification) {
        successNotification = `¡${newTicketDiscount.nombre} (-$${Math.abs(newTicketDiscount.precioUnitario).toFixed(2)}) aplicado a tu orden!`;
      }

      if (rewardToTrigger) {
        setPendingPromoReward(rewardToTrigger);
      }
      if (successNotification && triggerNotification) {
        triggerNotification(successNotification, 'success');
      } else if (upsellNotification && triggerNotification) {
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
      let notificationsToFire = new Set();

      setCart(prevCart => {
        let modifiedCart = prevCart.map(item => {
          const update = updates.find(u => String(u.id) === String(item.id));
          return update ? { ...item, stock: update.stock } : item;
        });

        for (const update of updates) {
          const itemsOfProduct = modifiedCart.filter(i => String(i.id) === String(update.id) && i.status !== 'CANCELLED');
          if (itemsOfProduct.length > 0 && itemsOfProduct[0].controlarStock) {
            let currentTotalQty = itemsOfProduct.reduce((sum, i) => sum + i.qty, 0);

            if (currentTotalQty > update.stock) {
              if (update.stock === 0) {
                notificationsToFire.add(JSON.stringify({ msg: `Un producto de tu carrito se agotó y fue retirado.`, type: 'error' }));
                modifiedCart = modifiedCart.filter(i => String(i.id) !== String(update.id));
              } else {
                notificationsToFire.add(JSON.stringify({ msg: `Ajustamos la cantidad de un producto por disponibilidad de stock.`, type: 'warning' }));
                for (let i = modifiedCart.length - 1; i >= 0; i--) {
                  const item = modifiedCart[i];
                  if (String(item.id) === String(update.id)) {
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

          (promotionsRef.current || []).forEach(promo => {
            const rawActive = promo.isActive ?? promo.is_active ?? promo.status;
            const isPActive = rawActive === true || rawActive === 1 || rawActive === 'true' || rawActive === '1';

            if (isPActive) {
              const applyList = parseIdArray(promo.applyToProducts || promo.apply_to_products);
              const rewardList = parseIdArray(promo.rewardProducts || promo.reward_products);
              const isTrigger = applyList.includes(String(update.id)) || String(promo.productId || promo.product_id) === String(update.id);
              const isReward = rewardList.includes(String(update.id));

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

        return modifiedCart;
      });

      if (triggerNotification && notificationsToFire.size > 0) {
        setTimeout(() => {
          notificationsToFire.forEach(notifStr => {
            const notif = JSON.parse(notifStr);
            triggerNotification(notif.msg, notif.type);
          });
        }, 0);
      }
    };

    socket.on('stock:update', handleStockAdjustment);
    return () => socket.off('stock:update', handleStockAdjustment);
  }, [triggerNotification]);

  const removeFromCart = (cartItemIdOrObj) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      let cartItemId = typeof cartItemIdOrObj === 'object' ? cartItemIdOrObj.cartItemId : cartItemIdOrObj;
      let breakQty = typeof cartItemIdOrObj === 'object' ? cartItemIdOrObj._breakPromoQty : null;

      if (typeof cartItemId === 'string' && cartItemId.includes('::BREAK::')) {
        const parts = cartItemId.split('::BREAK::');
        cartItemId = parts[0];
        breakQty = parseInt(parts[1], 10);
      }

      if (breakQty) {
        setCart(prev => breakPromoItems(prev, cartItemId, breakQty));
        return;
      }

      const targetItem = cartRef.current.find(i => i.cartItemId === cartItemId);
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
      let breakQty = typeof cartItemIdOrObj === 'object' ? cartItemIdOrObj._breakPromoQty : null;

      if (typeof cartItemId === 'string' && cartItemId.includes('::BREAK::')) {
        const parts = cartItemId.split('::BREAK::');
        cartItemId = parts[0];
        breakQty = parseInt(parts[1], 10);
      }

      if (breakQty) {
        const targetPromoItem = cartRef.current.find(i => i.cartItemId === cartItemId);
        setPromoWarning({
          isOpen: true,
          message: `Vas a cancelar la promoción de "${targetPromoItem?.nombre || 'Producto'}". Se restarán también los artículos asociados que la activan. ¿Deseas continuar?`,
          onConfirm: () => {
            setCart(prev => breakPromoItems(prev, cartItemId, breakQty));
            setPromoWarning({ isOpen: false, message: '', onConfirm: null, onCancel: null });
          },
          onCancel: () => setPromoWarning({ isOpen: false, message: '', onConfirm: null, onCancel: null })
        });
        return;
      }

      const targetItem = cartRef.current.find(i => i.cartItemId === cartItemId);
      if (!targetItem) return;

      const isDeletingPromo = Boolean(targetItem.isAutoPromo && targetItem.promoLabel !== 'OFERTA');

      checkRuptureAndExecute(prev => {
        return prev.filter(item => item.cartItemId !== cartItemId);
      }, isDeletingPromo);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const incrementInCart = (cartItemIdOrObj) => {
    const cartItemId = typeof cartItemIdOrObj === 'object' ? cartItemIdOrObj.cartItemId : cartItemIdOrObj;
    const existing = cartRef.current.find(item => item.cartItemId === cartItemId);
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