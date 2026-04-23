import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Check, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export const ProductOptionsModal = ({ product, onClose, onConfirm }) => {
  const [selections, setSelections] = useState({});

  if (!product) return null;

  const isAgotado = product.controlarStock === true && product.stock <= 0;

  const availableModifiers = useMemo(() => {
    let ops = product.opciones;
    
    // Desempaquetado del JSON de MySQL
    if (typeof ops === 'string') {
        try { ops = JSON.parse(ops); } catch (e) { }
    }
    if (typeof ops === 'string') {
        try { ops = JSON.parse(ops); } catch (e) { }
    }
    
    if (ops && typeof ops === 'object') {
        const mods = [];
        
        const mapOption = (opt) => {
            if (typeof opt === 'string') return { id: opt, label: opt, price: 0 };
            return { 
                id: opt.nombre || 'Opción', 
                label: opt.nombre || 'Opción', 
                price: Number(opt.precioAdicional || 0) 
            };
        };

        const tamanos = Array.isArray(ops.tamanos) ? ops.tamanos : [];
        const leches = Array.isArray(ops.leches) ? ops.leches : [];
        const extras = Array.isArray(ops.extras) ? ops.extras : [];

        if (tamanos.length > 0) {
          mods.push({ id: 'tamano', title: 'Tamaño', type: 'single', options: tamanos.map(mapOption) });
        }
        if (leches.length > 0) {
          mods.push({ id: 'leche', title: 'Tipo de Leche', type: 'single', options: leches.map(mapOption) });
        }
        if (extras.length > 0) {
          mods.push({ id: 'extras', title: 'Extras Adicionales', type: 'multiple', options: extras.map(mapOption) });
        }

        if (mods.length > 0) return mods;
    }

    // Si la BD no manda opciones, regresamos un arreglo vacío
    return [];
  }, [product]);

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
        if (opt && opt.id !== 's' && opt.id !== 'entera') {
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
      uniqueId: Date.now()
    });
  };

  return (
    <div className="absolute inset-0 z-[60] flex items-end md:items-center justify-center pointer-events-none">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto" />

      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative z-10 bg-white dark:bg-gray-800 w-full md:w-[500px] md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[85vh] transition-colors">
        <div className="relative h-40 bg-gray-100 dark:bg-gray-700 shrink-0 p-2 border-b border-gray-200 dark:border-gray-600">
          {product.image || product.imagen ? (
            <img src={product.image || product.imagen} className="w-full h-full object-contain drop-shadow-sm opacity-90" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">☕</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
          <div className="absolute bottom-4 left-4 text-white pr-12">
            <h3 className="text-2xl font-black leading-tight">{product.nombre}</h3>
            <p className="opacity-90 font-medium">${Number(product.precioBase || product.precio || 0).toFixed(2)} Base</p>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-md transition-colors active:scale-90">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {availableModifiers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center space-y-2">
              <span className="text-4xl">🍽️</span>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Este producto no tiene opciones adicionales configuradas.</p>
            </div>
          ) : (
            availableModifiers.map(mod => (
              <div key={mod.id}>
                <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-3 flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2">
                  <span>{mod.title}</span>
                  {mod.type === 'multiple' && <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded">Elige varios</span>}
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
                          "px-4 py-3 rounded-2xl border text-sm font-bold transition-all flex items-center justify-between gap-3 active:scale-95 flex-grow sm:flex-grow-0",
                          isSelected 
                            ? "border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/30" 
                            : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {isSelected && <Check size={16} strokeWidth={4} />}
                          {opt.label}
                        </span>
                        
                        {/* 🔥 VISUALIZACIÓN PREMIUM DEL PRECIO EXTRA */}
                        {opt.price > 0 && (
                          <span 
                            className={clsx(
                              "text-xs px-2 py-1 rounded-lg ml-auto whitespace-nowrap",
                              isSelected 
                                ? "bg-white/25 text-white" 
                                : "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400"
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
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
          <button 
            disabled={isAgotado}
            onClick={handleConfirm}
            className={clsx(
              "w-full py-4 rounded-xl font-black text-lg flex justify-between px-6 items-center shadow-lg transition-all active:scale-95",
              isAgotado 
                ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed shadow-none"
                : "bg-green-500 hover:bg-green-600 text-white shadow-green-500/30"
            )}
          >
            <span>{isAgotado ? 'Agotado' : 'Añadir a la cuenta'}</span>
            <span className="bg-black/20 px-3 py-1 rounded-lg">${calculateTotal().toFixed(2)}</span>
          </button>
        </div>

      </motion.div>
    </div>
  );
};