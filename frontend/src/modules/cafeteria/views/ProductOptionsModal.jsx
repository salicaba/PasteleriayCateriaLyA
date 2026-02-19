import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { MODIFIERS } from '../models/productsModel';
import clsx from 'clsx';

export const ProductOptionsModal = ({ product, onClose, onConfirm }) => {
  const [selections, setSelections] = useState({});

  if (!product) return null;

  const availableModifiers = MODIFIERS[product.categoria] || [];

  const handleToggle = (modId, optId, type) => {
    setSelections(prev => {
      const current = prev[modId];
      if (type === 'single') {
        return { ...prev, [modId]: optId };
      } else {
        const currentArray = Array.isArray(current) ? current : [];
        if (currentArray.includes(optId)) {
          return { ...prev, [modId]: currentArray.filter(id => id !== optId) };
        } else {
          return { ...prev, [modId]: [...currentArray, optId] };
        }
      }
    });
  };

  const calculateTotal = () => {
    let total = product.precio;
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
    const details = [];
    availableModifiers.forEach(mod => {
      const selected = selections[mod.id];
      if (!selected) return;
      if (mod.type === 'single') {
        const opt = mod.options.find(o => o.id === selected);
        if (opt && opt.id !== 's' && opt.id !== 'entera') details.push(opt.label);
      } else {
        selected.forEach(sId => {
          const opt = mod.options.find(o => o.id === sId);
          if (opt) details.push(opt.label);
        });
      }
    });

    onConfirm({
      ...product,
      precioFinal: calculateTotal(),
      detalles: details.length > 0 ? { tamano: details[0] || 'Estándar', extras: details.slice(1) } : { tamano: 'Estándar' },
      uniqueId: Date.now()
    });
  };

 return (
    <div className="absolute inset-0 z-[60] flex items-end md:items-center justify-center pointer-events-none">
      
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
      />

      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        // CAMBIO: dark:bg-gray-800
        className="relative z-10 bg-white dark:bg-gray-800 w-full md:w-[500px] md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[85vh] transition-colors"
      >
        {/* Header con Foto */}
        <div className="relative h-40 bg-gray-100 dark:bg-gray-700 shrink-0">
          <img src={product.imagen} className="w-full h-full object-cover opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-4 left-4 text-white">
            <h3 className="text-2xl font-bold">{product.nombre}</h3>
            <p className="opacity-80">${product.precio} Base</p>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Opciones Scrollables */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {availableModifiers.length === 0 ? (
            <p className="text-center text-gray-400 py-4">Este producto no tiene opciones adicionales.</p>
          ) : (
            availableModifiers.map(mod => (
              <div key={mod.id}>
                <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-3 flex justify-between">
                  {mod.title}
                  {mod.type === 'multiple' && <span className="text-xs font-normal text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">Elige varios</span>}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {mod.options.map(opt => {
                    const isSelected = mod.type === 'single' 
                      ? selections[mod.id] === opt.id
                      : selections[mod.id]?.includes(opt.id);

                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleToggle(mod.id, opt.id, mod.type)}
                        className={clsx(
                          "px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center gap-2 active:scale-95",
                          isSelected 
                            // Seleccionado (Brand Color)
                            ? "border-brand-primary bg-brand-primary/5 text-brand-primary shadow-sm ring-1 ring-brand-primary" 
                            // No seleccionado (Dark Mode Adaptado)
                            : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                        )}
                      >
                        {isSelected && <Check size={14} strokeWidth={3} />}
                        {opt.label}
                        {opt.price > 0 && <span className="text-xs opacity-60 ml-1">+${opt.price}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Confirmar */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 shrink-0">
          <button 
            onClick={handleConfirm}
            className="w-full bg-brand-dark dark:bg-brand-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 dark:hover:bg-brand-secondary transition-colors flex justify-between px-8 items-center shadow-lg active:scale-95"
          >
            <span>Agregar a la Orden</span>
            <span>${calculateTotal().toFixed(2)}</span>
          </button>
        </div>

      </motion.div>
    </div>
  );
};