// src/modules/kitchen/views/KitchenOrderCard.jsx
import React, { useState, useEffect } from 'react';
import { Timer, Check, ChefHat, Flame, BellRing, ShoppingBag, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const KitchenOrderCard = ({ 
  order, 
  onToggleItem, 
  onComplete, 
  onMarkAllReady,
  processingItems = new Set(),
  processingOrders = new Set() 
}) => {
  const [elapsed, setElapsed] = useState('');
  const [progress, setProgress] = useState(0);
  const [urgency, setUrgency] = useState({
    theme: 'normal',
    textGlow: 'from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 lya:from-lya-primary lya:to-lya-secondary',
    border: 'border-gray-100 dark:border-gray-800 lya:border-lya-border/40',
    shadow: 'shadow-lg shadow-gray-200/50 dark:shadow-none lya:shadow-lya-primary/5',
    bar: 'bg-blue-500 lya:bg-lya-primary',
    timeBg: 'bg-blue-50 dark:bg-blue-900/20 lya:bg-lya-primary/10 text-blue-600 dark:text-blue-400 lya:text-lya-primary'
  });

  // 🔥 LÓGICA DE CANCELACIONES Y ESTADOS
  const allCancelled = order.items.every(i => i.status === 'CANCELLED');
  const activeItems = order.items.filter(i => i.status !== 'CANCELLED');
  const allReady = activeItems.length > 0 && activeItems.every(i => i.kitchenStatus === 'PREPARING');
  
  const isOrderProcessing = processingOrders.has(order.id);

  const getDisplayTitle = () => {
    const tipo = order.tipo || 'salon';
    const rawMesa = String(order.mesa || '');
    
    if (tipo === 'llevar' || rawMesa.toUpperCase().includes('LLEVAR')) {
      if (rawMesa.toUpperCase().startsWith('LLEVAR #')) {
        return rawMesa.split(' - ')[0].split(' | ')[0];
      }
      let folio = rawMesa.split(' - ')[0].split(' | ')[0];
      folio = folio.split(' ')[0].replace('#', '');
      if (folio.toLowerCase() === 'para' || folio.toLowerCase() === 'llevar' || folio.toLowerCase() === 's/n') {
        folio = String(order.id).split('-').pop().slice(-4).toUpperCase();
      }
      return `LLEVAR #${folio}`;
    } else {
      if (rawMesa.toUpperCase().startsWith('MESA #')) return rawMesa;
      let tableNum = rawMesa.replace(/Mesa\s*/i, '').replace('#', '').trim();
      return `MESA #${tableNum}`;
    }
  };

  useEffect(() => {
    const calculateTime = () => {
      const start = new Date(order.createdAt);
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
          theme: 'cancelled',
          textGlow: 'from-red-600 to-red-800 dark:from-red-400 dark:to-red-600 lya:from-red-500 lya:to-red-700',
          border: 'border-red-500 dark:border-red-700 lya:border-red-500',
          shadow: 'shadow-xl shadow-red-500/30 dark:shadow-red-900/50 animate-pulse',
          bar: 'bg-red-600 lya:bg-red-500 animate-pulse',
          timeBg: 'bg-red-100 dark:bg-red-900/40 lya:bg-red-500/20 text-red-700 dark:text-red-400 lya:text-red-400'
        });
      } else if (allReady) {
        setUrgency({
          theme: 'ready',
          textGlow: 'from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-400 lya:from-emerald-400 lya:to-emerald-600',
          border: 'border-emerald-400 dark:border-emerald-500/50 lya:border-emerald-500/50',
          shadow: 'shadow-xl shadow-emerald-500/20 dark:shadow-emerald-900/40 lya:shadow-emerald-500/20',
          bar: 'bg-emerald-500 lya:bg-emerald-500',
          timeBg: 'bg-emerald-100 dark:bg-emerald-900/40 lya:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 lya:text-emerald-400'
        });
      } else if (diffMins >= 15) {
        setUrgency({
          theme: 'critical',
          textGlow: 'from-red-600 to-rose-600 dark:from-red-400 dark:to-rose-400 lya:from-red-400 lya:to-rose-400',
          border: 'border-red-500 dark:border-red-500/70 lya:border-red-500/70',
          shadow: 'shadow-xl shadow-red-500/30 dark:shadow-red-900/50 animate-pulse',
          bar: 'bg-red-600 animate-pulse',
          timeBg: 'bg-red-100 dark:bg-red-900/40 lya:bg-red-500/20 text-red-700 dark:text-red-400 lya:text-red-400 animate-pulse'
        });
      } else if (diffMins >= 10) {
        setUrgency({
          theme: 'warning',
          textGlow: 'from-orange-500 to-amber-500 dark:from-orange-400 dark:to-amber-400 lya:from-amber-400 lya:to-orange-400',
          border: 'border-orange-300 dark:border-orange-700/50 lya:border-amber-500/50',
          shadow: 'shadow-lg shadow-orange-500/10 dark:shadow-none lya:shadow-amber-500/10',
          bar: 'bg-orange-500 lya:bg-amber-500',
          timeBg: 'bg-orange-50 dark:bg-orange-900/30 lya:bg-amber-500/20 text-orange-600 dark:text-orange-400 lya:text-amber-500'
        });
      } else {
        setUrgency({
          theme: 'normal',
          textGlow: 'from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 lya:from-lya-text lya:to-lya-text/80',
          border: 'border-gray-200 dark:border-gray-800 lya:border-lya-border/40',
          shadow: 'shadow-lg shadow-gray-200/50 dark:shadow-none lya:shadow-lya-primary/5',
          bar: 'bg-blue-500 lya:bg-lya-primary',
          timeBg: 'bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-gray-700 dark:text-gray-300 lya:text-lya-text'
        });
      }

      setElapsed(`${diffMins}m ${diffSecs.toString().padStart(2, '0')}s`);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [order.createdAt, allReady, allCancelled]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={`relative flex flex-col rounded-[2rem] bg-white dark:bg-gray-900 lya:bg-lya-surface border-2 transition-all duration-500 overflow-hidden ${urgency.border} ${urgency.shadow}`}
    >
      {/* BARRA DE PROGRESO */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg">
        <div 
          className={`h-full transition-all duration-1000 ease-linear ${urgency.bar}`} 
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="pt-5 pb-3 px-5 flex justify-between items-center relative z-10">
        <h3 className={`text-xl sm:text-2xl font-black uppercase tracking-tighter bg-gradient-to-br bg-clip-text text-transparent ${urgency.textGlow}`}>
          {getDisplayTitle()}
        </h3>
        
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-xs transition-colors duration-300 shadow-sm ${urgency.timeBg}`}>
          {urgency.theme === 'critical' || urgency.theme === 'cancelled' ? <Flame size={14} /> : <Timer size={14} />}
          {elapsed}
        </div>
      </div>

      <div className="flex-1 px-3 pb-3 space-y-2">
        {order.items.map(item => {
          const isCancelled = item.status === 'CANCELLED';
          const isReady = item.kitchenStatus === 'PREPARING' && !isCancelled;
          const isItemProcessing = processingItems.has(item.id) || isOrderProcessing;
          
          return (
            <motion.div 
              layout
              key={item.id} 
              onClick={() => {
                if (!isItemProcessing && !isCancelled) onToggleItem(order.id, item.id);
              }}
              className={`group flex items-start gap-3 p-3 rounded-2xl transition-all duration-300 ${
                isItemProcessing || isCancelled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
              } ${
                isCancelled
                  ? 'bg-red-50/50 dark:bg-red-900/10 lya:bg-red-500/5 border-red-200 dark:border-red-900/50 lya:border-red-500/30 border-2 border-dashed'
                  : isReady 
                    ? 'bg-gray-50/50 dark:bg-gray-800/30 lya:bg-lya-bg/30 opacity-60' 
                    : 'bg-white dark:bg-gray-800 lya:bg-lya-bg border border-gray-100 dark:border-gray-700/50 lya:border-lya-border/40 hover:shadow-sm hover:border-blue-200 dark:hover:border-gray-600 lya:hover:border-lya-primary/40'
              }`}
            >
              <div className={`relative w-8 h-8 mt-0.5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 shadow-sm ${
                isItemProcessing
                  ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 lya:bg-lya-border/40'
                  : isCancelled
                    ? 'bg-red-100 dark:bg-red-900/50 lya:bg-red-500/20 text-red-600 dark:text-red-400 lya:text-red-500'
                    : isReady 
                      ? 'bg-emerald-500 text-white shadow-emerald-500/30 scale-95' 
                      : 'bg-gray-100 dark:bg-gray-700 lya:bg-lya-surface text-gray-800 dark:text-gray-200 lya:text-lya-primary group-hover:bg-blue-100 dark:group-hover:bg-gray-600 lya:group-hover:bg-lya-primary/20'
              }`}>
                {isItemProcessing ? (
                  <Loader2 size={16} className="animate-spin text-orange-500 lya:text-lya-primary" />
                ) : isCancelled ? (
                  <Trash2 size={16} />
                ) : isReady ? (
                  <Check size={16} strokeWidth={3} />
                ) : (
                  <span className="text-sm font-black">{item.qty}</span>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={`text-sm sm:text-[15px] font-bold uppercase leading-snug break-words transition-all duration-300 ${
                  isCancelled
                    ? 'line-through text-red-600 dark:text-red-400 lya:text-red-500 decoration-2 decoration-red-400/50'
                    : isReady 
                      ? 'line-through text-gray-400 dark:text-gray-500 lya:text-lya-text/40 decoration-2 decoration-gray-400/50' 
                      : 'text-gray-800 dark:text-gray-100 lya:text-lya-text'
                }`}>
                  {item.nombre}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {/* BUBBLE CANCELADO */}
                  {isCancelled && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border bg-red-100 dark:bg-red-900/40 lya:bg-red-500/10 border-red-300 dark:border-red-800/50 lya:border-red-500/30 text-red-600 dark:text-red-400 lya:text-red-500">
                      <AlertCircle size={10} /> Cancelado
                    </span>
                  )}
                  
                  {item.isTakeaway && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                        isCancelled || isReady 
                          ? 'bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg border-gray-200 dark:border-gray-700 lya:border-lya-border/40 text-gray-500 lya:text-lya-text/50' 
                          : 'bg-orange-50 dark:bg-orange-900/30 lya:bg-lya-secondary/10 border-orange-200 dark:border-orange-800/50 lya:border-lya-secondary/30 text-orange-600 dark:text-orange-400 lya:text-lya-secondary'
                    }`}>
                      <ShoppingBag size={10} /> Empacar Llevar
                    </span>
                  )}
                  
                  {!item.requiereCocina && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                       isCancelled || isReady 
                        ? 'bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg border-gray-200 dark:border-gray-700 lya:border-lya-border/40 text-gray-500 lya:text-lya-text/50' 
                        : 'bg-blue-50 dark:bg-blue-900/30 lya:bg-blue-500/10 border-blue-200 dark:border-blue-800/50 lya:border-blue-500/30 text-blue-600 dark:text-blue-400 lya:text-blue-500'
                    }`}>
                      Solo Servir
                    </span>
                  )}
                </div>
                
                {item.preparaciones && item.preparaciones.length > 0 && (
                  <div className={`mt-1.5 flex flex-wrap gap-1 transition-opacity duration-300 ${isReady || isCancelled ? 'opacity-50' : 'opacity-100'}`}>
                    {item.preparaciones.slice(0, 1).map((prep, idx) => (
                      <React.Fragment key={idx}>
                        {prep.tamano && prep.tamano !== 'Estándar' && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 text-gray-500 dark:text-gray-400 lya:text-lya-text/60">
                            {prep.tamano}
                          </span>
                        )}
                        {prep.leche && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border border-blue-200 dark:border-blue-900/50 lya:border-lya-secondary/40 text-blue-600 dark:text-blue-400 lya:text-lya-secondary bg-blue-50/50 dark:bg-blue-900/10 lya:bg-lya-secondary/5">
                            {prep.leche}
                          </span>
                        )}
                        {prep.extras && prep.extras.length > 0 && (
                          <span className="text-[10px] font-bold text-orange-500 dark:text-orange-400 lya:text-lya-primary italic flex items-center before:content-['+'] before:mr-0.5">
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

      <div className="p-3 bg-transparent pt-0">
        {allCancelled ? (
          <button 
            onClick={() => onComplete(order.id)}
            disabled={isOrderProcessing}
            className={`w-full py-3.5 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 lya:bg-red-500 lya:hover:bg-red-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-red-500/25 transition-all border border-transparent dark:border-red-500/50 ${
              isOrderProcessing ? 'opacity-70 cursor-wait shadow-none' : 'active:scale-[0.98]'
            }`}
          >
            {isOrderProcessing ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            {isOrderProcessing ? 'Descartando...' : 'Descartar Comanda'}
          </button>
        ) : allReady ? (
          <button 
            onClick={() => onComplete(order.id)}
            disabled={isOrderProcessing}
            className={`w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 lya:shadow-lya-primary/30 transition-all border border-transparent dark:border-emerald-500/50 lya:border-lya-primary ${
              isOrderProcessing ? 'opacity-70 cursor-wait shadow-none' : 'active:scale-[0.98]'
            }`}
          >
            {isOrderProcessing ? <Loader2 size={18} className="animate-spin" /> : <BellRing size={18} className="animate-pulse" />}
            {isOrderProcessing ? 'Procesando...' : 'Entregar'}
          </button>
        ) : (
          <button 
            onClick={() => onMarkAllReady(order.id)}
            disabled={isOrderProcessing}
            className={`w-full py-3.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 lya:bg-lya-surface lya:hover:bg-lya-border/20 text-gray-600 dark:text-gray-300 lya:text-lya-text font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all border-2 border-gray-200 dark:border-gray-700 lya:border-lya-border/40 ${
              isOrderProcessing ? 'opacity-70 cursor-wait' : 'active:scale-[0.98]'
            }`}
          >
            {isOrderProcessing ? <Loader2 size={16} className="animate-spin text-orange-500 lya:text-lya-primary" /> : <ChefHat size={16} strokeWidth={2.5} />}
            {isOrderProcessing ? 'Procesando...' : 'Todo Preparado'}
          </button>
        )}
      </div>
    </motion.div>
  );
}