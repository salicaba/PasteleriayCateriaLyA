// src/modules/client/views/ClientMenu.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ChevronLeft, AlertTriangle, Utensils, Plus, Minus, CheckCircle, Image as ImageIcon, X, Check, Settings, Palette, Type, ReceiptText } from 'lucide-react';
import client from '../../../api/client'; 
import ClientOrderSuccess from './ClientOrderSuccess';
import clsx from 'clsx';

// --- CONSTANTES DE AJUSTES ---
const THEME_NAMES = ['Claro', 'Oscuro', '𝓛𝔂𝓪'];
const THEME_CLASSES = ['light', 'dark', 'theme-lya'];

const SIZES = [
  { name: 'Chica', val: '14px' },
  { name: 'Mediana', val: '16px' },
  { name: 'Grande', val: '18px' }
];

const getInitialTheme = () => {
  const saved = localStorage.getItem('lya_client_theme');
  if (saved !== null) return Number(saved);
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 1;
  return 2; 
};

const getInitialSize = () => {
  const saved = localStorage.getItem('lya_client_size');
  if (saved !== null) return Number(saved);
  return 0; 
};

const getProductModifiers = (product) => {
  if (!product) return [];
  let ops = product.opciones;
  if (typeof ops === 'string') { try { ops = JSON.parse(ops); } catch (e) { } }
  if (typeof ops === 'string') { try { ops = JSON.parse(ops); } catch (e) { } }
  
  if (ops && typeof ops === 'object') {
      const mods = [];
      const mapOption = (opt) => {
          if (typeof opt === 'string') return { id: opt, label: opt, price: 0 };
          return { id: opt.nombre || 'Opción', label: opt.nombre || 'Opción', price: Number(opt.precioAdicional || 0) };
      };

      const tamanos = Array.isArray(ops.tamanos) ? ops.tamanos : [];
      const leches = Array.isArray(ops.leches) ? ops.leches : [];
      const extras = Array.isArray(ops.extras) ? ops.extras : [];

      if (tamanos.length > 0) mods.push({ id: 'tamano', title: 'Tamaño', type: 'single', options: tamanos.map(mapOption) });
      if (leches.length > 0) mods.push({ id: 'leche', title: 'Tipo de Leche', type: 'single', options: leches.map(mapOption) });
      if (extras.length > 0) mods.push({ id: 'extras', title: 'Extras Adicionales', type: 'multiple', options: extras.map(mapOption) });

      return mods;
  }
  return [];
};

const getDefaultCustomizations = (product) => {
  const modifiers = getProductModifiers(product);
  if (modifiers.length === 0) return null;

  let total = Number(product.precioBase || product.precio || 0);
  let tamanoStr = 'Estándar';
  let lecheStr = null;
  let extrasArr = [];

  modifiers.forEach(mod => {
      if (mod.type === 'single' && mod.options.length > 0) {
          const opt = mod.options[0];
          total += opt.price;
          
          const idLower = String(mod.id).toLowerCase();
          const titleLower = String(mod.title).toLowerCase();
          
          if (idLower.includes('leche') || titleLower.includes('leche')) {
              lecheStr = opt.label;
          } else if (idLower.includes('taman') || idLower.includes('tamañ') || titleLower.includes('tamañ')) {
              tamanoStr = opt.label;
          } else {
              extrasArr.push(opt.label);
          }
      }
  });

  return {
      precioFinal: total,
      detalles: { tamano: tamanoStr, ...(lecheStr && { leche: lecheStr }), ...(extrasArr.length > 0 && { extras: extrasArr }) },
      isTakeaway: false
  };
};

const ClientProductModal = ({ product, onClose, onConfirm }) => {
  const [selections, setSelections] = useState({});
  const [isTakeaway, setIsTakeaway] = useState(false);

  const isAgotado = product.controlarStock === true && product.stock <= 0;
  const availableModifiers = useMemo(() => getProductModifiers(product), [product]);

  useEffect(() => {
    const initial = {};
    availableModifiers.forEach(mod => {
      if (mod.type === 'single' && mod.options.length > 0) {
        initial[mod.id] = mod.options[0].id;
      }
    });
    setSelections(initial);
  }, [availableModifiers]);

  const handleToggle = (modId, optId, type) => {
    setSelections(prev => {
      const current = prev[modId];
      if (type === 'single') return { ...prev, [modId]: optId };
      const currentArray = Array.isArray(current) ? current : [];
      if (currentArray.includes(optId)) return { ...prev, [modId]: currentArray.filter(id => id !== optId) };
      return { ...prev, [modId]: [...currentArray, optId] };
    });
  };

  const calculateTotal = () => {
    let total = Number(product.precioBase || product.precio || 0);
    availableModifiers.forEach(mod => {
      const selected = selections[mod.id];
      if (!selected) return;
      if (mod.type === 'single') {
        const opt = mod.options.find(o => o.id === selected);
        if (opt) total += opt.price;
      } else {
        selected.forEach(sId => {
          const opt = mod.options.find(o => o.id === sId);
          if (opt) total += opt.price;
        });
      }
    });
    return total;
  };

  const handleConfirm = () => {
    if (isAgotado) return;
    let tamanoStr = 'Estándar';
    let lecheStr = null;
    let extrasArr = [];

    availableModifiers.forEach(mod => {
      const selected = selections[mod.id];
      if (!selected) return;

      if (mod.type === 'single') {
        const opt = mod.options.find(o => o.id === selected);
        if (opt) {
           const idLower = String(mod.id).toLowerCase();
           const titleLower = String(mod.title).toLowerCase();
           if (idLower.includes('leche') || titleLower.includes('leche')) {
               lecheStr = opt.label;
           } else if (idLower.includes('taman') || idLower.includes('tamañ') || titleLower.includes('tamañ')) {
               tamanoStr = opt.label;
           } else {
               extrasArr.push(opt.label);
           }
        }
      } else {
        selected.forEach(sId => {
          const opt = mod.options.find(o => o.id === sId);
          if (opt) extrasArr.push(opt.label);
        });
      }
    });

    onConfirm({
      precioFinal: calculateTotal(),
      detalles: { tamano: tamanoStr, ...(lecheStr && { leche: lecheStr }), ...(extrasArr.length > 0 && { extras: extrasArr }) },
      isTakeaway
    });
  };

  if (!product) return null;
  const hasImage = product.imagen && !product.imagen.includes('default-product');

  return (
    <div className="absolute inset-0 z-[70] flex items-end justify-center pointer-events-none p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 lya:bg-black/70 pointer-events-auto" />
      <motion.div initial={{ y: "100%", scale: 0.95, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: "100%", scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 220 }} className="relative z-10 bg-white dark:bg-gray-800 lya:bg-lya-surface w-full max-w-md mx-auto rounded-[2.5rem] shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[85vh] border border-gray-200 dark:border-gray-700 lya:border-lya-border/40">
        <div className="flex items-start gap-4 p-5 border-b border-gray-200 dark:border-gray-700 lya:border-lya-border/40 shrink-0 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg">
          {hasImage ? <img src={product.imagen} className="w-20 h-20 object-cover rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 shrink-0" alt={product.nombre} /> : <div className="w-20 h-20 flex items-center justify-center bg-gray-200 dark:bg-gray-700 lya:bg-white/50 rounded-2xl text-gray-400 lya:text-lya-text/30 shrink-0 border border-gray-200 dark:border-gray-700 lya:border-lya-border/30"><ImageIcon size={32} /></div>}
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="text-lg sm:text-xl font-black leading-tight text-gray-900 dark:text-white lya:text-lya-text line-clamp-3 mb-1.5">{product.nombre}</h3>
            <p className="font-bold text-base text-orange-600 dark:text-orange-400 lya:text-lya-secondary">${Number(product.precioBase || product.precio || 0).toFixed(2)} <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 ml-1 uppercase tracking-wider">Base</span></p>
          </div>
          <button onClick={onClose} className="shrink-0 bg-white dark:bg-gray-700 lya:bg-white hover:bg-gray-100 active:scale-90 text-gray-500 dark:text-gray-300 lya:text-lya-text p-2 rounded-full transition-colors border border-gray-200 dark:border-gray-600 lya:border-lya-border/40 shadow-sm mt-0.5"><X size={20} strokeWidth={2.5} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {availableModifiers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center space-y-2">
              <span className="text-4xl">🍽️</span><p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-medium">Este producto no tiene opciones adicionales configuradas.</p>
            </div>
          ) : (
            availableModifiers.map(mod => (
              <div key={mod.id}>
                <h4 className="font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text mb-3 flex justify-between items-center border-b border-gray-100 dark:border-gray-700 lya:border-lya-border/30 pb-2">
                  <span>{mod.title}</span>{mod.type === 'multiple' && <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500 bg-orange-100 dark:bg-orange-500/20 lya:bg-lya-secondary/10 px-2 py-0.5 rounded lya:border lya:border-lya-secondary/20">Elige varios</span>}
                </h4>
                <div className="flex flex-wrap gap-3">
                  {mod.options.map(opt => {
                    const isSelected = mod.type === 'single' ? selections[mod.id] === opt.id : selections[mod.id]?.includes(opt.id);
                    return (
                      <button key={opt.id} onClick={() => handleToggle(mod.id, opt.id, mod.type)} className={clsx("px-4 py-3 rounded-2xl border text-sm font-bold transition-all flex items-center justify-between gap-3 active:scale-95 flex-grow sm:flex-grow-0", isSelected ? "border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/30 lya:bg-lya-primary lya:border-lya-primary lya:text-lya-surface" : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:border-gray-300 lya:bg-white/80 lya:border-lya-border/40 lya:text-lya-text")}>
                        <span className="flex items-center gap-2">{isSelected && <Check size={16} strokeWidth={4} />}{opt.label}</span>
                        {opt.price > 0 && <span className={clsx("text-xs px-2 py-1 rounded-lg ml-auto whitespace-nowrap", isSelected ? "bg-white/25 text-white lya:bg-white/30" : "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 lya:text-lya-primary lya:bg-lya-primary/10")}>+${Number(opt.price).toFixed(2)}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          <div className="mt-8 mb-2">
            <label className="flex items-center gap-4 p-4 border-2 border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/5 lya:bg-lya-primary/5 rounded-2xl cursor-pointer active:scale-[0.98] transition-transform">
              <input type="checkbox" checked={isTakeaway} onChange={(e) => setIsTakeaway(e.target.checked)} className="w-6 h-6 text-orange-500 bg-white border-orange-300 rounded focus:ring-orange-500 cursor-pointer" />
              <div className="flex flex-col">
                <span className="font-black text-orange-900 dark:text-orange-300 lya:text-lya-primary text-sm flex items-center gap-2"><ShoppingBag size={16} /> Empaquetar para Llevar</span>
                <span className="text-[11px] font-medium text-orange-700 dark:text-orange-400 lya:text-lya-text/60 mt-0.5">Se enviará a cocina con indicación de empaque desechable.</span>
              </div>
            </label>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 lya:border-lya-border/40 bg-white dark:bg-gray-800 lya:bg-lya-surface shrink-0">
          <button disabled={isAgotado} onClick={handleConfirm} className={clsx("w-full py-4 rounded-[1.25rem] font-black text-lg flex justify-between px-6 items-center shadow-lg transition-all active:scale-95 lya:border-2", isAgotado ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed shadow-none lya:bg-lya-bg lya:border-lya-border/30" : "bg-green-500 hover:bg-green-600 text-white shadow-green-500/30 lya:bg-lya-primary lya:border-lya-primary lya:text-lya-surface lya:shadow-lya-primary/30")}>
            <span>{isAgotado ? 'Agotado' : 'Añadir a la orden'}</span><span className="bg-black/20 px-3 py-1 rounded-lg">${calculateTotal().toFixed(2)}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL: Menú Digital ---
export default function ClientMenu({ clientData, type, tableId }) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeCategory, setActiveCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [showSettings, setShowSettings] = useState(false);
  const [themeIndex, setThemeIndex] = useState(getInitialTheme);
  const [sizeIndex, setSizeIndex] = useState(getInitialSize);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeOrderId, setActiveOrderId] = useState(() => localStorage.getItem('lya_client_order_id') || null);
  const [confirmedSnapshot, setConfirmedSnapshot] = useState(() => {
    const saved = localStorage.getItem('lya_client_snapshot');
    return saved ? JSON.parse(saved) : { items: [], total: 0 };
  });

  useEffect(() => {
    const loadMenuData = async () => {
      try {
        setIsLoading(true);
        const [catsRes, prodsRes] = await Promise.all([ 
          client.get('/menu/categories'), 
          client.get('/menu/products') 
        ]);
        
        const catsData = catsRes.data;
        const prodsData = prodsRes.data;

        setCategories(catsData);
        
        // 🔥 FILTRAMOS Y TRADUCIMOS AL ESPAÑOL PARA LA VISTA DEL CLIENTE
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

        const todasCat = catsData.find(c => c.name.trim().toLowerCase() === 'todas');
        if (todasCat) {
          setActiveCategory(todasCat.id);
        } else if (catsData.length > 0) {
          setActiveCategory(catsData[0].id);
        }
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

  const handleAddDirectly = (product, customizations = null) => {
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
  };

  const removeFromCart = (cartItemId) => setCart(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId);
      if (existing.qty === 1) return prev.filter(item => item.cartItemId !== cartItemId);
      return prev.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty - 1 } : item);
  });
  
  const incrementInCart = (cartItemId) => setCart(prev => prev.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty + 1 } : item));

  const totalCart = cart.reduce((acc, item) => acc + (item.precioUnitario * item.qty), 0);
  const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);

  const handleConfirmOrder = async () => {
    if (cart.length === 0) return;
    
    try {
      setIsSubmitting(true);
      const dbOrderType = type === 'mesa' ? 'SALON' : 'LLEVAR';
      let targetOrderId = activeOrderId;

      const createNewOrder = async () => {
        const orderPayload = { orderType: dbOrderType, tableId: dbOrderType === 'SALON' ? tableId : null, ticketId: clientData.name };
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
      console.error("Error:", error);
      alert("Error de conexión con el sistema. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : 'Delicia';
  };

  if (isLoading) {
    return (
      <div className="fixed top-0 left-0 w-screen h-screen z-[9999] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg">
        <div className="relative w-16 h-16 mb-5">
          <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-800 lya:border-lya-border/30 rounded-full" />
          <div className="absolute inset-0 border-4 border-orange-500 dark:border-orange-400 lya:border-lya-primary rounded-full border-t-transparent animate-spin" />
        </div>
        <p className="font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 animate-pulse text-sm tracking-wide">
          Cargando el menú de <b>𝓛𝔂𝓪</b>...
        </p>
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
        onReset={() => setIsConfirmed(false)}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full h-full pb-28 relative">
      <header className="px-6 pt-6 pb-3 shrink-0 space-y-4 z-10 sticky top-0 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg border-b border-gray-200 dark:border-gray-800 lya:border-lya-border/40 transition-colors">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 lya:text-lya-text/40 uppercase tracking-wider">Menú Digital</p>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text truncate">Hola, {clientData.name}</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 lya:bg-lya-surface border border-gray-200 dark:border-gray-700 lya:border-lya-border shadow-sm text-xs font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text shrink-0">
              {type === 'mesa' ? <Utensils size={14} className="text-orange-500 lya:text-lya-secondary" /> : <ShoppingBag size={14} className="text-orange-500 lya:text-lya-secondary" />}
              <span>{type === 'mesa' ? `Mesa ${tableId}` : 'Llevar'}</span>
            </div>
            
            <button onClick={() => setShowSettings(true)} className="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 lya:bg-lya-surface border border-gray-200 dark:border-gray-700 lya:border-lya-border shadow-sm text-gray-600 dark:text-gray-300 lya:text-lya-text hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-all shrink-0">
              <Settings size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 pt-0.5 -mx-6 px-6">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl font-bold text-xs transition-all duration-200 shadow-sm border ${
                activeCategory === cat.id 
                  ? 'bg-orange-500 dark:bg-orange-600 lya:bg-lya-primary text-white border-transparent scale-102' 
                  : 'bg-white dark:bg-gray-800 lya:bg-lya-surface border-gray-200 dark:border-gray-700 lya:border-lya-border/40 text-gray-600 dark:text-gray-400 lya:text-lya-text/80'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {visibleProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 lya:text-lya-text/40 font-medium text-sm">No se encontraron productos en esta categoría.</div>
        ) : (
          visibleProducts.map(product => {
            const hasImage = product.imagen && !product.imagen.includes('default-product');
            const isCustomizable = getProductModifiers(product).length > 0;

            return (
              <motion.div key={product.id} layout onClick={() => isCustomizable && setSelectedProduct(product)} className={`flex items-center gap-4 p-3 rounded-[2rem] bg-white dark:bg-gray-800 lya:bg-lya-surface border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 shadow-sm transition-all ${isCustomizable ? 'cursor-pointer hover:shadow-md hover:scale-[1.01]' : ''}`}>
                <div className="w-24 h-24 shrink-0 rounded-[1.25rem] overflow-hidden bg-gray-100 dark:bg-gray-900 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 flex items-center justify-center shadow-inner pointer-events-none">
                  {hasImage ? <img src={product.imagen} alt={product.nombre} className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-300 dark:text-gray-600 lya:text-lya-text/20" size={28} />}
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col justify-between h-full min-h-[6rem] py-1">
                  <div className="min-w-0 mb-1">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-orange-500 dark:text-orange-400 lya:text-lya-secondary block truncate mb-0.5">{getCategoryName(product.categoria)}</span>
                    <h3 className="font-extrabold text-[15px] sm:text-base text-gray-900 dark:text-white lya:text-lya-text leading-tight line-clamp-2">{product.nombre}</h3>
                    {isCustomizable && <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-orange-600 dark:text-orange-400 lya:text-lya-secondary bg-orange-100 dark:bg-orange-500/20 lya:bg-lya-secondary/10 px-2.5 py-1 rounded-full border border-orange-200 dark:border-orange-500/30 lya:border-lya-secondary/20 transition-colors">✨ Personalizable</span>}
                  </div>
                  
                  <div className="flex items-end justify-between mt-auto">
                    <span className="font-black text-lg text-gray-900 dark:text-white lya:text-lya-text tracking-tight block">${product.precio}</span>
                    
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        const defaultMods = isCustomizable ? getDefaultCustomizations(product) : null;
                        handleAddDirectly(product, defaultMods); 
                      }} 
                      className="w-10 h-10 rounded-full bg-gray-900 dark:bg-white lya:bg-lya-primary text-white dark:text-gray-900 lya:text-white flex items-center justify-center shadow hover:scale-110 active:scale-95 transition-transform shrink-0"
                    >
                      <Plus size={20} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {selectedProduct && <ClientProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onConfirm={(customizations) => handleAddDirectly(selectedProduct, customizations)} />}
      </AnimatePresence>

      <AnimatePresence>
        {confirmedSnapshot.items.length > 0 && !showCheckout && !selectedProduct && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0, opacity: 0 }} 
            className={clsx("fixed right-6 z-30 max-w-md mx-auto flex justify-end pointer-events-none", cart.length > 0 ? "bottom-28" : "bottom-6")}
            style={{ width: 'calc(100% - 3rem)' }}
          >
            <button onClick={() => setIsConfirmed(true)} className="pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-full bg-white dark:bg-gray-800 lya:bg-lya-surface shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-gray-200/50 dark:border-gray-700/50 lya:border-lya-border/50 active:scale-95 transition-all text-gray-800 dark:text-gray-200 lya:text-lya-text">
              <div className="relative">
                <ReceiptText size={20} className="text-orange-500 lya:text-lya-secondary" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-white dark:border-gray-800 lya:border-lya-surface animate-pulse"></span>
              </div>
              <span className="font-bold text-sm tracking-wide">Mi Nota</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cart.length > 0 && !showCheckout && !selectedProduct && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-6 left-0 right-0 px-6 z-40 max-w-md mx-auto">
            <button onClick={() => setShowCheckout(true)} className="w-full bg-gray-900 dark:bg-white lya:bg-lya-text text-white dark:text-gray-900 lya:text-lya-surface py-4 px-5 rounded-[1.5rem] flex items-center justify-between shadow-xl active:scale-[0.99] transition-transform font-bold">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 dark:bg-black/10 lya:bg-white/25 flex items-center justify-center font-black text-sm">{totalItems}</div>
                <span className="text-base tracking-wide">Revisar Pedido</span>
              </div>
              <span className="font-black text-xl">${totalCart.toFixed(2)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCheckout && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex flex-col justify-end p-4">
            <div className="absolute inset-0" onClick={() => setShowCheckout(false)} />
            <motion.div initial={{ y: '100%', scale: 0.95, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: '100%', scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 26, stiffness: 220 }} className="relative bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-[2.5rem] p-6 pb-8 space-y-5 shadow-2xl max-w-md mx-auto w-full border border-gray-200 dark:border-gray-700 lya:border-lya-border/50">
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">Tu Orden</h3>
                <button onClick={() => setShowCheckout(false)} className="p-2 rounded-full bg-white dark:bg-gray-800 lya:bg-lya-surface border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 active:scale-90 transition-transform text-gray-500 dark:text-gray-300 lya:text-lya-text"><ChevronLeft size={22} strokeWidth={2.5} /></button>
              </div>

              <div className="space-y-3 max-h-[35vh] overflow-y-auto custom-scrollbar pr-1">
                {cart.map(item => (
                  <div key={item.cartItemId} className="flex items-center justify-between bg-white dark:bg-gray-800 lya:bg-lya-surface p-4 rounded-3xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 shadow-sm">
                    <div className="min-w-0 flex-1 pr-3">
                      <h4 className="font-bold text-gray-900 dark:text-white lya:text-lya-text text-sm truncate">{item.nombre}</h4>
                      {item.detalles && (
                        <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-0.5 leading-tight">
                          {item.detalles.tamano && <span>{item.detalles.tamano}</span>}
                          {item.detalles.leche && <span> • {item.detalles.leche}</span>}
                          {item.detalles.extras && item.detalles.extras.length > 0 && <span> • +{item.detalles.extras.join(', ')}</span>}
                          {item.isTakeaway && <span className="block text-orange-500 dark:text-orange-400 lya:text-lya-secondary mt-0.5">Empaque P/Llevar</span>}
                        </div>
                      )}
                      <div className="mt-1.5 flex items-baseline gap-2">
                        <span className="text-sm font-black text-gray-700 dark:text-gray-300 lya:text-lya-text/80">${(item.precioUnitario * item.qty).toFixed(2)}</span>
                        {item.qty > 1 && <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 lya:text-lya-text/50 uppercase">Unit: ${item.precioUnitario.toFixed(2)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-900 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 rounded-[1rem] p-1.5 shrink-0">
                      <button onClick={() => removeFromCart(item.cartItemId)} className="w-8 h-8 flex items-center justify-center rounded-[0.7rem] bg-white dark:bg-gray-800 lya:bg-lya-surface text-gray-600 dark:text-gray-300 lya:text-lya-text hover:bg-red-50 dark:hover:bg-red-900/20 shadow-sm font-bold border border-gray-200 dark:border-gray-700 lya:border-lya-border/40"><Minus size={16} strokeWidth={3} /></button>
                      <span className="font-black w-4 text-center text-sm text-gray-900 dark:text-white lya:text-lya-text">{item.qty}</span>
                      <button onClick={() => incrementInCart(item.cartItemId)} className="w-8 h-8 flex items-center justify-center rounded-[0.7rem] bg-gray-900 dark:bg-white lya:bg-lya-primary text-white dark:text-gray-900 shadow-sm font-bold"><Plus size={16} strokeWidth={3} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center py-4 border-y border-gray-200 dark:border-gray-800 lya:border-lya-border/40 text-gray-900 dark:text-white lya:text-lya-text">
                <span className="text-sm font-bold text-gray-400 dark:text-gray-500 lya:text-lya-text/60">Total Bruto</span>
                <span className="text-3xl font-black tracking-tight">${totalCart.toFixed(2)}</span>
              </div>

              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-3xl p-5 flex gap-4 text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle size={24} className="shrink-0 mt-0.5" />
                <div className="text-xs font-medium leading-relaxed">
                  <p className="font-bold uppercase tracking-wider mb-1 text-[10px]">Políticas de confirmación</p>
                  Al confirmar la orden, el pedido entra de forma automática a producción en cocina. Por seguridad operacional, <b>no se permiten cancelaciones posteriores</b>.
                </div>
              </div>

              <button disabled={isSubmitting} onClick={handleConfirmOrder} className={clsx("w-full py-5 rounded-[1.5rem] font-black text-lg shadow-xl hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-3", isSubmitting ? "bg-gray-400 dark:bg-gray-700 lya:bg-lya-border text-white/70 cursor-not-allowed shadow-none" : "bg-orange-500 dark:bg-orange-600 lya:bg-lya-primary text-white shadow-orange-500/30 dark:shadow-orange-900/40 lya:shadow-lya-primary/30")}>
                {isSubmitting ? <><div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin" /><span>Enviando a cocina...</span></> : <><span>Confirmar Orden</span><CheckCircle size={22} strokeWidth={2.5} /></>}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 dark:bg-black/80 z-[80] flex items-center justify-center p-6">
            <div className="absolute inset-0" onClick={() => setShowSettings(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="relative bg-white dark:bg-gray-900 lya:bg-lya-bg rounded-[2.5rem] p-6 shadow-2xl max-w-[280px] w-full border border-gray-200 dark:border-gray-800 lya:border-lya-border/50 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text">Ajustes</h3>
                <button onClick={() => setShowSettings(false)} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 lya:bg-lya-surface text-gray-500 dark:text-gray-400 lya:text-lya-text hover:bg-gray-200 active:scale-95 transition-all"><X size={18} strokeWidth={3} /></button>
              </div>
              <div className="space-y-4">
                <button onClick={cycleTheme} className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-gray-50 dark:bg-gray-800 lya:bg-lya-surface border border-gray-200/60 dark:border-gray-700/60 lya:border-lya-border/40 hover:border-orange-500/50 active:scale-95 transition-all group shadow-sm">
                  <div className="flex items-center gap-3 text-gray-800 dark:text-gray-200 lya:text-lya-text"><Palette size={20} className="text-orange-500 dark:text-orange-400 lya:text-lya-secondary group-hover:rotate-12 transition-transform" /><span className="font-bold text-sm">Tema</span></div>
                  <span className="text-xs font-black bg-white dark:bg-gray-700 lya:bg-lya-bg px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-600 lya:border-lya-border/30 text-gray-700 dark:text-gray-200 lya:text-lya-text shadow-sm">{THEME_NAMES[themeIndex]}</span>
                </button>
                <button onClick={cycleSize} className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-gray-50 dark:bg-gray-800 lya:bg-lya-surface border border-gray-200/60 dark:border-gray-700/60 lya:border-lya-border/40 hover:border-orange-500/50 active:scale-95 transition-all group shadow-sm">
                  <div className="flex items-center gap-3 text-gray-800 dark:text-gray-200 lya:text-lya-text"><Type size={20} className="text-orange-500 dark:text-orange-400 lya:text-lya-secondary group-hover:scale-110 transition-transform" /><span className="font-bold text-sm">Tamaño</span></div>
                  <span className="text-xs font-black bg-white dark:bg-gray-700 lya:bg-lya-bg px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-600 lya:border-lya-border/30 text-gray-700 dark:text-gray-200 lya:text-lya-text shadow-sm">{SIZES[sizeIndex].name}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}