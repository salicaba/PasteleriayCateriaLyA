import { useState, useMemo, useEffect, useRef } from 'react';

// Hooks de Dominio
import { usePosNotifications } from './usePosNotifications.js';
import { usePosMenu } from './usePosMenu.js';
import { usePosAccounts } from './usePosAccounts.js';
import { usePosCart } from './usePosCart.js';
import { usePosMutations } from './usePosMutations.js';

export const usePosController = (mesaInicial, isOpen, todasLasMesas = [], showToast, onTableRelease, onClose, inline) => {
  // 1. Determinar Mesa Activa
  const mesaActual = useMemo(() => {
    if (!mesaInicial) return null;
    return todasLasMesas.find(m => m.id === mesaInicial.id) || mesaInicial;
  }, [mesaInicial, todasLasMesas]);

  const isVitrina = mesaActual?.zona === 'vitrina';

  // 2. Estado Global de la Orden
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [orderStatus, setOrderStatus] = useState('OPEN');

  // 3. Inyección de Módulos (Hooks Especializados)
  const { notification, triggerNotification } = usePosNotifications();
  const menu = usePosMenu(isVitrina);
  const accounts = usePosAccounts();

  const cartLogic = usePosCart(accounts.cuentaActiva, accounts.cuentasPagadasReales, showToast || triggerNotification);

  // 🔥 1. PRIMERO declaramos mutations
  const mutations = usePosMutations({
    cart: cartLogic.cart,
    setCart: cartLogic.setCart,
    activeOrderId, 
    setActiveOrderId,
    mesaActual,
    setCuentasTelefonos: accounts.setCuentasTelefonos,
    setPaidAccounts: accounts.setPaidAccounts,
    setOrderStatus,
    cuentasPagadasReales: accounts.cuentasPagadasReales,
    triggerNotification: showToast || triggerNotification 
  });

  // 🔥 2. LUEGO declaramos el candado (Cooldown Lock)
  const [isSyncLocked, setIsSyncLocked] = useState(false);
  const syncLockTimeout = useRef(null);

  // 🔥 3. AHORA SÍ usamos el useEffect del candado
  useEffect(() => {
    if (mutations.isProcessing) {
      setIsSyncLocked(true);
      if (syncLockTimeout.current) clearTimeout(syncLockTimeout.current);
      return;
    }

    syncLockTimeout.current = setTimeout(() => {
      setIsSyncLocked(false);
    }, 1500);

    return () => clearTimeout(syncLockTimeout.current);
  }, [mutations.isProcessing]);


  // 4. EL ORQUESTADOR DE SINCRONIZACIÓN (Base de Datos a UI)
  const { setCart, clearEntireCart, clearCartByAccount } = cartLogic;
  const { 
    setPaidAccounts, 
    setNombresCuentas, 
    setCuentaActiva, 
    setCuentasTelefonos,
    sincronizarCuentas 
  } = accounts;

  // Variables Primitivas para useEffect
  const mesaId = mesaActual?.id;
  const mesaEstado = mesaActual?.estado;
  const mesaOrderId = mesaActual?.orderId;
  const mesaOrderStatus = mesaActual?.status || mesaActual?.orderStatus; // 🔥 FIX: Leemos .status de la BD
  
  // 🔥 FIX BBDD UNIVERSAL PARA LLEVAR Y MOSTRADOR
  const rawItems = mesaActual?.items || mesaActual?.orderItems || mesaActual?.OrderItems || [];
  const dbItemsString = JSON.stringify(rawItems);
  const paidAccountsString = JSON.stringify(mesaActual?.paidAccounts || []);

  // 🔥 EFECTO 1: EL BORRADOR INMORTAL
  useEffect(() => {
    if (isOpen && mesaId) {
      const unsentDraft = cartLogic.cart.filter(p => !p.enviadoCocina && p.status !== 'CANCELLED');
      if (unsentDraft.length > 0) {
        localStorage.setItem(`lya_draft_${mesaId}`, JSON.stringify(unsentDraft));
      } else {
        localStorage.removeItem(`lya_draft_${mesaId}`);
      }
    }
  }, [cartLogic.cart, isOpen, mesaId]);

  // 🔥 EFECTO 2: ORQUESTADOR PRINCIPAL (Fusión de BD + Borrador)
  useEffect(() => {
    if (mutations.isProcessing || isSyncLocked) return;

    if (!isOpen) {
        setCart([]); 
        setActiveOrderId(null); 
        setOrderStatus('OPEN'); 
        setPaidAccounts([]);
        setNombresCuentas(['General']); 
        setCuentaActiva('General');
        setCuentasTelefonos({});
        return;
    }

    let recoveredDraft = [];
    try {
      const draftStr = localStorage.getItem(`lya_draft_${mesaId}`);
      if (draftStr) recoveredDraft = JSON.parse(draftStr);
    } catch (e) {}

    // 🔥 FIX: Seguro de Vida para Mesas Virtuales
    const isLlevarVirtual = mesaActual?.zona === 'llevar' || mesaActual?.orderType === 'LLEVAR';
    const isMesaActiva = isVitrina || isLlevarVirtual || mesaEstado === 'ocupada' || mesaOrderId != null || activeOrderId != null || rawItems.length > 0;

    if (isMesaActiva) {
        setActiveOrderId(mesaOrderId || activeOrderId);
        // 🔥 FIX: Actualizamos el estatus con el valor real de la base de datos
        setOrderStatus(mesaActual?.status || mesaActual?.orderStatus || orderStatus || 'OPEN');
        
        let loadedPaidAccounts = [];
        try { loadedPaidAccounts = JSON.parse(paidAccountsString); } catch(e) {}

        if (mesaOrderId) {
            const storedPhones = localStorage.getItem(`lya_phones_${mesaOrderId}`);
            if (storedPhones) try { setCuentasTelefonos(JSON.parse(storedPhones)); } catch(e) {}

            const storedPaid = localStorage.getItem(`lya_paid_${mesaOrderId}`);
            if (storedPaid) {
                try {
                  const parsedPaid = JSON.parse(storedPaid);
                  loadedPaidAccounts = Array.from(new Set([...loadedPaidAccounts, ...parsedPaid]));
                } catch(e) {}
            }
        }
        
        setPaidAccounts(prev => Array.from(new Set([...prev, ...loadedPaidAccounts])));

        let dbItems = [];
        try { dbItems = JSON.parse(dbItemsString); } catch(e) {}

        const loadedCart = dbItems.map(item => {
            let parsedPreps = [];
            if (item.notes) {
                try { parsedPreps = JSON.parse(item.notes); } 
                catch(e) { parsedPreps = [{ detalles: "Personalización cargada" }]; }
            }
            if (!Array.isArray(parsedPreps)) parsedPreps = [parsedPreps || {}];

            // 🛡️ ESCUDO ANTI-ZOMBIES
            const prevLocal = cartLogic.cart.find(p => String(p.backendItemId) === String(item.id));
            const safeStatus = (prevLocal && prevLocal.status === 'CANCELLED') ? 'CANCELLED' : (item.status || 'ACTIVE');

            return {
                id: item.productId,
                nombre: item.product?.name || item.product?.nombre || 'Producto',
                imagen: item.product?.imageUrl || null,
                precio: parseFloat(item.subtotal) / (item.quantity || 1),
                qty: item.quantity,
                preparaciones: parsedPreps,
                enviadoCocina: true,
                kitchenStatus: item.kitchenStatus,
                status: safeStatus, 
                cuenta: item.cuenta || 'General',
                isTakeaway: item.isTakeaway || false,
                backendItemId: String(item.id),
                requiereCocina: item.product?.requiereCocina !== false,
                isAutoPromo: item.isAutoPromo || false,
                promoLabel: item.promoLabel || null,
                precioOriginal: item.precioOriginal || null
            };
        });

        setCart(prev => {
            const localItems = prev.filter(p => !p.enviadoCocina);
            const activeLocals = localItems.length > 0 ? localItems : recoveredDraft;

            const sentButNotLoaded = prev.filter(p => {
                if (!p.enviadoCocina) return false;
                
                if (p.backendItemId && p.backendItemId !== 'undefined' && p.backendItemId !== 'null') {
                     const exactMatch = loadedCart.some(loaded => String(loaded.backendItemId) === String(p.backendItemId));
                     if (exactMatch) return false; 
                     return true; 
                }
                
                const contentMatch = loadedCart.some(loaded => 
                     String(loaded.id) === String(p.id) && 
                     loaded.cuenta === (p.cuenta || 'General') &&
                     Number(loaded.precio).toFixed(2) === Number(p.precio).toFixed(2)
                );
                
                return !contentMatch; 
            });

            const finalCart = [...loadedCart, ...sentButNotLoaded, ...activeLocals];
            
            if (sincronizarCuentas) {
                sincronizarCuentas({
                    items: finalCart.map(i => ({ ...i, status: 'ACTIVE' })),
                    paidAccounts: loadedPaidAccounts
                });
            } else {
                const reales = new Set(['General', ...loadedPaidAccounts, ...finalCart.map(i => i.cuenta || 'General')]);
                setNombresCuentas(prevN => {
                    const purgadas = prevN.filter(c => reales.has(c));
                    return purgadas.length > 0 ? purgadas : ['General'];
                });
                setCuentaActiva(prevA => reales.has(prevA) ? prevA : 'General');
            }

            return finalCart;
        });
        
    } else {
        setActiveOrderId(null);
        setOrderStatus('OPEN');
        setPaidAccounts([]);

        setCart(prev => {
            const localItems = prev.filter(p => !p.enviadoCocina);
            const activeLocals = localItems.length > 0 ? localItems : recoveredDraft;

            if (sincronizarCuentas) {
                sincronizarCuentas({
                    items: activeLocals.map(i => ({ ...i, status: 'ACTIVE' })),
                    paidAccounts: []
                });
            }
            return activeLocals;
        });
    }

  // 🔥 FIX MAESTRO: Removemos isSyncLocked y mutations.isProcessing del array de dependencias 
  // para evitar que el efecto se dispare de forma prematura y sobrescriba los cambios visuales de entrega.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isOpen, mesaId, mesaOrderId, dbItemsString, paidAccountsString, activeOrderId, mesaActual?.status]);

// 🔥 WRAPPERS CON ANIMACIÓN DE CARGA Y ACTUALIZACIÓN FLUIDA
  const wrappedCancelFullOrder = async (motivo) => {
      // 1. Esperamos a que el backend procese (el botón mostrará su animación de carga)
      await mutations.cancelFullOrder(motivo);
      if (clearEntireCart) clearEntireCart();
      localStorage.removeItem(`lya_draft_${mesaId}`);
      
      // 2. Al terminar con éxito, actualizamos la UI y cerramos con elegancia
      setCart(prev => prev.map(item => ({ ...item, status: 'CANCELLED' })));
      setActiveOrderId(null); 
      setOrderStatus('OPEN');

      if (onTableRelease) onTableRelease(mesaId);
      if (onClose && !inline) onClose();
  };

  const wrappedCancelAccountItems = async (cuenta, motivo) => {
      // 1. Esperamos al backend (botón con carga)
      await mutations.cancelAccountItems(cuenta, motivo);
      if (clearCartByAccount) clearCartByAccount(cuenta);
      
      // 2. Actualizamos la UI al instante al recibir respuesta
      setCart(prev => prev.map(item => 
          ((item.cuenta || 'General') === cuenta) ? { ...item, status: 'CANCELLED' } : item
      ));
      
      const remainingUnsent = cartLogic.cart.filter(p => p.cuenta !== cuenta && !p.enviadoCocina && p.status !== 'CANCELLED');
      if (remainingUnsent.length === 0) {
          localStorage.removeItem(`lya_draft_${mesaId}`);
      }
  };

  const wrappedCancelItem = async (itemId, cancelReason, cancelQty) => {
      // 1. Esperamos al backend (botón con carga)
      await mutations.cancelItem(itemId, cancelReason, cancelQty);

      // 2. Actualizamos la UI al instante para que el producto desaparezca de la comanda sin refrescar
      setCart(prev => prev.map(item => {
          if (String(item.backendItemId) === String(itemId) || String(item.id) === String(itemId)) {
              if (cancelQty && cancelQty < item.qty) {
                  return { ...item, qty: item.qty - cancelQty };
              } else {
                  return { ...item, status: 'CANCELLED' };
              }
          }
          return item;
      }));
  };

  const cuentasDisponibles = useMemo(() => 
    Array.from(new Set([...accounts.nombresCuentas, ...cartLogic.cart.map(i => i.cuenta || 'General')])), 
  [cartLogic.cart, accounts.nombresCuentas]);

  const cuentasCancelables = useMemo(() => {
    const cuentasVivas = cartLogic.cart
      .filter(item => item.status !== 'CANCELLED')
      .map(item => item.cuenta || 'General');
    return Array.from(new Set(cuentasVivas));
  }, [cartLogic.cart]);

  return { 
    cart: cartLogic.cart, 
    total: cartLogic.total, 
    unsentTotal: cartLogic.unsentTotal, 
    hasUnsentItems: cartLogic.hasUnsentItems, 
    addToCart: cartLogic.addToCart, 
    removeFromCart: cartLogic.removeFromCart, 
    deleteLine: cartLogic.deleteLine, 
    toggleItemTakeaway: cartLogic.toggleItemTakeaway, 
    getProductQty: cartLogic.getProductQty,
    getSubtotalByCuenta: cartLogic.getSubtotalByCuenta,
    
    promoWarning: cartLogic.promoWarning,
    confirmPromoRupture: cartLogic.confirmPromoRupture,
    cancelPromoRupture: cartLogic.cancelPromoRupture,
    
    filtroTexto: menu.filtroTexto, 
    setFiltroTexto: menu.setFiltroTexto, 
    categoriaActiva: menu.categoriaActiva, 
    setCategoriaActiva: menu.setCategoriaActiva, 
    filteredProducts: menu.filteredProducts, 
    dbCategories: menu.dbCategories,
    
    cuentaActiva: accounts.cuentaActiva, 
    setCuentaActiva: accounts.setCuentaActiva, 
    cuentasDisponibles, 
    cuentasCancelables,
    addNewCuenta: (n, t) => accounts.addNewCuenta(n, t, activeOrderId), 
    paidAccounts: accounts.paidAccounts,
    cuentasTelefonos: accounts.cuentasTelefonos,
    
    orderStatus,
    isSuccess: mutations.isSuccess, 
    isProcessing: mutations.isProcessing,
    simulateKitchenSend: mutations.simulateKitchenSend,
    moveItemToCuenta: mutations.moveItemToCuenta,
    toggleDeliveredStatus: mutations.toggleDeliveredStatus,
    handleCheckout: mutations.handleCheckout, 
    handleCloseTable: mutations.handleCloseTable, 
    handlePrintTicket: mutations.handlePrintTicket,
    payCuenta: mutations.payCuenta,
    validateAllDelivered: mutations.validateAllDelivered,
    deliverAllActiveItems: mutations.deliverAllActiveItems, 
    cancelItem: wrappedCancelItem,  // 🔥 AQUÍ: Cambia mutations.cancelItem por wrappedCancelItem
    cancelFullOrder: wrappedCancelFullOrder, 
    cancelAccountItems: wrappedCancelAccountItems, 
    releaseAccount: mutations.releaseAccount,
    
    notification, 
    triggerNotification: showToast || triggerNotification 
  };
};