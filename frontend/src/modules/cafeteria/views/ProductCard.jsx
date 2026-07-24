// src/modules/cafeteria/views/ProductCard.jsx
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2, Lock, Flame, Tag } from 'lucide-react';

export const ProductCard = ({ product, onClick, onQuickAdd, isLocked = false, cartQty = 0, onLimitReached, activePromotions = [] }) => {
  const [imgError, setImgError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  const isAgotado = product.isAgotado === true || (product.controlarStock === true && product.stock <= 0);
  const isLimitReached = product.controlarStock === true && cartQty >= product.stock && product.stock > 0;
  const showScarcity = !isAgotado && !isLimitReached && product.controlarStock === true && product.stock > 0 && product.stock <= 10;
  
  const imageUrl = product.image || product.imagen;

  const parsedOptions = useMemo(() => {
    try {
      if (!product.opciones) return null;
      return typeof product.opciones === 'string' ? JSON.parse(product.opciones) : product.opciones;
    } catch (e) {
      return null;
    }
  }, [product.opciones]);

  const hasOptions = parsedOptions && (parsedOptions.tamanos?.length > 0 || parsedOptions.leches?.length > 0 || parsedOptions.extras?.length > 0);

  const realBasePrice = useMemo(() => {
    let base = Number(product.precioBase || product.precio || 0);
    if (parsedOptions && parsedOptions.defaults) {
      const defaultTamano = parsedOptions.defaults.tamano;
      const defaultLeche = parsedOptions.defaults.leche;

      if (defaultTamano) {
        const t = parsedOptions.tamanos?.find(x => x.nombre === defaultTamano);
        if (t && t.precioAdicional) base += Number(t.precioAdicional);
      }
      if (defaultLeche) {
        const l = parsedOptions.leches?.find(x => x.nombre === defaultLeche);
        if (l && l.precioAdicional) base += Number(l.precioAdicional);
      }
    }
    return base;
  }, [product.precioBase, product.precio, parsedOptions]);

  // 🔥 FILTRADO ESTRICTO + ESCUDO ANTI-QUIEBRE DE STOCK
  const activePromo = useMemo(() => {
    const promosArray = Array.isArray(activePromotions) 
      ? activePromotions 
      : (activePromotions?.data || activePromotions?.promotions || []);

    if (promosArray.length === 0) return null;

    const promo = promosArray.find(p => {
      const matchesProduct = String(p.productId || p.product_id) === String(product.id);
      if (!matchesProduct) return false;

      const rawActive = p.isActive ?? p.is_active ?? p.status;
      return rawActive === true || rawActive === 1 || rawActive === 'true' || rawActive === '1';
    });

    if (!promo) return null;
    
    // 🛡️ VALIDACIÓN DE STOCK: ¿Alcanza para cumplir la promoción?
    if (product.controlarStock) {
      let requiredQty = 1;
      if (promo.type === 'NxM' || promo.type === 'NTH_FIXED') {
        requiredQty = Number(promo.buyQty || promo.buy_qty || 2);
      }
      if (product.stock < requiredQty) {
        console.log(`❌ Promo Oculta: Stock insuficiente (${product.stock}) para la oferta que exige ${requiredQty}.`);
        return null; // Se autodestruye visualmente
      }
    }

    const today = new Date().getDay(); 
    let validDaysAsNumbers = [];
    const daysRaw = promo.validDays || promo.valid_days;

    if (Array.isArray(daysRaw)) {
      validDaysAsNumbers = daysRaw.map(Number);
    } else if (typeof daysRaw === 'string') {
      try { 
        validDaysAsNumbers = JSON.parse(daysRaw).map(Number); 
      } catch (e) { 
        validDaysAsNumbers = daysRaw.replace(/[\[\]]/g, '').split(',').map(n => Number(n.trim())); 
      }
    }

    if (validDaysAsNumbers.length > 0 && !validDaysAsNumbers.includes(today)) {
      return null;
    }

    return promo;
  }, [activePromotions, product.id, product.stock, product.controlarStock]);

  const promoFixedPrice = useMemo(() => {
    if (!activePromo || activePromo.type !== 'FIXED') return 0;
    const originalDbPrice = Number(product.precioBase || product.precio || 0);
    const costoExtras = realBasePrice - originalDbPrice;
    const discountVal = Number(activePromo.discountValue || activePromo.discount_value || 0);
    return discountVal + costoExtras;
  }, [activePromo, realBasePrice, product.precioBase, product.precio]);

  const discountPercent = useMemo(() => {
    if (activePromo?.type === 'FIXED' && realBasePrice > 0) {
      const percent = ((realBasePrice - promoFixedPrice) / realBasePrice) * 100;
      return Math.max(0, Math.round(percent));
    }
    return 0;
  }, [activePromo, realBasePrice, promoFixedPrice]);

  const promoBadgeText = useMemo(() => {
    if (!activePromo) return '';
    const type = activePromo.type;
    
    if (type === 'NxM') {
      const buy = activePromo.buyQty || activePromo.buy_qty || 3;
      const pay = activePromo.payQty || activePromo.pay_qty || 2;
      return `${buy}x${pay}`;
    }
    
    if (type === 'FIXED') {
      return `-${discountPercent}% OFF`;
    }
    
    if (type === 'NTH_FIXED') {
      const nth = activePromo.buyQty || activePromo.buy_qty || 2;
      const rawDiscountPrice = Number(activePromo.discountValue || activePromo.discount_value || 0);
      
      const originalDbPrice = Number(product.precioBase || product.precio || 0);
      const costoExtras = realBasePrice - originalDbPrice;
      const finalPromoPrice = rawDiscountPrice + (costoExtras > 0 ? costoExtras : 0);
      
      const formattedPrice = finalPromoPrice % 1 === 0 ? finalPromoPrice : finalPromoPrice.toFixed(2);
      return `${nth}ª a $${formattedPrice}`;
    }
    
    return activePromo.name || 'Promo';
  }, [activePromo, discountPercent, realBasePrice, product.precioBase, product.precio]);

  const handleQuickAddClick = async (e) => {
    e.stopPropagation(); 
    if (isAgotado || isAdding || isLocked) return;
    
    if (isLimitReached) {
      if (onLimitReached) onLimitReached(product.stock);
      return;
    }

    const defaultTamano = parsedOptions?.defaults?.tamano;
    if (hasOptions && (!defaultTamano || defaultTamano.toLowerCase().includes('elegir'))) {
      if (onClick) onClick(product); 
      return;
    }

    setIsAdding(true);
    try {
      if (onQuickAdd) await onQuickAdd(product);
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
      whileTap={!isAgotado && !isLocked && !isLimitReached ? { scale: 0.95 } : {}}
      onClick={() => {
        if (isAgotado || isLocked) return;
        if (isLimitReached) {
          if (onLimitReached) onLimitReached(product.stock);
          return;
        }
        if (onClick) onClick(product);
      }}
      className={`relative flex flex-col bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2rem] p-3 transition-all duration-300 overflow-hidden border-2 h-full transform ${
        isAgotado 
          ? 'border-gray-100 dark:border-gray-800 lya:border-lya-border/30 opacity-60 grayscale-[80%] cursor-not-allowed' 
          : isLocked
            ? 'border-transparent dark:border-transparent lya:border-lya-border/20 opacity-80 cursor-default'
            : isLimitReached
              ? 'border-amber-200 dark:border-amber-900/50 lya:border-amber-500/30 opacity-80 shadow-inner'
              : activePromo 
                ? 'border-rose-200 dark:border-rose-900/40 lya:border-lya-primary/40 shadow-[0_5px_20px_rgba(244,63,94,0.1)] cursor-pointer md:hover:-translate-y-1 md:hover:shadow-[0_10px_30px_rgba(244,63,94,0.2)] md:dark:hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] md:lya:hover:shadow-lya-primary/20 md:lya:hover:border-lya-secondary/30'
                : 'border-transparent dark:border-transparent lya:border-lya-border/20 shadow-[0_5px_15px_rgba(0,0,0,0.03)] cursor-pointer md:hover:-translate-y-1 md:hover:shadow-[0_10px_30px_rgba(244,139,49,0.15)] md:dark:hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] md:lya:hover:shadow-lya-primary/20 md:lya:hover:border-lya-secondary/30'
      }`}
    >
      {isAgotado && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[120%] pointer-events-none">
          <div className="bg-red-500/95 dark:bg-red-600/95 lya:bg-red-500/95 backdrop-blur-md text-white text-center py-2 font-black tracking-widest uppercase transform -rotate-12 shadow-2xl border-y-2 border-red-400/50 text-[11px]">
            Agotado
          </div>
        </div>
      )}

      <div className="h-28 w-full rounded-[1.25rem] bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg mb-3 flex items-center justify-center overflow-hidden p-2 relative group transition-colors shadow-inner shrink-0">
        
        {activePromo && !isAgotado && (
          <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-rose-500 to-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg border border-rose-400 flex items-center gap-1 uppercase tracking-widest">
            <Tag size={10} strokeWidth={3} />
            {promoBadgeText}
          </div>
        )}

        {showScarcity && (
          <div className={`absolute top-2 z-10 bg-amber-500/95 dark:bg-amber-600/95 lya:bg-lya-secondary/95 backdrop-blur-md text-white text-[9px] font-black px-2 py-1 rounded-full shadow-lg border border-amber-400/50 flex items-center gap-1 animate-pulse ${activePromo ? 'right-2' : 'left-2'}`}>
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
        
        <div className="mt-auto flex items-center justify-between pt-2.5 border-t-2 border-gray-50 dark:border-gray-800/80 lya:border-lya-border/40 transition-colors">
          
          <div className="flex flex-col items-start pl-1">
            {(activePromo && activePromo.type === 'FIXED') ? (
              <>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 lya:text-lya-text/50 line-through leading-none">
                  ${realBasePrice.toFixed(2)}
                </span>
                <span className="font-black text-base tracking-tight text-rose-600 dark:text-rose-400 lya:text-lya-primary leading-tight">
                  ${promoFixedPrice.toFixed(2)}
                </span>
              </>
            ) : (
              <span className={`font-black text-base tracking-tight ${isAgotado || isLimitReached ? 'text-gray-400 dark:text-gray-600 lya:text-lya-text/40' : 'text-gray-900 dark:text-white lya:text-lya-text'}`}>
                ${realBasePrice.toFixed(2)}
              </span>
            )}
          </div>
          
          {!isLocked ? (
            <button 
              disabled={isAgotado || isAdding}
              onClick={handleQuickAddClick}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all outline-none touch-manipulation ${
                isAgotado 
                  ? 'bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-gray-400 dark:text-gray-600 lya:text-lya-text/30 cursor-not-allowed' 
                  : isLimitReached
                    ? 'bg-gray-100 dark:bg-gray-800 text-amber-500'
                    : activePromo 
                      ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/30 active:scale-90 disabled:opacity-50 md:hover:from-rose-600 md:hover:to-rose-700'
                      : 'bg-orange-500 dark:bg-orange-600 lya:bg-lya-primary text-white lya:text-lya-surface shadow-lg shadow-orange-500/30 dark:shadow-orange-900/40 lya:shadow-lya-primary/30 active:scale-90 disabled:opacity-50 md:hover:bg-orange-600 md:dark:hover:bg-orange-500 md:lya:hover:bg-lya-primary/90'
              }`}
              title={activePromo ? 'Añadir Oferta' : 'Añadir directo a la orden'}
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