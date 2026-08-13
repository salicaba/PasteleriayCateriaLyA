//frontend/src/modules/client/views/ClientOrderSuccess.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, ShoppingBag, Eye, ArrowLeft, Utensils, ChevronRight, ReceiptText, Check, PowerOff, Settings, Phone, Tag, Copy, Landmark, MessageCircle, CheckCircle2, Loader2, ChevronDown, LogOut } from 'lucide-react';
import { socket } from '../../../api/socket.js';
import client from '../../../api/client.js';

// 🔥 Añadido onLogoutClick en las props
export default function ClientOrderSuccess({ cart, totalCart, clientData, type, tableId, products, categories, getCategoryName, onReset, isQrActive, onOpenSettings, isOrderPaid, onLogoutClick }) {
  const [showReadOnlyMenu, setShowReadOnlyMenu] = useState(false);
  const [liveCart, setLiveCart] = useState(() => cart || []);
  const [toastMessage, setToastMessage] = useState(null);
  
  const [localIsPaid, setLocalIsPaid] = useState(isOrderPaid);
  
  const [bankAccounts, setBankAccounts] = useState([]);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [showBankDetails, setShowBankDetails] = useState(false); 
  
  const [isProcessingWa, setIsProcessingWa] = useState(false);
  const [copyingId, setCopyingId] = useState(null);
  const isFirstRender = useRef(true);
  
  const parsedNameData = clientData?.name || 'Cliente Lya';
  let displayName = parsedNameData;
  let displayPhone = null;

  if (parsedNameData.includes(' | ')) {
    [displayName, displayPhone] = parsedNameData.split(' | ');
  } else if (parsedNameData.includes(' - ')) {
    [displayName, displayPhone] = parsedNameData.split(' - ');
  }
  
  displayName = displayName.trim();
  if (displayPhone) displayPhone = displayPhone.trim();

  const primerNombre = displayName.split(' ')[0] || 'Cliente Lya';

  useEffect(() => {
    setLiveCart(cart || []);
  }, [cart]);

  useEffect(() => {
    setLocalIsPaid(isOrderPaid);
  }, [isOrderPaid]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoadingAccounts(true);
        const res = await client.get('/settings');
        let rawData = res.data;
        
        if (rawData.data) rawData = rawData.data;

        let parsedAccounts = [];
        let parsedWa = "";

        if (Array.isArray(rawData)) {
            const accObj = rawData.find(item => item.key && (item.key.toLowerCase().includes('cuenta') || item.key.toLowerCase().includes('bank')));
            const waObj = rawData.find(item => item.key && item.key.toLowerCase().includes('whatsapp'));
            
            if (accObj) {
                try { parsedAccounts = typeof accObj.value === 'string' ? JSON.parse(accObj.value) : accObj.value; } catch(e){}
            } else if (rawData.length > 0 && (rawData[0].banco || rawData[0].bank_name)) {
                parsedAccounts = rawData;
            }
            if (waObj) parsedWa = waObj.value;
        } 
        else if (typeof rawData === 'object') {
            parsedAccounts = rawData.bank_accounts || rawData.cuentasBancarias || rawData.bankAccounts || rawData.cuentas || [];
            if (typeof parsedAccounts === 'string') {
                try { parsedAccounts = JSON.parse(parsedAccounts); } catch(e) { parsedAccounts = []; }
            }
            parsedWa = rawData.whatsapp_number || rawData.whatsappComprobantes || rawData.whatsapp || rawData.telefono || "";
        }

        setBankAccounts(Array.isArray(parsedAccounts) ? parsedAccounts : []);

        let cleanWa = String(parsedWa).replace(/\D/g, ''); 
        if (cleanWa.length === 10) cleanWa = '52' + cleanWa; 
        setWhatsappNumber(cleanWa);

      } catch (err) {
        console.error("Error al cargar configuraciones:", err);
        setBankAccounts([]);
      } finally {
        setIsLoadingAccounts(false);
      }
    };

    if (!localIsPaid) {
      fetchSettings();
    }

    socket.on('config:update', fetchSettings);
    socket.on('business_config_updated', fetchSettings);

    return () => {
      socket.off('config:update', fetchSettings);
      socket.off('business_config_updated', fetchSettings);
    };
  }, [localIsPaid]);

  useEffect(() => {
    const handleItemCancelled = ({ orderId, itemId, productId, cancelQty }) => {
        setLiveCart(prev => {
            let found = false;
            return prev.map(item => {
                if (!found && (String(item.backendItemId || item.id) === String(itemId) || String(item.id) === String(productId))) {
                    found = true;
                    const newQty = item.qty - (cancelQty || item.qty);
                    if (newQty <= 0) {
                        return { ...item, status: 'CANCELLED' };
                    }
                    return { ...item, qty: newQty };
                }
                return item;
            });
        });
    };

    const handleItemRestored = ({ orderId, itemId, item }) => {
        if (!item) return;
        setLiveCart(prev => {
            const exists = prev.find(p => String(p.backendItemId || p.id) === String(itemId));
            if (exists) {
                return prev.map(p => String(p.backendItemId || p.id) === String(itemId) ? { ...p, qty: item.quantity, status: 'ACTIVE' } : p);
            }
            
            let parsedPreps = [];
            try { parsedPreps = JSON.parse(item.notes || '[]'); } catch(e) {}
            const meta = parsedPreps.find(p => p && p._isPromoMeta);
            
            const safePrecioUnitario = Number(item.subtotal || 0) / Number(item.quantity || 1);
            const safePrecioOriginal = meta?.precioOriginal ? Number(meta.precioOriginal) : (item.product?.basePrice ? Number(item.product.basePrice) : null);

            const newItem = {
                id: item.productId,
                backendItemId: item.id,
                nombre: item.product?.name || item.nombre || 'Producto',
                imagen: item.product?.imageUrl || null,
                precioUnitario: safePrecioUnitario,
                qty: Number(item.quantity || 1),
                detalles: parsedPreps.filter(p => !p._isPromoMeta)[0] || null,
                preparaciones: parsedPreps,
                cuenta: item.cuenta || 'General',
                isTakeaway: item.isTakeaway,
                isAutoPromo: meta ? meta.isAutoPromo : false,
                promoLabel: meta ? meta.promoLabel : null,
                precioOriginal: safePrecioOriginal,
                status: 'ACTIVE'
            };
            
            return [...prev, newItem];
        });
    };

    const handleOrderCancelled = (data) => {
        const isMyTable = type === 'mesa' && data?.tableId && String(data.tableId) === String(tableId);
        const isMyTakeaway = type !== 'mesa' && data?.ticketId && data.ticketId.toLowerCase().includes(displayName.toLowerCase());
        
        if (isMyTable || isMyTakeaway) {
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.includes('lya_') || key.includes('snapshot'))) localStorage.removeItem(key);
                }
            } catch(e) {}
            onReset(); 
        }
    };

    const handleOrderRestored = (data) => {
        const isMyTable = type === 'mesa' && data?.tableId && String(data.tableId) === String(tableId);
        const isMyTakeaway = type !== 'mesa' && data?.ticketId && data.ticketId.toLowerCase().includes(displayName.toLowerCase());
        
        if (isMyTable || isMyTakeaway) {
            window.location.reload();
        }
    };

    const handleOrderPaid = (data) => {
        const isMyTable = type === 'mesa' && data?.tableId && String(data.tableId) === String(tableId);
        const isMyTakeaway = type !== 'mesa' && data?.ticketId && data.ticketId.toLowerCase().includes(displayName.toLowerCase());

        if (isMyTable || isMyTakeaway) {
            if (data.isFullPayment || (data.cuentaName && data.cuentaName.toLowerCase() === displayName.toLowerCase())) {
                setLocalIsPaid(true);
            }
        }
    };
    
    socket.on('orderItemCancelled', handleItemCancelled);
    socket.on('orderItemRestored', handleItemRestored); 
    socket.on('orderCancelled', handleOrderCancelled);
    socket.on('orderRestored', handleOrderRestored);
    socket.on('orderPaid', handleOrderPaid);
    
    return () => {
       socket.off('orderItemCancelled', handleItemCancelled);
       socket.off('orderItemRestored', handleItemRestored);
       socket.off('orderCancelled', handleOrderCancelled);
       socket.off('orderRestored', handleOrderRestored);
       socket.off('orderPaid', handleOrderPaid);
    };
  }, [tableId, type, displayName, onReset]);

  useEffect(() => {
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return; 
    }

    if (liveCart.length === 0 && cart && cart.length > 0) {
       onReset(); 
    } else if (liveCart.length > 0 && (liveCart.length !== cart.length || liveCart.some((l, i) => cart[i] && l.qty !== cart[i].qty))) {
       try {
           for (let i = 0; i < localStorage.length; i++) {
               const key = localStorage.key(i);
               if (key && (key.toLowerCase().includes('client') || key.toLowerCase().includes('snapshot') || key.toLowerCase().includes('cart'))) {
                   const val = localStorage.getItem(key);
                   if (val && val.includes('precioUnitario')) {
                       const parsed = JSON.parse(val);
                       if (parsed.items) {
                           parsed.items = liveCart;
                           parsed.total = liveCart.filter(i => i.status !== 'CANCELLED').reduce((sum, item) => sum + (Number(item.precioUnitario || 0) * (item.qty || 1)), 0);
                           localStorage.setItem(key, JSON.stringify(parsed));
                       }
                   }
               }
           }
       } catch(e) {}
    }
  }, [liveCart, cart, onReset]);

  const liveTotal = liveCart
    .filter(item => item.status !== 'CANCELLED')
    .reduce((sum, item) => sum + (Number(item.precioUnitario || 0) * (item.qty || 1)), 0);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopy = async (text, label, id) => {
    setCopyingId(`${id}-${label}`);
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copiada exitosamente`);
    } catch (err) {
      showToast('Error al copiar al portapapeles');
    } finally {
      setTimeout(() => setCopyingId(null), 500);
    }
  };

  const handleWhatsApp = async () => {
    if (isProcessingWa || !whatsappNumber) return;
    setIsProcessingWa(true);
    try {
      const orderTypeStr = type === 'mesa' ? `Mesa ${tableId}` : 'Para Llevar';
      const text = encodeURIComponent(`¡Hola! Envío mi comprobante de pago por transferencia.\n\n💳 *Cliente:* ${displayName}\n🧾 *Orden:* ${orderTypeStr}\n💵 *Total Pagado:* $${liveTotal.toFixed(2)}\n\nAdjunto el comprobante:`);
      
      const waUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${text}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setIsProcessingWa(false);
    }
  };

  if (showReadOnlyMenu) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 15 }}
        className="h-full w-full flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900 lya:bg-[#FAF6F0]"
      >
        <header className="px-6 pt-6 pb-4 shrink-0 bg-gray-50 dark:bg-gray-900 lya:bg-[#FAF6F0] border-b border-gray-200 dark:border-gray-800 lya:border-[#EADCC9] transition-colors z-30 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowReadOnlyMenu(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] shadow-sm text-gray-600 dark:text-gray-300 lya:text-[#7A6353] outline-none md:hover:bg-gray-100 dark:md:hover:bg-gray-700"
            >
              <ArrowLeft size={20} strokeWidth={2.5} />
            </motion.button>
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white lya:text-[#3E2723] leading-tight">Menú de Consulta</h3>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 lya:text-[#7A6353] uppercase tracking-wider mt-0.5">Modo Solo Lectura</p>
            </div>
          </div>

          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={onOpenSettings} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] shadow-sm text-gray-600 dark:text-gray-300 lya:text-[#7A6353] outline-none md:hover:bg-gray-100 dark:md:hover:bg-gray-700"
          >
             <Settings size={20} strokeWidth={2.5} />
          </motion.button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar pb-28">
          {products.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-medium text-sm">No hay productos disponibles para mostrar.</div>
          ) : (
            products.map(product => {
              const hasImage = product.imagen && !product.imagen.includes('default-product');
              return (
                <div key={product.id} className="flex items-center gap-4 p-3 rounded-[2rem] bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] shadow-sm">
                  <div className="w-20 h-20 shrink-0 rounded-[1.25rem] overflow-hidden bg-gray-100 dark:bg-gray-900 lya:bg-[#EADCC9] border border-gray-200 dark:border-gray-700 lya:border-[#D9C4A9] flex items-center justify-center shadow-inner pointer-events-none">
                    {hasImage ? <img src={product.imagen} alt={product.nombre} className="w-full h-full object-cover" /> : <span className="text-2xl opacity-30">🍽️</span>}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-orange-500 dark:text-orange-400 lya:text-[#78350F] block truncate mb-0.5 text-left">
                      {getCategoryName(product.categoria)}
                    </span>
                    <h4 className="font-extrabold text-base text-gray-900 dark:text-white lya:text-[#3E2723] leading-tight truncate text-left">
                      {product.nombre}
                    </h4>
                    <span className="font-black text-base text-gray-900 dark:text-white lya:text-[#5D4037] tracking-tight mt-1.5 block text-left">
                      ${Number(product.precio).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="absolute bottom-6 left-0 right-0 px-6 z-40 max-w-md mx-auto">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowReadOnlyMenu(false)}
            className="w-full py-4 rounded-2xl font-black bg-gray-900 md:hover:bg-gray-800 dark:bg-white dark:md:hover:bg-gray-100 lya:bg-[#78350F] text-white dark:text-gray-900 lya:text-white shadow-xl outline-none transition-transform text-sm uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <ReceiptText size={18} strokeWidth={2.5} /> <span>Volver a mi Nota</span>
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      className="h-full w-full flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 lya:bg-[#FAF6F0] relative"
    >
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] flex justify-center w-max max-w-[90vw]"
          >
            <div className="bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] rounded-full shadow-2xl border border-gray-100 dark:border-gray-700 lya:border-[#EADCC9] px-5 py-2.5 flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={16} strokeWidth={3} />
              </div>
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200 lya:text-[#3E2723] text-center">
                {toastMessage}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto custom-scrollbar w-full relative">
        <div className="flex flex-col items-center justify-start p-6 text-center w-full max-w-sm mx-auto min-h-full pb-32 pt-12">
          
          <motion.button 
            whileTap={{ scale: 0.95 }} 
            onClick={onOpenSettings}
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] shadow-sm text-gray-600 dark:text-gray-300 lya:text-[#7A6353] md:hover:bg-gray-100 dark:md:hover:bg-gray-700 transition-colors z-50 outline-none"
          >
            <Settings size={20} strokeWidth={2.5} />
          </motion.button>

          <div className="relative mb-6 mt-2">
            <motion.div 
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="absolute inset-0 bg-green-500 rounded-full blur-2xl z-0"
            />
            
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="relative z-10 w-24 h-24 mx-auto bg-gradient-to-tr from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-xl border-4 border-white dark:border-gray-900 lya:border-[#FAF6F0]"
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
              >
                <Check size={48} strokeWidth={4} className="text-white drop-shadow-md" />
              </motion.div>
            </motion.div>
          </div>

          <div className="space-y-1.5 mb-8">
            <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white lya:text-[#3E2723] leading-none text-center">
              ¡Listo, {primerNombre}!
            </h2>
            <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 lya:text-[#7A6353] px-4 text-center">
              Tu orden está siendo preparada en cocina con mucho amor.
            </p>
          </div>

          <div className="w-full bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] rounded-[2.5rem] p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border border-gray-100 dark:border-gray-700/80 lya:border-[#EADCC9] relative overflow-hidden shrink-0 mb-6">
            
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-400 to-orange-600 lya:from-[#78350F] lya:to-orange-500" />

            <AnimatePresence>
              {localIsPaid && (
                <motion.div 
                  initial={{ scale: 2, opacity: 0, rotate: -25 }} 
                  animate={{ scale: 1, opacity: 1, rotate: -25 }} 
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center overflow-hidden"
                >
                  <div className="border-[6px] border-emerald-500/30 text-emerald-500/30 dark:border-emerald-400/20 dark:text-emerald-400/20 font-black text-5xl sm:text-6xl uppercase tracking-widest px-8 py-3 rounded-[2rem] backdrop-blur-[1.5px] select-none text-center">
                    PAGADA
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700/50 lya:border-[#EADCC9]/50 pb-4 mb-4 mt-2 relative z-10">
              <div className="text-left flex flex-col gap-1">
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-gray-400 dark:text-gray-500 lya:text-[#7A6353]/70">
                  Comprobante
                </span>
                <div className="flex flex-col">
                   <span className="text-sm font-bold text-gray-900 dark:text-white lya:text-[#3E2723] capitalize">
                     {displayName}
                   </span>
                   {displayPhone && (
                     <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                       <Phone size={10} /> {displayPhone}
                     </span>
                   )}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 items-end">
                 <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 lya:bg-white rounded-xl border border-gray-100 dark:border-gray-700 lya:border-[#EADCC9] text-[11px] font-bold text-gray-700 dark:text-gray-300 lya:text-[#3E2723]">
                   {type === 'mesa' ? <Utensils size={14} className="text-orange-500 lya:text-[#78350F]" /> : <ShoppingBag size={14} className="text-orange-500 lya:text-[#78350F]" />}
                   <span>{type === 'mesa' ? `Mesa ${tableId}` : 'Llevar'}</span>
                 </div>
              </div>
            </div>

            <div className="space-y-4 max-h-[30vh] overflow-y-auto custom-scrollbar pr-2 relative z-10">
              {liveCart.map((item, idx) => {
                const isGhost = item.isAutoPromo && item.precioUnitario === 0;
                const isCancelled = item.status === 'CANCELLED';

                return (
                  <div key={idx} className={`flex justify-between items-start text-sm font-medium pb-4 border-b border-gray-50 dark:border-gray-700/30 lya:border-[#EADCC9]/50 last:border-0 last:pb-0 transition-opacity ${isCancelled ? 'opacity-50 grayscale' : 'text-gray-800 dark:text-gray-200 lya:text-[#3E2723]'}`}>
                    
                    <div className="flex-1 pr-3 min-w-0 flex items-start gap-2.5">
                      {isGhost ? (
                         <div className="flex flex-col items-center justify-center bg-rose-50 dark:bg-rose-900/20 lya:bg-rose-100 rounded-lg px-2 py-1 shrink-0 border border-rose-100 dark:border-rose-800/30 lya:border-rose-200 mt-0.5">
                           <Tag size={14} className="text-rose-500 lya:text-rose-600 mb-0.5" strokeWidth={2.5} />
                           <span className="font-black text-center text-[10px] text-rose-600 dark:text-rose-400 lya:text-rose-600 tracking-wider">x{item.qty}</span>
                         </div>
                      ) : isCancelled ? (
                         <span className="text-xs font-black text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                           x{item.qty}
                         </span>
                      ) : (
                         <span className="text-xs font-black text-orange-500 dark:text-orange-400 lya:text-[#78350F] bg-orange-50 dark:bg-orange-500/10 lya:bg-[#EADCC9]/50 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                           x{item.qty}
                         </span>
                      )}
                      
                      <div className="flex-1 min-w-0 text-left">
                        <span className={`font-bold block leading-tight ${isCancelled ? 'text-red-500 dark:text-red-400 line-through' : 'text-gray-900 dark:text-white lya:text-[#3E2723]'}`}>
                          {item.nombre}
                        </span>
                        
                        {item.detalles && !isGhost && (
                          <div className="text-[10px] opacity-70 mt-1 leading-snug font-semibold text-gray-500 dark:text-gray-400 lya:text-[#7A6353]">
                            {item.detalles.tamano && <span>{item.detalles.tamano}</span>}
                            {item.detalles.leche && <span> • {item.detalles.leche}</span>}
                            {item.detalles.extras && item.detalles.extras.length > 0 && <span> • +{item.detalles.extras.join(', ')}</span>}
                            {item.isTakeaway && <span className={`block font-bold mt-1 ${isCancelled ? 'text-red-400' : 'text-orange-500 dark:text-orange-400 lya:text-[#78350F]'}`}>Empaque P/Llevar</span>}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {isCancelled && (
                            <span className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase shrink-0 shadow-sm border border-red-200 dark:border-red-800">
                              Cancelado
                            </span>
                          )}

                          {item.promoLabel && !isCancelled && (
                            <span className="inline-flex items-center gap-1 bg-rose-500 dark:bg-rose-600 text-white px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase shrink-0 shadow-sm">
                              <Tag size={10} strokeWidth={3} />
                              <span>{item.promoLabel}</span>
                            </span>
                          )}
                          
                          {item.qty > 1 && !isGhost && (
                            <span className="inline-block text-[9px] font-extrabold text-gray-400 dark:text-gray-500 lya:text-[#7A6353] tracking-wide uppercase">
                              Unit: ${(Number(item.precioUnitario)).toFixed(2)}
                            </span>
                          )}
                          
                          {item.precioOriginal && !isGhost && !isCancelled && (
                            <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 lya:text-[#7A6353] line-through shrink-0">
                              Normal: ${(Number(item.precioOriginal)).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end shrink-0">
                      <span className={`font-black text-[15px] ${isCancelled ? 'text-red-400 dark:text-red-500 line-through' : 'text-gray-900 dark:text-white lya:text-[#3E2723]'}`}>
                        ${(Number(item.precioUnitario) * item.qty).toFixed(2)}
                      </span>
                      {item.precioOriginal && item.qty > 1 && !isGhost && !isCancelled && (
                         <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 lya:text-[#7A6353] line-through mt-0.5">
                           ${(Number(item.precioOriginal) * item.qty).toFixed(2)}
                         </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] flex flex-col items-center justify-center gap-1 relative z-10">
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-gray-400 dark:text-gray-500 lya:text-[#7A6353]/80">
                Total a Pagar
              </span>
              <span className="text-4xl font-black text-gray-900 dark:text-white lya:text-[#3E2723] tracking-tighter">
                ${liveTotal.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="w-full shrink-0 relative z-30">
            <AnimatePresence mode="wait">
              {localIsPaid ? (
                <motion.div 
                  key="paid-message"
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="w-full bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-[2rem] border border-emerald-200 dark:border-emerald-800/30 text-center shadow-sm"
                >
                  <p className="flex items-center justify-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400 font-black text-sm uppercase tracking-widest">
                    <CheckCircle size={18} strokeWidth={2.5} /> Cuenta Pagada
                  </p>
                  <p className="text-emerald-700/80 dark:text-emerald-300/80 text-[11.5px] font-bold leading-relaxed px-2 text-justify mb-4">
                    Tu cuenta ha sido saldada exitosamente y este ticket ha sido bloqueado. En breve nuestro personal liberará la orden. ¡Gracias por elegir 𝓛𝔂𝓪!
                  </p>
                  
                  <div className="border-t border-emerald-200/60 dark:border-emerald-800/50 pt-4">
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowReadOnlyMenu(true)} 
                      className="w-full py-3.5 rounded-2xl font-bold text-sm bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40 shadow-sm md:hover:bg-emerald-50 dark:md:hover:bg-gray-700 outline-none transition-all flex items-center justify-center gap-2"
                    >
                      <Eye size={16} strokeWidth={2.5} />
                      <span>Ojear menú (Solo Lectura)</span>
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="unpaid-actions" 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  className="space-y-6 w-full"
                >
                  <div className="w-full bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] p-5 rounded-[2rem] border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] shadow-sm text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Landmark className="text-orange-500 lya:text-[#78350F]" size={20} strokeWidth={2.5} />
                      <h3 className="font-black text-gray-900 dark:text-white lya:text-[#3E2723] text-sm uppercase tracking-wide">Pago por Transferencia</h3>
                    </div>
                    
                    <p className="text-[11.5px] font-medium text-gray-500 dark:text-gray-400 lya:text-[#7A6353] text-justify mb-4 px-1 leading-relaxed">
                      Si prefieres pagar vía transferencia electrónica, puedes desplegar los datos bancarios y enviarnos tu comprobante.
                    </p>

                    {isLoadingAccounts ? (
                      <div className="flex flex-col items-center justify-center py-6">
                        <Loader2 className="animate-spin text-orange-500 mb-2" size={32} strokeWidth={3} />
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Conectando...</p>
                      </div>
                    ) : bankAccounts.length === 0 ? (
                      <div className="bg-gray-50 dark:bg-gray-900/50 lya:bg-[#EADCC9]/30 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 mb-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">No hay cuentas bancarias configuradas por el momento.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 mb-5">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setShowBankDetails(!showBankDetails)}
                          className="w-full py-3.5 px-4 rounded-2xl bg-gray-50 dark:bg-gray-900 lya:bg-white border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] flex items-center justify-between text-xs font-black text-gray-800 dark:text-gray-200 lya:text-[#3E2723] shadow-sm outline-none transition-colors md:hover:bg-gray-100 dark:md:hover:bg-gray-800"
                        >
                          <div className="flex items-center gap-2">
                            <Landmark size={16} className="text-orange-500 lya:text-[#78350F]" />
                            <span>{showBankDetails ? 'Ocultar cuentas bancarias' : `Ver cuentas bancarias (${bankAccounts.length})`}</span>
                          </div>
                          <ChevronDown size={16} className={`transition-transform duration-300 ${showBankDetails ? 'rotate-180' : ''}`} />
                        </motion.button>

                        <AnimatePresence>
                          {showBankDetails && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden space-y-3 pt-1"
                            >
                              {bankAccounts.map((acc, index) => {
                                const banco = acc.bank_name || acc.banco || 'Banco';
                                const titular = acc.account_holder || acc.titular;
                                const cuenta = acc.account_number || acc.cuenta;
                                const clabe = acc.clabe;

                                return (
                                  <div key={acc.id || index} className="bg-gray-50 dark:bg-gray-900 lya:bg-white rounded-2xl p-4 border border-gray-100 dark:border-gray-700 lya:border-[#EADCC9] text-left">
                                    <div className="mb-2">
                                      <p className="text-xs font-black text-gray-900 dark:text-white lya:text-[#3E2723]">{banco}</p>
                                      {titular && <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 lya:text-[#7A6353] truncate">Titular: {titular}</p>}
                                    </div>
                                    
                                    {cuenta && (
                                      <div className="flex items-center justify-between bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] mb-2">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[9px] uppercase font-extrabold text-gray-400 dark:text-gray-500 lya:text-[#7A6353]/70">Cuenta</p>
                                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200 lya:text-[#3E2723] tracking-wider truncate">{cuenta}</p>
                                        </div>
                                        <motion.button
                                          whileTap={{ scale: 0.90 }}
                                          onClick={() => handleCopy(cuenta, 'Cuenta', acc.id || index)}
                                          className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 lya:bg-white flex items-center justify-center text-gray-600 dark:text-gray-300 lya:text-[#7A6353] md:hover:bg-gray-200 dark:md:hover:bg-gray-600 outline-none shrink-0"
                                        >
                                          {copyingId === `${acc.id || index}-Cuenta` ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                        </motion.button>
                                      </div>
                                    )}

                                    {clabe && (
                                      <div className="flex items-center justify-between bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9]">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[9px] uppercase font-extrabold text-gray-400 dark:text-gray-500 lya:text-[#7A6353]/70">CLABE Interbancaria</p>
                                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200 lya:text-[#3E2723] tracking-wider truncate">{clabe}</p>
                                        </div>
                                        <motion.button
                                          whileTap={{ scale: 0.90 }}
                                          onClick={() => handleCopy(clabe, 'CLABE', acc.id || index)}
                                          className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 lya:bg-white flex items-center justify-center text-gray-600 dark:text-gray-300 lya:text-[#7A6353] md:hover:bg-gray-200 dark:md:hover:bg-gray-600 outline-none shrink-0"
                                        >
                                          {copyingId === `${acc.id || index}-CLABE` ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                        </motion.button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleWhatsApp}
                      disabled={isProcessingWa || !whatsappNumber}
                      className="w-full py-3.5 rounded-2xl font-black text-sm bg-emerald-500 md:hover:bg-emerald-600 dark:bg-emerald-600 dark:md:hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30 outline-none transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isProcessingWa ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <>
                          <MessageCircle size={18} strokeWidth={2.5} />
                          <span>{whatsappNumber ? 'Enviar Comprobante' : 'WhatsApp no configurado'}</span>
                        </>
                      )}
                    </motion.button>
                  </div>

                  {isQrActive ? (
                    <div className="space-y-2">
                      <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={onReset} 
                        className="w-full py-4 rounded-2xl font-black text-sm bg-gray-900 md:hover:bg-gray-800 dark:bg-white dark:md:hover:bg-gray-100 lya:bg-[#78350F] text-white dark:text-gray-900 lya:text-white shadow-xl outline-none transition-all flex items-center justify-center gap-2"
                      >
                        <span>Quiero pedir algo más</span>
                        <ChevronRight size={16} strokeWidth={3} />
                      </motion.button>
                      <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 lya:text-[#7A6353] text-center px-4">
                        Puedes seguir agregando bebidas o postres a tu cuenta de forma autónoma.
                      </p>
                    </div>
                  ) : (
                    <div className="w-full bg-gray-200/50 dark:bg-gray-800/50 lya:bg-[#EADCC9]/50 p-5 rounded-[2rem] border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] shrink-0 text-center">
                       <p className="flex items-center justify-center gap-2 mb-2 text-gray-500 dark:text-gray-400 lya:text-[#78350F] font-black text-sm">
                         <PowerOff size={16} strokeWidth={2.5} /> Servicio Pausado
                       </p>
                       <p className="text-gray-500 dark:text-gray-400 lya:text-[#7A6353] text-[11.5px] font-medium leading-relaxed px-2 text-justify">
                         Los pedidos digitales se han apagado temporalmente. Si deseas ordenar algo más, por favor habla directamente con nuestro personal en mostrador o en tu mesa.
                       </p>
                    </div>
                  )}

                  <div className="border-t border-gray-200 dark:border-gray-800 lya:border-[#EADCC9] w-3/4 mx-auto my-4"></div>

                  <div className="space-y-2">
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowReadOnlyMenu(true)} 
                      className="w-full py-3.5 rounded-2xl font-bold text-sm bg-white dark:bg-gray-800 lya:bg-white text-gray-600 dark:text-gray-300 lya:text-[#7A6353] border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] shadow-sm md:hover:bg-gray-50 dark:md:hover:bg-gray-700/50 outline-none transition-all flex items-center justify-center gap-2"
                    >
                      <Eye size={16} strokeWidth={2.5} />
                      <span>Ver menú solo de lectura</span>
                    </motion.button>
                    <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 lya:text-[#7A6353]/80 text-center px-2">
                      Si prefieres, revisa el catálogo aquí y pídele a un empleado que tome tu nueva orden.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 🔥 NUEVO: Botón Flotante de Retiro movido aquí (Dinámico para Mesa/Llevar y oculto en Solo Lectura) */}
      <AnimatePresence>
        {localIsPaid && !showReadOnlyMenu && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-6 left-0 right-0 px-6 z-40 flex justify-center pointer-events-none"
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onLogoutClick}
              className="pointer-events-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-4 rounded-full font-black shadow-2xl flex items-center gap-2 border border-gray-700 md:hover:scale-105 transition-transform"
            >
              <LogOut size={18} /> {type === 'llevar' ? 'Cerrar mi cuenta (Salir)' : 'Ya me retiro (Cerrar)'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}