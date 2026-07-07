// src/modules/cafeteria/views/ProductOptionsModal.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, ShoppingBag, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export const ProductOptionsModal = ({ product, isVitrina, isLlevar, onClose, onConfirm }) => {
  const [selections, setSelections] = useState({});
  const [isTakeaway, setIsTakeaway] = useState(isVitrina || isLlevar || false);
  const [isConfirming, setIsConfirming] = useState(false); 
  
  // 🔥 NUEVO ESTADO: Rastrea exactamente el ID de la opción que el usuario tocó
  const [calculatingOptId, setCalculatingOptId] = useState(null); 
  // Derivamos si hay algún cálculo activo para el total
  const isCalculatingTotal = calculatingOptId !== null;

  if (!product) return null;

  const isAgotado = product.controlarStock === true && product.stock <= 0;

  // 🔥 FUNCIÓN DE BLINDAJE MATEMÁTICO
  const cleanNumber = (val) => {
    if (!val) return 0;
    let stringVal = String(val).replace(',', '.');
    const cleaned = stringVal.replace(/[^0-9.-]+/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // 1. Desempaquetamos de forma segura las opciones
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
            price: cleanNumber(opt.precioAdicional) 
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

  // 3. Efecto para leer 'defaults'
  useEffect(() => {
    const initial = {};
    const defaults = parsedOptions.defaults || {};

    availableModifiers.forEach(mod => {
      if (mod.type === 'single' && mod.options.length > 0) {
        let defaultValue = null;
        if (mod.id === 'tamano' && defaults.tamano) defaultValue = defaults.tamano;
        if (mod.id === 'leche' && defaults.leche) defaultValue = defaults.leche;

        const optionExists = defaultValue ? mod.options.find(o => o.id === defaultValue) : null;
        initial[mod.id] = optionExists ? optionExists.id : mod.options[0].id;
      }
    });
    setSelections(initial);
  }, [availableModifiers, parsedOptions]);

  // 🔥 MANEJADOR CON FEEDBACK INDIVIDUAL Y ANTI-SPAM
  const handleToggle = (modId, optId, type) => {
    if (isCalculatingTotal) return;
    
    // Guardamos qué botón exacto se presionó para mostrarle el spinner
    setCalculatingOptId(optId);

    setTimeout(() => {
      setSelections(prev => {
        const current = prev[modId];
        if (type === 'single') return { ...prev, [modId]: optId };
        
        const currentArray = Array.isArray(current) ? current : [];
        if (currentArray.includes(optId)) {
          return { ...prev, [modId]: currentArray.filter(id => id !== optId) };
        }
        return { ...prev, [modId]: [...currentArray, optId] };
      });
      // Apagamos el spinner individual
      setCalculatingOptId(null);
    }, 250);
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
        selected.forEach(sId => {
          const opt = mod.options.find(o => o.id === sId);
          if (opt) total += cleanNumber(opt.price);
        });
      }
    });
    return Math.max(0, total);
  };

  const handleConfirm = async () => {
    if (isAgotado || isConfirming || isCalculatingTotal) return;
    setIsConfirming(true);

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
          selected.forEach(sId => {
            const opt = mod.options.find(o => o.id === sId);
            if (opt) extrasArr.push(opt.label);
          });
        }
      });

      await onConfirm({
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

    } finally {
      setIsConfirming(false); 
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center pointer-events-none overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={() => !isConfirming && onClose()} 
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
            <p className="opacity-90 font-bold mt-1 text-orange-400 lya:text-lya-primary">${cleanNumber(product.precioBase || product.precio).toFixed(2)} Base</p>
          </div>
          <button 
            onClick={() => !isConfirming && onClose()} 
            disabled={isConfirming}
            className="absolute top-4 right-4 bg-black/20 md:hover:bg-black/40 text-white p-2.5 rounded-full backdrop-blur-md transition-all active:scale-90 disabled:opacity-50 touch-manipulation outline-none select-none"
          >
            <X size={20} className="pointer-events-none" />
          </button>
        </div>

        {/* Opciones */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {availableModifiers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center space-y-3">
              <span className="text-5xl opacity-50 pointer-events-none">🍽️</span>
              <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-medium pointer-events-none">Este producto no tiene opciones adicionales configuradas.</p>
            </div>
          ) : (
            availableModifiers.map(mod => (
              <div key={mod.id}>
                <h4 className="font-black text-gray-900 dark:text-white lya:text-lya-text mb-4 flex justify-between items-center pb-2">
                  <span className="tracking-tight text-lg pointer-events-none">{mod.title}</span>
                  {mod.type === 'multiple' && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/20 lya:text-lya-secondary lya:bg-lya-secondary/10 px-2.5 py-1 rounded-lg pointer-events-none">
                      Elige varios
                    </span>
                  )}
                </h4>
                <div className="flex flex-wrap gap-3">
                  {mod.options.map(opt => {
                    // Verificamos si esta opción exacta está seleccionada
                    const isSelected = mod.type === 'single' 
                      ? selections[mod.id] === opt.id
                      : selections[mod.id]?.includes(opt.id);
                      
                    // 🔥 NUEVO: Verificamos si ESTA tarjeta específica es la que está cargando
                    const isThisCalculating = calculatingOptId === opt.id;

                    return (
                      <button
                        key={opt.id}
                        disabled={isConfirming || isCalculatingTotal}
                        onClick={() => handleToggle(mod.id, opt.id, mod.type)}
                        className={clsx(
                          "px-4 py-3 rounded-2xl border-2 text-sm font-bold transition-all flex items-center justify-between gap-3 active:scale-95 flex-grow sm:flex-grow-0 disabled:opacity-70 outline-none touch-manipulation select-none",
                          isSelected 
                            ? "border-orange-500 bg-orange-500 dark:bg-orange-600 dark:border-orange-600 text-white shadow-lg shadow-orange-500/30 dark:shadow-orange-900/30 lya:bg-lya-primary lya:border-lya-primary lya:text-lya-surface lya:shadow-lya-primary/30" 
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 md:hover:border-gray-300 dark:md:hover:border-gray-600 md:hover:bg-gray-50 dark:md:hover:bg-gray-700 lya:bg-lya-surface lya:border-lya-border/40 lya:text-lya-text lya:hover:border-lya-secondary/50",
                          // Efecto opcional: si está calculando ESTA opción, le damos un destello visual
                          isThisCalculating && "opacity-90 scale-95"
                        )}
                      >
                        <span className="flex items-center gap-2 pointer-events-none">
                          {/* 🔥 FIX: Renderizamos el Spinner o el Check dependiendo del estado INDIVIDUAL */}
                          <span className={clsx(
                            "transition-all duration-300 flex items-center justify-center overflow-hidden",
                            (isSelected || isThisCalculating) ? "w-5 opacity-100" : "w-0 opacity-0"
                          )}>
                            {isThisCalculating ? (
                              <Loader2 size={16} strokeWidth={4} className="animate-spin" />
                            ) : (
                              <Check size={16} strokeWidth={4} />
                            )}
                          </span>
                          {opt.label}
                        </span>
                        
                        {cleanNumber(opt.price) > 0 && (
                          <span 
                            className={clsx(
                              "text-xs px-2 py-1 rounded-lg ml-auto whitespace-nowrap pointer-events-none",
                              isSelected 
                                ? "bg-white/25 text-white lya:bg-white/30" 
                                : "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 lya:bg-lya-primary/10 lya:text-lya-primary"
                            )}
                          >
                            +${cleanNumber(opt.price).toFixed(2)}
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
              <motion.div 
                whileTap={isConfirming ? {} : { scale: 0.98 }} 
                onClick={() => {
                  if (!isConfirming) setIsTakeaway(!isTakeaway);
                }}
                className={clsx(
                  "flex items-center gap-4 p-4 border-2 border-orange-200 dark:border-orange-900/50 lya:border-lya-secondary/30 bg-orange-50 dark:bg-orange-900/10 lya:bg-lya-secondary/5 rounded-2xl cursor-pointer transition-transform select-none touch-manipulation outline-none",
                  isConfirming && "opacity-70 pointer-events-none"
                )}
              >
                <div className={clsx(
                  "w-6 h-6 flex-shrink-0 flex items-center justify-center border-2 rounded-lg transition-colors pointer-events-none",
                  isTakeaway 
                    ? "bg-orange-500 border-orange-500 text-white lya:bg-lya-primary lya:border-lya-primary" 
                    : "bg-white border-orange-300 dark:bg-gray-800 dark:border-orange-800/50"
                )}>
                  {isTakeaway && <Check size={14} strokeWidth={4} />}
                </div>
                <div className="flex flex-col pointer-events-none">
                  <span className="font-black text-orange-900 dark:text-orange-100 lya:text-lya-text text-sm flex items-center gap-2">
                    <ShoppingBag size={16} /> Empaquetar para Llevar
                  </span>
                  <span className="text-[11px] font-medium text-orange-700 dark:text-orange-400 lya:text-lya-text/60 mt-0.5 text-justify leading-tight">
                    Se enviará a cocina con indicación de empaque desechable.
                  </span>
                </div>
              </motion.div>
            </div>
          )}
        </div>

        {/* Footer / Confirmar */}
        <div className="p-5 border-t border-gray-100 dark:border-gray-800 lya:border-lya-border/40 bg-white dark:bg-gray-900 lya:bg-lya-surface shrink-0 transition-colors rounded-b-[2.5rem]">
          <button 
            disabled={isAgotado || isConfirming || isCalculatingTotal}
            onClick={handleConfirm}
            className={clsx(
              "w-full py-4 rounded-2xl font-black text-lg flex justify-between px-6 items-center transition-all outline-none select-none touch-manipulation",
              isAgotado 
                ? "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed lya:bg-lya-bg lya:text-lya-text/40 border border-transparent dark:border-gray-700"
                : "bg-emerald-500 md:hover:bg-emerald-600 dark:bg-emerald-600 dark:md:hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 dark:shadow-emerald-900/30 active:scale-95 lya:bg-lya-primary lya:hover:bg-lya-primary/90 lya:text-lya-surface lya:shadow-lya-primary/30"
            )}
          >
            <span className="flex items-center pointer-events-none">
              <span className={clsx(
                "transition-all duration-300 flex items-center justify-center overflow-hidden",
                isConfirming ? "w-6 opacity-100 mr-2" : "w-0 opacity-0 mr-0"
              )}>
                <Loader2 className="animate-spin" size={20} />
              </span>
              <span>
                {isAgotado ? 'Agotado' : isConfirming ? 'Añadiendo...' : 'Añadir a la cuenta'}
              </span>
            </span>

            <span className="bg-black/20 dark:bg-black/30 px-3 py-1 rounded-xl tracking-wide pointer-events-none flex items-center justify-center min-w-[4.5rem]">
              {isCalculatingTotal ? (
                <Loader2 className="animate-spin" size={16} strokeWidth={3} />
              ) : (
                `$${calculateTotal().toFixed(2)}`
              )}
            </span>
          </button>
        </div>

      </motion.div>
    </div>
  );
};