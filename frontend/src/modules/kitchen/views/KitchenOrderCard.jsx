import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, Circle, ChefHat, User, ShoppingBag, UtensilsCrossed, AlertTriangle } from 'lucide-react';

export const KitchenOrderCard = ({ order, onToggleItem, onComplete }) => {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    const calculateElapsed = () => {
      const start = new Date(order.createdAt).getTime();
      const now = new Date().getTime();
      const diffMins = Math.floor((now - start) / 60000);
      setElapsedMinutes(diffMins);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 10000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  // Validar si TODAS las preparaciones están listas
  const allItemsReady = order.items.every(item => 
    item.preparaciones.every(prep => prep.isReady)
  );

  // Colores por defecto (A tiempo)
  let statusColor = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 lya:bg-lya-surface lya:border-lya-secondary/50 lya:text-lya-text';
  let headerColor = 'bg-emerald-500 text-white lya:bg-lya-secondary lya:text-lya-surface';
  let isUrgent = false;

  // Alertas de tiempo (Mantienen semántica de urgencia incluso en Tema LyA)
  if (elapsedMinutes >= 10) {
    statusColor = 'bg-red-500/10 border-red-500/50 text-red-700 dark:text-red-400 lya:bg-lya-surface lya:border-red-500/50 lya:text-lya-text';
    headerColor = 'bg-red-500 text-white animate-pulse';
    isUrgent = true;
  } else if (elapsedMinutes >= 5) {
    statusColor = 'bg-yellow-500/10 border-yellow-500/40 text-yellow-700 dark:text-yellow-400 lya:bg-lya-surface lya:border-yellow-500/50 lya:text-lya-text';
    headerColor = 'bg-yellow-500 text-white';
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`flex flex-col rounded-2xl border ${statusColor} shadow-lg overflow-hidden backdrop-blur-md`}
    >
      {/* --- CABECERA MEJORADA --- */}
      <div className={`p-4 flex flex-col ${headerColor} shadow-sm z-10 relative`}>
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {/* MEJORA 1: Icono de contexto (Salón vs Llevar) */}
              {order.tipo === 'llevar' ? <ShoppingBag size={20} className="opacity-90" /> : <UtensilsCrossed size={20} className="opacity-90" />}
              <span className="font-bold text-xl leading-none">{order.mesa}</span>
            </div>
            <span className="text-xs font-bold tracking-widest uppercase opacity-90 mt-2 bg-black/20 self-start px-2 py-0.5 rounded-md lya:border lya:border-white/20">
              Tanda {order.batch}
            </span>
          </div>
          <div className="flex items-center space-x-2 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-inner lya:border lya:border-white/20">
            <Clock size={16} className={isUrgent ? 'animate-spin-slow' : ''} />
            <span className="font-mono font-bold text-sm">{elapsedMinutes}m</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between opacity-90">
          <div className="flex items-center space-x-1 text-sm font-medium lya:font-bold">
            <User size={14} />
            <span>{order.mesero}</span>
          </div>
          {/* Indicador extra si es para llevar */}
          {order.tipo === 'llevar' && (
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded lya:border lya:border-white/20">
              Empacar
            </span>
          )}
        </div>
      </div>

      {/* --- LISTA DE PLATILLOS --- */}
      <div className="p-4 flex-1 flex flex-col space-y-4 bg-white/60 dark:bg-gray-900/60 lya:bg-lya-surface z-0">
        {order.items.map(item => (
          <div key={item.id} className="flex flex-col space-y-2">
            
            <div className="font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text border-b border-gray-200 dark:border-gray-700 lya:border-lya-border/30 pb-1 flex items-center lya:uppercase lya:tracking-tight">
              <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 lya:bg-lya-bg lya:text-lya-text lya:border lya:border-lya-border/50 px-2 py-0.5 rounded text-sm mr-2 shadow-sm">
                {item.qty}
              </span>
              {item.nombre}
            </div>

            {item.preparaciones.map((prep, index) => (
              <motion.div
                key={prep.idPrep}
                layout
                onClick={() => onToggleItem(order.id, item.id, prep.idPrep)}
                className={`flex items-start space-x-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border ml-2 ${
                  prep.isReady
                    ? 'bg-gray-100/50 dark:bg-gray-800/30 lya:bg-lya-bg/50 border-transparent opacity-60 grayscale-[50%]'
                    : 'bg-white dark:bg-gray-800 lya:bg-lya-bg border-transparent lya:border-lya-border/20 shadow-sm hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 lya:hover:border-lya-secondary/50'
                }`}
              >
                <motion.div whileTap={{ scale: 0.8 }} className="mt-0.5">
                  {prep.isReady ? (
                    <CheckCircle2 className="text-emerald-500 lya:text-lya-secondary drop-shadow-sm" size={24} />
                  ) : (
                    <Circle className="text-gray-300 dark:text-gray-600 lya:text-lya-text/30" size={24} />
                  )}
                </motion.div>
                <div className="flex-1 text-sm">
                  <div className={`font-semibold text-gray-700 dark:text-gray-200 lya:text-lya-text ${prep.isReady ? 'line-through lya:opacity-70' : ''}`}>
                    Variante {index + 1}: {prep.tamano} {prep.leche ? `- ${prep.leche}` : ''}
                  </div>
                  
                  {/* MEJORA 2: Resaltar los extras o notas especiales visualmente */}
                  {prep.extras && prep.extras.length > 0 && (
                    <div className={`mt-1.5 flex items-start gap-1 p-1.5 rounded-md lya:rounded-xl ${prep.isReady ? 'bg-transparent' : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/50 lya:bg-lya-primary/10 lya:border-lya-primary/20'}`}>
                      {!prep.isReady && <AlertTriangle size={14} className="text-orange-500 lya:text-lya-primary mt-0.5 shrink-0" />}
                      <span className={`font-bold text-xs leading-tight lya:uppercase lya:tracking-wider lya:font-black ${prep.isReady ? 'text-orange-600 dark:text-orange-400 lya:text-lya-text' : 'text-orange-600 dark:text-orange-400 lya:text-lya-primary'}`}>
                        {prep.extras.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ))}
      </div>

      {/* --- FOOTER --- */}
      <div className="p-4 bg-white/80 dark:bg-gray-900/80 lya:bg-lya-bg border-t border-gray-200/50 dark:border-gray-800/50 lya:border-lya-border/30">
        <button
          onClick={() => onComplete(order.id)}
          disabled={!allItemsReady}
          className={`w-full py-3.5 rounded-xl flex items-center justify-center space-x-2 font-bold transition-all duration-300 lya:border-2 ${
            allItemsReady
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 transform hover:-translate-y-0.5 lya:bg-lya-secondary lya:border-lya-secondary lya:text-lya-surface lya:shadow-lya-secondary/30 lya:hover:opacity-90'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed lya:bg-lya-surface lya:border-lya-border/40 lya:text-lya-text/40'
          }`}
        >
          <ChefHat size={22} />
          <span className="tracking-wide lya:tracking-widest">{allItemsReady ? 'DESPACHAR TANDA' : 'PREPARANDO...'}</span>
        </button>
      </div>
    </motion.div>
  );
};