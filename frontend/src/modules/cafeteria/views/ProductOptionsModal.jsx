// src/modules/cafeteria/views/ProductOptionsModal.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, ShoppingBag } from 'lucide-react';
import clsx from 'clsx';

export const ProductOptionsModal = ({ product, isVitrina, isLlevar, onClose, onConfirm }) => {
  const [selections, setSelections] = useState({});
  const [isTakeaway, setIsTakeaway] = useState(isVitrina || isLlevar || false);

  if (!product) return null;

  const isAgotado = product.controlarStock === true && product.stock <= 0;

  // 1. Desempaquetamos de forma segura las opciones (incluyendo los defaults)
  const parsedOptions = useMemo(() => {
    let ops = product.opciones;
    if (typeof ops === 'string') {
        try { ops = JSON.parse(ops); } catch (e) { }
    }
    if (typeof ops === 'string') {
        try { ops = JSON.parse(ops); } catch (e) { }
    }
    return (ops && typeof ops === 'object') ? ops : {};
  }, [product]);

  // 2. Construimos los modificadores visuales
  const availableModifiers = useMemo(() => {
    const mods = [];
    
    const mapOption = (opt) => {
        if (typeof opt === 'string') return { id: opt, label: opt, price: 0 };
        return { 
            id: opt.nombre || 'Opción', 
            label: opt.nombre || 'Opción', 
            price: Number(opt.precioAdicional || 0) 
        };
    };

    const tamanos = Array.isArray(parsedOptions.tamanos) ? parsedOptions.tamanos : [];
    const leches = Array.isArray(parsedOptions.leches) ? parsedOptions.leches : [];
    const extras = Array.isArray(parsedOptions.extras) ? parsedOptions.extras : [];

    if (tamanos.length > 0) {
      mods.push({ id: 'tamano', title: 'Tamaño', type: 'single', options: tamanos.map(mapOption) });
    }
    if (leches.length > 0) {
      mods.push({ id: 'leche', title: 'Tipo de Leche', type: 'single', options: leches.map(mapOption) });
    }
    if (extras.length > 0) {
      mods.push({ id: 'extras', title: 'Extras Adicionales', type: 'multiple', options: extras.map(mapOption) });
    }

    return mods;
  }, [parsedOptions]);

  // 3. 🔥 EFECTO CORREGIDO: Leer 'defaults' desde el Gestor de Menú
  useEffect(() => {
    const initial = {};
    const defaults = parsedOptions.defaults || {};

    availableModifiers.forEach(mod => {
      if (mod.type === 'single' && mod.options.length > 0) {
        
        // Buscamos si el administrador guardó un valor por defecto
        let defaultValue = null;
        if (mod.id === 'tamano' && defaults.tamano) defaultValue = defaults.tamano;
        if (mod.id === 'leche' && defaults.leche) defaultValue = defaults.leche;

        // Verificamos si ese valor existe en la lista actual
        const optionExists = defaultValue ? mod.options.find(o => o.id === defaultValue) : null;

        // Usamos el configurado, o el primero por seguridad
        initial[mod.id] = optionExists ? optionExists.id : mod.options[0].id;
      }
    });
    setSelections(initial);
  }, [availableModifiers, parsedOptions]);

  const handleToggle = (modId, optId, type) => {
    setSelections(prev => {
      const current = prev[modId];
      if (type === 'single') return { ...prev, [modId]: optId };
      const currentArray = Array.isArray(current) ? current : [];
      if (currentArray.includes(optId)) {
        return { ...prev, [modId]: currentArray.filter(id => id !== optId) };
      }
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
      ...product,
      precioFinal: calculateTotal(),
      detalles: {
         tamano: tamanoStr,
         ...(lecheStr && { leche: lecheStr }),
         ...(extrasArr.length > 0 && { extras: extrasArr })
      },
      isTakeaway, 
      uniqueId: Date.now()
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center pointer-events-none overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 lya:bg-lya-dark/50 backdrop-blur-sm pointer-events-auto transition-colors" 
      />

      <motion.div 
        initial={{ y: "100%" }} 
        animate={{ y: 0 }} 
        exit={{ y: "100%" }} 
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative z-10 bg-white dark:bg-gray-900 lya:bg-lya-surface w-full md:w-[500px] md:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90dvh] md:max-h-[85vh] transition-colors md:border border-gray-100 dark:border-gray-800 lya:border-lya-border/40"
      >
        
        {/* Cabecera con Imagen */}
        <div className="relative h-48 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg shrink-0 p-2 border-b border-gray-200 dark:border-gray-700 lya:border-lya-border/30 transition-colors">
          {product.image || product.imagen ? (
            <img src={product.image || product.imagen} className="w-full h-full object-contain drop-shadow-md opacity-90" alt={product.nombre} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl opacity-80">☕</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          <div className="absolute bottom-5 left-6 text-white pr-12">
            <h3 className="text-2xl md:text-3xl font-black leading-tight tracking-tight drop-shadow-md">{product.nombre}</h3>
            <p className="opacity-90 font-bold mt-1 text-orange-400 lya:text-lya-primary">${Number(product.precioBase || product.precio || 0).toFixed(2)} Base</p>
          </div>
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2.5 rounded-full backdrop-blur-md transition-all active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        {/* Opciones */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {availableModifiers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center space-y-3">
              <span className="text-5xl opacity-50">🍽️</span>
              <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-medium">Este producto no tiene opciones adicionales configuradas.</p>
            </div>
          ) : (
            availableModifiers.map(mod => (
              <div key={mod.id}>
                <h4 className="font-black text-gray-900 dark:text-white lya:text-lya-text mb-4 flex justify-between items-center pb-2">
                  <span className="tracking-tight text-lg">{mod.title}</span>
                  {mod.type === 'multiple' && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/20 lya:text-lya-secondary lya:bg-lya-secondary/10 px-2.5 py-1 rounded-lg">
                      Elige varios
                    </span>
                  )}
                </h4>
                <div className="flex flex-wrap gap-3">
                  {mod.options.map(opt => {
                    const isSelected = mod.type === 'single' 
                      ? selections[mod.id] === opt.id
                      : selections[mod.id]?.includes(opt.id);

                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleToggle(mod.id, opt.id, mod.type)}
                        className={clsx(
                          "px-4 py-3 rounded-2xl border-2 text-sm font-bold transition-all flex items-center justify-between gap-3 active:scale-95 flex-grow sm:flex-grow-0",
                          isSelected 
                            ? "border-orange-500 bg-orange-500 dark:bg-orange-600 dark:border-orange-600 text-white shadow-lg shadow-orange-500/30 dark:shadow-orange-900/30 lya:bg-lya-primary lya:border-lya-primary lya:text-lya-surface lya:shadow-lya-primary/30" 
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 lya:bg-lya-surface lya:border-lya-border/40 lya:text-lya-text lya:hover:border-lya-secondary/50"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {isSelected && <Check size={16} strokeWidth={4} />}
                          {opt.label}
                        </span>
                        
                        {opt.price > 0 && (
                          <span 
                            className={clsx(
                              "text-xs px-2 py-1 rounded-lg ml-auto whitespace-nowrap",
                              isSelected 
                                ? "bg-white/25 text-white lya:bg-white/30" 
                                : "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 lya:bg-lya-primary/10 lya:text-lya-primary"
                            )}
                          >
                            +${Number(opt.price).toFixed(2)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {/* Toggle para Llevar */}
          {!isVitrina && !isLlevar && (
            <div className="mt-8 mb-2">
              <label className="flex items-center gap-4 p-4 border-2 border-orange-200 dark:border-orange-900/50 lya:border-lya-secondary/30 bg-orange-50 dark:bg-orange-900/10 lya:bg-lya-secondary/5 rounded-2xl cursor-pointer active:scale-[0.98] transition-transform">
                <input 
                  type="checkbox" 
                  checked={isTakeaway}
                  onChange={(e) => setIsTakeaway(e.target.checked)}
                  className="w-6 h-6 text-orange-500 dark:text-orange-600 lya:text-lya-secondary bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-orange-500 dark:focus:ring-orange-600 lya:focus:ring-lya-secondary dark:ring-offset-gray-900 focus:ring-2 cursor-pointer transition-colors"
                />
                <div className="flex flex-col">
                  <span className="font-black text-orange-900 dark:text-orange-100 lya:text-lya-text text-sm flex items-center gap-2">
                    <ShoppingBag size={16} /> Empaquetar para Llevar
                  </span>
                  <span className="text-[11px] font-medium text-orange-700 dark:text-orange-400 lya:text-lya-text/60 mt-0.5">
                    Se enviará a cocina con indicación de empaque desechable.
                  </span>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Footer / Confirmar */}
        <div className="p-5 border-t border-gray-100 dark:border-gray-800 lya:border-lya-border/40 bg-white dark:bg-gray-900 lya:bg-lya-surface shrink-0 transition-colors rounded-b-[2.5rem]">
          <button 
            disabled={isAgotado}
            onClick={handleConfirm}
            className={clsx(
              "w-full py-4 rounded-2xl font-black text-lg flex justify-between px-6 items-center transition-all",
              isAgotado 
                ? "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed lya:bg-lya-bg lya:text-lya-text/40 border border-transparent dark:border-gray-700"
                : "bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 dark:shadow-emerald-900/30 active:scale-95 lya:bg-lya-primary lya:hover:bg-lya-primary/90 lya:text-lya-surface lya:shadow-lya-primary/30"
            )}
          >
            <span>{isAgotado ? 'Agotado' : 'Añadir a la cuenta'}</span>
            <span className="bg-black/20 dark:bg-black/30 px-3 py-1 rounded-xl tracking-wide">${calculateTotal().toFixed(2)}</span>
          </button>
        </div>

      </motion.div>
    </div>
  );
};