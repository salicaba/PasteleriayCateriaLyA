import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

export const ProductCard = ({ product, onClick, onQuickAdd }) => {
  const isAgotado = product.controlarStock === true && product.stock <= 0;
  const imageUrl = product.image || product.imagen;

  // 🔍 Lógica premium: Detectar si tiene opciones para mostrarle la pista al cajero
  let hasOptions = false;
  try {
    const ops = typeof product.opciones === 'string' ? JSON.parse(product.opciones) : product.opciones;
    if (ops && (ops.tamanos?.length > 0 || ops.leches?.length > 0 || ops.extras?.length > 0)) {
      hasOptions = true;
    }
  } catch (e) {}

  return (
    <motion.div
      layout
      whileHover={!isAgotado ? { y: -5 } : {}}
      whileTap={!isAgotado ? { scale: 0.95 } : {}}
      onClick={() => {
        if (!isAgotado) {
          onClick(product);
        }
      }}
      className={`relative flex flex-col bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-3xl p-3 border transition-all overflow-hidden ${
        isAgotado 
          ? 'border-gray-200 dark:border-gray-700 lya:border-lya-border/40 opacity-60 grayscale-[70%] cursor-not-allowed' 
          : 'border-transparent lya:border-lya-border/20 shadow-sm hover:shadow-xl hover:shadow-orange-500/10 dark:hover:shadow-black/40 lya:hover:shadow-lya-primary/10 lya:hover:border-lya-secondary/30 cursor-pointer'
      }`}
    >
      {isAgotado && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full px-2 pointer-events-none">
          <div className="bg-red-600/90 backdrop-blur-md text-white text-center py-2 rounded-xl font-black tracking-widest uppercase transform -rotate-12 shadow-2xl border border-red-500/50 text-sm">
            Agotado
          </div>
        </div>
      )}

      {/* CONTENEDOR DE IMAGEN CON EFECTO HOVER */}
      <div className="h-28 w-full rounded-2xl bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg mb-3 flex items-center justify-center overflow-hidden p-2 relative group transition-colors">
        {imageUrl ? (
          <img src={imageUrl} alt={product.nombre} className="w-full h-full object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
        ) : (
          <span className="text-4xl">☕</span>
        )}
        
        {/* HINT VISUAL: Efecto de superposición que invita a tocar la tarjeta */}
        {!isAgotado && (
          <div className="absolute inset-0 bg-black/40 lya:bg-lya-text/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px] rounded-2xl">
            <span className="text-white lya:text-lya-surface font-bold text-[10px] uppercase tracking-wider px-3 py-1 bg-black/50 lya:bg-lya-primary/80 rounded-full border border-white/20 lya:border-lya-primary/40 text-center shadow-lg">
              {hasOptions ? 'Configurar opciones' : 'Ver detalle'}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 relative z-0 text-center">
        {/* TEXTO CENTRADO Y TRUNCADO (Máximo 2 líneas para alinear todas las tarjetas) */}
        <h3 className="font-bold text-gray-800 dark:text-gray-100 lya:text-lya-text text-[13px] leading-tight line-clamp-2 mb-1 px-1 h-8 flex items-center justify-center">
          {product.nombre}
        </h3>
        
        {/* BADGE DE PERSONALIZABLE */}
        <div className="h-5 mb-1 flex justify-center items-center">
          {hasOptions && (
             <span className="text-[9px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 lya:text-lya-primary bg-orange-500/10 dark:bg-orange-500/10 lya:bg-lya-primary/10 px-2 py-0.5 rounded-full border border-orange-500/20 dark:border-orange-500/20 lya:border-lya-primary/20">
                ✨ Personalizable
             </span>
          )}
        </div>
        
        {/* SECCIÓN DE PRECIO Y BOTÓN */}
        <div className="mt-auto flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/50 lya:border-lya-border/30 transition-colors">
          <span className={`font-black text-[15px] pl-1 ${isAgotado ? 'text-gray-500 dark:text-gray-500 lya:text-lya-text/40' : 'text-gray-900 dark:text-white lya:text-lya-text'}`}>
            ${Number(product.precioBase || product.precio || 0).toFixed(2)}
          </span>
          
          <button 
            disabled={isAgotado}
            onClick={(e) => {
              e.stopPropagation(); 
              if (!isAgotado && onQuickAdd) {
                onQuickAdd(product);
              }
            }}
            className={`p-2 rounded-xl transition-all active:scale-90 ${
              isAgotado 
                ? 'bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-gray-400 lya:text-lya-text/30' 
                : 'bg-orange-500 dark:bg-orange-500 lya:bg-lya-primary text-white lya:text-lya-surface shadow-lg shadow-orange-500/30 dark:shadow-orange-500/20 lya:shadow-lya-primary/30 hover:bg-orange-600 dark:hover:bg-orange-600 lya:hover:bg-lya-primary/90'
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