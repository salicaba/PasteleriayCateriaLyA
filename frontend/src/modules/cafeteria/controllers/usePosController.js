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
  const { setPaidAccounts, setNombresCuentas, setCuentaActiva, setCuentasTelefonos } = accounts;

  // 🔥 CIRUGÍA ANTI-BUCLE: Extraemos valores primitivos para el useEffect
  // Esto evita que React se confunda con referencias de memoria y cicle el renderizado.
  const mesaId = mesaActual?.id;
  const mesaEstado = mesaActual?.estado;
  const mesaOrderId = mesaActual?.orderId;
  const mesaOrderStatus = mesaActual?.orderStatus;
  
  // Convertimos a string para detectar cambios REALES en los datos, no en las referencias
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

    let nuevasCuentas = new Set(['General']);

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
            finalCart.forEach(c => nuevasCuentas.add(c.cuenta));
            return finalCart;
        });

        loadedPaidAccounts.forEach(pa => nuevasCuentas.add(pa));
        
    } else {
        setCart(prev => { 
          prev.forEach(c => nuevasCuentas.add(c.cuenta)); 
          return prev; 
        });
    }

    setNombresCuentas(prev => Array.from(new Set([...prev, ...Array.from(nuevasCuentas)])));

  // 🔥 SOLUCIÓN ESTRICTA: Solo dependemos de primitivas inmutables. 
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
    releaseAccount: mutations.releaseAccount, // <--- AÑADIR ESTA LÍNEA
    
    // Dominio: Notificaciones UI
    notification, 
    triggerNotification: showToast || triggerNotification 
  };
};