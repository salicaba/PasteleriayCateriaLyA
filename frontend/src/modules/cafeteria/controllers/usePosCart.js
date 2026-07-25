// frontend/src/modules/pos/controllers/usePosCart.js
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
        setPromotions(list);
      } catch (error) {
        console.error("Error cargando promociones en el carrito:", error);
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

    const promo = promotions.find(p => {
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

  const getUnsentQtyOfProduct = (cartState, productId) => {
    return cartState
      .filter(p => p.id === productId && !p.enviadoCocina && p.status !== 'CANCELLED')
      .reduce((acc, item) => acc + item.qty, 0);
  };

  const syncPromotions = (cartState) => {
    let cleanCart = [...cartState];
    const normalQtys = {};
    const ghostQtys = {};
    const normalItemsMap = {};

    cleanCart.forEach(item => {
      if (item.status === 'CANCELLED') return;
      const key = `${item.id}::${item.cuenta}`;
      
      const isTrueGhost = item.isAutoPromo && item.promoLabel !== 'OFERTA';
      
      if (isTrueGhost || Number(item.precio) === 0) {
        ghostQtys[key] = (ghostQtys[key] || 0) + item.qty;
      } else {
        normalQtys[key] = (normalQtys[key] || 0) + item.qty;
        if (!normalItemsMap[key]) normalItemsMap[key] = item;
      }
    });

    const allKeys = new Set([...Object.keys(normalQtys), ...Object.keys(ghostQtys)]);

    allKeys.forEach(key => {
      const [productId, ...cuentaParts] = key.split('::');
      const cuenta = cuentaParts.join('::');
      
      const sampleItem = normalItemsMap[key] || cleanCart.find(p => String(p.id) === String(productId));
      const activePromo = getActivePromo(productId, sampleItem?.stock, sampleItem?.controlarStock);
      
      let expectedGhosts = 0;
      let ghostPrice = 0;
      let ghostLabel = '';

      if (activePromo) {
        if (activePromo.type === 'NxM') {
          const buy = Number(activePromo.buyQty || activePromo.buy_qty || 2);
          const pay = Number(activePromo.payQty || activePromo.pay_qty || 1);
          expectedGhosts = Math.floor((normalQtys[key] || 0) / pay) * (buy - pay);
          ghostLabel = 'GRATIS';
        } else if (activePromo.type === 'NTH_FIXED') {
          const nth = Number(activePromo.buyQty || activePromo.buy_qty || 2);
          const totalItems = (normalQtys[key] || 0) + (ghostQtys[key] || 0);
          expectedGhosts = Math.floor(totalItems / nth);
          ghostPrice = Number(activePromo.discountValue || activePromo.discount_value || 0);
          ghostLabel = `${nth}º REBAJADO`;
        }
      }

      const currentGhosts = ghostQtys[key] || 0;

      if (currentGhosts > expectedGhosts) {
        let toRemove = currentGhosts - expectedGhosts;
        for (let i = cleanCart.length - 1; i >= 0; i--) {
          const item = cleanCart[i];
          const isTrueGhost = item.isAutoPromo && item.promoLabel !== 'OFERTA';

          if ((isTrueGhost || Number(item.precio) === 0) && String(item.id) === String(productId) && String(item.cuenta) === String(cuenta)) {
            
            if (activePromo?.type === 'NTH_FIXED' || (item.promoLabel && item.promoLabel.includes('Promo #'))) {
               const originalPrice = item.precioOriginal || item.precioBase || item.precio;
               const prepsToRestore = item.preparaciones.slice(0, toRemove);
               const prepStr = JSON.stringify(prepsToRestore[0] || {});
               
               const existingNormalIdx = cleanCart.findIndex(p => String(p.id) === String(productId) && String(p.cuenta) === String(cuenta) && !p.isAutoPromo && p.precio === originalPrice && JSON.stringify(p.preparaciones[0] || {}) === prepStr);

               if (toRemove >= item.qty) {
                  toRemove -= item.qty;
                  if (existingNormalIdx !== -1 && existingNormalIdx !== i) {
                      cleanCart[existingNormalIdx] = { ...cleanCart[existingNormalIdx], qty: cleanCart[existingNormalIdx].qty + item.qty, preparaciones: [...cleanCart[existingNormalIdx].preparaciones, ...item.preparaciones] };
                      cleanCart.splice(i, 1);
                  } else {
                      cleanCart[i] = { ...item, precio: originalPrice, isAutoPromo: false, promoLabel: undefined, promoId: undefined, promoType: undefined };
                  }
               } else {
                  const prepsToKeep = item.preparaciones.slice(toRemove);
                  cleanCart[i] = { ...item, qty: item.qty - toRemove, preparaciones: prepsToKeep };
                  if (existingNormalIdx !== -1) {
                      cleanCart[existingNormalIdx] = { ...cleanCart[existingNormalIdx], qty: cleanCart[existingNormalIdx].qty + toRemove, preparaciones: [...cleanCart[existingNormalIdx].preparaciones, ...prepsToRestore] };
                  } else {
                      const revertedItem = { ...item, qty: toRemove, precio: originalPrice, isAutoPromo: false, promoLabel: undefined, preparaciones: prepsToRestore, promoId: undefined, promoType: undefined };
                      cleanCart.push(revertedItem);
                  }
                  toRemove = 0;
               }
            } else {
               if (toRemove >= item.qty) {
                  toRemove -= item.qty;
                  cleanCart.splice(i, 1);
               } else {
                  cleanCart[i] = { ...item, qty: item.qty - toRemove, preparaciones: item.preparaciones.slice(0, item.qty - toRemove) };
                  toRemove = 0;
               }
            }
            if (toRemove === 0) break;
          }
        }
      } 
      else if (currentGhosts < expectedGhosts && activePromo && sampleItem) {
         let missing = expectedGhosts - currentGhosts;
         const promoMetadata = { promoId: activePromo.id, promoType: activePromo.type };
         
         if (activePromo.type === 'NTH_FIXED') {
            for (let i = cleanCart.length - 1; i >= 0; i--) {
               const item = cleanCart[i];
               if (!item.isAutoPromo && Number(item.precio) > 0 && String(item.id) === String(productId) && String(item.cuenta) === String(cuenta)) {
                  
                  const baseOriginal = parseFloat(item.precioBase || item.precio || 0);
                  const costoExtras = parseFloat(item.precio) - baseOriginal;
                  const finalGhostPrice = ghostPrice + (costoExtras > 0 ? costoExtras : 0);

                  const qtyToConvert = Math.min(missing, item.qty);
                  const prepsToConvert = item.preparaciones.slice(0, qtyToConvert);
                  const prepStr = JSON.stringify(prepsToConvert[0] || {});

                  const existingPromoIdx = cleanCart.findIndex(p => String(p.id) === String(productId) && String(p.cuenta) === String(cuenta) && p.isAutoPromo === true && p.promoLabel === ghostLabel && p.precio === finalGhostPrice && JSON.stringify(p.preparaciones[0] || {}) === prepStr);

                  if (item.qty <= missing) {
                     missing -= item.qty;
                     if (existingPromoIdx !== -1 && existingPromoIdx !== i) {
                         cleanCart[existingPromoIdx] = { ...cleanCart[existingPromoIdx], qty: cleanCart[existingPromoIdx].qty + item.qty, preparaciones: [...cleanCart[existingPromoIdx].preparaciones, ...item.preparaciones] };
                         cleanCart.splice(i, 1);
                     } else {
                         cleanCart[i] = { ...item, precioOriginal: item.precio, precio: finalGhostPrice, isAutoPromo: true, promoLabel: ghostLabel, ...promoMetadata };
                     }
                  } else {
                     const prepsToKeep = item.preparaciones.slice(missing);
                     cleanCart[i] = { ...item, qty: item.qty - missing, preparaciones: prepsToKeep };
                     
                     if (existingPromoIdx !== -1) {
                         cleanCart[existingPromoIdx] = { ...cleanCart[existingPromoIdx], qty: cleanCart[existingPromoIdx].qty + missing, preparaciones: [...cleanCart[existingPromoIdx].preparaciones, ...prepsToConvert] };
                     } else {
                         const convertedItem = { ...item, qty: missing, precioOriginal: item.precio, precio: finalGhostPrice, isAutoPromo: true, promoLabel: ghostLabel, preparaciones: prepsToConvert, ...promoMetadata };
                         cleanCart.push(convertedItem);
                     }
                     missing = 0;
                  }
                  if (missing === 0) break;
               }
            }
         } else if (activePromo.type === 'NxM') {
            let ops = sampleItem.opciones;
            if (typeof ops === 'string') { try { ops = JSON.parse(ops); } catch (e) { ops = null; } }
            
            let ghostDetails = {};
            if (ops && typeof ops === 'object') {
               if (ops.defaults?.tamano) ghostDetails.tamano = ops.defaults.tamano;
               if (ops.defaults?.leche) ghostDetails.leche = ops.defaults.leche;
               ghostDetails.extras = []; 
            }

            let ghostOriginalPrice = parseFloat(sampleItem.precioBase || sampleItem.precio || 0);
            const defaultCustoms = getDefaultCustomizations(sampleItem);
            if (defaultCustoms && defaultCustoms.precioFinal) {
               ghostOriginalPrice = defaultCustoms.precioFinal;
            }

            const existingGhostIdx = cleanCart.findIndex(i => String(i.id) === String(productId) && String(i.cuenta) === String(cuenta) && i.isAutoPromo === true && i.promoLabel === ghostLabel && i.status !== 'CANCELLED' && !i.enviadoCocina);

            if (existingGhostIdx !== -1) {
              const updatedGhost = { ...cleanCart[existingGhostIdx] };
              updatedGhost.qty += missing;
              updatedGhost.preparaciones = [...updatedGhost.preparaciones, ...Array(missing).fill(ghostDetails)];
              cleanCart[existingGhostIdx] = updatedGhost;
            } else {
              cleanCart.push({
                ...sampleItem,
                nombre: sampleItem.nombre, 
                precioOriginal: ghostOriginalPrice, 
                promoLabel: ghostLabel,            
                precio: 0, 
                qty: missing,
                preparaciones: Array(missing).fill(ghostDetails), 
                enviadoCocina: false,
                status: 'ACTIVE',
                cuenta: cuenta,
                isAutoPromo: true,
                requiereCocina: sampleItem.requiereCocina !== false,
                backendItemId: undefined,
                ...promoMetadata
              });
            }
         }
      }
    });

    cleanCart = cleanCart.map(item => {
      if (item.isAutoPromo && item.promoLabel !== 'OFERTA') return item; 
      const activePromo = getActivePromo(item.id, item.stock, item.controlarStock);
      
      if (activePromo && activePromo.type === 'FIXED') {
        const baseOriginal = parseFloat(item.precioBase || item.precioOriginal || item.precio || 0);
        const discountFixed = Number(activePromo.discountValue || 0);
        
        const costoExtras = parseFloat(item.precioOriginal || item.precio) - baseOriginal;
        const expectedPrice = discountFixed + (costoExtras > 0 ? costoExtras : 0);

        if (item.precio !== expectedPrice) {
          return { 
            ...item, 
            precioOriginal: item.precioOriginal || item.precio, 
            precio: expectedPrice, 
            promoLabel: 'OFERTA', 
            isAutoPromo: true,
            promoId: activePromo.id,
            promoType: activePromo.type 
          };
        }
      } else if (item.promoLabel === 'OFERTA' && (!activePromo || activePromo.type !== 'FIXED')) {
        return { 
          ...item, 
          precio: item.precioOriginal || item.precio, 
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
        const promoKey = `${item.promoId}::${item.cuenta}`;
        currentPromoQtys[promoKey] = (currentPromoQtys[promoKey] || 0) + item.qty;
      }
    });

    if (triggerNotification) {
      Object.keys(currentPromoQtys).forEach(promoKey => {
        const newQty = currentPromoQtys[promoKey];
        const oldQty = notifiedPromos.current[promoKey] || 0;

        if (newQty > oldQty) {
          const [promoId, cuenta] = promoKey.split('::');
          const promoItem = cleanCart.find(item => String(item.promoId) === promoId && String(item.cuenta) === cuenta);
          
          if (promoItem) {
            const multiplierText = newQty > 1 ? ` x${newQty}` : '';
            const baseMsg = promoItem.cuenta !== 'General' ? ` en ${promoItem.cuenta}` : '';

            setTimeout(() => {
              if (promoItem.promoType === 'NxM') {
                triggerNotification(`Promo Automática: ¡${promoItem.nombre} GRATIS${baseMsg}!${multiplierText}`, 'success');
              } else if (promoItem.promoType === 'NTH_FIXED') {
                triggerNotification(`Descuento aplicado en ${promoItem.nombre}${baseMsg}${multiplierText}`, 'success');
              } else if (promoItem.promoType === 'FIXED') {
                triggerNotification(`Rebaja directa en ${promoItem.nombre}${baseMsg}${multiplierText}`, 'success');
              }
            }, 50);
          }
        }
      });
      notifiedPromos.current = currentPromoQtys;
    }

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
      let needsWarning = false;
      let ruptureProductName = '';

      const getNormalQtys = (cartState) => {
        const qtys = {};
        cartState.forEach(item => {
          const isTrueGhost = item.isAutoPromo && item.promoLabel !== 'OFERTA';
          if (item.status === 'CANCELLED' || isTrueGhost || Number(item.precio) === 0) return;
          const key = `${item.id}::${item.cuenta}`;
          qtys[key] = (qtys[key] || 0) + item.qty;
        });
        return qtys;
      };

      const prevQtys = getNormalQtys(prev);
      const nextQtys = getNormalQtys(nextCart);

      for (const key of Object.keys(prevQtys)) {
        const [productId, ...cuentaParts] = key.split('::');
        const cuenta = cuentaParts.join('::');
        
        const sampleItem = prev.find(p => String(p.id) === String(productId));
        const activePromo = getActivePromo(productId, sampleItem?.stock, sampleItem?.controlarStock);
        
        if (activePromo) {
           let prevExpectedGhosts = 0;
           let nextExpectedGhosts = 0;
           
           const currentGhosts = prev.filter(p => 
             String(p.id) === String(productId) && 
             String(p.cuenta) === String(cuenta) && 
             (p.isAutoPromo && p.promoLabel !== 'OFERTA') && 
             p.status !== 'CANCELLED'
           ).reduce((a, b) => a + b.qty, 0);

           if (activePromo.type === 'NTH_FIXED') {
              const nth = Number(activePromo.buyQty || activePromo.buy_qty || 2);
              prevExpectedGhosts = Math.floor((prevQtys[key] || 0) / (nth - 1));
              nextExpectedGhosts = Math.floor((nextQtys[key] || 0) / (nth - 1));
           } else if (activePromo.type === 'NxM') {
              const buy = Number(activePromo.buyQty || activePromo.buy_qty || 2);
              const pay = Number(activePromo.payQty || activePromo.pay_qty || 1);
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

  const addToCart = (productWithDetails, forceCuenta = null) => {
    if (isProcessingRef.current) return false;
    isProcessingRef.current = true;

    try {
      const targetCuenta = forceCuenta || cuentaActiva;

      if (cuentasPagadasReales.includes(targetCuenta)) {
          if (triggerNotification) triggerNotification(`La cuenta "${targetCuenta}" está sellada. Selecciona una nueva.`, 'error');
          return false; 
      }

      const activePromo = getActivePromo(productWithDetails.id, productWithDetails.stock, productWithDetails.controlarStock);
      
      let qtyToAdd = 1; 
      let willAddExtraGhost = false; 
      let isSubstitutingWithGhost = false; 
      let ghostPrice = 0;
      let ghostLabel = '';
      let extraGhostQty = 0;

      if (activePromo) {
        if (activePromo.type === 'NxM') {
          const normalQtyInAccount = _cart.filter(p => p.id === productWithDetails.id && p.cuenta === targetCuenta && (!p.isAutoPromo || p.promoLabel === 'OFERTA') && Number(p.precio) > 0 && p.status !== 'CANCELLED').reduce((a, b) => a + b.qty, 0);
          const buy = Number(activePromo.buyQty || activePromo.buy_qty || 2);
          const pay = Number(activePromo.payQty || activePromo.pay_qty || 1);
          
          if ((normalQtyInAccount + 1) % pay === 0) {
            willAddExtraGhost = true;
            extraGhostQty = buy - pay;
            qtyToAdd += extraGhostQty; 
            ghostPrice = 0;
            ghostLabel = 'GRATIS';
          }
        } else if (activePromo.type === 'NTH_FIXED') {
          const totalQtyInAccount = _cart.filter(p => p.id === productWithDetails.id && p.cuenta === targetCuenta && p.status !== 'CANCELLED').reduce((a, b) => a + b.qty, 0);
          const nth = Number(activePromo.buyQty || activePromo.buy_qty || 2);
          
          if ((totalQtyInAccount + 1) % nth === 0) {
            isSubstitutingWithGhost = true;
            ghostPrice = Number(activePromo.discountValue || activePromo.discount_value || 0);
            ghostLabel = `${nth}º REBAJADO`;
          }
        }
      }

      if (productWithDetails.controlarStock) {
        const currentUnsent = getUnsentQtyOfProduct(_cart, productWithDetails.id);
        if (currentUnsent + qtyToAdd > productWithDetails.stock) {
            if (triggerNotification) triggerNotification(`Stock insuficiente. Intentas añadir ${qtyToAdd} (incluyendo promo) pero quedan ${productWithDetails.stock - currentUnsent}.`, 'warning');
            return false; 
        }
      }
      
      let finalDetails = productWithDetails.detalles || {};
      let finalPrice = parseFloat(productWithDetails.precioFinal || productWithDetails.precioBase || productWithDetails.precio || 0);
      
      let precioOriginalParaTachar = null; 
      let isAutoPromoFlag = false;
      let mainPromoLabel = undefined;
      let promoMetadata = {};

      if (isSubstitutingWithGhost) {
        const baseOriginal = parseFloat(productWithDetails.precioBase || productWithDetails.precio || 0);
        const costoExtras = finalPrice - baseOriginal;
        precioOriginalParaTachar = finalPrice;
        finalPrice = ghostPrice + (costoExtras > 0 ? costoExtras : 0);
        isAutoPromoFlag = true;
        mainPromoLabel = ghostLabel;
        promoMetadata = { promoId: activePromo.id, promoType: activePromo.type };
      } else if (activePromo && activePromo.type === 'FIXED') {
        const baseOriginal = parseFloat(productWithDetails.precioBase || productWithDetails.precio || 0);
        const discountFixed = Number(activePromo.discountValue || activePromo.discount_value || 0);
        const costoExtras = finalPrice - baseOriginal;
        precioOriginalParaTachar = finalPrice; 
        finalPrice = discountFixed + (costoExtras > 0 ? costoExtras : 0);
        mainPromoLabel = 'OFERTA';
        isAutoPromoFlag = true;
        promoMetadata = { promoId: activePromo.id, promoType: activePromo.type };
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
            p.id === productWithDetails.id && Number(p.precio).toFixed(2) === Number(finalPrice).toFixed(2) && !p.enviadoCocina && 
            p.cuenta === targetCuenta && !!p.isTakeaway === !!productWithDetails.isTakeaway && 
            (!p.isAutoPromo || p.promoLabel === 'OFERTA') && 
            p.preparaciones.every(prep => JSON.stringify(prep) === detailStr)
        );

        if (index !== -1) {
            newCart[index] = { ...newCart[index], qty: newCart[index].qty + 1, preparaciones: [...newCart[index].preparaciones, finalDetails] };
        } else {
            newCart.push({ 
              ...productWithDetails, precio: finalPrice, precioOriginal: precioOriginalParaTachar, promoLabel: mainPromoLabel,
              qty: 1, preparaciones: [finalDetails], enviadoCocina: false, status: 'ACTIVE', cuenta: targetCuenta, 
              isTakeaway: productWithDetails.isTakeaway || false, requiereCocina: productWithDetails.requiereCocina !== false, 
              isAutoPromo: isAutoPromoFlag, ...promoMetadata
            });
        }

        if (willAddExtraGhost) {
          let ops = productWithDetails.opciones;
          if (typeof ops === 'string') {
            try { ops = JSON.parse(ops); } catch (e) { ops = null; }
          }
          
          let ghostDetails = {};
          if (ops && typeof ops === 'object') {
              if (ops.defaults?.tamano) ghostDetails.tamano = ops.defaults.tamano;
              if (ops.defaults?.leche) ghostDetails.leche = ops.defaults.leche;
              ghostDetails.extras = []; 
          }

          let ghostOriginalPrice = parseFloat(productWithDetails.precioBase || productWithDetails.precio || 0);
          const defaultCustoms = getDefaultCustomizations(productWithDetails);
          if (defaultCustoms && defaultCustoms.precioFinal) {
              ghostOriginalPrice = defaultCustoms.precioFinal;
          }

          const existingGhostIdx = newCart.findIndex(p => 
              p.id === productWithDetails.id && p.cuenta === targetCuenta && 
              p.isAutoPromo === true && p.promoLabel === ghostLabel && 
              p.status !== 'CANCELLED' && !p.enviadoCocina
          );

          if (existingGhostIdx !== -1) {
              newCart[existingGhostIdx] = { 
                  ...newCart[existingGhostIdx], 
                  qty: newCart[existingGhostIdx].qty + extraGhostQty,
                  preparaciones: [...newCart[existingGhostIdx].preparaciones, ...Array(extraGhostQty).fill(ghostDetails)]
              };
          } else {
              newCart.push({
                ...productWithDetails, nombre: productWithDetails.nombre, precioOriginal: ghostOriginalPrice, promoLabel: ghostLabel, precio: 0, 
                qty: extraGhostQty, preparaciones: Array(extraGhostQty).fill(ghostDetails), enviadoCocina: false, status: 'ACTIVE', cuenta: targetCuenta,
                isAutoPromo: true, requiereCocina: productWithDetails.requiereCocina !== false, promoId: activePromo.id, promoType: activePromo.type
              });
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
  }, [triggerNotification, promotions]); 

  const removeFromCart = (itemToRemove) => { 
    if (isProcessingRef.current || itemToRemove.enviadoCocina) return;
    isProcessingRef.current = true;

    try {
      checkRuptureAndExecute((prev) => {
          const newCart = [...prev];
          const prepStr = JSON.stringify(itemToRemove.preparaciones[0] || {});
          
          const idx = newCart.findIndex(p => 
            p.id === itemToRemove.id && Number(p.precio).toFixed(2) === Number(itemToRemove.precio).toFixed(2) && p.cuenta === itemToRemove.cuenta && 
            !!p.isTakeaway === !!itemToRemove.isTakeaway && !p.enviadoCocina && 
            JSON.stringify(p.preparaciones[0] || {}) === prepStr
          );
          
          if (idx !== -1) {
              const isTrueGhost = newCart[idx].isAutoPromo && newCart[idx].promoLabel !== 'OFERTA';
              if (isTrueGhost) return prev;
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
        const isTrueGhost = itemToRemove.isAutoPromo && itemToRemove.promoLabel !== 'OFERTA';
        if (isTrueGhost) return prev;
        
        const prepStr = JSON.stringify(itemToRemove.preparaciones[0] || {});
        return prev.filter(p => !(
          p.id === itemToRemove.id && p.cuenta === itemToRemove.cuenta && 
          !!p.isTakeaway === !!itemToRemove.isTakeaway && !p.enviadoCocina && 
          JSON.stringify(p.preparaciones[0] || {}) === prepStr
        ));
      });
    } finally {
      isProcessingRef.current = false;
    }
  };

  const toggleItemTakeaway = (itemToToggle) => {
    if (isProcessingRef.current || itemToToggle.enviadoCocina) return;
    const isTrueGhost = itemToToggle.isAutoPromo && itemToToggle.promoLabel !== 'OFERTA';
    if (isTrueGhost) return;

    isProcessingRef.current = true;

    try {
      setCart(prev => {
        const newCart = [...prev];
        const prepStr = JSON.stringify(itemToToggle.preparaciones[0] || {});
        const idx = newCart.findIndex(p => 
          p.id === itemToToggle.id && Number(p.precio).toFixed(2) === Number(itemToToggle.precio).toFixed(2) && p.cuenta === itemToToggle.cuenta && 
          !!p.isTakeaway === !!itemToToggle.isTakeaway && !p.enviadoCocina && JSON.stringify(p.preparaciones[0] || {}) === prepStr
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
              p.id === currentItem.id && Number(p.precio).toFixed(2) === Number(currentItem.precio).toFixed(2) && p.cuenta === currentItem.cuenta && 
              !!p.isTakeaway === targetTakeawayState && !p.enviadoCocina && JSON.stringify(p.preparaciones[0] || {}) === prepStr
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

  return {
    cart: _cart, setCart, addToCart, removeFromCart, deleteLine, toggleItemTakeaway, total, unsentTotal, hasUnsentItems, getSubtotalByCuenta, getProductQty,
    promoWarning, confirmPromoRupture: () => promoWarning.onConfirm && promoWarning.onConfirm(), cancelPromoRupture: () => promoWarning.onCancel && promoWarning.onCancel()
  };
};