import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, Circle, ChefHat, User } from 'lucide-react';

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

  // Validar si TODAS las preparaciones de TODOS los items están listas
  const allItemsReady = order.items.every(item => 
    item.preparaciones.every(prep => prep.isReady)
  );

  let statusColor = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400';
  let headerColor = 'bg-emerald-500 text-white';
  let isUrgent = false;

  if (elapsedMinutes >= 10) {
    statusColor = 'bg-red-500/10 border-red-500/50 text-red-700 dark:text-red-400';
    headerColor = 'bg-red-500 text-white animate-pulse';
    isUrgent = true;
  } else if (elapsedMinutes >= 5) {
    statusColor = 'bg-yellow-500/10 border-yellow-500/40 text-yellow-700 dark:text-yellow-400';
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
      {/* Cabecera */}
      <div className={`p-4 flex flex-col ${headerColor} shadow-sm z-10 relative`}>
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="font-bold text-xl leading-none">{order.mesa}</span>
            <span className="text-xs font-bold tracking-widest uppercase opacity-90 mt-1.5 bg-black/20 self-start px-2 py-0.5 rounded-md">
              Tanda {order.batch}
            </span>
          </div>
          <div className="flex items-center space-x-2 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-inner">
            <Clock size={16} className={isUrgent ? 'animate-spin-slow' : ''} />
            <span className="font-mono font-bold text-sm">{elapsedMinutes}m</span>
          </div>
        </div>
        <div className="mt-3 flex items-center space-x-1 text-sm font-medium opacity-90">
          <User size={14} />
          <span>{order.mesero}</span>
        </div>
      </div>

      {/* Lista de Platillos (Agrupados por Item -> Preparaciones) */}
      <div className="p-4 flex-1 flex flex-col space-y-4 bg-white/60 dark:bg-gray-900/60 z-0">
        {order.items.map(item => (
          <div key={item.id} className="flex flex-col space-y-2">
            
            {/* Título del Grupo (Ej. 2x Latte Caliente) */}
            <div className="font-bold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-1 flex items-center">
              <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded text-sm mr-2">
                {item.qty}
              </span>
              {item.nombre}
            </div>

            {/* Desglose de Preparaciones */}
            {item.preparaciones.map((prep, index) => (
              <motion.div
                key={prep.idPrep}
                layout
                onClick={() => onToggleItem(order.id, item.id, prep.idPrep)}
                className={`flex items-start space-x-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border border-transparent ml-2 ${
                  prep.isReady
                    ? 'bg-gray-100/50 dark:bg-gray-800/30 opacity-60 grayscale-[50%]'
                    : 'bg-white dark:bg-gray-800 shadow-sm hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700'
                }`}
              >
                <motion.div whileTap={{ scale: 0.8 }} className="mt-0.5">
                  {prep.isReady ? (
                    <CheckCircle2 className="text-emerald-500 drop-shadow-sm" size={24} />
                  ) : (
                    <Circle className="text-gray-300 dark:text-gray-600" size={24} />
                  )}
                </motion.div>
                <div className="flex-1 text-sm">
                  <div className={`font-semibold text-gray-700 dark:text-gray-200 ${prep.isReady ? 'line-through' : ''}`}>
                    Variante {index + 1}: {prep.tamano} {prep.leche ? `- ${prep.leche}` : ''}
                  </div>
                  {prep.extras && prep.extras.length > 0 && (
                    <div className="text-orange-500 dark:text-orange-400 font-medium mt-1 text-xs">
                      + Extras: {prep.extras.join(', ')}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer / Botón */}
      <div className="p-4 bg-white/80 dark:bg-gray-900/80 border-t border-gray-200/50 dark:border-gray-800/50">
        <button
          onClick={() => onComplete(order.id)}
          disabled={!allItemsReady}
          className={`w-full py-3.5 rounded-xl flex items-center justify-center space-x-2 font-bold transition-all duration-300 ${
            allItemsReady
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 transform hover:-translate-y-0.5'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
          }`}
        >
          <ChefHat size={22} />
          <span className="tracking-wide">{allItemsReady ? 'DESPACHAR TANDA' : 'PREPARANDO...'}</span>
        </button>
      </div>
    </motion.div>
  );
};