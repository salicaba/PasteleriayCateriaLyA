// src/modules/client/controllers/useClientMenuController.js
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import client from '../../../api/client';
import { socket } from '../../../api/socket';
import { getInitialTheme, getInitialSize, THEME_CLASSES, SIZES } from '../views/utils/clientMenuUtils';
import { useClientCart } from './useClientCart';

// ⏱️ CONFIGURACIÓN DE TIEMPOS DE SESIÓN
const INACTIVITY_TIMEOUT_MS = 25 * 60 * 1000; 
const CACHE_PURGE_TTL_MS = 12 * 60 * 60 * 1000; 

export function useClientMenuController({ clientData, type, tableId, tableNumber, onLogout, setActiveOrdersCount }) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeCategory, setActiveCategory] = useState('todas');
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [themeIndex, setThemeIndex] = useState(getInitialTheme);
  const [sizeIndex, setSizeIndex] = useState(getInitialSize);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addingToCartId, setAddingToCartId] = useState(null);
  const [notification, setNotification] = useState(null);
  
  const [diagnosticError, setDiagnosticError] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [sessionExpired, setSessionExpired] = useState(() => localStorage.getItem('lya_client_session_expired') === 'true');
  const [finalizedStatus, setFinalizedStatus] = useState(() => localStorage.getItem('lya_client_finalized_status') || null);
  const [isOrderPaid, setIsOrderPaid] = useState(() => localStorage.getItem('lya_client_order_paid') === 'true');
  const [showFinalizedOverlay, setShowFinalizedOverlay] = useState(true);

  // Rastro de productos trasladados a otras cuentas de la mesa
  const [transferredItems, setTransferredItems] = useState([]);
  const [transferredToAccounts, setTransferredToAccounts] = useState(() => {
    try {
      const saved = localStorage.getItem('lya_client_transferred_to');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [globalQrActive, setGlobalQrActive] = useState(true);
  const [disabledQrs, setDisabledQrs] = useState([]);

  const isServiceActive = globalQrActive && 
    !(type === 'llevar' && disabledQrs.includes('llevar')) && 
    !(type === 'mesa' && disabledQrs.includes(`mesa-${tableNumber || tableId}`));

  const [internalIsConfirmed, setInternalIsConfirmed] = useState(() => {
    if (localStorage.getItem('lya_client_order_paid') === 'true') return true;
    return localStorage.getItem('lya_client_is_confirmed') === 'true';
  });

  const setIsConfirmed = useCallback((val) => {
    setInternalIsConfirmed(val);
    if (!val) {
      const now = Date.now();
      localStorage.setItem('lya_client_last_activity', now.toString());
      if (lastActivityRef.current) lastActivityRef.current = now;
    }
  }, []);

  const isConfirmed = internalIsConfirmed;

  const triggerNotification = useCallback((msg, notifType = 'success') => {
    setNotification({ msg, type: notifType });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  const [confirmedSnapshot, setConfirmedSnapshot] = useState(() => {
    const saved = localStorage.getItem('lya_client_snapshot');
    return saved ? JSON.parse(saved) : { items: [], total: 0 };
  });

  // 🔥 CÁLCULO INTELIGENTE: Subtotal ya confirmado en la nota del cliente (para acumular rondas de TICKET_DISCOUNT)
  const confirmedPhysicalSubtotal = useMemo(() => {
    return (confirmedSnapshot?.items || [])
      .filter(i => !i.isVirtualDiscount && i.status !== 'CANCELLED')
      .reduce((sum, i) => sum + ((Number(i.precioUnitario) || 0) * (i.qty || 1)), 0);
  }, [confirmedSnapshot]);

  const hasConfirmedTicketDiscount = useMemo(() => {
    return (confirmedSnapshot?.items || []).some(i => i.isVirtualDiscount);
  }, [confirmedSnapshot]);

  const cartUtils = useClientCart(triggerNotification, hasConfirmedTicketDiscount ? 0 : confirmedPhysicalSubtotal);
  const { cart, setCart, addToCart, totalCart } = cartUtils;

  useEffect(() => {
    localStorage.setItem('lya_client_is_confirmed', isConfirmed);
  }, [isConfirmed]);

  const isReadOnly = !!finalizedStatus;
  const initialActivity = parseInt(localStorage.getItem('lya_client_last_activity'), 10) || Date.now();
  const lastActivityRef = useRef(initialActivity);

  const [activeOrderId, setActiveOrderId] = useState(() => localStorage.getItem('lya_client_order_id') || null);

  // 🛡️ PURGADO DE CACHÉ VIEJA (12 Horas para basura de sesiones olvidadas)
  useEffect(() => {
    const lastAct = parseInt(localStorage.getItem('lya_client_last_activity'), 10);
    if (lastAct && (Date.now() - lastAct > CACHE_PURGE_TTL_MS)) { 
      handleLogout();
    } else {
      const now = Date.now();
      lastActivityRef.current = now;
      localStorage.setItem('lya_client_last_activity', now.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof setActiveOrdersCount === 'function') {
      setActiveOrdersCount((confirmedSnapshot?.items?.length || 0) + (transferredItems?.length || 0));
    }
  }, [confirmedSnapshot, transferredItems, setActiveOrdersCount]);

  const parsedNameData = clientData?.name || 'Cliente';
  let displayName = parsedNameData;
  let displayPhone = null;

  if (parsedNameData.includes(' | ')) {
    [displayName, displayPhone] = parsedNameData.split(' | ');
  } else if (parsedNameData.includes(' - ')) {
    [displayName, displayPhone] = parsedNameData.split(' - ');
  }
  
  displayName = displayName.trim();
  if (displayPhone) displayPhone = displayPhone.trim();

  // EFECTOS DE SOCKETS Y CONFIGURACIÓN
  useEffect(() => {
    const fetchInitialConfig = async () => {
      try {
        const res = await client.get(`/settings?_t=${Date.now()}`); 
        const data = res.data;
        if (data.qr_service_active !== undefined) setGlobalQrActive(data.qr_service_active !== 'false' && data.qr_service_active !== false);
        if (data.disabled_qrs) {
          const parsed = typeof data.disabled_qrs === 'string' ? JSON.parse(data.disabled_qrs) : data.disabled_qrs;
          setDisabledQrs(Array.isArray(parsed) ? parsed : []);
        }
      } catch(e) {
        console.error("Error obteniendo status local:", e);
      }
    };

    fetchInitialConfig();
    
    const handleConfigUpdate = (updates) => {
      if (updates) {
        if (updates.qr_service_active !== undefined) setGlobalQrActive(updates.qr_service_active !== 'false' && updates.qr_service_active !== false);
        if (updates.disabled_qrs !== undefined) {
          const parsed = typeof updates.disabled_qrs === 'string' ? JSON.parse(updates.disabled_qrs) : updates.disabled_qrs;
          setDisabledQrs(Array.isArray(parsed) ? parsed : []);
        }
      }
    };

    socket.on('config:update', handleConfigUpdate);
    socket.on('qr:status_changed', (status) => setGlobalQrActive(status));
    
    return () => {
      socket.off('config:update', handleConfigUpdate);
      socket.off('qr:status_changed');
    };
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('lya_client_last_activity')) {
      localStorage.setItem('lya_client_last_activity', Date.now().toString());
    }
  }, []);

  // 🔥 GUARDIÁN DE INACTIVIDAD INTELIGENTE (25 MINUTOS EN MENÚ SIN CONFIRMAR)
  useEffect(() => {
    const updateActivity = () => {
      if (sessionExpired || finalizedStatus) return; 
      const now = Date.now();
      lastActivityRef.current = now;
      localStorage.setItem('lya_client_last_activity', now.toString());
    };
    
    const events = ['touchstart', 'click', 'mousemove', 'scroll', 'keypress'];
    events.forEach(event => window.addEventListener(event, updateActivity, { passive: true }));

    const checkInactivity = () => {
      if (isConfirmed || isOrderPaid || isSubmitting || finalizedStatus || sessionExpired) return; 
      
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;

      if (elapsed > INACTIVITY_TIMEOUT_MS) { 
        const hasConfirmedOrders = (confirmedSnapshot?.items?.length || 0) > 0 || (transferredItems?.length || 0) > 0 || Boolean(activeOrderId);

        if (hasConfirmedOrders) {
          setCart([]);
          setShowCheckout(false);
          setSelectedProduct(null);
          cartUtils.setPendingPromoReward(null);
          setIsConfirmed(true);
          triggerNotification('Regresamos a tu nota por inactividad en el menú.', 'warning');
        } else {
          setCart([]);
          setShowCheckout(false);
          setSelectedProduct(null);
          cartUtils.setPendingPromoReward(null);
          localStorage.setItem('lya_client_session_expired', 'true');
          setSessionExpired(true);
        }
      }
    };

    const checkInterval = setInterval(checkInactivity, 5000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkInactivity();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    checkInactivity();

    return () => {
      clearInterval(checkInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      events.forEach(event => window.removeEventListener(event, updateActivity));
    };
  }, [
    isConfirmed, 
    isOrderPaid, 
    isSubmitting, 
    finalizedStatus, 
    sessionExpired, 
    confirmedSnapshot?.items?.length, 
    transferredItems?.length,
    activeOrderId, 
    setCart, 
    setIsConfirmed, 
    triggerNotification,
    cartUtils
  ]);

  // Helper para calcular el descuento por ticket sobre una lista de ítems físicos
  const computeTicketDiscountForPhysicalItems = useCallback((physicalItems) => {
    const activePhysical = (physicalItems || []).filter(item => item.status !== 'CANCELLED' && !item.isVirtualDiscount);
    const physicalSubtotal = activePhysical.reduce((sum, item) => sum + (Number(item.precioUnitario || 0) * (item.qty || 1)), 0);

    const nowInChiapasStr = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
    const today = new Date(nowInChiapasStr).getDay();

    const ticketPromos = (cartUtils.promotions || []).filter(p => {
      const rawActive = p.isActive ?? p.is_active ?? p.status;
      const isActive = rawActive === true || rawActive === 1 || rawActive === 'true' || rawActive === '1';
      let validDays = [];
      try {
        const dRaw = p.validDays || p.valid_days;
        validDays = Array.isArray(dRaw) ? dRaw.map(Number) : (dRaw ? JSON.parse(dRaw).map(Number) : []);
      } catch (e) {}
      const validToday = validDays.length === 0 || validDays.includes(today);
      return isActive && validToday && p.type === 'TICKET_DISCOUNT';
    });

    const qualifyingPromos = ticketPromos
      .filter(p => physicalSubtotal > 0 && physicalSubtotal >= Number(p.minTicketAmount || p.min_ticket_amount || 0))
      .sort((a, b) => Number(b.minTicketAmount || b.min_ticket_amount || 0) - Number(a.minTicketAmount || a.min_ticket_amount || 0));

    const bestTicketPromo = qualifyingPromos[0];
    if (!bestTicketPromo || activePhysical.length === 0) return [];

    const rawDiscount = Number(bestTicketPromo.discountValue || bestTicketPromo.discount_value || 0);
    const isPercentage = bestTicketPromo.discountType === 'PERCENTAGE';
    let finalDiscountPrice = isPercentage ? (physicalSubtotal * (rawDiscount / 100)) : rawDiscount;
    finalDiscountPrice = -Math.min(physicalSubtotal, Math.abs(finalDiscountPrice));

    return [{
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
    }];
  }, [cartUtils.promotions]);

  // 🔥 SINCRONIZACIÓN DE CARRITO, TRASLADOS Y ESPEJO (Con recálculo dinámico de TICKET_DISCOUNT)
  useEffect(() => {
    if (!activeOrderId || finalizedStatus) return;

    const checkStatus = async () => {
      try {
        const res = await client.get(`/pos/orders/${activeOrderId}/status`, {
          params: { 
            cuenta: clientData?.name,
            _t: Date.now()
          }
        });
        
        const data = res?.data || {};
        const globalStatus = data.status;
        const accountStatus = data.accountStatus;
        const serverItems = data.items; 

        // Sincronizar información de productos trasladados a otra cuenta
        const incomingTransferredItems = Array.isArray(data.transferredItems) ? data.transferredItems : [];
        const incomingTransferredAccounts = Array.isArray(data.transferredToAccounts) ? data.transferredToAccounts : [];
        setTransferredItems(incomingTransferredItems);
        setTransferredToAccounts(incomingTransferredAccounts);

        const isAllMoved = Boolean(data.allTransferred || ((serverItems || []).length === 0 && incomingTransferredItems.length > 0));
        if (isAllMoved) {
          localStorage.setItem('lya_client_all_transferred', 'true');
          localStorage.setItem('lya_client_transferred_to', JSON.stringify(incomingTransferredAccounts));
        } else if ((serverItems || []).length > 0) {
          localStorage.removeItem('lya_client_all_transferred');
          localStorage.removeItem('lya_client_transferred_to');
        }
        
        let finalStatus = 'OPEN';
        if (globalStatus === 'CLOSED' || globalStatus === 'CANCELLED' || globalStatus === 'DELETED') {
          finalStatus = globalStatus;
        } else if (globalStatus === 'PAID') {
          finalStatus = 'PAID';
        } else if (accountStatus === 'PAID' || accountStatus === 'CLOSED' || accountStatus === 'CANCELLED') { 
          finalStatus = accountStatus;
        } else {
          finalStatus = 'OPEN'; 
        }

        if (serverItems && Array.isArray(serverItems)) {
          let newItems = [];
          serverItems.forEach(serverItem => {
            let parsedNotes = [];
            try { 
              const rawNotes = JSON.parse(serverItem.notes || '[]'); 
              parsedNotes = Array.isArray(rawNotes) 
                ? rawNotes.filter(n => n && !n._isPromoMeta && !n._isReleased && !n._isTicketDiscountMeta) 
                : [];
            } catch(e){}
            const precioUnitario = Number(serverItem.subtotal) / (serverItem.quantity || 1);
            
            for(let i = 0; i < serverItem.quantity; i++) {
              const note = parsedNotes[i] || parsedNotes[0] || {};
              const newItem = {
                id: serverItem.productId,
                backendItemId: serverItem.id, 
                nombre: serverItem.product?.name || 'Producto',
                imagen: serverItem.product?.imageUrl || null,
                precioUnitario: precioUnitario,
                qty: 1,
                detalles: note,
                isTakeaway: serverItem.isTakeaway,
                isAutoPromo: serverItem.isAutoPromo,
                promoLabel: serverItem.promoLabel,
                precioOriginal: serverItem.precioOriginal ? Number(serverItem.precioOriginal) : null,
                status: serverItem.status || 'ACTIVE' 
              };
              
              const detailStr = JSON.stringify(newItem.detalles || {});
              const existingIdx = newItems.findIndex(x => 
                x.id === newItem.id && 
                x.isTakeaway === newItem.isTakeaway && 
                !!x.isAutoPromo === !!newItem.isAutoPromo &&
                Number(x.precioUnitario).toFixed(2) === Number(newItem.precioUnitario).toFixed(2) &&
                x.status === newItem.status && 
                JSON.stringify(x.detalles || {}) === detailStr
              );
              
              if (existingIdx >= 0) {
                newItems[existingIdx].qty += 1;
              } else {
                newItems.push(newItem);
              }
            }
          });

          setConfirmedSnapshot(prev => {
            if (newItems.length === 0 && prev.items && prev.items.length > 0 && (finalStatus === 'PAID' || finalStatus === 'CLOSED') && !isAllMoved) {
              return prev;
            }

            const computedVirtualDiscounts = computeTicketDiscountForPhysicalItems(newItems);
            const mergedItems = [...newItems, ...computedVirtualDiscounts];
            const activeServerItems = mergedItems.filter(item => item.status !== 'CANCELLED');
            const newTotal = activeServerItems.reduce((sum, item) => sum + (item.precioUnitario * item.qty), 0);
            
            const newState = { items: mergedItems, total: Math.max(0, newTotal) };
            localStorage.setItem('lya_client_snapshot', JSON.stringify(newState));
            return newState;
          });
        }
        
        if (finalStatus === 'PAID') {
          if (!isOrderPaid && !isAllMoved) {
            setIsOrderPaid(true);
            localStorage.setItem('lya_client_order_paid', 'true');
            setIsConfirmed(true); 
          }
        } else if (finalStatus === 'CLOSED') {
          triggerFinalized('CLOSED');
        } else if (finalStatus === 'CANCELLED' || finalStatus === 'DELETED') {
          triggerFinalized('CANCELLED');
        }
      } catch (error) {
        // Ignorar errores transitorios
      }
    };

    const handleOrderPaid = (data) => {
      const isMyTable = type === 'mesa' && data?.tableId && String(data.tableId) === String(tableId);
      const isMyTakeaway = type !== 'mesa' && data?.ticketId && data.ticketId.toLowerCase().includes(displayName.toLowerCase());
      const cleanPaidAcc = String(data?.cuentaName || '').split(' | ')[0].split(' - ')[0].trim().toLowerCase();

      if (isMyTable || isMyTakeaway) {
        const allMovedFlag = localStorage.getItem('lya_client_all_transferred') === 'true';
        if ((data.isFullPayment && !allMovedFlag) || (cleanPaidAcc && cleanPaidAcc === displayName.toLowerCase())) {
          setIsOrderPaid(true);
          localStorage.setItem('lya_client_order_paid', 'true');
          setIsConfirmed(true);
        }
      }
    };

    const interval = setInterval(checkStatus, 5000);
    socket.on('pos:update', checkStatus);
    socket.on('orderPaid', handleOrderPaid);
    
    checkStatus(); 

    return () => {
      clearInterval(interval);
      socket.off('pos:update', checkStatus);
      socket.off('orderPaid', handleOrderPaid);
    };
  }, [activeOrderId, finalizedStatus, isOrderPaid, clientData?.name, type, tableId, displayName, setIsConfirmed, computeTicketDiscountForPhysicalItems]);

  const triggerFinalized = (status) => {
    if (!localStorage.getItem('lya_client_finalized_at')) {
      localStorage.setItem('lya_client_finalized_at', Date.now().toString());
      localStorage.setItem('lya_client_finalized_status', status);
    }
    setFinalizedStatus(status);
    setShowFinalizedOverlay(true);
  };

  const handleLogout = useCallback(async () => {
    setShowLogoutConfirm(false);
    setShowSettings(false);
    setIsLoggingOut(true);
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const keysToRemove = [
      'lya_client_order_id', 'lya_client_snapshot', 'lya_client_data', 
      'lya_client_session', 'lya_client_finalized_at', 'lya_client_finalized_status', 
      'lya_client_order_paid', 'lya_client_is_confirmed', 'lya_client_last_activity',
      'lya_client_session_expired', 'lya_client_all_transferred', 'lya_client_transferred_to'
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    if (typeof onLogout === 'function') {
      onLogout();
    } else {
      window.location.reload();
    }
  }, [onLogout]);

  const handleDownloadTicket = async () => {
    if (!activeOrderId) return;
    triggerNotification('Generando comprobante digital...', 'success');
    await new Promise(resolve => setTimeout(resolve, 800));

    let baseApiUrl = client.defaults.baseURL || 'https://lya-backend-2gay.onrender.com/api';
    if (baseApiUrl.includes('localhost') || baseApiUrl.includes('127.0.0.1')) {
      baseApiUrl = 'https://lya-backend-2gay.onrender.com/api';
    }
    const shortId = activeOrderId.split('-')[0];
    
    const queryParam = type === 'llevar' 
      ? '' 
      : `?cuenta=${encodeURIComponent(clientData?.name || '')}`;
      
    const url = `https://pascaf-lya.vercel.app/api/pos/ticket/${shortId}${queryParam}`;
    window.open(url, '_blank');
  };

  const loadMenuData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setIsLoading(true);
      const [catsRes, prodsRes] = await Promise.all([ 
        client.get(`/menu/categories?_t=${Date.now()}`).catch(() => ({ data: [] })), 
        client.get(`/menu/products?_t=${Date.now()}`).catch(() => ({ data: [] })) 
      ]);
      
      const rawCats = catsRes.data?.data || catsRes.data || [];
      const fetchedCats = Array.isArray(rawCats) ? rawCats : [];
      const hasTodas = fetchedCats.some(c => c.id === 'todas' || (c.name && c.name.trim().toLowerCase() === 'todas'));
      const catsData = hasTodas ? fetchedCats : [{ id: 'todas', name: 'Todas' }, ...fetchedCats];
      setCategories(catsData);
      
      const rawProds = prodsRes.data?.data || prodsRes.data || [];
      const prodsData = Array.isArray(rawProds) ? rawProds : [];
      
      const activeProducts = prodsData.filter(p => {
        const estado = p.isActive !== undefined ? p.isActive : p.disponible;
        return !(estado === false || estado === 0 || estado === '0');
      }).map(p => ({
        ...p,
        nombre: p.name || p.nombre || 'Sin Nombre',
        precio: parseFloat(p.basePrice || p.precio || 0),
        precioBase: parseFloat(p.basePrice || p.precio || 0),
        imagen: p.imageUrl || p.image || p.imagen || null,
        categoria: p.categoryId || p.categoria,
        stock: p.stockQuantity ?? p.stock ?? 0,
        controlarStock: p.controlarStock || false,
        isAgotado: p.isAgotado || false
      }));
      
      setProducts(activeProducts);
      if (!isBackground) setActiveCategory('todas');
    } catch (error) {
      console.error("🔥 Error al cargar el menú real:", error);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionExpired) {
      loadMenuData(false);
    } else {
      setIsLoading(false);
    }
  }, [sessionExpired, loadMenuData]);

  useEffect(() => {
    const handleStockAdjustment = (updates) => {
      if (!Array.isArray(updates)) return;
      setProducts(prevProducts => prevProducts.map(p => {
        const update = updates.find(u => u.id === p.id);
        if (update) {
          const newStock = update.stock !== undefined ? update.stock : p.stock;
          let incomingAgotado = update.isAgotado !== undefined ? update.isAgotado : p.isAgotado;
          if (p.controlarStock && newStock <= 0) incomingAgotado = true;
          return { ...p, stock: newStock, isAgotado: incomingAgotado };
        }
        return p;
      }));
    };

    const handleBackgroundSync = () => loadMenuData(true);
    socket.on('stock:update', handleStockAdjustment);
    socket.on('pos:update', handleBackgroundSync); 
    
    return () => {
      socket.off('stock:update', handleStockAdjustment);
      socket.off('pos:update', handleBackgroundSync);
    };
  }, [loadMenuData]);

  const activeCatObj = categories.find(c => c.id === activeCategory);
  const isTodasCategory = !activeCategory || activeCategory === 'todas' || (activeCatObj && activeCatObj.name?.trim().toLowerCase() === 'todas');
  const visibleProducts = isTodasCategory ? products : products.filter(p => p.categoria === activeCategory);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'theme-lya');
    root.classList.add(THEME_CLASSES[themeIndex]);
    localStorage.setItem('lya_client_theme', themeIndex);
  }, [themeIndex]);

  useEffect(() => {
    document.documentElement.style.fontSize = SIZES[sizeIndex].val;
    localStorage.setItem('lya_client_size', sizeIndex);
  }, [sizeIndex]);

  const cycleTheme = () => setThemeIndex((prev) => (prev + 1) % 3);
  const cycleSize = () => setSizeIndex((prev) => (prev + 1) % 3);

  const handleAddDirectly = async (product, customizations = null, e = null) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setAddingToCartId(product.id);
    try {
      await new Promise(resolve => setTimeout(resolve, 150));
      addToCart(product, customizations);
      setSelectedProduct(null);
    } finally {
      setAddingToCartId(null);
    }
  };

  const handleConfirmOrder = async () => {
    const physicalItems = cart.filter(item => !item.isVirtualDiscount);
    if (physicalItems.length === 0) return;

    setIsSubmitting(true);
    setIsOrderPaid(false);
    localStorage.removeItem('lya_client_order_paid');
    localStorage.removeItem('lya_client_all_transferred');
    
    try {
      const isActuallySalon = type === 'mesa' && tableId;
      const dbOrderType = isActuallySalon ? 'SALON' : 'LLEVAR';
      let targetOrderId = activeOrderId;

      const createNewOrder = async () => {
        const orderPayload = { orderType: dbOrderType, tableId: isActuallySalon ? tableId : null, ticketId: clientData?.name };
        const orderRes = await client.post('/pos/orders', orderPayload);
        const newId = orderRes.data.order.id;
        setActiveOrderId(newId);
        localStorage.setItem('lya_client_order_id', newId);
        return newId;
      };

      if (!targetOrderId) targetOrderId = await createNewOrder();

      const itemsPayload = {
        items: physicalItems.map(item => ({
          productId: item.id,
          quantity: item.qty,
          subtotal: item.precioUnitario * item.qty,
          cuenta: dbOrderType === 'LLEVAR' ? 'General' : (clientData?.name || 'General'), 
          notes: JSON.stringify(item.detalles ? Array(item.qty).fill(item.detalles) : []), 
          isTakeaway: item.isTakeaway || false,
          isAutoPromo: item.isAutoPromo || false,
          promoLabel: item.promoLabel || null,
          promoId: item.promoId || null,
          promoType: item.promoType || null,
          precioOriginal: item.precioOriginal ? Number(item.precioOriginal) : null
        }))
      };

      let orderWasClosedOrDeleted = false;
      try {
        await client.post(`/pos/orders/${targetOrderId}/items`, itemsPayload);
      } catch (error) {
        if (error.response && (error.response.status === 400 || error.response.status === 404)) {
          targetOrderId = await createNewOrder();
          await client.post(`/pos/orders/${targetOrderId}/items`, itemsPayload);
          orderWasClosedOrDeleted = true;
        } else {
          throw error;
        }
      }

      setConfirmedSnapshot(prev => {
        const baseItems = orderWasClosedOrDeleted ? [] : [...prev.items].filter(i => !i.isVirtualDiscount);
        const newPhysicalItems = [...baseItems];
        
        physicalItems.forEach(cartItem => {
          const detailStr1 = JSON.stringify(cartItem.detalles || {});
          const existingIndex = newPhysicalItems.findIndex(i => 
            i.id === cartItem.id && i.isTakeaway === cartItem.isTakeaway && 
            !!i.isAutoPromo === !!cartItem.isAutoPromo &&
            Number(i.precioUnitario).toFixed(2) === Number(cartItem.precioUnitario).toFixed(2) &&
            JSON.stringify(i.detalles || {}) === detailStr1
          );
          if (existingIndex >= 0) {
            newPhysicalItems[existingIndex] = { ...newPhysicalItems[existingIndex], qty: newPhysicalItems[existingIndex].qty + cartItem.qty };
          } else {
            newPhysicalItems.push({ ...cartItem });
          }
        });

        // Recalcular Descuento por Ticket sobre la totalidad de ítems físicos sin parpadeos
        const updatedVirtualDiscounts = computeTicketDiscountForPhysicalItems(newPhysicalItems);
        const finalMergedItems = [...newPhysicalItems, ...updatedVirtualDiscounts];
        const finalTotal = finalMergedItems
          .filter(i => i.status !== 'CANCELLED')
          .reduce((sum, i) => sum + (Number(i.precioUnitario || 0) * (i.qty || 1)), 0);

        const newState = { items: finalMergedItems, total: Math.max(0, finalTotal) };
        localStorage.setItem('lya_client_snapshot', JSON.stringify(newState));
        return newState;
      });

      setCart([]);
      setIsConfirmed(true);
      setShowCheckout(false);

    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.message === 'Network Error') {
        triggerNotification("Conexión inestable. El pedido no se envió, intenta de nuevo.", "error");
        return;
      }

      setDiagnosticError({
        endpoint: error.config?.url || "/pos/orders",
        statusCode: error.response?.status || "Error de Red",
        message: error.response?.data?.message || error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : 'Delicia';
  };

  return {
    categories, products, isLoading, activeCategory, setActiveCategory,
    showCheckout, setShowCheckout, selectedProduct, setSelectedProduct,
    showSettings, setShowSettings, showLogoutConfirm, setShowLogoutConfirm,
    themeIndex, sizeIndex, isSubmitting, addingToCartId, notification,
    sessionExpired, finalizedStatus, isOrderPaid, showFinalizedOverlay,
    isServiceActive, isConfirmed, setIsConfirmed, isReadOnly, confirmedSnapshot,
    transferredItems, transferredToAccounts,
    isLoggingOut, displayName, displayPhone, visibleProducts,
    triggerNotification, handleLogout, handleDownloadTicket, cycleTheme, 
    cycleSize, handleAddDirectly, handleConfirmOrder, getCategoryName,
    diagnosticError,
    cartUtils
  };
}