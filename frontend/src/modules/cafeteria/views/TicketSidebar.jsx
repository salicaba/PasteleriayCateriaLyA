import React from 'react';
import { Trash2, Minus, Plus, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const TicketSidebar = ({ cart, total, onAdd, onRemove, onDelete, onConfirm }) => {
  return (
    // CAMBIO: Fondo principal
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 transition-colors">
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 dark:text-gray-600 opacity-60">
            <ShoppingBag size={48} className="mb-2" />
            <p className="text-sm font-medium">Tu orden está vacía</p>
          </div>
        ) : (
          <AnimatePresence initial={false} mode="popLayout"> 
            {cart.map((item, index) => (
              <motion.div 
                // Usamos ID compuesto por si implementaste la lógica de agrupación
                key={`${item.id}-${item.precio}`}
                layout
                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.5, transition: { duration: 0.2 } }}
                // CAMBIO: Fondo de item y bordes
                className="flex justify-between items-start pb-3 border-b border-gray-50 dark:border-gray-700 last:border-0 group bg-white dark:bg-gray-800"
              >
                <div className="flex-1 pr-2">
                  <div className="flex justify-between font-bold text-gray-800 dark:text-gray-200 text-sm">
                    <span className="line-clamp-1">{item.nombre}</span>
                    <motion.span 
                      key={item.qty}
                      initial={{ scale: 1.2, color: "#D946EF" }}
                      animate={{ scale: 1, color: "currentColor" }} // Hereda color
                    >
                        ${(item.precio * item.qty).toFixed(2)}
                    </motion.span>
                  </div>
                  
                  {/* Preparaciones / Detalles */}
                  <div className="mt-1 space-y-0.5">
                     {item.preparaciones?.map((prep, idx) => (
                       <div key={idx} className="text-[10px] text-gray-400 dark:text-gray-500 italic">
                         {prep.tamano} {prep.leche && `• ${prep.leche}`}
                       </div>
                     ))}
                     {/* Fallback si no hay preparaciones (legacy) */}
                     {!item.preparaciones && item.detalles && (
                        <div className="text-[10px] text-brand-primary dark:text-brand-secondary font-medium uppercase">
                           {item.detalles}
                        </div>
                     )}
                  </div>
                  
                  <div className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">${item.precio} c/u</div>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-1 border border-gray-100 dark:border-gray-700">
                  <button onClick={() => onRemove(item.id, item.precio)} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded text-gray-400 hover:text-red-500 transition-colors">
                      <Minus size={14}/>
                  </button>
                  <motion.span 
                    key={item.qty}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="text-xs font-bold w-4 text-center text-gray-700 dark:text-white"
                  >
                      {item.qty}
                  </motion.span>
                  <button onClick={() => onAdd(item)} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded text-brand-primary hover:text-brand-dark dark:hover:text-white transition-colors">
                      <Plus size={14}/>
                  </button>
                </div>

                <button onClick={() => onDelete(item.id, item.precio)} className="ml-2 text-gray-300 dark:text-gray-600 hover:text-red-500 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={16}/>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer Fijo */}
      {/* CAMBIO: Fondo oscuro */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-10 transition-colors">
        <div className="flex justify-between items-end mb-4">
          <span className="text-gray-500 dark:text-gray-400 font-medium text-sm uppercase tracking-wide">Total a Pagar</span>
          <motion.span 
            key={total}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-3xl font-black text-brand-dark dark:text-white"
          >
              ${total.toFixed(2)}
          </motion.span>
        </div>
        <button 
            onClick={onConfirm}
            disabled={cart.length === 0}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold shadow-lg shadow-green-200 dark:shadow-none transition-all active:scale-95 flex justify-center gap-2 items-center"
        >
          <span>CONFIRMAR PEDIDO</span>
        </button>
      </div>
    </div>
  );
};