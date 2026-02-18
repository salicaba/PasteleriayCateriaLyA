import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { MODIFIERS } from '../models/productsModel';
import clsx from 'clsx';

export const ProductOptionsModal = ({ product, onClose, onConfirm }) => {
  // Estado para guardar las selecciones { size: 'm', milk: 'almendra', extras: ['shot'] }
  const [selections, setSelections] = useState({});

  if (!product) return null;

  // Detectar qué modificadores aplican según la categoría del producto
  const availableModifiers = MODIFIERS[product.categoria] || [];

  // Si el producto no tiene opciones, agregarlo directo (esto se podría manejar antes)
  // Pero visualmente queremos mostrarlo.

  const handleToggle = (modId, optId, type) => {
    setSelections(prev => {
      const current = prev[modId];
      
      if (type === 'single') {
        // Si es selección única, reemplazamos el valor
        return { ...prev, [modId]: optId };
      } else {
        // Si es múltiple, agregamos o quitamos del array
        const currentArray = Array.isArray(current) ? current : [];
        if (currentArray.includes(optId)) {
          return { ...prev, [modId]: currentArray.filter(id => id !== optId) };
        } else {
          return { ...prev, [modId]: [...currentArray, optId] };
        }
      }
    });
  };

  // Calcular precio total dinámico
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
    // Generar descripción de las opciones para el ticket
    // Ej: "Mediano, Almendra, Shot Extra"
    const details = [];
    availableModifiers.forEach(mod => {
      const selected = selections[mod.id];
      if (!selected) return;

      if (mod.type === 'single') {
        const opt = mod.options.find(o => o.id === selected);
        if (opt && opt.id !== 's' && opt.id !== 'entera') details.push(opt.label); // Omitimos los default
      } else {
        selected.forEach(sId => {
          const opt = mod.options.find(o => o.id === sId);
          if (opt) details.push(opt.label);
        });
      }
    });

    onConfirm({
      ...product,
      precioFinal: calculateTotal(), // Nuevo precio calculado
      detalles: details.join(', '), // String para mostrar en ticket
      uniqueId: Date.now() // Importante: ID único para diferenciar dos lattes distintos
    });
  };

 return (
    <div className="absolute inset-0 z-[60] flex items-end md:items-center justify-center pointer-events-none">
      
      {/* Backdrop transparente pero bloqueante */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
      />

      {/* Ventana Modal */}
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        // CORRECCIÓN AQUÍ: Agregado 'relative z-10' para evitar que el fondo tape el modal
        className="relative z-10 bg-white w-full md:w-[500px] md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[85vh]"
      >
        {/* Header con Foto */}
        <div className="relative h-40 bg-gray-100 shrink-0">
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
                <h4 className="font-bold text-gray-800 mb-3 flex justify-between">
                  {mod.title}
                  {mod.type === 'multiple' && <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Elige varios</span>}
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
                            ? "border-brand-primary bg-brand-primary/5 text-brand-primary shadow-sm ring-1 ring-brand-primary" 
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
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
        <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <button 
            onClick={handleConfirm}
            className="w-full bg-brand-dark text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition-colors flex justify-between px-8 items-center shadow-lg active:scale-95"
          >
            <span>Agregar a la Orden</span>
            <span>${calculateTotal().toFixed(2)}</span>
          </button>
        </div>

      </motion.div>
    </div>
  );
};