// src/modules/kitchen/views/KitchenOrderCard.jsx
import React, { useState, useEffect } from 'react';
import { Timer, Check, ChefHat, CheckCircle, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

export const KitchenOrderCard = ({ order, onToggleItem, onComplete, onMarkAllReady }) => {
  const [elapsed, setElapsed] = useState('');
  const [progress, setProgress] = useState(0);
  const [urgency, setUrgency] = useState({
    theme: 'normal', // normal, warning, critical, ready
    textGlow: 'from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 lya:from-lya-primary lya:to-lya-secondary',
    border: 'border-gray-200 dark:border-gray-800 lya:border-lya-border/40',
    shadow: 'shadow-xl shadow-gray-200/50 dark:shadow-none lya:shadow-lya-primary/5',
    bar: 'bg-blue-500 lya:bg-lya-primary',
    timeBg: 'bg-blue-50 dark:bg-blue-900/20 lya:bg-lya-primary/10 text-blue-600 dark:text-blue-400 lya:text-lya-primary'
  });

  const allReady = order.items.every(i => i.kitchenStatus === 'READY');

  // Lógica del cronómetro y la barra de progreso
  useEffect(() => {
    const calculateTime = () => {
      const start = new Date(order.createdAt);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      const totalSecs = Math.floor(diffMs / 1000);
      
      // Calculamos el progreso basado en 15 minutos (900 segundos)
      const maxSecs = 15 * 60;
      const currentProgress = Math.min((totalSecs / maxSecs) * 100, 100);
      setProgress(currentProgress);

      if (allReady) {
        setUrgency({
          theme: 'ready',
          textGlow: 'from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-400',
          border: 'border-emerald-400 dark:border-emerald-500/50',
          shadow: 'shadow-2xl shadow-emerald-500/20 dark:shadow-emerald-900/40',
          bar: 'bg-emerald-500',
          timeBg: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
        });
      } else if (diffMins >= 15) {
        setUrgency({
          theme: 'critical',
          textGlow: 'from-red-600 to-rose-600 dark:from-red-400 dark:to-rose-400',
          border: 'border-red-500 dark:border-red-500/70',
          shadow: 'shadow-2xl shadow-red-500/30 dark:shadow-red-900/50 animate-pulse',
          bar: 'bg-red-600 animate-pulse',
          timeBg: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 animate-pulse'
        });
      } else if (diffMins >= 10) {
        setUrgency({
          theme: 'warning',
          textGlow: 'from-orange-500 to-amber-500 dark:from-orange-400 dark:to-amber-400',
          border: 'border-orange-300 dark:border-orange-700/50',
          shadow: 'shadow-xl shadow-orange-500/10 dark:shadow-none',
          bar: 'bg-orange-500',
          timeBg: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
        });
      } else {
        setUrgency({
          theme: 'normal',
          textGlow: 'from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 lya:from-lya-text lya:to-lya-text/80',
          border: 'border-gray-200 dark:border-gray-800 lya:border-lya-border/40',
          shadow: 'shadow-xl shadow-gray-200/50 dark:shadow-none lya:shadow-lya-primary/5',
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
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={`relative flex flex-col rounded-[2rem] bg-white dark:bg-gray-900 lya:bg-lya-surface border-2 transition-all duration-500 overflow-hidden ${urgency.border} ${urgency.shadow}`}
    >
      {/* BARRA DE PROGRESO DE TIEMPO (Top) */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg">
        <div 
          className={`h-full transition-all duration-1000 ease-linear ${urgency.bar}`} 
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* --- ENCABEZADO "NEO" --- */}
      <div className="pt-6 pb-4 px-5 flex justify-between items-center relative z-10">
        <h3 className={`text-3xl sm:text-4xl font-black uppercase tracking-tighter bg-gradient-to-br bg-clip-text text-transparent ${urgency.textGlow}`}>
          {order.mesa}
        </h3>
        
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-sm sm:text-base transition-colors duration-300 ${urgency.timeBg}`}>
          {urgency.theme === 'critical' ? <Flame size={18} /> : <Timer size={18} />}
          {elapsed}
        </div>
      </div>

      {/* --- LISTA DE PRODUCTOS --- */}
      <div className="flex-1 px-3 pb-3 space-y-2">
        {order.items.map(item => {
          const isReady = item.kitchenStatus === 'READY';
          
          return (
            <motion.div 
              layout
              key={item.id} 
              onClick={() => onToggleItem(order.id, item.id)}
              className={`cursor-pointer group flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 ${
                isReady 
                  ? 'bg-gray-50/50 dark:bg-gray-800/30 opacity-60' 
                  : 'bg-white dark:bg-gray-800 lya:bg-lya-surface border border-gray-100 dark:border-gray-700/50 lya:border-lya-border/40 hover:shadow-md hover:border-blue-200 dark:hover:border-gray-600 lya:hover:border-lya-primary/40'
              }`}
            >
              {/* Círculo Checkbox Morphs */}
              <div className={`relative w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                isReady 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-95' 
                  : 'bg-gray-100 dark:bg-gray-700 lya:bg-lya-bg text-gray-800 dark:text-gray-200 lya:text-lya-primary group-hover:bg-blue-100 dark:group-hover:bg-gray-600 lya:group-hover:bg-lya-primary/20'
              }`}>
                {isReady ? (
                  <Check size={20} strokeWidth={3} />
                ) : (
                  <span className="text-lg font-black">{item.qty}</span>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={`text-lg font-extrabold uppercase truncate transition-all duration-300 ${
                  isReady 
                    ? 'line-through text-gray-400 dark:text-gray-500 decoration-2 decoration-gray-400/50' 
                    : 'text-gray-800 dark:text-gray-100 lya:text-lya-text'
                }`}>
                  {item.nombre}
                </p>
                
                {/* Variantes en estilo "Píldoras Ghost" */}
                {item.preparaciones && item.preparaciones.length > 0 && (
                  <div className={`mt-1 flex flex-wrap gap-1.5 transition-opacity duration-300 ${isReady ? 'opacity-40' : 'opacity-100'}`}>
                    {item.preparaciones.map((prep, idx) => (
                      <React.Fragment key={prep.idPrep}>
                        {prep.tamano && prep.tamano !== 'Estándar' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                            {prep.tamano}
                          </span>
                        )}
                        {prep.leche && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400">
                            {prep.leche}
                          </span>
                        )}
                        {prep.extras && prep.extras.length > 0 && (
                          <span className="text-[11px] font-bold text-orange-500 dark:text-orange-400 italic flex items-center before:content-['+'] before:mr-1">
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

      {/* --- BOTÓN DE ACCIÓN FLOTANTE --- */}
      <div className="p-3 bg-transparent">
        {allReady ? (
          <button 
            onClick={() => onComplete(order.id)}
            className="w-full py-4 bg-gradient-to-r from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 text-white font-black rounded-[1rem] text-sm sm:text-base uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98]"
          >
            <CheckCircle size={22} /> Entregar Pedido
          </button>
        ) : (
          <button 
            onClick={() => onMarkAllReady(order.id)}
            className="w-full py-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 lya:bg-lya-bg lya:hover:opacity-80 text-gray-600 dark:text-gray-300 lya:text-lya-text font-bold rounded-[1rem] text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-gray-200 dark:border-gray-700 lya:border-lya-border/40"
          >
            <ChefHat size={18} /> Marcar Todo Listo
          </button>
        )}
      </div>
    </motion.div>
  );
}