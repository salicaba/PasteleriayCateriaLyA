// src/modules/kitchen/views/KitchenOrderCard.jsx
import React, { useState, useEffect } from 'react';
import { Timer, Check, ChefHat, Flame, BellRing, ShoppingBag, Loader2, AlertCircle, Trash2, UtensilsCrossed } from 'lucide-react';
import { motion } from 'framer-motion';

export const KitchenOrderCard = ({ 
  order, 
  category, // 'salon' | 'llevar'
  onToggleItem, 
  onComplete, 
  onMarkAllReady,
  processingItems = new Set(),
  processingOrders = new Set() 
}) => {
  
  // 🔥 CANDADO INFINITO ANTI-PARPADEO
  // Si le da a "Entregar" o "Descartar", la tarjeta muere cargando hasta que el backend la borre de la pantalla
  const [isLeaving, setIsLeaving] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [localProcessingItems, setLocalProcessingItems] = useState(new Set());

  const handleComplete = async () => {
    if (isLeaving) return;
    setIsLeaving(true);
    try {
      await onComplete(order.id);
      // 🔥 IMPORTANTE: NO hacemos setIsLeaving(false) si tiene éxito.
      // La tarjeta se quedará cargando hasta que el componente se desmonte automáticamente.
    } catch (error) {
      setIsLeaving(false); // Solo se libera si falló la petición al backend
    }
  };

  const handleMarkAllReady = async () => {
    if (isMarkingAll || isLeaving) return;
    setIsMarkingAll(true);
    try {
      await onMarkAllReady(order.id);
    } finally {
      setIsMarkingAll(false); // Este sí se libera porque la tarjeta no desaparece
    }
  };

  const handleToggle = async (itemId) => {
    if (isLeaving || localProcessingItems.has(itemId)) return;
    
    setLocalProcessingItems(prev => new Set(prev).add(itemId));
    try {
      await onToggleItem(order.id, itemId);
    } finally {
      setLocalProcessingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const [elapsed, setElapsed] = useState('');
  const [progress, setProgress] = useState(0);
  const [urgency, setUrgency] = useState({
    border: 'border-gray-200 dark:border-gray-800 lya:border-lya-border/40',
    shadow: 'shadow-lg shadow-gray-200/50 dark:shadow-none lya:shadow-lya-primary/5',
    bar: 'bg-gray-300 dark:bg-gray-700',
    timeBg: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
  });

  const allCancelled = order.items.every(i => i.status === 'CANCELLED');
  const activeItems = order.items.filter(i => i.status !== 'CANCELLED');
  const allReady = activeItems.length > 0 && activeItems.every(i => i.kitchenStatus === 'PREPARING');
  
  const isOrderProcessing = processingOrders.has(order.id) || isLeaving;

  // CONFIGURACIÓN DE COLORES POR CATEGORÍA
  const catStyles = {
    salon: {
      bg: 'bg-emerald-500 dark:bg-emerald-600 lya:bg-lya-primary',
      icon: UtensilsCrossed
    },
    llevar: {
      bg: 'bg-orange-500 dark:bg-orange-600 lya:bg-orange-500',
      icon: ShoppingBag
    }
  };
  const activeStyle = catStyles[category] || catStyles.salon;
  const CategoryIcon = activeStyle.icon;

  const getDisplayTitle = () => {
    const rawMesa = String(order.mesa || '');
    if (category === 'llevar') {
      let folio = rawMesa.split(' - ')[0].split(' | ')[0].replace('#', '');
      if (['para', 'llevar', 's/n', 'express'].includes(folio.toLowerCase().trim())) {
        folio = String(order.id).split('-').pop().slice(-4).toUpperCase();
      }
      return `LLEVAR #${folio}`;
    } else {
      let tableNum = rawMesa.replace(/Mesa\s*/i, '').replace('#', '').trim();
      return `MESA #${tableNum}`;
    }
  };

  useEffect(() => {
    const calculateTime = () => {
      const start = new Date(order.oldestItemTime || order.createdAt);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      const totalSecs = Math.floor(diffMs / 1000);
      
      const maxSecs = 15 * 60; // 15 minutos al 100% de la barra
      const currentProgress = Math.min((totalSecs / maxSecs) * 100, 100);
      setProgress(currentProgress);

      if (allCancelled) {
        setUrgency({
          border: 'border-red-500',
          shadow: 'shadow-xl shadow-red-500/30 animate-pulse',
          bar: 'bg-red-500 animate-pulse',
          timeBg: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
        });
      } else if (allReady) {
        setUrgency({
          border: 'border-emerald-400',
          shadow: 'shadow-xl shadow-emerald-500/20',
          bar: 'bg-emerald-500',
          timeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
        });
      } else if (diffMins >= 15) {
        setUrgency({
          border: 'border-red-500',
          shadow: 'shadow-xl shadow-red-500/30 animate-pulse',
          bar: 'bg-red-600 animate-pulse',
          timeBg: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 animate-pulse'
        });
      } else if (diffMins >= 10) {
        setUrgency({
          border: 'border-orange-400',
          shadow: 'shadow-lg shadow-orange-500/20',
          bar: 'bg-orange-500',
          timeBg: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
        });
      } else {
        setUrgency({
          border: 'border-gray-200 dark:border-gray-700',
          shadow: 'shadow-xl shadow-gray-200/50 dark:shadow-none',
          bar: activeStyle.bg,
          timeBg: 'bg-white/20 text-white backdrop-blur-sm'
        });
      }

      setElapsed(`${diffMins}m ${diffSecs.toString().padStart(2, '0')}s`);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [order.oldestItemTime, order.createdAt, allReady, allCancelled, activeStyle.bg]);

  return (
    <div
      className={`relative flex flex-col rounded-3xl bg-white dark:bg-gray-900 lya:bg-lya-surface border-2 transition-all duration-500 overflow-hidden ${urgency.border} ${urgency.shadow} ${isLeaving ? 'opacity-80 scale-[0.98]' : ''}`}
    >
      {/* BARRA DE PROGRESO DE TIEMPO SUPERIOR */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100 dark:bg-gray-800 z-20">
        <div 
          className={`h-full transition-all duration-1000 ease-linear ${urgency.bar}`} 
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* CABECERA CON COLOR DE CATEGORÍA */}
      <div className={`pt-5 pb-4 px-5 flex justify-between items-center relative z-10 ${activeStyle.bg} text-white`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
            <CategoryIcon size={20} className="text-white" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white drop-shadow-sm">
            {getDisplayTitle()}
          </h3>
        </div>
        
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-xs transition-colors duration-300 shadow-sm ${urgency.timeBg}`}>
          {allCancelled || progress >= 100 ? <Flame size={14} /> : <Timer size={14} />}
          {elapsed}
        </div>
      </div>

      {/* LISTA DE ITEMS */}
      <div className="flex-1 p-3 space-y-2 pointer-events-auto">
        {order.items.slice().sort((a, b) => {
            const idA = String(a.id || '');
            const idB = String(b.id || '');
            return idA.localeCompare(idB, undefined, { numeric: true });
        }).map(item => {
          const isCancelled = item.status === 'CANCELLED';
          const isReady = item.kitchenStatus === 'PREPARING' && !isCancelled;
          const isItemProcessing = processingItems.has(item.id) || localProcessingItems.has(item.id) || isOrderProcessing;
          
          return (
            <motion.div 
              layout="position"
              key={item.id} 
              onClick={() => {
                if (!isItemProcessing && !isCancelled) {
                  handleToggle(item.id);
                }
              }}
              className={`group flex items-start gap-3 p-3 rounded-2xl transition-all duration-300 ${
                isItemProcessing || isCancelled ? 'opacity-70 cursor-wait' : 'cursor-pointer'
              } ${
                isCancelled
                  ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-900/50 border-2 border-dashed'
                  : isReady 
                    ? 'bg-gray-50/50 dark:bg-gray-800/30 opacity-60' 
                    : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 hover:shadow-md hover:border-blue-300 dark:hover:border-gray-500'
              }`}
            >
              <div className={`relative w-9 h-9 mt-0.5 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 shadow-sm ${
                isItemProcessing
                  ? 'bg-gray-200 text-gray-500 dark:bg-gray-700'
                  : isCancelled
                    ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
                    : isReady 
                      ? 'bg-emerald-500 text-white shadow-emerald-500/30 scale-95 rounded-full' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 group-hover:bg-blue-500 group-hover:text-white'
              }`}>
                {isItemProcessing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isCancelled ? (
                  <Trash2 size={18} />
                ) : isReady ? (
                  <Check size={18} strokeWidth={3} />
                ) : (
                  <span className="text-base font-black">{item.qty}</span>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={`text-[15px] sm:text-base font-bold uppercase leading-snug break-words transition-all duration-300 ${
                  isCancelled
                    ? 'line-through text-red-600 dark:text-red-400 decoration-2 decoration-red-400/50'
                    : isReady 
                      ? 'line-through text-gray-400 dark:text-gray-500 decoration-2 decoration-gray-400/50' 
                      : 'text-gray-900 dark:text-white'
                }`}>
                  {item.nombre}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {isCancelled && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-800/50 text-red-600 dark:text-red-400">
                      <AlertCircle size={10} /> Cancelado
                    </span>
                  )}
                  
                  {item.isTakeaway && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                        isCancelled || isReady 
                          ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500' 
                          : 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800/50 text-orange-600 dark:text-orange-400'
                    }`}>
                      <ShoppingBag size={10} /> Empacar Llevar
                    </span>
                  )}
                  
                  {!item.requiereCocina && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                       isCancelled || isReady 
                        ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500' 
                        : 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400'
                    }`}>
                      Solo Servir
                    </span>
                  )}
                </div>
                
                {item.preparaciones && item.preparaciones.length > 0 && (
                  <div className={`mt-2 flex flex-wrap gap-1.5 transition-opacity duration-300 ${isReady || isCancelled ? 'opacity-50' : 'opacity-100'}`}>
                    {item.preparaciones.slice(0, 1).map((prep, idx) => (
                      <React.Fragment key={idx}>
                        {prep.tamano && prep.tamano !== 'Estándar' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 shadow-sm">
                            {prep.tamano}
                          </span>
                        )}
                        {prep.leche && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-900/20 shadow-sm">
                            {prep.leche}
                          </span>
                        )}
                        {prep.extras && prep.extras.length > 0 && (
                          <span className="text-[11px] font-black text-orange-500 dark:text-orange-400 flex items-center before:content-['+'] before:mr-0.5 mt-0.5">
                            {prep.extras.join(', ')}
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* BOTONERA INFERIOR PROTEGIDA */}
      <div className="p-3 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 rounded-b-[1.8rem]">
        {allCancelled ? (
          <button 
            onClick={handleComplete}
            disabled={isOrderProcessing}
            className={`w-full py-4 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white font-black rounded-2xl text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-red-500/25 transition-all border border-transparent dark:border-red-500/50 ${
              isOrderProcessing ? 'opacity-70 cursor-wait shadow-none' : 'active:scale-[0.98]'
            }`}
          >
            {isOrderProcessing ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
            {isOrderProcessing ? 'Descartando...' : 'Descartar Comanda'}
          </button>
        ) : allReady ? (
          <button 
            onClick={handleComplete}
            disabled={isOrderProcessing}
            className={`w-full py-4 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-black rounded-2xl text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all border border-transparent dark:border-emerald-500/50 ${
              isOrderProcessing ? 'opacity-70 cursor-wait shadow-none' : 'active:scale-[0.98]'
            }`}
          >
            {isOrderProcessing ? <Loader2 size={20} className="animate-spin" /> : <BellRing size={20} className="animate-pulse" />}
            {isOrderProcessing ? 'Entregando...' : 'Entregar a Mesero'}
          </button>
        ) : (
          <button 
            onClick={handleMarkAllReady}
            disabled={isOrderProcessing || isMarkingAll}
            className={`w-full py-4 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-black rounded-2xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all border-2 border-gray-200 dark:border-gray-700 shadow-sm ${
              isOrderProcessing || isMarkingAll ? 'opacity-70 cursor-wait' : 'active:scale-[0.98] hover:border-blue-300 dark:hover:border-gray-500'
            }`}
          >
            {isOrderProcessing || isMarkingAll ? <Loader2 size={18} className="animate-spin text-blue-500" /> : <ChefHat size={18} strokeWidth={2.5} />}
            {isOrderProcessing || isMarkingAll ? 'Procesando...' : 'Todo Preparado'}
          </button>
        )}
      </div>
    </div>
  );
};