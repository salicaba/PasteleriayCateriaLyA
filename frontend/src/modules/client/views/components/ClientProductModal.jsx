// src/modules/client/views/components/ClientProductModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Image as ImageIcon, ShoppingBag, Loader2, Lock } from 'lucide-react';
import clsx from 'clsx';
import { getProductModifiers } from '../utils/clientMenuUtils';

export default function ClientProductModal({ product, cart = [], onClose, onConfirm }) {
  const [selections, setSelections] = useState({});
  const [isTakeaway, setIsTakeaway] = useState(false);
  
  // ESTADOS DE PROCESAMIENTO
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCalculatingTotal, setIsCalculatingTotal] = useState(false);

  const isAgotado = product.controlarStock === true && product.stock <= 0;
  
  // 🔥 CÁLCULO DE LÍMITE EN TIEMPO REAL (Poka-Yoke)
  const currentCartQty = cart.filter(item => item.id === product.id && !item.isAutoPromo).reduce((acc, item) => acc + item.qty, 0);
  const isLimitReached = product.controlarStock && currentCartQty >= product.stock && product.stock > 0;

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

  // 🔥 FUNCIÓN DE BLINDAJE MATEMÁTICO: Limpia cualquier error de escritura del administrador
  const cleanNumber = (val) => {
    if (!val) return 0;
    let stringVal = String(val).replace(',', '.');
    const cleaned = stringVal.replace(/[^0-9.-]+/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const handleToggle = (modId, optId, type) => {
    if (isCalculatingTotal) return;
    
    setIsCalculatingTotal(true);

    setTimeout(() => {
      setSelections(prev => {
        const current = prev[modId];
        if (type === 'single') {
          if (current === optId) return prev; 
          return { ...prev, [modId]: optId };
        }
        
        const currentArray = Array.isArray(current) ? current : [];
        if (currentArray.includes(optId)) {
          return { ...prev, [modId]: currentArray.filter(id => id !== optId) };
        }
        return { ...prev, [modId]: [...currentArray, optId] };
      });
      
      setIsCalculatingTotal(false);
    }, 200);
  };

  const calculateTotal = () => {
    let total = cleanNumber(product.precioBase || product.precio);
    
    availableModifiers.forEach(mod => {
      const selected = selections[mod.id];
      if (!selected) return;
      
      if (mod.type === 'single') {
        const opt = mod.options.find(o => o.id === selected);
        if (opt) total += cleanNumber(opt.price);
      } else {
        const currentArray = Array.isArray(selected) ? selected : [];
        currentArray.forEach(sId => {
          const opt = mod.options.find(o => o.id === sId);
          if (opt) total += cleanNumber(opt.price);
        });
      }
    });
    return Math.max(0, total); 
  };

  const handleConfirmAction = async () => {
    if (isAgotado || isLimitReached || isProcessing || isCalculatingTotal) return;
    setIsProcessing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 250));

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
          const currentArray = Array.isArray(selected) ? selected : [];
          currentArray.forEach(sId => {
            const opt = mod.options.find(o => o.id === sId);
            if (opt) extrasArr.push(opt.label);
          });
        }
      });

      await onConfirm({
        precioFinal: calculateTotal(),
        detalles: { tamano: tamanoStr, ...(lecheStr && { leche: lecheStr }), ...(extrasArr.length > 0 && { extras: extrasArr }) },
        isTakeaway
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!product) return null;
  const hasImage = product.imagen && !product.imagen.includes('default-product');

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center pointer-events-none p-4 sm:p-6 h-[100dvh] w-full overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-black/60 lya:bg-black/70 pointer-events-auto backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ y: "100%", scale: 0.95, opacity: 0 }} 
        animate={{ y: 0, scale: 1, opacity: 1 }} 
        exit={{ y: "100%", scale: 0.95, opacity: 0 }} 
        transition={{ type: 'spring', damping: 25, stiffness: 220 }} 
        className="relative z-10 bg-white dark:bg-gray-800 lya:bg-[#FAF6F0] w-full max-w-md mx-auto rounded-[2.5rem] shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[85vh] border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9]"
      >
        
        {/* HEADER */}
        <div className="flex items-start gap-4 p-5 border-b border-gray-200 dark:border-gray-700 lya:border-[#EADCC9]/50 shrink-0 bg-gray-50 dark:bg-gray-900 lya:bg-white">
          {hasImage ? (
            <img src={product.imagen} className="w-20 h-20 object-cover rounded-[1.5rem] shadow-sm border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] shrink-0" alt={product.nombre} />
          ) : (
            <div className="w-20 h-20 flex items-center justify-center bg-gray-200 dark:bg-gray-700 lya:bg-[#EADCC9]/30 rounded-[1.5rem] text-gray-400 lya:text-[#7A6353]/50 shrink-0 border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9]">
              <ImageIcon size={32} />
            </div>
          )}
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="text-lg sm:text-xl font-black leading-tight text-gray-900 dark:text-white lya:text-[#3E2723] line-clamp-2 mb-1.5">{product.nombre}</h3>
            <p className="font-bold text-base text-orange-600 dark:text-orange-400 lya:text-[#78350F]">
              ${cleanNumber(product.precioBase || product.precio).toFixed(2)} 
              <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 lya:text-[#7A6353] ml-1 uppercase tracking-wider">Base</span>
            </p>
          </div>
          <motion.button 
            type="button" 
            whileTap={{ scale: 0.95 }} 
            onClick={onClose} 
            disabled={isProcessing} 
            className="shrink-0 bg-white dark:bg-gray-700 lya:bg-[#F3EBE0] md:hover:bg-gray-100 text-gray-500 dark:text-gray-300 lya:text-[#7A6353] p-2 rounded-full transition-colors border border-gray-200 dark:border-gray-600 lya:border-[#EADCC9] shadow-sm mt-0.5 outline-none select-none touch-manipulation"
          >
            <X size={20} strokeWidth={2.5} className="pointer-events-none" />
          </motion.button>
        </div>
        
        {/* BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {availableModifiers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center space-y-2">
              <span className="text-4xl">🍽️</span>
              <p className="text-gray-500 dark:text-gray-400 lya:text-[#7A6353] font-medium text-center">Este producto no tiene opciones adicionales configuradas.</p>
            </div>
          ) : (
            availableModifiers.map(mod => (
              <div key={mod.id}>
                <h4 className="font-bold text-gray-800 dark:text-gray-200 lya:text-[#3E2723] mb-3 flex justify-between items-center border-b border-gray-100 dark:border-gray-700 lya:border-[#EADCC9]/50 pb-2">
                  <span>{mod.title}</span>
                  {mod.type === 'multiple' && <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500 bg-orange-100 dark:bg-orange-500/20 lya:text-[#78350F] lya:bg-[#EADCC9] px-2 py-0.5 rounded-lg">Elige varios</span>}
                </h4>
                <div className="flex flex-wrap gap-3">
                  {mod.options.map(opt => {
                    const isSelected = mod.type === 'single' ? selections[mod.id] === opt.id : selections[mod.id]?.includes(opt.id);
                    return (
                      <motion.button 
                        type="button" 
                        whileTap={{ scale: 0.95 }} 
                        key={opt.id} 
                        disabled={isCalculatingTotal}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggle(mod.id, opt.id, mod.type);
                        }} 
                        className={clsx(
                          "px-4 py-3 rounded-[1.25rem] border text-sm font-bold transition-all flex items-center justify-between gap-3 flex-grow sm:flex-grow-0 outline-none select-none touch-manipulation", 
                          isSelected 
                            ? "border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/30 lya:bg-[#78350F] lya:border-[#78350F] lya:text-white" 
                            : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 md:hover:border-gray-300 lya:bg-white lya:border-[#EADCC9] lya:text-[#5D4037]",
                          isCalculatingTotal && "opacity-80 cursor-wait"
                        )}
                      >
                        <span className="flex items-center pointer-events-none">
                          <span className={clsx(
                            "transition-all duration-300 flex items-center justify-center overflow-hidden",
                            isSelected ? "w-5 opacity-100 mr-1" : "w-0 opacity-0 mr-0"
                          )}>
                            <Check size={16} strokeWidth={4} />
                          </span>
                          <span className="text-left">{opt.label}</span>
                        </span>
                        
                        {cleanNumber(opt.price) > 0 && (
                          <span className={clsx(
                            "text-xs px-2 py-1 rounded-[0.75rem] ml-auto whitespace-nowrap pointer-events-none", 
                            isSelected 
                              ? "bg-white/25 text-white lya:bg-white/30" 
                              : "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 lya:text-[#78350F] lya:bg-[#EADCC9]"
                          )}>
                            +${cleanNumber(opt.price).toFixed(2)}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          <div className="mt-8 mb-2">
            <motion.div 
              whileTap={{ scale: 0.98 }} 
              onClick={() => setIsTakeaway(!isTakeaway)}
              className="flex items-center gap-4 p-4 border-2 border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/5 lya:bg-[#EADCC9]/30 lya:border-[#EADCC9] rounded-[1.5rem] cursor-pointer transition-transform select-none touch-manipulation"
            >
              <div className={clsx(
                "w-6 h-6 flex-shrink-0 flex items-center justify-center border-2 rounded-[0.75rem] transition-colors pointer-events-none",
                isTakeaway 
                  ? "bg-orange-500 border-orange-500 text-white lya:bg-[#78350F] lya:border-[#78350F]" 
                  : "bg-white border-orange-300 lya:border-[#D9C4A9]"
              )}>
                {isTakeaway && <Check size={14} strokeWidth={4} />}
              </div>
              <div className="flex flex-col pointer-events-none">
                <span className="font-black text-orange-900 dark:text-orange-300 lya:text-[#3E2723] text-sm flex items-center gap-2">
                  <ShoppingBag size={16} /> Empaquetar para Llevar
                </span>
                <span className="text-[11px] font-medium text-orange-700 dark:text-orange-400 lya:text-[#7A6353] mt-0.5 text-justify">
                  Se enviará a cocina con indicación de empaque desechable.
                </span>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* FOOTER - BOTÓN BLINDADO */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 lya:border-[#EADCC9]/80 bg-white dark:bg-gray-800 lya:bg-white shrink-0 z-20">
          <motion.button 
            type="button" 
            whileTap={isAgotado || isLimitReached || isProcessing || isCalculatingTotal ? {} : { scale: 0.95 }} 
            disabled={isAgotado || isLimitReached || isProcessing || isCalculatingTotal} 
            onClick={(e) => {
              e.preventDefault();
              handleConfirmAction();
            }} 
            className={clsx(
              "w-full py-4 rounded-[1.5rem] font-black text-lg flex justify-between px-6 items-center transition-all outline-none select-none touch-manipulation", 
              isAgotado 
                ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed shadow-none lya:bg-gray-200" 
                : isLimitReached
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 cursor-not-allowed shadow-none"
                  : "bg-green-500 md:hover:bg-green-600 text-white shadow-lg shadow-green-500/30 lya:bg-[#78350F] lya:text-white"
            )}
          >
            <span className="flex items-center pointer-events-none">
              <span className={clsx(
                "transition-all duration-300 flex items-center justify-center overflow-hidden",
                (isProcessing || isLimitReached) ? "w-6 opacity-100 mr-2" : "w-0 opacity-0 mr-0"
              )}>
                {isLimitReached ? <Lock size={20} strokeWidth={3} /> : <Loader2 className="animate-spin" size={20} />}
              </span>
              <span>
                {isAgotado ? 'Agotado' : isLimitReached ? `Límite: ${product.stock} en carrito` : isProcessing ? 'Procesando...' : 'Añadir a la orden'}
              </span>
            </span>

            {/* 🔥 FEEDBACK VISUAL PREMIUM */}
            <span className={clsx(
              "px-3 py-1 rounded-[1rem] pointer-events-none flex items-center justify-center min-w-[4.5rem]",
              isLimitReached ? "bg-amber-200/50 text-amber-700 dark:text-amber-400" : "bg-black/20 text-white"
            )}>
              {isCalculatingTotal ? (
                <Loader2 className="animate-spin" size={16} strokeWidth={3} />
              ) : (
                `$${calculateTotal().toFixed(2)}`
              )}
            </span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}