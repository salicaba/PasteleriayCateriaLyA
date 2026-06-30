import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

export const ProductCard = ({ product, onClick, onQuickAdd }) => {
  const [imgError, setImgError] = useState(false);
  
  // 🔥 FIX CRÍTICO: Ahora escucha tanto el stock automático como el botón de Pausa manual del Gestor
  const isAgotado = product.isAgotado === true || (product.controlarStock === true && product.stock <= 0);
  const imageUrl = product.image || product.imagen;

  // 🔍 Lógica premium optimizada con useMemo: 
  // Calculamos una sola vez si tiene opciones para evitar parseos en cada render de la cuadrícula.
  const hasOptions = useMemo(() => {
    try {
      if (!product.opciones) return false;
      const ops = typeof product.opciones === 'string' ? JSON.parse(product.opciones) : product.opciones;
      return ops && (ops.tamanos?.length > 0 || ops.leches?.length > 0 || ops.extras?.length > 0);
    } catch (e) {
      return false;
    }
  }, [product.opciones]);

  return (
    <motion.div
      layout
      whileHover={!isAgotado ? { y: -5 } : {}}
      whileTap={!isAgotado ? { scale: 0.96 } : {}}
      onClick={() => {
        if (!isAgotado && onClick) {
          onClick(product);
        }
      }}
      className={`relative flex flex-col bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2rem] p-3 transition-all overflow-hidden border-2 ${
        isAgotado 
          ? 'border-gray-100 dark:border-gray-800 lya:border-lya-border/30 opacity-60 grayscale-[80%] cursor-not-allowed' 
          : 'border-transparent dark:border-transparent lya:border-lya-border/20 shadow-[0_5px_15px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_30px_rgba(244,139,49,0.15)] dark:hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] lya:hover:shadow-lya-primary/20 lya:hover:border-lya-secondary/30 cursor-pointer'
      }`}
    >
      {/* CINTA DE AGOTADO */}
      {isAgotado && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[120%] pointer-events-none">
          <div className="bg-red-500/95 dark:bg-red-600/95 lya:bg-red-500/95 backdrop-blur-md text-white text-center py-2 font-black tracking-widest uppercase transform -rotate-12 shadow-2xl border-y-2 border-red-400/50 text-[11px]">
            Agotado
          </div>
        </div>
      )}

      {/* CONTENEDOR DE IMAGEN CON EFECTO HOVER */}
      <div className="h-28 w-full rounded-2xl bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg mb-3 flex items-center justify-center overflow-hidden p-2 relative group transition-colors shadow-inner">
        {imageUrl && !imgError ? (
          <img 
            src={imageUrl} 
            alt={product.nombre} 
            onError={() => setImgError(true)}
            className="w-full h-full object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-500 ease-out" 
          />
        ) : (
          <span className="text-5xl drop-shadow-sm opacity-90">☕</span>
        )}
        
        {/* HINT VISUAL: Efecto de superposición que invita a tocar la tarjeta */}
        {!isAgotado && (
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 lya:bg-lya-dark/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px] rounded-2xl">
            <span className="text-white lya:text-lya-surface font-black text-[10px] uppercase tracking-wider px-3.5 py-1.5 bg-black/50 dark:bg-gray-900/80 lya:bg-lya-primary/80 rounded-xl border border-white/20 dark:border-gray-600/50 lya:border-lya-primary/40 text-center shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
              {hasOptions ? 'Opciones' : 'Ver detalle'}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 relative z-0 text-center">
        {/* TEXTO CENTRADO Y TRUNCADO (Máximo 2 líneas para alinear todas las tarjetas) */}
        <h3 className="font-black text-gray-800 dark:text-gray-100 lya:text-lya-text text-sm leading-tight line-clamp-2 mb-1 px-1 h-10 flex items-center justify-center tracking-tight">
          {product.nombre}
        </h3>
        
        {/* BADGE DE PERSONALIZABLE */}
        <div className="h-6 mb-2 flex justify-center items-center">
          {hasOptions && (
             <span className="text-[9px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 lya:text-lya-primary bg-orange-50 dark:bg-orange-500/10 lya:bg-lya-primary/10 px-2.5 py-1 rounded-md border border-orange-200 dark:border-orange-500/20 lya:border-lya-primary/20 shadow-sm">
               ✨ Configurable
             </span>
          )}
        </div>
        
        {/* SECCIÓN DE PRECIO Y BOTÓN */}
        <div className="mt-auto flex items-center justify-between pt-2.5 border-t-2 border-gray-50 dark:border-gray-800/80 lya:border-lya-border/40 transition-colors">
          <span className={`font-black text-base pl-1 tracking-tight ${isAgotado ? 'text-gray-400 dark:text-gray-600 lya:text-lya-text/40' : 'text-gray-900 dark:text-white lya:text-lya-text'}`}>
            ${Number(product.precioBase || product.precio || 0).toFixed(2)}
          </span>
          
          <button 
            disabled={isAgotado}
            onClick={(e) => {
              e.stopPropagation(); // Evita que se abra el modal de detalle
              if (!isAgotado && onQuickAdd) {
                onQuickAdd(product);
              }
            }}
            className={`p-2.5 rounded-xl transition-all ${
              isAgotado 
                ? 'bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-gray-400 dark:text-gray-600 lya:text-lya-text/30 cursor-not-allowed' 
                : 'bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white lya:text-lya-surface shadow-lg shadow-orange-500/30 dark:shadow-orange-900/40 lya:shadow-lya-primary/30 active:scale-90'
            }`}
            title="Añadir directo a la orden"
          >
            <Plus size={18} strokeWidth={3} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};