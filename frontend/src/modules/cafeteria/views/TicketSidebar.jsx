import React from 'react';
import { Trash2, Minus, Plus, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // <--- IMPORTANTE

export const TicketSidebar = ({ cart, total, onAdd, onRemove, onDelete, onConfirm }) => {
  return (
    <div className="flex flex-col h-full bg-white">
      
      {/* Lista de Items con Scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 opacity-60">
            <ShoppingBag size={48} className="mb-2" />
            <p className="text-sm font-medium">Tu orden está vacía</p>
          </div>
        ) : (
          <AnimatePresence initial={false} mode="popLayout"> 
            {cart.map(item => (
              <motion.div 
                key={item.id}
                layout // <--- MAGIA: Esto anima el reordenamiento automático
                initial={{ opacity: 0, x: -20, scale: 0.9 }} // Entra desde la izquierda
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.5, transition: { duration: 0.2 } }} // Sale hacia la derecha
                className="flex justify-between items-start pb-3 border-b border-gray-50 last:border-0 group bg-white"
              >
                {/* Info Producto */}
                <div className="flex-1 pr-2">
                  <div className="flex justify-between font-bold text-gray-800 text-sm">
                    <span className="line-clamp-1">{item.nombre}</span>
                    <motion.span 
                      key={item.qty} // Anima el precio si cambia la cantidad
                      initial={{ scale: 1.2, color: "#D946EF" }}
                      animate={{ scale: 1, color: "#1F2937" }}
                    >
                        ${(item.precio * (item.qty || item.cantidad)).toFixed(2)}
                    </motion.span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">${item.precio} c/u</div>
                </div>

                {/* Controles Cantidad */}
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-100">
                  <button onClick={() => onRemove(item.id)} className="p-1 hover:bg-white rounded text-gray-400 hover:text-red-500 transition-colors">
                      <Minus size={14}/>
                  </button>
                  <motion.span 
                    key={item.qty} // Pequeño pop al cambiar número
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="text-xs font-bold w-4 text-center text-gray-700"
                  >
                      {item.qty || item.cantidad}
                  </motion.span>
                  <button onClick={() => onAdd(item)} className="p-1 hover:bg-white rounded text-brand-primary hover:text-brand-dark transition-colors">
                      <Plus size={14}/>
                  </button>
                </div>

                {/* Botón Borrar */}
                <button onClick={() => onDelete(item.id)} className="ml-2 text-gray-300 hover:text-red-500 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={16}/>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer Fijo */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-10">
        <div className="flex justify-between items-end mb-4">
          <span className="text-gray-500 font-medium text-sm uppercase tracking-wide">Total a Pagar</span>
          <motion.span 
            key={total} // Anima el total final
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-3xl font-black text-brand-dark"
          >
              ${total.toFixed(2)}
          </motion.span>
        </div>
        <button 
            onClick={onConfirm} // <--- Conectamos la acción aquí
            disabled={cart.length === 0}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold shadow-lg shadow-green-200 transition-all active:scale-95 flex justify-center gap-2 items-center"
        >
          <span>CONFIRMAR PEDIDO</span>
        </button>
      </div>
    </div>
  );
};