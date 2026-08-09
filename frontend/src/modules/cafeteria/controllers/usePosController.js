// src/modules/cafeteria/controllers/usePosController.js
import { useState, useMemo, useEffect } from 'react';

// Hooks de Dominio
import { usePosNotifications } from './usePosNotifications.js';
import { usePosMenu } from './usePosMenu.js';
import { usePosAccounts } from './usePosAccounts.js';
import { usePosCart } from './usePosCart.js';
import { usePosMutations } from './usePosMutations.js';

export const usePosController = (mesaInicial, isOpen, todasLasMesas = [], showToast) => {
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
  const mesaOrderStatus = mesaActual?.orderStatus;
  
  const dbItemsString = JSON.stringify(mesaActual?.items || []);
  const paidAccountsString = JSON.stringify(mesaActual?.paidAccounts || []);

  // 🔥 EFECTO 1: EL BORRADOR INMORTAL (Auto-Save en tiempo real)
  useEffect(() => {
    if (isOpen && mesaId) {
      // Filtramos solo lo que el empleado ha tecleado pero NO ha enviado a cocina
      const unsentDraft = cartLogic.cart.filter(p => !p.enviadoCocina && p.status !== 'CANCELLED');
      if (unsentDraft.length > 0) {
        localStorage.setItem(`lya_draft_${mesaId}`, JSON.stringify(unsentDraft));
      } else {
        // Si el carrito está vacío o todo ya fue enviado, limpiamos el borrador
        localStorage.removeItem(`lya_draft_${mesaId}`);
      }
    }
  }, [cartLogic.cart, isOpen, mesaId]);

  // 🔥 EFECTO 2: ORQUESTADOR PRINCIPAL (Fusión de BD + Borrador)
  useEffect(() => {
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

    // RECUPERAR EL BORRADOR DE LOCALSTORAGE
    let recoveredDraft = [];
    try {
      const draftStr = localStorage.getItem(`lya_draft_${mesaId}`);
      if (draftStr) recoveredDraft = JSON.parse(draftStr);
    } catch (e) {}

    if (mesaEstado === 'ocupada') {
        setActiveOrderId(mesaOrderId);
        setOrderStatus(mesaOrderStatus || 'OPEN');
        
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

            return {
                id: item.productId,
                nombre: item.product?.name || item.product?.nombre || 'Producto',
                imagen: item.product?.imageUrl || null,
                precio: parseFloat(item.subtotal) / item.quantity,
                qty: item.quantity,
                preparaciones: parsedPreps,
                enviadoCocina: true,
                kitchenStatus: item.kitchenStatus,
                status: item.status || 'ACTIVE',
                cuenta: item.cuenta || 'General',
                isTakeaway: item.isTakeaway || false,
                backendItemId: item.id,
                requiereCocina: item.product?.requiereCocina !== false 
            };
        });

        setCart(prev => {
            const localItems = prev.filter(p => !p.enviadoCocina);
            // 🔥 FUSIÓN BINDADA: Si el estado local se borró (porque te sacó el sistema), usamos el borrador rescatado
            const activeLocals = localItems.length > 0 ? localItems : recoveredDraft;

            // 🔥 FIX CLONAJE: Evita que 2 productos se vuelvan 4 al enviar a cocina
            const sentButNotLoaded = prev.filter(p => {
                if (!p.enviadoCocina) return false;
                
                // Si el item ya tenía ID de base de datos, verificamos si desapareció
                if (p.backendItemId) {
                     return !loadedCart.some(loaded => loaded.backendItemId === p.backendItemId);
                }
                
                // Si es un producto local RECIÉN enviado (no tiene backendItemId aún),
                // comprobamos si el loadedCart ya nos devolvió ese mismo producto para esa cuenta
                const yaLlegoDeLaBD = loadedCart.some(loaded => 
                     loaded.id === p.id && loaded.cuenta === p.cuenta
                );
                
                // Si ya llegó de la BD, destruimos el clon local para no duplicar.
                return !yaLlegoDeLaBD; 
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
        // 🔥 FIX 400: MESA LIBRE -> Debemos purgar el ID de la orden cancelada 
        // para que no intente inyectar productos nuevos a un ticket muerto.
        setActiveOrderId(null);
        setOrderStatus('OPEN');
        setPaidAccounts([]);

        // Solo usamos el carrito local o el borrador recuperado
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mesaId, mesaEstado, mesaOrderId, mesaOrderStatus, dbItemsString, paidAccountsString]);

  // 🔥 WRAPPERS ANTI-ZOMBIES: Limpiamos la memoria y matamos el Error 400
  const wrappedCancelFullOrder = async (motivo) => {
      await mutations.cancelFullOrder(motivo);
      if (clearEntireCart) clearEntireCart();
      localStorage.removeItem(`lya_draft_${mesaId}`);
      
      setActiveOrderId(null); // <-- DESTRUYE EL CADÁVER (Previene Error 400)
      setOrderStatus('OPEN');
  };

  const wrappedCancelAccountItems = async (cuenta, motivo) => {
      await mutations.cancelAccountItems(cuenta, motivo);
      if (clearCartByAccount) clearCartByAccount(cuenta);
      
      const remainingUnsent = cartLogic.cart.filter(p => p.cuenta !== cuenta && !p.enviadoCocina && p.status !== 'CANCELLED');
      if (remainingUnsent.length === 0) {
          localStorage.removeItem(`lya_draft_${mesaId}`);
      }

      // Si ya no queda NADA vivo en el carrito, matamos el ID de la orden
      const remainingActive = cartLogic.cart.filter(p => p.cuenta !== cuenta && p.status !== 'CANCELLED');
      if (remainingActive.length === 0) {
          setActiveOrderId(null); // <-- DESTRUYE EL CADÁVER
          setOrderStatus('OPEN');
      }
  };

  // 5. Cálculos Derivados (Orquestados)
  const cuentasDisponibles = useMemo(() => 
    Array.from(new Set([...accounts.nombresCuentas, ...cartLogic.cart.map(i => i.cuenta || 'General')])), 
  [cartLogic.cart, accounts.nombresCuentas]);

  // 6. RETORNO DE API PÚBLICA (Compatibilidad 100% garantizada)
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
    cancelItem: mutations.cancelItem, 
    cancelFullOrder: wrappedCancelFullOrder, 
    cancelAccountItems: wrappedCancelAccountItems, 
    releaseAccount: mutations.releaseAccount,
    
    notification, 
    triggerNotification: showToast || triggerNotification 
  };
};