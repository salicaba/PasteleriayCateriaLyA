// frontend/src/modules/cafeteria/controllers/usePosCart.js
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

const formatAccountDisplayName = (str) => {
  if (!str) return 'General';
  const s = String(str);
  if (s.includes(' | ')) return s.split(' | ')[0].trim();
  if (s.includes(' - ')) {
    const parts = s.split(' - ');
    const possiblePhone = parts[parts.length - 1].replace(/\D/g, '');
    if (possiblePhone.length >= 10) return parts.slice(0, -1).join(' - ').trim();
  }
  return s;
};

export const usePosCart = (cuentaActiva, cuentasPagadasReales, triggerNotification) => {
  const [_cart, _setCart] = useState([]);
  const cartRef = useRef([]);
  const [promotions, setPromotions] = useState([]);
  const promotionsRef = useRef([]);
  const cuentasPagadasRef = useRef(cuentasPagadasReales || []);
  const isProcessingRef = useRef(false);

  const [pendingPromoReward, setPendingPromoReward] = useState(null);

  const [promoWarning, setPromoWarning] = useState({
    isOpen: false, message: '', onConfirm: null, onCancel: null
  });

  const [suspendedPromos, setSuspendedPromos] = useState([]);
  const alertedPromosRef = useRef(new Set());

  useEffect(() => {
    cartRef.current = _cart;
  }, [_cart]);

  useEffect(() => {
    promotionsRef.current = promotions;
  }, [promotions]);

  useEffect(() => {
    cuentasPagadasRef.current = cuentasPagadasReales || [];
  }, [cuentasPagadasReales]);

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const res = await api.get('/promotions');
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : (raw?.data || raw?.promotions || []);
        promotionsRef.current = list;
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
    const activePromosList = promotionsRef.current.length > 0 ? promotionsRef.current : promotions;
    if (!activePromosList || activePromosList.length === 0) return null;
    const today = new Date().getDay();

    const promo = activePromosList.find(p => {
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

    setCart(prev => {
      const newCart = [...prev];
      const existingGhostIdx = newCart.findIndex(p => 
        p.id === baseProduct.id && (p.cuenta || 'General') === (cuenta || 'General') && 
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
          cuenta: cuenta || 'General',
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
    const activePromosList = promotionsRef.current.length > 0 ? promotionsRef.current : promotions;
    const currentPaidAccounts = cuentasPagadasRef.current || cuentasPagadasReales || [];

    let cleanCart = [...cartState];
    const promoGroups = {}; 

    cleanCart.forEach(item => {
      if (item.status === 'CANCELLED' || item.enviadoCocina || item.isTransferred || item.isVirtualDiscount) return;
      
      let activePromo = null;
      if (item.isAutoPromo && item.promoId) {
        activePromo = activePromosList.find(p => p.id === item.promoId);
      } else {
        activePromo = getActivePromo(item.id, item.stock, item.controlarStock);
      }
      
      if (activePromo && ['NxM', 'BOGO', 'NTH_FIXED', 'COMBO'].includes(activePromo.type)) {
        const itemCuenta = item.cuenta || 'General';
        const key = `${activePromo.id}::${itemCuenta}`;
        if (!promoGroups[key]) promoGroups[key] = { normalQty: 0, triggerQtys: {}, ghosts: [], activePromo, cuenta: itemCuenta };
        
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
          if (item.isAutoPromo && item.promoId === group.activePromo.id && String(item.cuenta || 'General') === String(group.cuenta) && !item.enviadoCocina) {
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

    // 🔥 EL JEFE FINAL: EVALUACIÓN DE ÚLTIMA MILLA ESTRICTAMENTE POR CUENTA INDIVIDUAL (TICKET_DISCOUNT)
    const ticketPromos = activePromosList.filter(p => {
      const rawActive = p.isActive ?? p.is_active ?? p.status;
      const isActive = rawActive === true || rawActive === 1 || rawActive === 'true' || rawActive === '1';
      const daysRaw = p.validDays || p.valid_days;
      const validDays = parseValidDays(daysRaw);
      const today = new Date().getDay();
      const validToday = validDays.length === 0 || validDays.includes(today);
      return isActive && validToday && p.type === 'TICKET_DISCOUNT';
    });

    const cuentasEnCarrito = [...new Set(cleanCart.map(item => item.cuenta || 'General'))];

    cuentasEnCarrito.forEach(cuenta => {
      if (currentPaidAccounts.includes(cuenta)) return;

      const itemsCuenta = cleanCart.filter(item => (item.cuenta || 'General') === cuenta && item.status !== 'CANCELLED' && item.promoType !== 'TICKET_DISCOUNT' && !item.isVirtualDiscount);
      const subtotalCuenta = itemsCuenta.reduce((acc, item) => acc + (Number(item.precio) * item.qty), 0);

      const qualifyingPromos = ticketPromos
        .filter(p => subtotalCuenta > 0 && subtotalCuenta >= Number(p.minTicketAmount || p.min_ticket_amount || 0))
        .sort((a, b) => Number(b.minTicketAmount || b.min_ticket_amount || 0) - Number(a.minTicketAmount || a.min_ticket_amount || 0));

      const bestTicketPromo = qualifyingPromos[0];
      const ghostIdx = cleanCart.findIndex(item => (item.cuenta || 'General') === cuenta && (item.promoType === 'TICKET_DISCOUNT' || item.isVirtualDiscount));

      if (bestTicketPromo && itemsCuenta.length > 0) {
        const rawDiscount = Number(bestTicketPromo.discountValue || bestTicketPromo.discount_value || 0);
        const isPercentage = bestTicketPromo.discountType === 'PERCENTAGE';
        
        let finalDiscountPrice = isPercentage ? (subtotalCuenta * (rawDiscount / 100)) : rawDiscount;
        finalDiscountPrice = -Math.min(subtotalCuenta, Math.abs(finalDiscountPrice));

        if (ghostIdx !== -1) {
          if (cleanCart[ghostIdx].precio !== finalDiscountPrice || cleanCart[ghostIdx].promoId !== bestTicketPromo.id) {
            cleanCart[ghostIdx] = {
              ...cleanCart[ghostIdx],
              cuenta: cuenta,
              nombre: bestTicketPromo.name || 'Descuento por Cuenta',
              precio: finalDiscountPrice,
              precioOriginal: finalDiscountPrice,
              promoId: bestTicketPromo.id
            };
          }
        } else {
          cleanCart.push({
            id: `GLOBAL_DISCOUNT_${bestTicketPromo.id}_${cuenta}`,
            nombre: bestTicketPromo.name || 'Descuento por Cuenta',
            precioOriginal: finalDiscountPrice,
            precio: finalDiscountPrice,
            qty: 1,
            preparaciones: [{}],
            enviadoCocina: true,
            kitchenStatus: 'DELIVERED',
            status: 'ACTIVE',
            cuenta: cuenta,
            isAutoPromo: true,
            isVirtualDiscount: true,
            requiereCocina: false,
            promoId: bestTicketPromo.id,
            promoType: 'TICKET_DISCOUNT',
            promoLabel: 'DESCUENTO EXTRA'
          });
        }
      } else if (ghostIdx !== -1) {
        cleanCart.splice(ghostIdx, 1);
      }
    });

    return cleanCart;
  };

  const setCart = (action) => {
    _setCart(prev => {
      const nextCart = typeof action === 'function' ? action(prev) : action;
      const synced = syncPromotions(nextCart);
      cartRef.current = synced;
      return synced;
    });
  };

  // 🔥 FIX CLAVE: Re-evaluar el carrito apenas terminen de cargar las promociones del backend o cambien cuentas pagadas
  useEffect(() => {
    _setCart(prev => {
      if (!prev || prev.length === 0) return prev;
      const synced = syncPromotions(prev);
      cartRef.current = synced;
      return synced;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promotions, cuentasPagadasReales]);

  const checkRuptureAndExecute = (actionToCalculateNextCart, explicitlyDeletedGhost = false) => {
    setCart(prev => {
      const rawNextCart = actionToCalculateNextCart(prev);
      const syncedNextCart = syncPromotions(rawNextCart);
      
      const ghostLabels = ['GRATIS', 'PROMO', 'DESCUENTO EXTRA'];
      const prevGhosts = prev.filter(p => p.isAutoPromo && ghostLabels.includes(p.promoLabel)).reduce((sum, p) => sum + p.qty, 0);
      const nextGhosts = syncedNextCart.filter(p => p.isAutoPromo && ghostLabels.includes(p.promoLabel)).reduce((sum, p) => sum + p.qty, 0);

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
        return prev; 
      }
      return rawNextCart;
    });
  };

  // 🔥 GUARDIÁN 1: RUPTURA DE PROMOCIÓN AL MOVER UN PRODUCTO INDIVIDUAL ENTRE CUENTAS
  const checkAndExecuteMove = (item, targetCuenta, qtyToMove, onProceed, onCancelCallback) => {
    const sourceCuenta = item.cuenta || 'General';
    if (sourceCuenta === targetCuenta) {
      return onProceed({ revokeMovedItemPromo: false, revokePromos: [] });
    }

    const activePromosList = promotionsRef.current.length > 0 ? promotionsRef.current : promotions;
    const currentCart = cartRef.current;
    const sourceName = formatAccountDisplayName(sourceCuenta);
    const targetName = formatAccountDisplayName(targetCuenta);

    const brokenPromoNames = new Set();
    let revokeMovedItemPromo = false;
    const revokePromos = [];
    const unsentGhostsToRevert = [];

    if (item.isAutoPromo && !item.isVirtualDiscount) {
      const pObj = activePromosList.find(p => String(p.id) === String(item.promoId));
      brokenPromoNames.add(pObj?.name || item.promoLabel || `Promoción en ${item.nombre}`);
      revokeMovedItemPromo = true;
    }

    const sourceAccountItems = currentCart.filter(
      p => (p.cuenta || 'General') === sourceCuenta && p.status !== 'CANCELLED' && !p.isVirtualDiscount
    );

    const sourceGhosts = sourceAccountItems.filter(p => p.isAutoPromo && p !== item);

    sourceGhosts.forEach(ghost => {
      const promoDef = activePromosList.find(p => (ghost.promoId && String(p.id) === String(ghost.promoId))) 
        || getActivePromo(ghost.id, ghost.stock, ghost.controlarStock);

      const triggerIds = promoDef
        ? (Array.isArray(promoDef.applyToProducts) && promoDef.applyToProducts.length > 0
            ? promoDef.applyToProducts.map(String)
            : [String(promoDef.productId || promoDef.product_id || ghost.id)])
        : [String(ghost.id)];

      if (!triggerIds.includes(String(item.id))) return;

      const currentTriggerQty = sourceAccountItems
        .filter(p => triggerIds.includes(String(p.id)) && !p.isAutoPromo && Boolean(p.enviadoCocina) === Boolean(ghost.enviadoCocina))
        .reduce((sum, p) => sum + p.qty, 0);

      const remainingTriggerQty = Math.max(0, currentTriggerQty - (!item.isAutoPromo ? qtyToMove : 0));

      let supportedGhostsAfter = 0;
      const pType = promoDef?.type || ghost.promoType || 'NxM';

      if (pType === 'NxM') {
        const pay = Number(promoDef?.payQty || 1);
        const buy = Number(promoDef?.buyQty || 2);
        supportedGhostsAfter = Math.floor(remainingTriggerQty / pay) * Math.max(1, buy - pay);
      } else if (pType === 'BOGO') {
        const buyReq = Number(promoDef?.buyQty || 1);
        const rewardGiven = Number(promoDef?.payQty || 1);
        supportedGhostsAfter = Math.floor(remainingTriggerQty / buyReq) * rewardGiven;
      } else if (pType === 'NTH_FIXED') {
        const buyTotal = Number(promoDef?.buyQty || 2);
        const normalReq = Math.max(1, buyTotal - 1);
        supportedGhostsAfter = Math.floor(remainingTriggerQty / normalReq);
      } else if (pType === 'COMBO') {
        const minTriggerAfter = Math.min(...triggerIds.map(tId => {
          const totalOfTId = sourceAccountItems
            .filter(p => String(p.id) === tId && Boolean(p.enviadoCocina) === Boolean(ghost.enviadoCocina))
            .reduce((sum, p) => sum + p.qty, 0);
          return String(item.id) === tId ? Math.max(0, totalOfTId - qtyToMove) : totalOfTId;
        }));
        supportedGhostsAfter = minTriggerAfter;
      }

      if (ghost.qty > supportedGhostsAfter) {
        const qtyBroken = ghost.qty - supportedGhostsAfter;
        const promoTitle = promoDef?.name || ghost.promoLabel || `Promoción en ${ghost.nombre}`;
        brokenPromoNames.add(promoTitle);

        if (ghost.enviadoCocina && ghost.backendItemId) {
          revokePromos.push({ itemId: ghost.backendItemId, qtyToRevoke: qtyBroken });
        } else if (!ghost.enviadoCocina) {
          unsentGhostsToRevert.push({ ghostRef: ghost, qtyToRevert: qtyBroken });
        }
      }
    });

    const prevTicketDiscount = currentCart.find(
      p => (p.cuenta || 'General') === sourceCuenta && (p.isVirtualDiscount || p.promoType === 'TICKET_DISCOUNT')
    );

    if (prevTicketDiscount) {
      const currentSourceSubtotal = sourceAccountItems.reduce((acc, p) => acc + (Number(p.precio) * p.qty), 0);
      const movedAmount = Number(item.precio) * qtyToMove;
      const nextSourceSubtotal = Math.max(0, currentSourceSubtotal - movedAmount);

      const ticketPromoObj = activePromosList.find(p => String(p.id) === String(prevTicketDiscount.promoId));
      const minRequired = Number(ticketPromoObj?.minTicketAmount || ticketPromoObj?.min_ticket_amount || 0);

      if (nextSourceSubtotal < minRequired) {
        brokenPromoNames.add(prevTicketDiscount.nombre || 'Descuento por Cuenta');
      }
    }

    const executeWithRevert = () => {
      if (unsentGhostsToRevert.length > 0) {
        _setCart(prev => {
          const updated = [...prev];
          unsentGhostsToRevert.forEach(({ ghostRef, qtyToRevert }) => {
            const gIdx = updated.findIndex(p => p === ghostRef || (p.id === ghostRef.id && p.cuenta === ghostRef.cuenta && p.isAutoPromo && !p.enviadoCocina));
            if (gIdx !== -1) {
              const targetGhost = updated[gIdx];
              const regularPrice = Number(targetGhost.precioOriginal || targetGhost.precioBase || targetGhost.precio || 0);
              if (qtyToRevert >= targetGhost.qty) {
                updated[gIdx] = {
                  ...targetGhost,
                  precio: regularPrice,
                  isAutoPromo: false,
                  promoLabel: null,
                  promoId: null,
                  promoType: null,
                  isTransferred: true
                };
              } else {
                updated[gIdx] = {
                  ...targetGhost,
                  qty: targetGhost.qty - qtyToRevert,
                  preparaciones: targetGhost.preparaciones.slice(qtyToRevert)
                };
                updated.push({
                  ...targetGhost,
                  qty: qtyToRevert,
                  preparaciones: targetGhost.preparaciones.slice(0, qtyToRevert),
                  precio: regularPrice,
                  isAutoPromo: false,
                  promoLabel: null,
                  promoId: null,
                  promoType: null,
                  isTransferred: true
                });
              }
            }
          });
          cartRef.current = updated;
          return updated;
        });
      }

      onProceed({ revokeMovedItemPromo, revokePromos });
    };

    if (brokenPromoNames.size > 0) {
      const brokenList = Array.from(brokenPromoNames).join(', ');
      setPromoWarning({
        isOpen: true,
        message: `Al pasar este producto de "${sourceName}" a "${targetName}", se romperá la promoción "${brokenList}" en la cuenta de "${sourceName}". ¿Deseas continuar?`,
        onConfirm: () => {
          setPromoWarning({ isOpen: false, message: '', onConfirm: null, onCancel: null });
          executeWithRevert();
        },
        onCancel: () => {
          setPromoWarning({ isOpen: false, message: '', onConfirm: null, onCancel: null });
          if (onCancelCallback) onCancelCallback();
        }
      });
      return;
    }

    executeWithRevert();
  };

  // 🔥 GUARDIÁN 2: RUPTURA DE PROMOCIÓN AL UNIR CUENTAS COMPLETAS
  const checkAndExecuteMerge = (sourceCuenta, targetCuenta, onProceed, onCancelCallback) => {
    if (!sourceCuenta || !targetCuenta || sourceCuenta === targetCuenta) {
      if (onCancelCallback) onCancelCallback();
      return;
    }

    const activePromosList = promotionsRef.current.length > 0 ? promotionsRef.current : promotions;
    const currentCart = cartRef.current;
    const sourceName = formatAccountDisplayName(sourceCuenta);
    const targetName = formatAccountDisplayName(targetCuenta);

    const brokenPromoNames = new Set();

    // 1. Detectar promociones de artículos activas en la cuenta origen (se revocarán al moverse)
    const sourcePromoItems = currentCart.filter(
      p => (p.cuenta || 'General') === sourceCuenta && p.status !== 'CANCELLED' && p.isAutoPromo && !p.isVirtualDiscount
    );

    sourcePromoItems.forEach(item => {
      const promoDef = activePromosList.find(p => (item.promoId && String(p.id) === String(item.promoId)))
        || getActivePromo(item.id, item.stock, item.controlarStock);
      brokenPromoNames.add(promoDef?.name || item.promoLabel || `Promoción en ${item.nombre}`);
    });

    // 2. Detectar si ambas cuentas tenían Descuento por Ticket por separado (al unirlas solo quedará 1 descuento por cuenta)
    const sourceTicketDiscount = currentCart.find(
      p => (p.cuenta || 'General') === sourceCuenta && (p.isVirtualDiscount || p.promoType === 'TICKET_DISCOUNT')
    );
    const targetTicketDiscount = currentCart.find(
      p => (p.cuenta || 'General') === targetCuenta && (p.isVirtualDiscount || p.promoType === 'TICKET_DISCOUNT')
    );

    if (sourceTicketDiscount && targetTicketDiscount) {
      brokenPromoNames.add(`${sourceTicketDiscount.nombre || 'Descuento por Cuenta'} (se unificará en una sola cuenta)`);
    }

    if (brokenPromoNames.size > 0) {
      const brokenList = Array.from(brokenPromoNames).join(', ');
      setPromoWarning({
        isOpen: true,
        message: `Al unir la cuenta de "${sourceName}" con "${targetName}", se perderá la promoción "${brokenList}" de "${sourceName}" (solo se mantendrá el Descuento por Ticket en "${targetName}" si cumple la meta). ¿Deseas continuar?`,
        onConfirm: () => {
          setPromoWarning({ isOpen: false, message: '', onConfirm: null, onCancel: null });
          onProceed();
        },
        onCancel: () => {
          setPromoWarning({ isOpen: false, message: '', onConfirm: null, onCancel: null });
          if (onCancelCallback) onCancelCallback();
        }
      });
      return;
    }

    onProceed();
  };

  const addToCart = (productWithDetails, forceCuenta = null) => {
    if (isProcessingRef.current) return false;
    isProcessingRef.current = true;

    try {
      const targetCuenta = forceCuenta || cuentaActiva || 'General';
      if (cuentasPagadasReales.includes(targetCuenta)) {
        if (triggerNotification) triggerNotification(`La cuenta "${targetCuenta}" está sellada.`, 'error');
        return false; 
      }

      if (productWithDetails.controlarStock) {
        const currentUnsent = getUnsentQtyOfProduct(_cart, productWithDetails.id);
        if (currentUnsent + 1 > productWithDetails.stock) {
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
      let successNotification = null;

      setCart(prev => {
        const isEligiblePromoTrigger = (p) => 
          (p.cuenta || 'General') === targetCuenta && 
          p.status !== 'CANCELLED' && 
          !p.enviadoCocina && 
          !p.isTransferred;

        const detailStr = JSON.stringify(finalDetails);
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

            if (triggerIds.includes(String(productWithDetails.id))) {
              const normalQtyInAccount = prev.filter(p => triggerIds.includes(String(p.id)) && isEligiblePromoTrigger(p) && !p.isAutoPromo).reduce((a, b) => a + b.qty, 0);
              const ghostQtyInAccount = prev.filter(p => p.isAutoPromo && p.promoId === activePromo.id && isEligiblePromoTrigger(p)).reduce((a, b) => a + b.qty, 0);
              
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
              ? activePromo.applyToProducts.map(String) 
              : [];

            if (triggerIds.includes(String(productWithDetails.id))) {
              const currentBundles = Math.min(...triggerIds.map(id => 
                prev.filter(p => String(p.id) === id && isEligiblePromoTrigger(p)).reduce((a,b)=>a+b.qty, 0)
              ));

              const triggerQtysAfter = {};
              triggerIds.forEach(id => {
                let qty = prev.filter(p => String(p.id) === id && isEligiblePromoTrigger(p)).reduce((a,b)=>a+b.qty, 0);
                if (id === String(productWithDetails.id)) qty += 1;
                triggerQtysAfter[id] = qty;
              });
              
              const newBundles = Math.min(...triggerIds.map(id => triggerQtysAfter[id]));

              if (newBundles > currentBundles) {
                isNthGhost = true;
                
                let otherItemsSum = 0;
                triggerIds.forEach(id => {
                  if (id !== String(productWithDetails.id)) {
                    const item = prev.find(p => String(p.id) === id && isEligiblePromoTrigger(p));
                    if (item) otherItemsSum += Number(item.precioOriginal || item.precio);
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
          const ghostIndex = newCart.findIndex(p => 
            p.id === productWithDetails.id && 
            Number(p.precio).toFixed(2) === Number(finalPromoPrice).toFixed(2) && 
            (p.cuenta || 'General') === targetCuenta && 
            !!p.isTakeaway === !!productWithDetails.isTakeaway && 
            p.isAutoPromo && 
            p.promoId === safeActivePromo.id &&
            !p.enviadoCocina && 
            p.preparaciones.every(prep => JSON.stringify(prep) === detailStr)
          );

          if (ghostIndex !== -1) {
            newCart[ghostIndex] = { ...newCart[ghostIndex], qty: newCart[ghostIndex].qty + 1, preparaciones: [...newCart[ghostIndex].preparaciones, finalDetails] };
          } else {
            newCart.push({ 
              ...productWithDetails, 
              precioOriginal: finalPrice, 
              precio: finalPromoPrice, 
              qty: 1, 
              preparaciones: [finalDetails], 
              enviadoCocina: false, 
              status: 'ACTIVE', 
              cuenta: targetCuenta, 
              isTakeaway: productWithDetails.isTakeaway || false, 
              requiereCocina: productWithDetails.requiereCocina !== false, 
              isAutoPromo: true,
              promoLabel: finalPromoPrice === 0 ? 'GRATIS' : 'PROMO',
              promoId: safeActivePromo.id,
              promoType: safeActivePromo.type
            });
          }
          if (activePromo?.type === 'NTH_FIXED') {
            successNotification = `Promo: ¡${productWithDetails.nombre} añadido con descuento a $${finalPromoPrice.toFixed(2)}!`;
          }
        } else {
          const index = newCart.findIndex(p => 
            p.id === productWithDetails.id && Number(p.precio).toFixed(2) === Number(finalPrice).toFixed(2) && !p.enviadoCocina && 
            (p.cuenta || 'General') === targetCuenta && !!p.isTakeaway === !!productWithDetails.isTakeaway && 
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
        }

        if (activePromo && !isNthGhost) {
          const triggerIds = Array.isArray(activePromo.applyToProducts) && activePromo.applyToProducts.length > 0 
            ? activePromo.applyToProducts.map(String) 
            : [String(activePromo.productId || activePromo.product_id)];

          if (activePromo.type === 'NxM') {
            const normalQtyInAccount = newCart
              .filter(p => triggerIds.includes(String(p.id)) && isEligiblePromoTrigger(p) && !p.isAutoPromo)
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
              .filter(p => triggerIds.includes(String(p.id)) && isEligiblePromoTrigger(p) && !p.isAutoPromo)
              .reduce((a, b) => a + b.qty, 0);
            
            const bundles = Math.floor(totalTriggerQty / reqQty);
            const expectedGhosts = bundles * rewardQty;
            
            const currentGhosts = newCart
              .filter(p => p.isAutoPromo && p.promoId === activePromo.id && (p.cuenta || 'General') === targetCuenta)
              .reduce((a, b) => a + b.qty, 0);

            if (expectedGhosts > currentGhosts) {
              const earnedGhosts = expectedGhosts - currentGhosts;
              rewardToTrigger = {
                promo: safeActivePromo,
                earnedGhosts: earnedGhosts,
                targetCuenta,
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
            const normalQtyInAccount = newCart.filter(p => triggerIds.includes(String(p.id)) && isEligiblePromoTrigger(p) && !p.isAutoPromo).reduce((a, b) => a + b.qty, 0);
            const ghostQtyInAccount = newCart.filter(p => p.isAutoPromo && p.promoId === activePromo.id && isEligiblePromoTrigger(p)).reduce((a, b) => a + b.qty, 0);
            
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

      if (rewardToTrigger) {
        setPendingPromoReward(rewardToTrigger);
      }
      if (autoClaimNxM) {
        setTimeout(() => claimPromoReward(autoClaimNxM.productWithDetails, autoClaimNxM.activePromo, autoClaimNxM.targetCuenta, autoClaimNxM.earnedGhosts), 0);
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
      const isDeletingPromo = Boolean(itemToRemove.isAutoPromo);
      
      checkRuptureAndExecute((prev) => {
        const newCart = [...prev];
        const prepStr = JSON.stringify(itemToRemove.preparaciones[0] || {});
        const idx = newCart.findIndex(p => p.id === itemToRemove.id && Number(p.precio).toFixed(2) === Number(itemToRemove.precio).toFixed(2) && (p.cuenta || 'General') === (itemToRemove.cuenta || 'General') && !!p.isTakeaway === !!itemToRemove.isTakeaway && !p.enviadoCocina && JSON.stringify(p.preparaciones[0] || {}) === prepStr);
        if (idx !== -1) {
          newCart[idx] = { ...newCart[idx], qty: newCart[idx].qty - 1, preparaciones: newCart[idx].preparaciones.slice(0, -1) };
          if (newCart[idx].qty <= 0) newCart.splice(idx, 1);
        }
        return newCart;
      }, isDeletingPromo);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const deleteLine = (itemToRemove) => { 
    if (isProcessingRef.current || itemToRemove.enviadoCocina) return;
    isProcessingRef.current = true;
    try {
      const isDeletingPromo = Boolean(itemToRemove.isAutoPromo);

      checkRuptureAndExecute((prev) => {
        const prepStr = JSON.stringify(itemToRemove.preparaciones[0] || {});
        return prev.filter(p => !(p.id === itemToRemove.id && (p.cuenta || 'General') === (itemToRemove.cuenta || 'General') && !!p.isTakeaway === !!itemToRemove.isTakeaway && !p.enviadoCocina && JSON.stringify(p.preparaciones[0] || {}) === prepStr));
      }, isDeletingPromo);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const toggleItemTakeaway = (itemToToggle) => {
    if (isProcessingRef.current || itemToToggle.enviadoCocina) return;
    isProcessingRef.current = true;

    try {
      setCart(prev => {
        const newCart = [...prev];
        const prepStr = JSON.stringify(itemToToggle.preparaciones[0] || {});
        const idx = newCart.findIndex(p => p.id === itemToToggle.id && Number(p.precio).toFixed(2) === Number(itemToToggle.precio).toFixed(2) && (p.cuenta || 'General') === (itemToToggle.cuenta || 'General') && !!p.isTakeaway === !!itemToToggle.isTakeaway && !p.enviadoCocina && JSON.stringify(p.preparaciones[0] || {}) === prepStr);

        if (idx !== -1) {
          const currentItem = newCart[idx];
          const targetTakeawayState = !currentItem.isTakeaway;
          
          if (currentItem.qty === 1) { 
            newCart[idx] = { ...currentItem, isTakeaway: targetTakeawayState }; 
          } else {
            const prepToMove = currentItem.preparaciones[currentItem.preparaciones.length - 1];
            newCart[idx] = { ...currentItem, qty: currentItem.qty - 1, preparaciones: currentItem.preparaciones.slice(0, -1) };
            
            const existingTargetIdx = newCart.findIndex(p => p.id === currentItem.id && Number(p.precio).toFixed(2) === Number(currentItem.precio).toFixed(2) && (p.cuenta || 'General') === (currentItem.cuenta || 'General') && !!p.isTakeaway === targetTakeawayState && !p.enviadoCocina && JSON.stringify(p.preparaciones[0] || {}) === prepStr);
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
  const hasUnsentItems = useMemo(() => _cart.some(p => !p.enviadoCocina && !p.isVirtualDiscount), [_cart]);
  const getSubtotalByCuenta = (nombreCuenta) => {
    if (cuentasPagadasReales.includes(nombreCuenta)) return 0;
    return _cart.filter(item => (item.cuenta || 'General') === (nombreCuenta || 'General') && item.status !== 'CANCELLED').reduce((acc, curr) => acc + (curr.precio * curr.qty), 0);
  };
  const getProductQty = (id) => _cart.filter(p => p.id === id && !p.enviadoCocina && (p.cuenta || 'General') === (cuentaActiva || 'General') && p.status !== 'CANCELLED' && (!p.isAutoPromo || p.promoLabel === 'OFERTA')).reduce((acc, item) => acc + item.qty, 0);

  const clearCartByAccount = (cuentaTarget) => setCart(prev => prev.filter(item => (item.cuenta || 'General') !== (cuentaTarget || 'General')));
  const clearEntireCart = () => setCart([]);

  return {
    cart: _cart, setCart, addToCart, removeFromCart, deleteLine, toggleItemTakeaway, total, unsentTotal, hasUnsentItems, getSubtotalByCuenta, getProductQty,
    clearCartByAccount, clearEntireCart,
    promoWarning, confirmPromoRupture: () => promoWarning.onConfirm && promoWarning.onConfirm(), cancelPromoRupture: () => promoWarning.onCancel && promoWarning.onCancel(),
    pendingPromoReward, setPendingPromoReward, claimPromoReward,
    suspendedPromos,
    checkAndExecuteMove,
    checkAndExecuteMerge
  };
};