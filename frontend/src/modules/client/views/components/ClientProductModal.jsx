// src/modules/client/views/components/ClientProductModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Image as ImageIcon, ShoppingBag, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { getProductModifiers } from '../utils/clientMenuUtils';

export default function ClientProductModal({ product, onClose, onConfirm }) {
  const [selections, setSelections] = useState({});
  const [isTakeaway, setIsTakeaway] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleConfirmAction = async () => {
    if (isAgotado || isProcessing) return;
    setIsProcessing(true);
    
    try {
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
    <div className="absolute inset-0 z-[70] flex items-end justify-center pointer-events-none p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 lya:bg-black/70 pointer-events-auto" />
      <motion.div initial={{ y: "100%", scale: 0.95, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: "100%", scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 220 }} className="relative z-10 bg-white dark:bg-gray-800 lya:bg-lya-surface w-full max-w-md mx-auto rounded-[2.5rem] shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[85vh] border border-gray-200 dark:border-gray-700 lya:border-lya-border/40">
        <div className="flex items-start gap-4 p-5 border-b border-gray-200 dark:border-gray-700 lya:border-lya-border/40 shrink-0 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg">
          {hasImage ? <img src={product.imagen} className="w-20 h-20 object-cover rounded-[1.5rem] shadow-sm border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 shrink-0" alt={product.nombre} /> : <div className="w-20 h-20 flex items-center justify-center bg-gray-200 dark:bg-gray-700 lya:bg-white/50 rounded-[1.5rem] text-gray-400 lya:text-lya-text/30 shrink-0 border border-gray-200 dark:border-gray-700 lya:border-lya-border/30"><ImageIcon size={32} /></div>}
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="text-lg sm:text-xl font-black leading-tight text-gray-900 dark:text-white lya:text-lya-text line-clamp-2 mb-1.5">{product.nombre}</h3>
            <p className="font-bold text-base text-orange-600 dark:text-orange-400 lya:text-lya-secondary">${Number(product.precioBase || product.precio || 0).toFixed(2)} <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 ml-1 uppercase tracking-wider">Base</span></p>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onClose} disabled={isProcessing} className="shrink-0 bg-white dark:bg-gray-700 lya:bg-white md:hover:bg-gray-100 text-gray-500 dark:text-gray-300 lya:text-lya-text p-2 rounded-full transition-colors border border-gray-200 dark:border-gray-600 lya:border-lya-border/40 shadow-sm mt-0.5"><X size={20} strokeWidth={2.5} /></motion.button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {availableModifiers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center space-y-2">
              <span className="text-4xl">🍽️</span>
              <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-medium text-center">Este producto no tiene opciones adicionales configuradas.</p>
            </div>
          ) : (
            availableModifiers.map(mod => (
              <div key={mod.id}>
                <h4 className="font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text mb-3 flex justify-between items-center border-b border-gray-100 dark:border-gray-700 lya:border-lya-border/30 pb-2">
                  <span>{mod.title}</span>{mod.type === 'multiple' && <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500 bg-orange-100 dark:bg-orange-500/20 lya:bg-lya-secondary/10 px-2 py-0.5 rounded-lg lya:border lya:border-lya-secondary/20">Elige varios</span>}
                </h4>
                <div className="flex flex-wrap gap-3">
                  {mod.options.map(opt => {
                    const isSelected = mod.type === 'single' ? selections[mod.id] === opt.id : selections[mod.id]?.includes(opt.id);
                    return (
                      <motion.button whileTap={{ scale: 0.95 }} key={opt.id} onClick={() => handleToggle(mod.id, opt.id, mod.type)} className={clsx("px-4 py-3 rounded-2xl border text-sm font-bold transition-all flex items-center justify-between gap-3 flex-grow sm:flex-grow-0", isSelected ? "border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/30 lya:bg-lya-primary lya:border-lya-primary lya:text-lya-surface" : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 md:hover:border-gray-300 lya:bg-white/80 lya:border-lya-border/40 lya:text-lya-text")}>
                        <span className="flex items-center gap-2">{isSelected && <Check size={16} strokeWidth={4} />}{opt.label}</span>
                        {opt.price > 0 && <span className={clsx("text-xs px-2 py-1 rounded-lg ml-auto whitespace-nowrap", isSelected ? "bg-white/25 text-white lya:bg-white/30" : "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 lya:text-lya-primary lya:bg-lya-primary/10")}>+${Number(opt.price).toFixed(2)}</span>}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          <div className="mt-8 mb-2">
            <motion.label whileTap={{ scale: 0.98 }} className="flex items-center gap-4 p-4 border-2 border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/5 lya:bg-lya-primary/5 rounded-[1.5rem] cursor-pointer transition-transform">
              <input type="checkbox" checked={isTakeaway} onChange={(e) => setIsTakeaway(e.target.checked)} className="w-6 h-6 text-orange-500 bg-white border-orange-300 rounded-lg focus:ring-orange-500 cursor-pointer" />
              <div className="flex flex-col">
                <span className="font-black text-orange-900 dark:text-orange-300 lya:text-lya-primary text-sm flex items-center gap-2"><ShoppingBag size={16} /> Empaquetar para Llevar</span>
                <span className="text-[11px] font-medium text-orange-700 dark:text-orange-400 lya:text-lya-text/60 mt-0.5 text-justify">Se enviará a cocina con indicación de empaque desechable.</span>
              </div>
            </motion.label>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 lya:border-lya-border/40 bg-white dark:bg-gray-800 lya:bg-lya-surface shrink-0">
          <motion.button whileTap={isAgotado || isProcessing ? {} : { scale: 0.95 }} disabled={isAgotado || isProcessing} onClick={handleConfirmAction} className={clsx("w-full py-4 rounded-[1.5rem] font-black text-lg flex justify-between px-6 items-center transition-all lya:border-2", isAgotado ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed shadow-none lya:bg-lya-bg lya:border-lya-border/30" : "bg-green-500 md:hover:bg-green-600 text-white shadow-lg shadow-green-500/30 lya:bg-lya-primary lya:border-lya-primary lya:text-lya-surface lya:shadow-lya-primary/30")}>
            <span className="flex items-center gap-2">
              {isProcessing && <Loader2 className="animate-spin" size={20} />}
              {isAgotado ? 'Agotado' : 'Añadir a la orden'}
            </span>
            <span className="bg-black/20 px-3 py-1 rounded-xl">${calculateTotal().toFixed(2)}</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}