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
      className={`relative flex flex-col bg-brand-surface rounded-3xl p-3 border transition-all overflow-hidden ${
        isAgotado 
          ? 'border-brand-border/30 opacity-60 grayscale-[70%] cursor-not-allowed' 
          : 'border-transparent shadow-sm hover:shadow-xl hover:shadow-brand-primary/10 cursor-pointer'
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
      <div className="h-28 w-full rounded-2xl bg-brand-bg mb-3 flex items-center justify-center overflow-hidden p-2 relative group">
        {imageUrl ? (
          <img src={imageUrl} alt={product.nombre} className="w-full h-full object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
        ) : (
          <span className="text-4xl">☕</span>
        )}
        
        {/* HINT VISUAL: Usando colores corporativos */}
        {!isAgotado && (
          <div className="absolute inset-0 bg-brand-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px] rounded-2xl">
            <span className="text-brand-surface font-bold text-[10px] uppercase tracking-wider px-3 py-1 bg-brand-primary/80 rounded-full border border-brand-surface/20 text-center shadow-lg">
              {hasOptions ? 'Configurar opciones' : 'Ver detalle'}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 relative z-0 text-center">
        {/* TEXTO CENTRADO Y TRUNCADO */}
        <h3 className="font-bold text-brand-text text-[13px] leading-tight line-clamp-2 mb-1 px-1 h-8 flex items-center justify-center">
          {product.nombre}
        </h3>
        
        {/* BADGE DE PERSONALIZABLE CON TONOS LYA */}
        <div className="h-5 mb-1 flex justify-center items-center">
          {hasOptions && (
             <span className="text-[9px] font-black uppercase tracking-wider text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full border border-brand-primary/20">
                ✨ Personalizable
             </span>
          )}
        </div>
        
        {/* SECCIÓN DE PRECIO Y BOTÓN DE AÑADIR */}
        <div className="mt-auto flex items-center justify-between pt-2 border-t border-brand-border/50">
          <span className={`font-black text-[15px] pl-1 ${isAgotado ? 'text-brand-text opacity-50' : 'text-brand-text'}`}>
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
                ? 'bg-brand-bg text-brand-text opacity-40' 
                : 'bg-brand-primary text-brand-surface shadow-lg shadow-brand-primary/30 hover:opacity-90'
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