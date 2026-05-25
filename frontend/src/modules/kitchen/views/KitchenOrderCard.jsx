// src/modules/kitchen/views/KitchenOrderCard.jsx
import React, { useState, useEffect } from 'react';
import { Timer, Check, ChefHat, CheckCircle, Flame, BellRing } from 'lucide-react';
import { motion } from 'framer-motion';

export const KitchenOrderCard = ({ order, onToggleItem, onComplete, onMarkAllReady }) => {
  const [elapsed, setElapsed] = useState('');
  const [progress, setProgress] = useState(0);
  const [urgency, setUrgency] = useState({
    theme: 'normal',
    textGlow: 'from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 lya:from-lya-primary lya:to-lya-secondary',
    border: 'border-gray-200 dark:border-gray-800 lya:border-lya-border/40',
    shadow: 'shadow-lg shadow-gray-200/50 dark:shadow-none lya:shadow-lya-primary/5',
    bar: 'bg-blue-500 lya:bg-lya-primary',
    timeBg: 'bg-blue-50 dark:bg-blue-900/20 lya:bg-lya-primary/10 text-blue-600 dark:text-blue-400 lya:text-lya-primary'
  });

  const allReady = order.items.every(i => i.kitchenStatus === 'PREPARING');

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
      
      const maxSecs = 15 * 60;
      const currentProgress = Math.min((totalSecs / maxSecs) * 100, 100);
      setProgress(currentProgress);

      if (allReady) {
        setUrgency({
          theme: 'ready',
          textGlow: 'from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-400',
          border: 'border-emerald-400 dark:border-emerald-500/50',
          shadow: 'shadow-xl shadow-emerald-500/20 dark:shadow-emerald-900/40',
          bar: 'bg-emerald-500',
          timeBg: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
        });
      } else if (diffMins >= 15) {
        setUrgency({
          theme: 'critical',
          textGlow: 'from-red-600 to-rose-600 dark:from-red-400 dark:to-rose-400',
          border: 'border-red-500 dark:border-red-500/70',
          shadow: 'shadow-xl shadow-red-500/30 dark:shadow-red-900/50 animate-pulse',
          bar: 'bg-red-600 animate-pulse',
          timeBg: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 animate-pulse'
        });
      } else if (diffMins >= 10) {
        setUrgency({
          theme: 'warning',
          textGlow: 'from-orange-500 to-amber-500 dark:from-orange-400 dark:to-amber-400',
          border: 'border-orange-300 dark:border-orange-700/50',
          shadow: 'shadow-lg shadow-orange-500/10 dark:shadow-none',
          bar: 'bg-orange-500',
          timeBg: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
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
  }, [order.createdAt, allReady]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={`relative flex flex-col rounded-[1.5rem] bg-white dark:bg-gray-900 lya:bg-lya-surface border-2 transition-all duration-500 overflow-hidden ${urgency.border} ${urgency.shadow}`}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg">
        <div 
          className={`h-full transition-all duration-1000 ease-linear ${urgency.bar}`} 
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* CABECERA ULTRA COMPACTA */}
      <div className="pt-4 pb-3 px-4 flex justify-between items-center relative z-10">
        <h3 className={`text-xl sm:text-2xl font-black uppercase tracking-tighter bg-gradient-to-br bg-clip-text text-transparent ${urgency.textGlow}`}>
          {getDisplayTitle()}
        </h3>
        
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-xs transition-colors duration-300 ${urgency.timeBg}`}>
          {urgency.theme === 'critical' ? <Flame size={14} /> : <Timer size={14} />}
          {elapsed}
        </div>
      </div>

      <div className="flex-1 px-2.5 pb-2.5 space-y-2">
        {order.items.map(item => {
          const isReady = item.kitchenStatus === 'PREPARING';
          
          return (
            <motion.div 
              layout
              key={item.id} 
              onClick={() => onToggleItem(order.id, item.id)}
              className={`cursor-pointer group flex items-start gap-3 p-2.5 rounded-xl transition-all duration-300 ${
                isReady 
                  ? 'bg-gray-50/50 dark:bg-gray-800/30 opacity-60' 
                  : 'bg-white dark:bg-gray-800 lya:bg-lya-surface border border-gray-100 dark:border-gray-700/50 lya:border-lya-border/40 hover:shadow-sm hover:border-blue-200 dark:hover:border-gray-600 lya:hover:border-lya-primary/40'
              }`}
            >
              {/* BURBUJA DE CANTIDAD MÁS PEQUEÑA */}
              <div className={`relative w-8 h-8 mt-0.5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                isReady 
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-95' 
                  : 'bg-gray-100 dark:bg-gray-700 lya:bg-lya-bg text-gray-800 dark:text-gray-200 lya:text-lya-primary group-hover:bg-blue-100 dark:group-hover:bg-gray-600 lya:group-hover:bg-lya-primary/20'
              }`}>
                {isReady ? (
                  <Check size={16} strokeWidth={3} />
                ) : (
                  <span className="text-sm font-black">{item.qty}</span>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                {/* NOMBRE DEL ITEM SIN TRUNCAR (Baja de línea si es largo) */}
                <p className={`text-sm sm:text-[15px] font-bold uppercase leading-snug break-words transition-all duration-300 ${
                  isReady 
                    ? 'line-through text-gray-400 dark:text-gray-500 decoration-2 decoration-gray-400/50' 
                    : 'text-gray-800 dark:text-gray-100 lya:text-lya-text'
                }`}>
                  {item.nombre}
                </p>
                
                {item.preparaciones && item.preparaciones.length > 0 && (
                  <div className={`mt-1 flex flex-wrap gap-1 transition-opacity duration-300 ${isReady ? 'opacity-40' : 'opacity-100'}`}>
                    {item.preparaciones.map((prep, idx) => (
                      <React.Fragment key={prep.idPrep}>
                        {prep.tamano && prep.tamano !== 'Estándar' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                            {prep.tamano}
                          </span>
                        )}
                        {prep.leche && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400">
                            {prep.leche}
                          </span>
                        )}
                        {prep.extras && prep.extras.length > 0 && (
                          <span className="text-[10px] font-bold text-orange-500 dark:text-orange-400 italic flex items-center before:content-['+'] before:mr-0.5">
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

      {/* BOTONES MÁS DELGADOS */}
      <div className="p-2.5 bg-transparent pt-0">
        {allReady ? (
          <button 
            onClick={() => onComplete(order.id)}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 transition-all active:scale-[0.98]"
          >
            <BellRing size={16} className="animate-pulse" /> Entregar
          </button>
        ) : (
          <button 
            onClick={() => onMarkAllReady(order.id)}
            className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 lya:bg-lya-bg lya:hover:opacity-80 text-gray-600 dark:text-gray-300 lya:text-lya-text font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] border border-gray-200 dark:border-gray-700 lya:border-lya-border/40"
          >
            <ChefHat size={14} /> Todo Preparado
          </button>
        )}
      </div>
    </motion.div>
  );
}