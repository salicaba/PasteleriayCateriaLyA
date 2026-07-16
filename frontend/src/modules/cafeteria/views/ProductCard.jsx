// src/modules/cafeteria/views/ProductCard.jsx
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2, Lock, Flame } from 'lucide-react';

export const ProductCard = ({ product, onClick, onQuickAdd, isLocked = false, cartQty = 0, onLimitReached }) => {
  const [imgError, setImgError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  // 🚀 LÓGICA DE ESTADO
  const isAgotado = product.isAgotado === true || (product.controlarStock === true && product.stock <= 0);
  
  // 🔥 CÁLCULO DE LÍMITE (Poka-Yoke)
  const isLimitReached = product.controlarStock === true && cartQty >= product.stock && product.stock > 0;
  const showScarcity = !isAgotado && !isLimitReached && product.controlarStock === true && product.stock > 0 && product.stock <= 10;
  
  const imageUrl = product.image || product.imagen;

  const hasOptions = useMemo(() => {
    try {
      if (!product.opciones) return false;
      const ops = typeof product.opciones === 'string' ? JSON.parse(product.opciones) : product.opciones;
      return ops && (ops.tamanos?.length > 0 || ops.leches?.length > 0 || ops.extras?.length > 0);
    } catch (e) {
      return false;
    }
  }, [product.opciones]);

  const handleQuickAddClick = async (e) => {
    e.stopPropagation(); 
    if (isAgotado || isAdding || isLocked) return;
    
    // 🛡️ BLOQUEO TEMPRANO SI ALCANZA EL LÍMITE
    if (isLimitReached) {
      if (onLimitReached) onLimitReached(product.stock);
      return;
    }

    setIsAdding(true);
    try {
      if (onQuickAdd) {
        await onQuickAdd(product);
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      // 📱 BLINDAJE TÁCTIL
      whileTap={!isAgotado && !isLocked && !isLimitReached ? { scale: 0.95 } : {}}
      onClick={() => {
        if (isAgotado || isLocked) return;
        if (isLimitReached) {
          if (onLimitReached) onLimitReached(product.stock);
          return;
        }
        if (onClick) onClick(product);
      }}
      // 🎨 GEOMETRÍA PREMIUM & ESTADO BLOQUEADO
      className={`relative flex flex-col bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2rem] p-3 transition-all duration-300 overflow-hidden border-2 h-full transform ${
        isAgotado 
          ? 'border-gray-100 dark:border-gray-800 lya:border-lya-border/30 opacity-60 grayscale-[80%] cursor-not-allowed' 
          : isLocked
            ? 'border-transparent dark:border-transparent lya:border-lya-border/20 opacity-80 cursor-default'
            : isLimitReached
              ? 'border-amber-200 dark:border-amber-900/50 lya:border-amber-500/30 opacity-80 shadow-inner' // Estilo de límite alcanzado
              : 'border-transparent dark:border-transparent lya:border-lya-border/20 shadow-[0_5px_15px_rgba(0,0,0,0.03)] cursor-pointer md:hover:-translate-y-1 md:hover:shadow-[0_10px_30px_rgba(244,139,49,0.15)] md:dark:hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] md:lya:hover:shadow-lya-primary/20 md:lya:hover:border-lya-secondary/30'
      }`}
    >
      {/* ⚠️ CINTA DE AGOTADO */}
      {isAgotado && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[120%] pointer-events-none">
          <div className="bg-red-500/95 dark:bg-red-600/95 lya:bg-red-500/95 backdrop-blur-md text-white text-center py-2 font-black tracking-widest uppercase transform -rotate-12 shadow-2xl border-y-2 border-red-400/50 text-[11px]">
            Agotado
          </div>
        </div>
      )}

      {/* CONTENEDOR DE IMAGEN NEO-BENTO */}
      <div className="h-28 w-full rounded-[1.25rem] bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg mb-3 flex items-center justify-center overflow-hidden p-2 relative group transition-colors shadow-inner shrink-0">
        
        {/* 🔥 BADGE DE ESCASEZ VISUAL */}
        {showScarcity && (
          <div className="absolute top-2 right-2 z-10 bg-amber-500/95 dark:bg-amber-600/95 lya:bg-lya-secondary/95 backdrop-blur-md text-white text-[9px] font-black px-2 py-1 rounded-full shadow-lg border border-amber-400/50 flex items-center gap-1 animate-pulse">
            <Flame size={10} /> ¡Quedan {product.stock}!
          </div>
        )}

        {imageUrl && !imgError ? (
          <img 
            src={imageUrl} 
            alt={product.nombre} 
            onError={() => setImgError(true)}
            className={`w-full h-full object-contain drop-shadow-md transition-transform duration-500 ease-out ${!isLocked && !isLimitReached && 'md:group-hover:scale-110'}`} 
          />
        ) : (
          <span className="text-5xl drop-shadow-sm opacity-90">☕</span>
        )}
      </div>

      <div className="flex flex-col flex-1 relative z-0 text-center justify-between">
        <div>
          <h3 className="font-black text-gray-800 dark:text-gray-100 lya:text-lya-text text-sm leading-tight line-clamp-2 mb-1 px-1 h-10 flex items-center justify-center tracking-tight">
            {product.nombre}
          </h3>
          
          <div className="h-6 mb-2 flex justify-center items-center">
            {isLimitReached ? (
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800/30">
                <Lock size={10} className="mr-1 inline" /> Límite
              </span>
            ) : hasOptions ? (
              <span className="text-[9px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 lya:text-lya-primary bg-orange-50 dark:bg-orange-500/10 lya:bg-lya-primary/10 px-2.5 py-1 rounded-md border border-orange-200 dark:border-orange-500/20 lya:border-lya-primary/20 shadow-sm">
                ✨ Configurable
              </span>
            ) : null}
          </div>
        </div>
        
        {/* FOOTER DEL CARD */}
        <div className="mt-auto flex items-center justify-between pt-2.5 border-t-2 border-gray-50 dark:border-gray-800/80 lya:border-lya-border/40 transition-colors">
          <span className={`font-black text-base pl-1 tracking-tight ${isAgotado || isLimitReached ? 'text-gray-400 dark:text-gray-600 lya:text-lya-text/40' : 'text-gray-900 dark:text-white lya:text-lya-text'}`}>
            ${Number(product.precioBase || product.precio || 0).toFixed(2)}
          </span>
          
          {!isLocked ? (
            <button 
              disabled={isAgotado || isAdding}
              onClick={handleQuickAddClick}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all outline-none touch-manipulation ${
                isAgotado 
                  ? 'bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-gray-400 dark:text-gray-600 lya:text-lya-text/30 cursor-not-allowed' 
                  : isLimitReached
                    ? 'bg-gray-100 dark:bg-gray-800 text-amber-500' // Candado color ambar
                    : 'bg-orange-500 text-white lya:text-lya-surface shadow-lg shadow-orange-500/30 dark:shadow-orange-900/40 lya:shadow-lya-primary/30 active:scale-90 disabled:opacity-50 md:hover:bg-orange-600 md:dark:hover:bg-orange-500 md:lya:hover:bg-lya-primary/90'
              }`}
              title="Añadir directo a la orden"
            >
              {isAdding ? <Loader2 size={18} className="animate-spin" /> : (isLimitReached ? <Lock size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />)}
            </button>
          ) : (
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800/50 lya:bg-lya-bg text-gray-400 lya:text-lya-text/40 cursor-not-allowed" title="Cuenta cobrada/cerrada">
              <Lock size={16} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};