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
  const { setCart } = cartLogic;
  const { 
    setPaidAccounts, 
    setNombresCuentas, 
    setCuentaActiva, 
    setCuentasTelefonos,
    sincronizarCuentas // 🔥 EXTRAEMOS EL PURGADOR DE FANTASMAS
  } = accounts;

  // Variables Primitivas para useEffect
  const mesaId = mesaActual?.id;
  const mesaEstado = mesaActual?.estado;
  const mesaOrderId = mesaActual?.orderId;
  const mesaOrderStatus = mesaActual?.orderStatus;
  
  const dbItemsString = JSON.stringify(mesaActual?.items || []);
  const paidAccountsString = JSON.stringify(mesaActual?.paidAccounts || []);

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

    if (mesaEstado === 'ocupada') {
        setActiveOrderId(mesaOrderId);
        setOrderStatus(mesaOrderStatus || 'OPEN');
        
        let loadedPaidAccounts = [];
        try { loadedPaidAccounts = JSON.parse(paidAccountsString); } catch(e) {}

        if (mesaOrderId) {
            // RECUPERAR TELÉFONOS
            const storedPhones = localStorage.getItem(`lya_phones_${mesaOrderId}`);
            if (storedPhones) try { setCuentasTelefonos(JSON.parse(storedPhones)); } catch(e) {}

            // ESCUDO CONTRA AMNESIA DE BD: RECUPERAR PAGOS LOCALES
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
            const sentButNotLoaded = prev.filter(p => p.enviadoCocina && !loadedCart.some(loaded => loaded.backendItemId === p.backendItemId));
            const finalCart = [...loadedCart, ...sentButNotLoaded, ...localItems];
            
            // 🔥 INYECCIÓN DE LA SOLUCIÓN AL BUG 2:
            // Ejecutamos el purgador con la "verdad absoluta" combinando BD y Locales
            if (sincronizarCuentas) {
                sincronizarCuentas({
                    // Forzamos status ACTIVE para que el hook de cuentas reconozca los locales
                    items: finalCart.map(i => ({ ...i, status: 'ACTIVE' })),
                    paidAccounts: loadedPaidAccounts
                });
            } else {
                // Fallback de seguridad estricta
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
        // Mesa libre (sin BD) -> Solo usamos el carrito local
        setCart(prev => {
            if (sincronizarCuentas) {
                sincronizarCuentas({
                    items: prev.map(i => ({ ...i, status: 'ACTIVE' })),
                    paidAccounts: []
                });
            }
            return prev;
        });
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mesaId, mesaEstado, mesaOrderId, mesaOrderStatus, dbItemsString, paidAccountsString]);

  // 5. Cálculos Derivados (Orquestados)
  const cuentasDisponibles = useMemo(() => 
    Array.from(new Set([...accounts.nombresCuentas, ...cartLogic.cart.map(i => i.cuenta || 'General')])), 
  [cartLogic.cart, accounts.nombresCuentas]);

  // 6. RETORNO DE API PÚBLICA (Compatibilidad 100% garantizada)
  return { 
    // Dominio: Carrito
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
    
    // Dominio del Escudo Poka-Yoke (Promociones)
    promoWarning: cartLogic.promoWarning,
    confirmPromoRupture: cartLogic.confirmPromoRupture,
    cancelPromoRupture: cartLogic.cancelPromoRupture,
    
    // Dominio: Menú
    filtroTexto: menu.filtroTexto, 
    setFiltroTexto: menu.setFiltroTexto, 
    categoriaActiva: menu.categoriaActiva, 
    setCategoriaActiva: menu.setCategoriaActiva, 
    filteredProducts: menu.filteredProducts, 
    dbCategories: menu.dbCategories,
    
    // Dominio: Cuentas
    cuentaActiva: accounts.cuentaActiva, 
    setCuentaActiva: accounts.setCuentaActiva, 
    cuentasDisponibles, 
    addNewCuenta: (n, t) => accounts.addNewCuenta(n, t, activeOrderId), 
    paidAccounts: accounts.paidAccounts,
    cuentasTelefonos: accounts.cuentasTelefonos,
    
    // Dominio: Mutaciones (Pedidos/Cocina) y Estado Global
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
    cancelFullOrder: mutations.cancelFullOrder, 
    cancelAccountItems: mutations.cancelAccountItems, 
    releaseAccount: mutations.releaseAccount,
    
    // Dominio: Notificaciones UI
    notification, 
    triggerNotification: showToast || triggerNotification 
  };
};