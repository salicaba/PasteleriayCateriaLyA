// src/modules/kitchen/views/KitchenOrderCard.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, Circle, ChefHat, ShoppingBag, UtensilsCrossed, AlertTriangle } from 'lucide-react';

export const KitchenOrderCard = ({ order, onToggleItem, onComplete, onMarkAllReady }) => {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    const calculateElapsed = () => {
      const start = new Date(order.createdAt).getTime();
      const now = new Date().getTime();
      setElapsedMinutes(Math.floor((now - start) / 60000));
    };
    calculateElapsed();
    const interval = setInterval(calculateElapsed, 10000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  const allItemsReady = order.items.every(item => item.kitchenStatus === 'READY');

  let statusColor = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 lya:bg-lya-surface lya:border-lya-secondary/50 lya:text-lya-text';
  let headerColor = 'bg-emerald-500 text-white lya:bg-lya-secondary lya:text-lya-surface';
  
  if (elapsedMinutes >= 10) {
    statusColor = 'bg-red-500/10 border-red-500/50 text-red-700 lya:bg-lya-surface lya:border-red-500/50 lya:text-lya-text';
    headerColor = 'bg-red-500 animate-pulse';
  } else if (elapsedMinutes >= 5) {
    statusColor = 'bg-yellow-500/10 border-yellow-500/40 text-yellow-700 lya:bg-lya-surface lya:border-yellow-500/50 lya:text-lya-text';
    headerColor = 'bg-yellow-500';
  }

  // Formateo dinámico del título para los pedidos "Para Llevar"
  // Reemplaza "Ticket" o "Ticket #" por "Llevar #", manteniendo el nombre y celular intactos.
  const displayTitle = order.tipo === 'llevar' && typeof order.mesa === 'string'
    ? order.mesa.replace(/Ticket\s*#?/i, 'Llevar #') 
    : order.mesa;

  return (
    <motion.div layout className={`flex flex-col rounded-2xl border ${statusColor} shadow-lg overflow-hidden`}>
      <div className={`p-4 flex flex-col ${headerColor} shadow-sm relative`}>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {order.tipo === 'llevar' ? <ShoppingBag size={20} /> : <UtensilsCrossed size={20} />}
            {/* Usamos el displayTitle formateado */}
            <span className="font-bold text-xl">{displayTitle}</span>
          </div>
          <div className="flex items-center space-x-2 bg-black/20 px-3 py-1.5 rounded-full">
            <Clock size={16} />
            <span className="font-mono font-bold text-sm">{elapsedMinutes}m</span>
          </div>
        </div>

        {/* 🔥 BOTÓN MARCAR TODO CENTRADO */}
        <div className="mt-3 flex justify-center opacity-90 h-8">
          {!allItemsReady && (
            <button 
              onClick={() => onMarkAllReady(order.id)}
              className="text-[10px] font-black uppercase tracking-wider bg-white/30 hover:bg-white/50 px-4 py-1.5 rounded-lg border border-white/20 transition-all active:scale-95 text-white"
            >
              ✔️ Marcar Todo Listo
            </button>
          )}
        </div>
      </div>

      <div className="p-4 flex-1 space-y-4 bg-white/60 dark:bg-gray-900/60 lya:bg-lya-surface">
        {order.items.map(item => (
          <div key={item.id} className="flex flex-col space-y-2">
            <div 
              onClick={() => onToggleItem(order.id, item.id)}
              className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                item.kitchenStatus === 'READY'
                  ? 'bg-emerald-50/50 border-emerald-200 opacity-70 grayscale-[50%]'
                  : 'bg-white border-transparent shadow-sm'
              }`}
            >
              {item.kitchenStatus === 'READY' ? (
                <CheckCircle2 className="text-emerald-500 mt-1" size={24} />
              ) : (
                <Circle className="text-gray-300 mt-1" size={24} />
              )}
              <div className="flex-1">
                <div className={`font-bold text-gray-800 lya:text-lya-text ${item.kitchenStatus === 'READY' ? 'line-through' : ''}`}>
                  <span className="bg-gray-100 px-2 py-0.5 rounded mr-2">{item.qty}</span>
                  {item.nombre}
                </div>
                {item.preparaciones[0] && (
                  <div className="text-xs text-gray-500 mt-1">
                    {item.preparaciones[0].tamano} {item.preparaciones[0].leche ? `- ${item.preparaciones[0].leche}` : ''}
                  </div>
                )}
                {item.preparaciones[0]?.extras.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.preparaciones[0].extras.map(e => (
                      <span key={e} className="text-[10px] font-black uppercase px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded">
                        +{e}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-gray-50 lya:bg-lya-bg border-t border-gray-200">
        <button
          onClick={() => onComplete(order.id)}
          disabled={!allItemsReady}
          className={`w-full py-4 rounded-xl flex items-center justify-center space-x-2 font-bold transition-all ${
            allItemsReady
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg lya:bg-lya-secondary lya:text-lya-surface'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <ChefHat size={22} />
          <span>{allItemsReady ? 'LISTO PARA ENTREGAR' : 'PREPARANDO...'}</span>
        </button>
      </div>
    </motion.div>
  );
};