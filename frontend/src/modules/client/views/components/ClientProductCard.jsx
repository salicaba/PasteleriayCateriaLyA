// src/modules/client/views/components/ClientProductCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Flame, Gift, Tag, Lock, Plus, Loader2 } from 'lucide-react';
import { getProductModifiers } from '../utils/clientMenuUtils';

export default function ClientProductCard({
  product,
  cart,
  getCategoryName,
  addingToCartId,
  triggerNotification,
  setSelectedProduct,
  handleAddDirectly,
  getPromoBadge,
  itemVariants
}) {
  const hasImage = product.imagen && !product.imagen.includes('default-product');
  const isCustomizable = getProductModifiers(product).length > 0;
  const isAdding = addingToCartId === product.id;
  
  const isAgotado = product.isAgotado === true || (product.controlarStock === true && product.stock <= 0);
  
  const cartQty = cart.filter(item => item.id === product.id && !item.isAutoPromo).reduce((acc, item) => acc + item.qty, 0);
  const isLimitReached = product.controlarStock && cartQty >= product.stock && product.stock > 0;
  
  const showScarcity = !isAgotado && !isLimitReached && product.controlarStock === true && product.stock > 0 && product.stock <= 10;

  let parsedOptions = null;
  try { if (product.opciones) parsedOptions = typeof product.opciones === 'string' ? JSON.parse(product.opciones) : product.opciones; } catch(e){}
  
  const hasOptions = parsedOptions && (parsedOptions.tamanos?.length > 0 || parsedOptions.leches?.length > 0 || parsedOptions.extras?.length > 0);
  const baseOriginal = Number(product.precio);
  let finalPriceWithDefaults = baseOriginal;
  let defaultMods = null;

  if (hasOptions) {
    const isPlaceholderTamano = parsedOptions.defaults?.tamano && parsedOptions.defaults.tamano.toLowerCase().includes('elegir');
    const requiresSizeSelection = parsedOptions.tamanos?.length > 0 && (!parsedOptions.defaults?.tamano || isPlaceholderTamano);

    if (requiresSizeSelection) {
        defaultMods = 'REQUIRE_MODAL'; 
    } else {
        const tamanoDefault = (!isPlaceholderTamano && parsedOptions.defaults?.tamano) ? parsedOptions.defaults.tamano : (parsedOptions.tamanos?.[0]?.nombre || 'Estándar');
        const isPlaceholderLeche = parsedOptions.defaults?.leche && parsedOptions.defaults.leche.toLowerCase().includes('elegir');
        const lecheDefault = (!isPlaceholderLeche && parsedOptions.defaults?.leche) ? parsedOptions.defaults.leche : parsedOptions.leches?.[0]?.nombre;
        const extrasDefault = parsedOptions.defaults?.extras || [];

        let precioAdicional = 0;
        if (tamanoDefault) { const t = parsedOptions.tamanos?.find(x => x.nombre === tamanoDefault); if (t && t.precioAdicional) precioAdicional += Number(t.precioAdicional); }
        if (lecheDefault) { const l = parsedOptions.leches?.find(x => x.nombre === lecheDefault); if (l && l.precioAdicional) precioAdicional += Number(l.precioAdicional); }

        finalPriceWithDefaults = baseOriginal + precioAdicional;
        defaultMods = {
            precioFinal: finalPriceWithDefaults,
            detalles: { tamano: tamanoDefault, ...(lecheDefault && { leche: lecheDefault }), ...(extrasDefault.length > 0 && { extras: extrasDefault }) }
        };
    }
  }
  
  const costoExtras = finalPriceWithDefaults - baseOriginal;
  const promoData = getPromoBadge(product.id, finalPriceWithDefaults);

  let displayOriginalPrice = null;
  let displayFinalPrice = finalPriceWithDefaults;

  if (promoData?.type === 'FIXED') {
    displayOriginalPrice = finalPriceWithDefaults;
    displayFinalPrice = promoData.discountValue + (costoExtras > 0 ? costoExtras : 0);
    
    if (displayOriginalPrice > 0) {
        const percent = ((displayOriginalPrice - displayFinalPrice) / displayOriginalPrice) * 100;
        promoData.text = `-${Math.max(0, Math.round(percent))}% OFF`;
    }
  }

  return (
    <motion.div 
      layout 
      variants={itemVariants} 
      whileTap={isCustomizable && !isAgotado && !isLimitReached ? { scale: 0.98 } : {}} 
      onClick={() => {
        if (isAgotado) return;
        if (isLimitReached) {
          triggerNotification(`Límite en carrito: Solo hay ${product.stock} en stock.`, 'warning');
          return;
        }
        if (isCustomizable) setSelectedProduct(product);
      }} 
      className={`relative flex items-center gap-4 p-3 rounded-[2rem] bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] border shadow-sm transition-all overflow-hidden outline-none touch-manipulation ${
        isAgotado 
          ? 'border-gray-200 dark:border-gray-700 opacity-60 grayscale-[50%]' 
          : isLimitReached
            ? 'border-amber-200 dark:border-amber-900/40 opacity-80' 
            : `border-gray-100 dark:border-gray-700 lya:border-[#EADCC9] ${isCustomizable ? 'cursor-pointer md:hover:scale-[1.01] md:hover:shadow-md dark:md:hover:bg-gray-700/80 lya:md:hover:bg-[#EADCC9]/30' : ''}`
      }`}
    >
      
      {isAgotado && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[120%] pointer-events-none">
          <div className="bg-red-500/95 dark:bg-red-600/95 lya:bg-red-500/95 backdrop-blur-md text-white text-center py-1.5 font-black tracking-widest uppercase transform -rotate-12 shadow-2xl border-y border-red-400/50 text-[10px]">
            Agotado
          </div>
        </div>
      )}

      <div className="w-24 h-24 shrink-0 rounded-[1.25rem] overflow-hidden bg-gray-100 dark:bg-gray-900 lya:bg-[#EADCC9] border border-gray-100 dark:border-gray-700 lya:border-[#D9C4A9] flex items-center justify-center shadow-inner relative pointer-events-none">
        {showScarcity && (
          <div className="absolute top-1.5 right-1.5 z-10 bg-amber-500/95 dark:bg-amber-600/95 backdrop-blur-md text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-lg border border-amber-400/50 flex items-center gap-0.5 animate-pulse">
            <Flame size={8} /> ¡Quedan {product.stock}!
          </div>
        )}

        {hasImage ? <img src={product.imagen} alt={product.nombre} className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-300 dark:text-gray-600 lya:text-[#C4B29A]" size={28} />}
      </div>
      
      <div className="flex-1 min-w-0 flex flex-col justify-between h-full min-h-[6rem] py-1">
        <div className="min-w-0 mb-1">
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-orange-500 dark:text-orange-400 lya:text-[#78350F] block truncate text-left">{getCategoryName(product.categoria)}</span>
          <h3 className="font-extrabold text-[15px] sm:text-base text-gray-900 dark:text-white lya:text-[#3E2723] line-clamp-2 text-left leading-tight">{product.nombre}</h3>
          
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {promoData && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-rose-500 dark:bg-rose-600 px-2.5 py-1 rounded-full border border-transparent shadow-sm">
                {promoData.type === 'NxM' ? <Gift size={10} strokeWidth={2.5} /> : <Tag size={10} strokeWidth={3} />}
                <span>{promoData.text}</span>
              </span>
            )}
            {isCustomizable && !isLimitReached && (
              <span className="inline-flex text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20 lya:bg-[#EADCC9] px-2.5 py-1 rounded-full border border-orange-200 dark:border-orange-800/30 lya:border-transparent">
                ✨ Personalizable
              </span>
            )}
            {isLimitReached && (
              <span className="inline-flex text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800/30">
                <Lock size={10} className="mr-1 inline" /> Límite: {product.stock}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-end justify-between mt-auto">
          <div className="flex flex-col items-start justify-end">
            {promoData?.type === 'FIXED' ? (
              <>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 line-through decoration-rose-500/40 decoration-[1.5px] leading-none block -mb-0.5">
                  ${displayOriginalPrice.toFixed(2)}
                </span>
                <span className={`font-black text-lg tracking-tight block text-left ${isAgotado || isLimitReached ? 'text-gray-400 dark:text-gray-600' : 'text-rose-500 dark:text-rose-400 lya:text-[#78350F]'}`}>
                  ${displayFinalPrice.toFixed(2)}
                </span>
              </>
            ) : (
              <span className={`font-black text-lg tracking-tight block text-left ${isAgotado || isLimitReached ? 'text-gray-400 dark:text-gray-600 lya:text-lya-text/40' : 'text-gray-900 dark:text-white lya:text-[#5D4037]'}`}>
                ${displayFinalPrice.toFixed(2)}
              </span>
            )}
          </div>
          
          <button 
            disabled={isAdding || addingToCartId !== null || isAgotado} 
            onClick={(e) => { 
              e.stopPropagation(); 
              if (isAgotado) return;
              if (isLimitReached) {
                triggerNotification(`Límite en carrito: Solo hay ${product.stock} en stock.`, 'warning');
                return;
              }
              if (defaultMods === 'REQUIRE_MODAL') {
                setSelectedProduct(product);
              } else {
                handleAddDirectly(product, defaultMods, e); 
              }
            }} 
            className={`w-10 h-10 rounded-[1rem] flex items-center justify-center shadow transition-all outline-none touch-manipulation ${
              isAgotado 
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                : isLimitReached
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-500 dark:text-amber-500' 
                  : 'bg-gray-900 dark:bg-white lya:bg-[#78350F] text-white dark:text-gray-900 md:hover:bg-gray-800 dark:md:hover:bg-gray-200 lya:md:hover:bg-[#5C240A] active:scale-90 disabled:opacity-50'
            }`}
          >
            {isAdding ? <Loader2 size={20} className="animate-spin" /> : (isLimitReached ? <Lock size={20} strokeWidth={3} /> : <Plus size={20} strokeWidth={3} />)}
          </button>
        </div>
      </div>
    </motion.div>
  );
}