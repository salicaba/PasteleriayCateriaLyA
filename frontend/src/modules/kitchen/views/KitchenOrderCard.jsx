import React from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export const KitchenOrderCard = ({ order, onComplete }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.3 } }}
      // CARD BG: Blanco en light, Gris 800 en dark
      className="bg-white dark:bg-gray-800 border-l-4 border-l-brand-primary rounded-xl shadow-lg dark:shadow-gray-900/30 overflow-hidden flex flex-col min-w-[300px] max-w-[350px] transition-colors"
    >
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-700/50 p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
        <div>
          <h3 className="font-black text-xl text-gray-800 dark:text-white">{order.mesa}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">#{order.id} • {order.mesero}</p>
        </div>
        <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded-lg text-xs font-bold">
          <Clock size={14} />
          <span>{order.hora}</span>
        </div>
      </div>

      {/* Lista de Items */}
      <div className="p-4 space-y-4 flex-1">
        {order.items.map((item, idx) => (
          <div key={idx} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-3 last:pb-0">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-gray-800 dark:text-gray-200 text-lg">{item.nombre}</span>
              <span className="bg-gray-900 dark:bg-gray-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                x{item.qty}
              </span>
            </div>

            <div className="space-y-2 mt-2">
              {item.preparaciones?.map((prep, i) => (
                // SUB-ITEM BG: Gris muy claro en light, Gris 700 en dark
                <div key={i} className="flex items-start gap-2 text-sm bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-1">
                      <span className="px-1.5 py-0.5 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded text-xs font-semibold text-gray-600 dark:text-gray-200">
                        {prep.tamano}
                      </span>
                      {prep.leche && (
                        <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded text-xs font-semibold text-blue-600 dark:text-blue-300">
                          {prep.leche}
                        </span>
                      )}
                      {prep.extras?.map((extra, e) => (
                        <span key={e} className="px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800 rounded text-xs font-semibold text-purple-600 dark:text-purple-300">
                          + {extra}
                        </span>
                      ))}
                    </div>
                  </div>
                  <input type="checkbox" className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-brand-primary bg-white dark:bg-gray-600 focus:ring-brand-primary/50 mt-0.5" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
        <button 
          onClick={() => onComplete(order.id)}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle size={20} />
          <span>Orden Completa</span>
        </button>
      </div>
    </motion.div>
  );
};