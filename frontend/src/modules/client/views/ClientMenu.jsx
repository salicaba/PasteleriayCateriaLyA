// src/modules/client/views/ClientMenu.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, Utensils, Plus, Image as ImageIcon, 
  Settings, ReceiptText, Loader2, CheckCircle2, AlertTriangle, AlertCircle, PowerOff, Clock
} from 'lucide-react';
import client from '../../../api/client'; 
import ClientOrderSuccess from './ClientOrderSuccess';
import clsx from 'clsx';

// Importación de componentes divididos
import ClientProductModal from './components/ClientProductModal';
import ClientCheckoutModal from './components/ClientCheckoutModal';
import ClientSettingsModal from './components/ClientSettingsModal';
import ClientLogoutModal from './components/ClientLogoutModal';
import { 
  THEME_CLASSES, SIZES, getInitialTheme, getInitialSize, 
  getProductModifiers, getDefaultCustomizations 
} from './utils/clientMenuUtils';

// Importamos el logo de 𝓛𝔂𝓪 para la pantalla de carga
import logoLyA from '../../../assets/logo.jpeg'; 

export default function ClientMenu({ clientData, type, tableId, onLogout }) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeCategory, setActiveCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Estados de interfaz y retroalimentación
  const [showSettings, setShowSettings] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [themeIndex, setThemeIndex] = useState(getInitialTheme);
  const [sizeIndex, setSizeIndex] = useState(getInitialSize);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addingToCartId, setAddingToCartId] = useState(null);
  const [notification, setNotification] = useState(null);
  
  // 🔥 ESTADO DE DIAGNÓSTICO NEO-BENTO PARA ERRORES DE RED
  const [diagnosticError, setDiagnosticError] = useState(null);
  
  // ESTADO PARA EL BOTÓN DE CARGA DE LOGOUT
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Estados del negocio (Kill-Switch y Caducidad)
  const [isQrActive, setIsQrActive] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  
  // REFERENCIA DE TIEMPO REAL PARA MÓVILES
  const lastActivityRef = useRef(Date.now());
  
  // CANDADO SÍNCRONO: Mata el Ghost Click en la lista de productos
  const isProcessingRef = useRef(false);

  const [activeOrderId, setActiveOrderId] = useState(() => localStorage.getItem('lya_client_order_id') || null);
  const [confirmedSnapshot, setConfirmedSnapshot] = useState(() => {
    const saved = localStorage.getItem('lya_client_snapshot');
    return saved ? JSON.parse(saved) : { items: [], total: 0 };
  });

  // POLLING PARA VERIFICAR SI APAGARON EL QR DESDE CAJA (Cada 15 segundos)
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

  // LÓGICA ROBUSTA: Auto-cierre de sesión por inactividad (25 minutos)
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };
    
    const events = ['touchstart', 'click', 'mousemove', 'scroll', 'keypress'];
    events.forEach(event => window.addEventListener(event, updateActivity, { passive: true }));

    const checkInterval = setInterval(() => {
      if (isConfirmed || isSubmitting) return; 

      const now = Date.now();
      if (now - lastActivityRef.current > 1500000) {
        setSessionExpired(true);
      }
    }, 30000); 

    return () => {
      clearInterval(checkInterval);
      events.forEach(event => window.removeEventListener(event, updateActivity));
    };
  }, [isConfirmed, isSubmitting]);

  // LÓGICA DE SALIDA PERFECTA: Sin parpadeos y con pantalla de carga de 𝓛𝔂𝓪
  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    setShowSettings(false);
    setIsLoggingOut(true);

    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const keysToRemove = [
      'lya_client_order_id', 
      'lya_client_snapshot', 
      'lya_client_data', 
      'lya_client_session'
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    if (typeof onLogout === 'function') {
      onLogout();
    } else {
      window.location.reload();
    }
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
  
  const visibleProducts = isTodasCategory 
    ? products 
    : products.filter(p => p.categoria === activeCategory);

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

  const triggerNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
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
      const dbOrderType = type === 'mesa' ? 'SALON' : 'LLEVAR';
      let targetOrderId = activeOrderId;

      const createNewOrder = async () => {
        const orderPayload = { orderType: dbOrderType, tableId: dbOrderType === 'SALON' ? tableId : null, ticketId: clientData.name };
        // Aquí es donde falla si el endpoint exige token
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
          cuenta: clientData.name, 
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
      
      let backendError = "Error al procesar la orden en el servidor.";
      let statusCode = error.response?.status || "Sin status";
      let endpoint = error.config?.url || "Ruta desconocida";

      if (error.response && error.response.data && error.response.data.message) {
        backendError = error.response.data.message;
      } else if (error.message) {
        backendError = error.message;
      }
      
      // 🔥 ACTIVACIÓN DEL MODAL DE DIAGNÓSTICO NEO-BENTO
      setDiagnosticError({
        endpoint: endpoint,
        statusCode: statusCode,
        message: backendError
      });

      // Notificación libre del "Ups!" para evadir el autocorrector
      triggerNotification(`Atención: ${backendError.substring(0, 25)}...`, 'warning');
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
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08, 
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      transition: { type: "spring", stiffness: 300, damping: 24 } 
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg backdrop-blur-md transition-opacity duration-300">
         <div className="relative w-28 h-28 mb-6">
            <div className="absolute inset-0 rounded-full border-[6px] border-gray-200 dark:border-gray-800 lya:border-lya-border/40" />
            <div className="absolute inset-0 rounded-full border-[6px] border-orange-500 dark:border-orange-400 lya:border-lya-primary border-t-transparent animate-spin" />
            <div className="absolute inset-0 m-2 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-inner">
              <img src={logoLyA} alt="Logo Lya" className="w-full h-full object-cover animate-pulse" />
            </div>
         </div>
         
         <motion.h2 
            initial={{ y: 10, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            transition={{ delay: 0.2 }}
            className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight mb-2 animate-pulse"
         >
            {isLoggingOut ? "Cerrando sesión..." : "Preparando tu mesa..."}
         </motion.h2>
         <motion.p 
            initial={{ y: 10, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            transition={{ delay: 0.4 }}
            className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-medium text-sm flex items-center gap-2"
         >
            {isLoggingOut ? (
               <Loader2 size={16} className="text-orange-500 animate-spin" />
            ) : (
               <CheckCircle2 size={16} className="text-green-500" />
            )}
            {isLoggingOut ? "Liberando la mesa" : "Cargando el menú más fresco"}
         </motion.p>
      </div>
    );
  }

  if (sessionExpired) {
    return (
      <div className="h-full w-full flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-6 overflow-hidden">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }} 
          transition={{ type: 'spring', damping: 25 }} 
          className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-8 sm:p-10 rounded-[2.5rem] shadow-2xl max-w-[400px] w-full flex flex-col items-center border border-gray-100 dark:border-gray-800 lya:border-lya-border/40"
        >
          <div className="w-20 h-20 bg-orange-50 dark:bg-orange-500/10 lya:bg-lya-secondary/10 rounded-full flex items-center justify-center mb-6 shadow-inner text-orange-500 dark:text-orange-400 lya:text-lya-secondary">
             <Clock size={40} strokeWidth={2} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-4 tracking-tight text-center">
             Sesión Expirada
          </h2>
          <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-medium text-sm mb-8 leading-relaxed text-justify px-2">
             Hemos cerrado tu sesión por inactividad para liberar la mesa digitalmente, ya que no detectamos ninguna orden confirmada. 
             <br/><br/>
             Si deseas ordenar nuevamente, por favor vuelve a ingresar tu nombre en el sistema presionando el botón de abajo.
          </p>
          <motion.button 
            whileTap={{ scale: 0.95 }} 
            onClick={handleLogout} 
            className="w-full py-4 bg-orange-500 md:hover:bg-orange-600 dark:bg-orange-600 lya:bg-lya-primary text-white lya:text-lya-surface rounded-2xl font-black transition-all shadow-lg shadow-orange-500/30 active:scale-95 flex items-center justify-center gap-2 outline-none"
          >
            <span>Volver a Iniciar Sesión</span>
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (!isQrActive && !isConfirmed) {
    return (
      <div className="h-full w-full flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-6 overflow-hidden">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }} 
          transition={{ type: 'spring', damping: 25 }} 
          className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-8 sm:p-10 rounded-[2.5rem] shadow-2xl max-w-[400px] w-full flex flex-col items-center border border-gray-100 dark:border-gray-800 lya:border-lya-border/40"
        >
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg rounded-full flex items-center justify-center mb-6 shadow-inner">
             <PowerOff size={40} className="text-gray-400 dark:text-gray-500 lya:text-lya-text/40" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-4 tracking-tight text-center">
             Servicio Suspendido
          </h2>
          <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-medium text-sm mb-8 leading-relaxed text-justify">
             El servicio de pedidos digitales por código QR se encuentra temporalmente deshabilitado. Esto ocurre cuando cerramos cocina o pausamos los pedidos web. 
             <br/><br/>
             <b className="text-gray-700 dark:text-gray-300 lya:text-lya-text/90">¿Estamos abiertos? ¡Entra y pide sin miedo!</b> Acércate al mostrador o llama a nuestro personal, estarán encantados de tomar tu orden directamente.
          </p>
          <motion.button 
            whileTap={{ scale: 0.95 }} 
            onClick={handleLogout} 
            className="w-full py-4 bg-gray-900 dark:bg-white lya:bg-lya-text text-white dark:text-gray-900 lya:text-lya-surface rounded-2xl font-black transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 outline-none"
          >
             <span>Entendido, cerrar menú</span>
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (isConfirmed) {
    return (
      <ClientOrderSuccess 
        cart={confirmedSnapshot.items} 
        totalCart={confirmedSnapshot.total}
        clientData={clientData}
        type={type}
        tableId={tableId}
        products={products}
        categories={categories}
        getCategoryName={getCategoryName}
        isQrActive={isQrActive} 
        onReset={() => {
          if (isQrActive) setIsConfirmed(false); 
        }}
        onOpenSettings={() => setShowSettings(true)}
      />
    );
  }

  return (
    <div className="h-full w-full flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg relative">
      
      {/* NOTIFICACIONES TIPO CÁPSULA NEO-BENTO */}
      <AnimatePresence>
        {notification && (
          <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
            <motion.div 
              initial={{ opacity: 0, y: -50, scale: 0.9 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className={`bg-white/95 dark:bg-gray-900/95 lya:bg-lya-surface/95 backdrop-blur-xl text-gray-800 dark:text-white lya:text-lya-text px-6 py-4 rounded-full shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] flex items-center justify-center gap-3 font-bold border pointer-events-auto transition-colors max-w-md w-full sm:w-auto text-center ${
                notification.type === 'success' ? 'border-emerald-200/50 dark:border-emerald-900/30 lya:border-lya-primary/30' :
                notification.type === 'warning' ? 'border-amber-200/50 dark:border-amber-900/30 lya:border-amber-500/30' :
                'border-red-200/50 dark:border-red-900/30 lya:border-red-500/30'
              }`}
            >
              <div className={`p-1.5 rounded-full shrink-0 ${
                notification.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/20 lya:bg-lya-primary/20 text-emerald-500 lya:text-lya-primary' :
                notification.type === 'warning' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-500 lya:text-amber-400' :
                'bg-red-100 dark:bg-red-500/20 text-red-500 lya:text-red-400'
              }`}>
                {notification.type === 'success' ? <CheckCircle2 size={20} strokeWidth={2.5} /> : 
                 notification.type === 'warning' ? <AlertTriangle size={20} strokeWidth={2.5} /> : 
                 <AlertCircle size={20} strokeWidth={2.5} />}
              </div>
              <span className="text-sm tracking-wide text-center">{notification.msg}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="px-6 pt-6 pb-3 shrink-0 space-y-4 z-10 sticky top-0 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg border-b border-gray-200 dark:border-gray-800 lya:border-lya-border/40 transition-colors">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 lya:text-lya-text/40 uppercase tracking-wider text-left">Menú Digital</p>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text truncate text-left">Hola, {clientData.name}</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 lya:bg-lya-surface border border-gray-200 dark:border-gray-700 lya:border-lya-border shadow-sm text-xs font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text shrink-0 text-center">
              {type === 'mesa' ? <Utensils size={14} className="text-orange-500 lya:text-lya-secondary" /> : <ShoppingBag size={14} className="text-orange-500 lya:text-lya-secondary" />}
              <span>{type === 'mesa' ? `Mesa ${tableId}` : 'Llevar'}</span>
            </div>
            
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowSettings(true)} className="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 lya:bg-lya-surface border border-gray-200 dark:border-gray-700 lya:border-lya-border shadow-sm text-gray-600 dark:text-gray-300 lya:text-lya-text md:hover:bg-gray-100 dark:md:hover:bg-gray-700 transition-colors shrink-0 outline-none">
              <Settings size={18} strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 pt-0.5 -mx-6 px-6">
          {categories.map(cat => (
            <motion.button
              whileTap={{ scale: 0.95 }}
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl font-bold text-xs transition-colors shadow-sm border text-center outline-none ${
                activeCategory === cat.id 
                  ? 'bg-orange-500 dark:bg-orange-600 lya:bg-lya-primary text-white border-transparent' 
                  : 'bg-white dark:bg-gray-800 lya:bg-lya-surface border-gray-200 dark:border-gray-700 lya:border-lya-border/40 text-gray-600 dark:text-gray-400 lya:text-lya-text/80'
              }`}
            >
              {cat.name}
            </motion.button>
          ))}
        </div>
      </header>

      <motion.div 
        key={activeCategory} 
        variants={containerVariants}
        initial="hidden" 
        animate="show" 
        className="flex-1 overflow-y-auto px-6 py-4 pb-32 space-y-4 custom-scrollbar"
      >
        {visibleProducts.length === 0 ? (
          <motion.div variants={itemVariants} className="text-center py-12 text-gray-400 dark:text-gray-500 lya:text-lya-text/40 font-medium text-sm">
            No se encontraron productos en esta categoría.
          </motion.div>
        ) : (
          visibleProducts.map(product => {
            const hasImage = product.imagen && !product.imagen.includes('default-product');
            const isCustomizable = getProductModifiers(product).length > 0;
            const isAdding = addingToCartId === product.id;

            return (
              <motion.div 
                key={product.id} 
                layout 
                variants={itemVariants}
                whileTap={isCustomizable ? { scale: 0.98 } : {}} 
                onClick={() => isCustomizable && setSelectedProduct(product)} 
                className={`flex items-center gap-4 p-3 rounded-[2rem] bg-white dark:bg-gray-800 lya:bg-lya-surface border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 shadow-sm transition-all ${isCustomizable ? 'cursor-pointer md:hover:shadow-md md:hover:scale-[1.01]' : ''}`}
              >
                <div className="w-24 h-24 shrink-0 rounded-[1.25rem] overflow-hidden bg-gray-100 dark:bg-gray-900 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 flex items-center justify-center shadow-inner pointer-events-none">
                  {hasImage ? <img src={product.imagen} alt={product.nombre} className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-300 dark:text-gray-600 lya:text-lya-text/20" size={28} />}
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col justify-between h-full min-h-[6rem] py-1">
                  <div className="min-w-0 mb-1">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-orange-500 dark:text-orange-400 lya:text-lya-secondary block truncate mb-0.5 text-left">{getCategoryName(product.categoria)}</span>
                    <h3 className="font-extrabold text-[15px] sm:text-base text-gray-900 dark:text-white lya:text-lya-text leading-tight line-clamp-2 text-left">{product.nombre}</h3>
                    {isCustomizable && <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-orange-600 dark:text-orange-400 lya:text-lya-secondary bg-orange-100 dark:bg-orange-500/20 lya:bg-lya-secondary/10 px-2.5 py-1 rounded-full border border-orange-200 dark:border-orange-500/30 lya:border-lya-secondary/20 transition-colors text-center">✨ Personalizable</span>}
                  </div>
                  
                  <div className="flex items-end justify-between mt-auto">
                    <span className="font-black text-lg text-gray-900 dark:text-white lya:text-lya-text tracking-tight block text-left">${product.precio}</span>
                    
                    <button 
                      disabled={isAdding || addingToCartId !== null}
                      onClick={(e) => { 
                        const defaultMods = getDefaultCustomizations(product);
                        handleAddDirectly(product, defaultMods, e); 
                      }} 
                      className="w-10 h-10 rounded-[1rem] bg-gray-900 dark:bg-white lya:bg-lya-primary text-white dark:text-gray-900 lya:text-white flex items-center justify-center shadow shrink-0 outline-none touch-manipulation active:scale-90 transition-all disabled:opacity-50"
                    >
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
          <motion.div 
            initial={{ scale: 0, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0, opacity: 0 }} 
            className={clsx("fixed right-6 z-30 max-w-md mx-auto flex justify-end pointer-events-none", cart.length > 0 ? "bottom-28" : "bottom-6")}
            style={{ width: 'calc(100% - 3rem)' }}
          >
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsConfirmed(true)} className="pointer-events-auto flex items-center gap-2 px-5 py-3.5 rounded-full bg-white dark:bg-gray-800 lya:bg-lya-surface shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-gray-200/50 dark:border-gray-700/50 lya:border-lya-border/50 transition-colors text-gray-800 dark:text-gray-200 lya:text-lya-text text-center outline-none touch-manipulation">
              <div className="relative">
                <ReceiptText size={20} className="text-orange-500 lya:text-lya-secondary" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-white dark:border-gray-800 lya:border-lya-surface animate-pulse"></span>
              </div>
              <span className="font-black text-sm tracking-wide">Mi Nota</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cart.length > 0 && !showCheckout && !selectedProduct && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-6 left-0 right-0 px-6 z-40 max-w-md mx-auto">
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowCheckout(true)} className="w-full bg-gray-900 dark:bg-white lya:bg-lya-text text-white dark:text-gray-900 lya:text-lya-surface py-4 px-5 rounded-[2rem] flex items-center justify-between shadow-xl transition-colors font-bold text-center outline-none touch-manipulation">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 dark:bg-black/10 lya:bg-white/25 flex items-center justify-center font-black text-sm">{totalItems}</div>
                <span className="text-base tracking-wide font-black">Revisar Pedido</span>
              </div>
              
              {addingToCartId !== null ? (
                <Loader2 size={24} className="animate-spin text-orange-500 lya:text-lya-secondary" />
              ) : (
                <span className="font-black text-xl">${(totalCart || 0).toFixed(2)}</span>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RENDERIZADO DE MODALES EXTERNOS */}
      <AnimatePresence>
        {selectedProduct && (
          <ClientProductModal 
            product={selectedProduct} 
            onClose={() => setSelectedProduct(null)} 
            onConfirm={async (customizations) => await handleAddDirectly(selectedProduct, customizations)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCheckout && (
          <ClientCheckoutModal 
            cart={cart}
            totalCart={totalCart}
            isSubmitting={isSubmitting}
            onClose={() => setShowCheckout(false)}
            onConfirmOrder={handleConfirmOrder}
            removeFromCart={removeFromCart}
            incrementInCart={incrementInCart}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <ClientSettingsModal 
            themeIndex={themeIndex}
            sizeIndex={sizeIndex}
            cycleTheme={cycleTheme}
            cycleSize={cycleSize}
            onClose={() => setShowSettings(false)}
            showLogout={!isConfirmed} 
            onLogout={() => {
              setShowSettings(false);
              setShowLogoutConfirm(true);
            }}
            onLogoutClick={() => {
              setShowSettings(false);
              setShowLogoutConfirm(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogoutConfirm && (
          <ClientLogoutModal 
            isOpen={showLogoutConfirm}
            show={showLogoutConfirm}
            onClose={() => setShowLogoutConfirm(false)}
            onLogout={handleLogout}
            onConfirm={handleLogout} 
          />
        )}
      </AnimatePresence>

      {/* 🔥 MODAL DE DIAGNÓSTICO NEO-BENTO PARA ERRORES DE RED */}
      <AnimatePresence>
        {diagnosticError && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDiagnosticError(null)}
              className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-[400px] flex flex-col items-center border-2 border-red-100 dark:border-red-900/40"
            >
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 mx-auto rounded-full flex items-center justify-center mb-5 shadow-sm">
                <AlertCircle size={32} strokeWidth={2} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6 text-center tracking-tight">Falla de Conexión</h3>
              
              <div className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-[1.5rem] mb-6 font-mono text-xs text-gray-700 dark:text-gray-300 overflow-hidden break-words text-left space-y-3 border border-gray-200 dark:border-gray-700 shadow-inner">
                <p><strong className="text-red-500 dark:text-red-400">🌐 Endpoint:</strong> <br/>{diagnosticError.endpoint}</p>
                <p><strong className="text-red-500 dark:text-red-400">📡 Status:</strong> {diagnosticError.statusCode}</p>
                <p><strong className="text-red-500 dark:text-red-400">🛑 Motivo:</strong> <br/>{diagnosticError.message}</p>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 p-5 rounded-[1.5rem] mb-8 text-xs font-medium text-orange-800 dark:text-orange-200 text-justify border border-orange-100 dark:border-orange-800/30">
                <strong className="block mb-2 font-black uppercase tracking-wider text-[10px]">💡 Diagnóstico Neo-Bento:</strong>
                Si el error es "Token no proporcionado" en <b>/pos/orders</b>, el Backend está bloqueando tu petición. Debes decirle a la API que acepte órdenes de clientes públicos quitándole el middleware de Auth a esa ruta o creando una nueva ruta pública en el servidor.
              </div>

              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => setDiagnosticError(null)}
                className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-[1.5rem] font-black shadow-lg shadow-gray-900/20 dark:shadow-white/10 outline-none select-none"
              >
                Entendido, lo revisaré
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}