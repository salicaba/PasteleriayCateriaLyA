// src/modules/client/views/ClientMenu.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, Utensils, Plus, Image as ImageIcon, 
  Settings, ReceiptText, Loader2, CheckCircle2, AlertTriangle, 
  AlertCircle, PowerOff, Clock, Phone
} from 'lucide-react';
import client from '../../../api/client'; 
import ClientOrderSuccess from './ClientOrderSuccess';
import clsx from 'clsx';

// Importación de componentes divididos
import ClientProductModal from './components/ClientProductModal';
import ClientCheckoutModal from './components/ClientCheckoutModal';
import ClientSettingsModal from './components/ClientSettingsModal';
import ClientLogoutModal from './components/ClientLogoutModal';
import ClientFinalizedOverlay from './components/ClientFinalizedOverlay';
import { 
  THEME_CLASSES, SIZES, getInitialTheme, getInitialSize, 
  getProductModifiers, getDefaultCustomizations 
} from './utils/clientMenuUtils';

import { socket } from '../../../api/socket';
import logoLyA from '../../../assets/logo.jpeg'; 

export default function ClientMenu({ clientData, type, tableId, onLogout }) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeCategory, setActiveCategory] = useState(null);
  const [cart, setCart] = useState([]);
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

  const [isQrActive, setIsQrActive] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const [finalizedStatus, setFinalizedStatus] = useState(() => localStorage.getItem('lya_client_finalized_status') || null);
  const [isOrderPaid, setIsOrderPaid] = useState(() => localStorage.getItem('lya_client_order_paid') === 'true');
  const [showFinalizedOverlay, setShowFinalizedOverlay] = useState(true);

  const [isConfirmed, setIsConfirmed] = useState(() => {
    if (localStorage.getItem('lya_client_order_paid') === 'true') return true;
    return localStorage.getItem('lya_client_is_confirmed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('lya_client_is_confirmed', isConfirmed);
  }, [isConfirmed]);

  const isReadOnly = !!finalizedStatus;
  const lastActivityRef = useRef(Date.now());
  const isProcessingRef = useRef(false);

  const [activeOrderId, setActiveOrderId] = useState(() => localStorage.getItem('lya_client_order_id') || null);
  const [confirmedSnapshot, setConfirmedSnapshot] = useState(() => {
    const saved = localStorage.getItem('lya_client_snapshot');
    return saved ? JSON.parse(saved) : { items: [], total: 0 };
  });

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

  useEffect(() => {
    const checkQrStatus = async () => {
      try {
        const res = await client.get('/settings/qr-status');
        setIsQrActive(res.data.active);
      } catch (error) {
        console.error("No se pudo verificar el estado del QR");
      }
    };
    checkQrStatus(); 
    const intervalId = setInterval(checkQrStatus, 15000); 
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };
    
    const events = ['touchstart', 'click', 'mousemove', 'scroll', 'keypress'];
    events.forEach(event => window.addEventListener(event, updateActivity, { passive: true }));

    const checkInterval = setInterval(() => {
      if (isConfirmed || isSubmitting || finalizedStatus) return; 

      const now = Date.now();
      // 🔥 MODO TESTING ACTIVADO: 25 minutos (1500000 ms) para expirar la sesión
      if (now - lastActivityRef.current > 1500000) {
        setSessionExpired(true);
      }
    }, 3000); // 🔥 Revisamos cada 5 segundos para que sea súper preciso

    return () => {
      clearInterval(checkInterval);
      events.forEach(event => window.removeEventListener(event, updateActivity));
    };
  }, [isConfirmed, isSubmitting, finalizedStatus]);

  useEffect(() => {
    if (!activeOrderId || finalizedStatus) return;

    const checkStatus = async () => {
      try {
        const res = await client.get(`/pos/orders/${activeOrderId}/status`, {
          params: { cuenta: clientData.name }
        });
        
        const status = res.data.status;
        
        if (status === 'PAID') {
           if (!isOrderPaid) {
               setIsOrderPaid(true);
               localStorage.setItem('lya_client_order_paid', 'true');
               setIsConfirmed(true); 
           }
        } else if (status === 'CLOSED') {
           triggerFinalized('CLOSED');
        } else if (status === 'CANCELLED' || status === 'DELETED') {
           triggerFinalized('CANCELLED');
        }
      } catch (error) {
      }
    };

    const interval = setInterval(checkStatus, 5000);
    socket.on('pos:update', checkStatus);
    checkStatus(); 

    return () => {
       clearInterval(interval);
       socket.off('pos:update', checkStatus);
    };
  }, [activeOrderId, finalizedStatus, isOrderPaid, clientData.name]);

  const triggerFinalized = (status) => {
    if (!localStorage.getItem('lya_client_finalized_at')) {
       localStorage.setItem('lya_client_finalized_at', Date.now().toString());
       localStorage.setItem('lya_client_finalized_status', status);
    }
    setFinalizedStatus(status);
    setShowFinalizedOverlay(true);
  };

  const handleLogout = React.useCallback(async () => {
    setShowLogoutConfirm(false);
    setShowSettings(false);
    setIsLoggingOut(true);
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const keysToRemove = [
      'lya_client_order_id', 
      'lya_client_snapshot', 
      'lya_client_data', 
      'lya_client_session',
      'lya_client_finalized_at', 
      'lya_client_finalized_status', 
      'lya_client_order_paid',
      'lya_client_is_confirmed'
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    if (typeof onLogout === 'function') {
      onLogout();
    } else {
      window.location.reload();
    }
  }, [onLogout]);

  const handleDownloadTicket = () => {
    if (!activeOrderId) return;
    let baseApiUrl = client.defaults.baseURL || 'https://lya-backend-2gay.onrender.com/api';
    if (baseApiUrl.includes('localhost') || baseApiUrl.includes('127.0.0.1')) {
      baseApiUrl = 'https://lya-backend-2gay.onrender.com/api';
    }
    const shortId = activeOrderId.split('-')[0];
    const url = `${baseApiUrl}/pos/ticket/${shortId}?cuenta=${encodeURIComponent(clientData.name)}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    const loadMenuData = async () => {
      try {
        setIsLoading(true);
        const [catsRes, prodsRes] = await Promise.all([ 
          client.get('/menu/categories'), 
          client.get('/menu/products') 
        ]);
        
        const fetchedCats = catsRes.data;
        const hasTodas = fetchedCats.some(c => c.id === 'todas' || c.name.trim().toLowerCase() === 'todas');
        const catsData = hasTodas ? fetchedCats : [{ id: 'todas', name: 'Todas' }, ...fetchedCats];

        setCategories(catsData);
        
        const prodsData = prodsRes.data;
        const activeProducts = prodsData.filter(p => {
          const estado = p.isActive !== undefined ? p.isActive : p.disponible;
          if (estado === false || estado === 0 || estado === '0') return false;
          return true;
        }).map(p => ({
          ...p,
          nombre: p.name || p.nombre || 'Sin Nombre',
          precio: parseFloat(p.basePrice || p.precio || 0),
          imagen: p.imageUrl || p.image || p.imagen || null,
          categoria: p.categoryId || p.categoria,
          stock: p.stockQuantity || p.stock || 0
        }));
        
        setProducts(activeProducts);
        setActiveCategory('todas');
      } catch (error) {
        console.error("Error al cargar el menú real:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadMenuData();
  }, []);

  const activeCatObj = categories.find(c => c.id === activeCategory);
  const isTodasCategory = activeCatObj && activeCatObj.name.trim().toLowerCase() === 'todas';
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

  const triggerNotification = (msg, notifType = 'success') => {
    setNotification({ msg, type: notifType });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleAddDirectly = async (product, customizations = null, e = null) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setAddingToCartId(product.id);

    try {
      await new Promise(resolve => setTimeout(resolve, 150));
      
      setCart(prev => {
        let newItem = { ...product, qty: 1, precioUnitario: product.precio };
        let uniqueCartId = product.id.toString();

        if (customizations) {
          newItem = { ...newItem, precioUnitario: customizations.precioFinal, detalles: customizations.detalles, isTakeaway: customizations.isTakeaway };
          const detailStr = JSON.stringify(customizations.detalles) + (customizations.isTakeaway ? '-llevar' : '');
          uniqueCartId = `${product.id}-${detailStr}`;
        }

        newItem.cartItemId = uniqueCartId;
        const existing = prev.find(item => item.cartItemId === uniqueCartId);
        if (existing) return prev.map(item => item.cartItemId === uniqueCartId ? { ...item, qty: item.qty + 1 } : item);
        return [...prev, newItem];
      });
      
      setSelectedProduct(null);
      triggerNotification(`¡${product.nombre} agregado!`, 'success');
    } finally {
      setAddingToCartId(null);
      isProcessingRef.current = false;
    }
  };

  const removeFromCart = (cartItemId) => setCart(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId);
      if (!existing) return prev; 
      if (existing.qty === 1) return prev.filter(item => item.cartItemId !== cartItemId);
      return prev.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty - 1 } : item);
  });
  
  const incrementInCart = (cartItemId) => setCart(prev => prev.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty + 1 } : item));

  const totalCart = cart.reduce((acc, item) => acc + ((item.precioUnitario || 0) * (item.qty || 0)), 0);
  const totalItems = cart.reduce((acc, item) => acc + (item.qty || 0), 0);

  const handleConfirmOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    
    try {
      const isActuallySalon = type === 'mesa' && tableId;
      const dbOrderType = isActuallySalon ? 'SALON' : 'LLEVAR';
      let targetOrderId = activeOrderId;

      const createNewOrder = async () => {
        const orderPayload = { 
          orderType: dbOrderType, 
          tableId: isActuallySalon ? tableId : null, 
          ticketId: clientData.name 
        };
        const orderRes = await client.post('/pos/orders', orderPayload);
        const newId = orderRes.data.order.id;
        setActiveOrderId(newId);
        localStorage.setItem('lya_client_order_id', newId);
        return newId;
      };

      if (!targetOrderId) {
        targetOrderId = await createNewOrder();
      }

      const itemsPayload = {
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.qty,
          subtotal: item.precioUnitario * item.qty,
          cuenta: dbOrderType === 'LLEVAR' ? 'General' : (clientData.name || 'General'), 
          notes: JSON.stringify(item.detalles ? [item.detalles] : []), 
          isTakeaway: item.isTakeaway || false
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
        let baseItems = orderWasClosedOrDeleted ? [] : [...prev.items];
        let baseTotal = orderWasClosedOrDeleted ? 0 : prev.total;
        let newItems = [...baseItems];
        
        cart.forEach(cartItem => {
            const detailStr1 = JSON.stringify(cartItem.detalles || {});
            const existingIndex = newItems.findIndex(i => 
                i.id === cartItem.id && 
                i.isTakeaway === cartItem.isTakeaway && 
                JSON.stringify(i.detalles || {}) === detailStr1
            );
            if (existingIndex >= 0) {
                newItems[existingIndex] = { ...newItems[existingIndex], qty: newItems[existingIndex].qty + cartItem.qty };
            } else {
                newItems.push({ ...cartItem });
            }
        });

        const newState = { items: newItems, total: baseTotal + totalCart };
        localStorage.setItem('lya_client_snapshot', JSON.stringify(newState));
        return newState;
      });

      setCart([]);
      setIsConfirmed(true);
      setShowCheckout(false);

    } catch (error) {
      console.error("Error al enviar la orden al servidor:", error);
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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950 lya:bg-[#FAF6F0] backdrop-blur-md transition-opacity duration-300">
         <div className="relative w-28 h-28 mb-6">
            <div className="absolute inset-0 rounded-full border-[6px] border-neutral-200 dark:border-neutral-800 lya:border-[#EADCC9]" />
            <div className="absolute inset-0 rounded-full border-[6px] border-orange-500 dark:border-orange-600 lya:border-[#78350F] border-t-transparent animate-spin" />
            <div className="absolute inset-0 m-2 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-inner">
              <img src={logoLyA} alt="Logo 𝓛𝔂α" className="w-full h-full object-cover animate-pulse" />
            </div>
         </div>
         <h2 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 lya:text-[#3E2723] tracking-tight mb-2 animate-pulse text-center">
            {isLoggingOut ? "Cerrando sesión..." : (type === 'llevar' ? "Preparando menú para llevar..." : "Preparando tu mesa...")}
         </h2>
         <p className="text-neutral-500 dark:text-neutral-400 lya:text-[#7A6353] font-medium text-sm flex items-center gap-2 justify-center">
            {isLoggingOut ? <Loader2 size={16} className="text-orange-500 dark:text-orange-400 lya:text-[#78350F] animate-spin" /> : <CheckCircle2 size={16} className="text-emerald-500 dark:text-emerald-400" />}
            {isLoggingOut ? (type === 'llevar' ? "Cerrando orden..." : "Liberando la mesa...") : "Cargando el menú más fresco"}
         </p>
      </div>
    );
  }

  if (finalizedStatus && showFinalizedOverlay) {
    return (
      <ClientFinalizedOverlay 
        finalizedStatus={finalizedStatus}
        type={type}
        handleDownloadTicket={handleDownloadTicket}
        handleLogout={handleLogout}
      />
    );
  }

  if (sessionExpired) {
    return (
      <div className="h-full w-full flex-1 flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950 lya:bg-[#FAF6F0] p-6 overflow-hidden">
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-white dark:bg-neutral-900 lya:bg-[#F3EBE0] p-8 sm:p-10 rounded-[2.5rem] shadow-2xl max-w-[400px] w-full flex flex-col items-center border border-neutral-100 dark:border-neutral-800 lya:border-[#EADCC9]">
          <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/20 lya:bg-[#EADCC9]/50 rounded-full flex items-center justify-center mb-6 shadow-inner text-orange-500 dark:text-orange-400 lya:text-[#78350F]">
             <Clock size={40} />
          </div>
          <h2 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 lya:text-[#3E2723] mb-4 tracking-tight text-center">Sesión Expirada</h2>
          <p className="text-neutral-500 dark:text-neutral-400 lya:text-[#7A6353] font-medium text-sm mb-8 leading-relaxed text-justify px-2">
             {type === 'llevar' ? "Hemos cerrado tu sesión por inactividad temporal ya que no detectamos ninguna orden confirmada." : "Hemos cerrado tu sesión por inactividad para liberar la mesa digitalmente."}
          </p>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleLogout} className="w-full py-4 bg-orange-500 dark:bg-orange-600 lya:bg-[#78350F] text-white rounded-2xl font-black shadow-lg">Entendido</motion.button>
        </motion.div>
      </div>
    );
  }

  if (!isQrActive && !isConfirmed) {
    return (
      <div className="h-full w-full flex-1 flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950 lya:bg-[#FAF6F0] p-6 overflow-hidden">
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-white dark:bg-neutral-900 lya:bg-[#F3EBE0] p-8 sm:p-10 rounded-[2.5rem] shadow-2xl max-w-[400px] w-full flex flex-col items-center border border-neutral-100 dark:border-neutral-800 lya:border-[#EADCC9]">
          <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 lya:bg-[#EADCC9]/50 rounded-full flex items-center justify-center mb-6 shadow-inner"><PowerOff size={40} className="text-neutral-400 dark:text-neutral-500 lya:text-[#78350F]" /></div>
          <h2 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 lya:text-[#3E2723] mb-4 tracking-tight text-center">Servicio Suspendido</h2>
          <p className="text-neutral-500 dark:text-neutral-400 lya:text-[#7A6353] font-medium text-sm mb-8 leading-relaxed text-justify">El servicio de pedidos digitales por código QR se encuentra deshabilitado temporalmente.</p>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleLogout} className="w-full py-4 bg-neutral-900 dark:bg-neutral-800 lya:bg-[#78350F] text-white rounded-2xl font-black shadow-xl">Entendido, cerrar menú</motion.button>
        </motion.div>
      </div>
    );
  }

  if (isConfirmed && !isReadOnly) {
    return (
      <>
        <ClientOrderSuccess 
          cart={confirmedSnapshot.items} totalCart={confirmedSnapshot.total} clientData={clientData} type={type} tableId={tableId} products={products} categories={categories} getCategoryName={getCategoryName} isQrActive={isQrActive} isOrderPaid={isOrderPaid} onReset={() => { if (isQrActive && !isOrderPaid) setIsConfirmed(false); }} onOpenSettings={() => setShowSettings(true)}
        />
        <AnimatePresence>{showSettings && <ClientSettingsModal themeIndex={themeIndex} sizeIndex={sizeIndex} cycleTheme={cycleTheme} cycleSize={cycleSize} onClose={() => setShowSettings(false)} showLogout={confirmedSnapshot.items.length === 0} onLogout={() => { setShowSettings(false); setShowLogoutConfirm(true); }} onLogoutClick={() => { setShowSettings(false); setShowLogoutConfirm(true); }} />}</AnimatePresence>
        <AnimatePresence>{showLogoutConfirm && <ClientLogoutModal isOpen={showLogoutConfirm} show={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} onLogout={handleLogout} onConfirm={handleLogout} />}</AnimatePresence>
      </>
    );
  }

  return (
    <div className="h-full w-full flex-1 flex flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-950 lya:bg-[#FAF6F0] relative">
      <AnimatePresence>
        {notification && (
          <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
            <motion.div initial={{ opacity: 0, y: -50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9, y: -20 }} className={`bg-white/95 dark:bg-neutral-900/95 lya:bg-[#F3EBE0]/95 backdrop-blur-xl px-6 py-4 rounded-full shadow-2xl flex items-center justify-center gap-3 font-bold border pointer-events-auto max-w-md w-full sm:w-auto text-center ${notification.type === 'success' ? 'border-emerald-200 dark:border-emerald-900/50 lya:border-emerald-200/50 text-neutral-800 dark:text-neutral-100 lya:text-[#3E2723]' : 'border-red-200 dark:border-red-900/50 lya:border-red-200/50 text-neutral-800 dark:text-neutral-100 lya:text-[#3E2723]'}`}>
              <span className="text-sm tracking-wide text-center">{notification.msg}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="px-6 pt-6 pb-3 shrink-0 space-y-4 z-10 sticky top-0 bg-neutral-50 dark:bg-neutral-950 lya:bg-[#FAF6F0] border-b border-neutral-200 dark:border-neutral-800 lya:border-[#EADCC9] transition-colors">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 lya:text-[#7A6353] uppercase tracking-wider text-left">Menú Digital</p>
            <h2 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 lya:text-[#3E2723] truncate text-left leading-tight">Hola, {displayName}</h2>
            {displayPhone && (
              <div className="flex items-center gap-1 mt-1.5 w-fit px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 lya:bg-emerald-50/50 rounded-md border border-emerald-100 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-black tracking-widest">
                <Phone size={12} /><span>{displayPhone}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowSettings(true)} className="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-neutral-900 lya:bg-[#F3EBE0] border border-neutral-200 dark:border-neutral-800 lya:border-[#EADCC9] shadow-sm text-neutral-600 dark:text-neutral-400 lya:text-[#7A6353] transition-colors"><Settings size={18} /></motion.button>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-neutral-900 lya:bg-[#F3EBE0] border border-neutral-200 dark:border-neutral-800 lya:border-[#EADCC9] shadow-sm text-[10px] font-bold text-neutral-700 dark:text-neutral-300 lya:text-[#7A6353] rounded-full">
              {type === 'mesa' ? <Utensils size={12} className="text-orange-500 dark:text-orange-400 lya:text-[#78350F]" /> : <ShoppingBag size={12} className="text-orange-500 dark:text-orange-400 lya:text-[#78350F]" />}
              <span>{type === 'mesa' ? `Mesa ${tableId}` : 'Llevar'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 pt-0.5 -mx-6 px-6">
          {categories.map(cat => (
            <motion.button whileTap={{ scale: 0.95 }} key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`whitespace-nowrap px-4 py-2 rounded-xl font-bold text-xs transition-colors border ${activeCategory === cat.id ? 'bg-orange-500 dark:bg-orange-600 lya:bg-[#78350F] text-white border-transparent' : 'bg-white dark:bg-neutral-900 lya:bg-[#F3EBE0] border-neutral-200 dark:border-neutral-800 lya:border-[#EADCC9] text-neutral-600 dark:text-neutral-400 lya:text-[#7A6353]'}`}>{cat.name}</motion.button>
          ))}
        </div>
      </header>

      <motion.div key={activeCategory} variants={containerVariants} initial="hidden" animate="show" className="flex-1 overflow-y-auto px-6 py-4 pb-32 space-y-4 custom-scrollbar">
        {visibleProducts.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 dark:text-neutral-500 lya:text-[#7A6353] font-medium text-sm">No se encontraron productos en esta categoría.</div>
        ) : (
          visibleProducts.map(product => {
            const hasImage = product.imagen && !product.imagen.includes('default-product');
            const isCustomizable = getProductModifiers(product).length > 0;
            const isAdding = addingToCartId === product.id;

            return (
              <motion.div key={product.id} layout variants={itemVariants} whileTap={isCustomizable ? { scale: 0.98 } : {}} onClick={() => isCustomizable && setSelectedProduct(product)} className={`flex items-center gap-4 p-3 rounded-[2rem] bg-white dark:bg-neutral-900 lya:bg-[#F3EBE0] border border-neutral-100 dark:border-neutral-800 lya:border-[#EADCC9] shadow-sm transition-all ${isCustomizable ? 'cursor-pointer md:hover:scale-[1.01] dark:md:hover:bg-neutral-800/80 lya:md:hover:bg-[#EADCC9]/30' : ''}`}>
                <div className="w-24 h-24 shrink-0 rounded-[1.25rem] overflow-hidden bg-neutral-100 dark:bg-neutral-950 lya:bg-[#EADCC9] border border-neutral-100 dark:border-neutral-800 lya:border-[#D9C4A9] flex items-center justify-center shadow-inner">
                  {hasImage ? <img src={product.imagen} alt={product.nombre} className="w-full h-full object-cover" /> : <ImageIcon className="text-neutral-300 dark:text-neutral-700 lya:text-[#C4B29A]" size={28} />}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between h-full min-h-[6rem] py-1">
                  <div className="min-w-0 mb-1">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-orange-500 dark:text-orange-400 lya:text-[#78350F] block truncate text-left">{getCategoryName(product.categoria)}</span>
                    <h3 className="font-extrabold text-[15px] sm:text-base text-neutral-900 dark:text-neutral-100 lya:text-[#3E2723] truncate text-left">{product.nombre}</h3>
                    {isCustomizable && <span className="inline-flex mt-1.5 text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20 lya:bg-[#EADCC9] px-2.5 py-1 rounded-full border border-orange-200 dark:border-orange-800/30 lya:border-transparent">✨ Personalizable</span>}
                  </div>
                  <div className="flex items-end justify-between mt-auto">
                    <span className="font-black text-lg text-neutral-900 dark:text-neutral-100 lya:text-[#5D4037] tracking-tight block text-left">${product.precio}</span>
                    <button disabled={isAdding || addingToCartId !== null} onClick={(e) => { const defaultMods = getDefaultCustomizations(product); handleAddDirectly(product, defaultMods, e); }} className="w-10 h-10 rounded-[1rem] bg-neutral-900 dark:bg-neutral-800 lya:bg-[#78350F] text-white md:hover:bg-neutral-800 dark:md:hover:bg-neutral-700 lya:md:hover:bg-[#5C240A] flex items-center justify-center shadow transition-all disabled:opacity-50">
                      {isAdding ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} strokeWidth={3} />}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>

      <AnimatePresence>
        {confirmedSnapshot.items.length > 0 && !showCheckout && !selectedProduct && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className={clsx("fixed right-6 z-30 max-w-md mx-auto flex justify-end pointer-events-none", cart.length > 0 ? "bottom-28" : "bottom-6")} style={{ width: 'calc(100% - 3rem)' }}>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsConfirmed(true)} className="pointer-events-auto flex items-center gap-2 px-5 py-3.5 rounded-full bg-white dark:bg-neutral-900 lya:bg-[#F3EBE0] shadow-md border border-neutral-200 dark:border-neutral-800 lya:border-[#EADCC9] text-neutral-800 dark:text-neutral-200 lya:text-[#3E2723] font-black text-sm"><ReceiptText size={20} className="text-orange-500 dark:text-orange-400 lya:text-[#78350F]" /><span>Mi Nota</span></motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cart.length > 0 && !showCheckout && !selectedProduct && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-6 left-0 right-0 px-6 z-40 max-w-md mx-auto">
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowCheckout(true)} className="w-full bg-neutral-900 dark:bg-neutral-800 lya:bg-[#78350F] text-white py-4 px-5 rounded-[2rem] flex items-center justify-between shadow-xl font-bold md:hover:bg-neutral-800 dark:md:hover:bg-neutral-700 lya:md:hover:bg-[#5C240A] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 dark:bg-black/20 flex items-center justify-center font-black text-sm">{totalItems}</div>
                <span className="text-base font-black">Revisar Pedido</span>
              </div>
              {addingToCartId !== null ? <Loader2 size={24} className="animate-spin" /> : <span className="font-black text-xl">${totalCart.toFixed(2)}</span>}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{selectedProduct && <ClientProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onConfirm={async (customizations) => await handleAddDirectly(selectedProduct, customizations)} />}</AnimatePresence>
      <AnimatePresence>{showCheckout && <ClientCheckoutModal cart={cart} totalCart={totalCart} isSubmitting={isSubmitting} onClose={() => setShowCheckout(false)} onConfirmOrder={handleConfirmOrder} removeFromCart={removeFromCart} incrementInCart={incrementInCart} />}</AnimatePresence>
      <AnimatePresence>{showSettings && <ClientSettingsModal themeIndex={themeIndex} sizeIndex={sizeIndex} cycleTheme={cycleTheme} cycleSize={cycleSize} onClose={() => setShowSettings(false)} showLogout={confirmedSnapshot.items.length === 0} onLogout={() => { setShowSettings(false); setShowLogoutConfirm(true); }} onLogoutClick={() => { setShowSettings(false); setShowLogoutConfirm(true); }} />}</AnimatePresence>
      <AnimatePresence>{showLogoutConfirm && <ClientLogoutModal isOpen={showLogoutConfirm} show={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} onLogout={handleLogout} onConfirm={handleLogout} />}</AnimatePresence>
    </div>
  );
}