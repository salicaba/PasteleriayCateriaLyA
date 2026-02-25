import React from 'react';
import { Trash2, Minus, Plus, ShoppingBag, ChefHat, CreditCard, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// NUEVAS PROPS: Recibimos mesaTotal y unsentTotal para el desglose
export const TicketSidebar = ({ cart, total, hasUnsentItems, unsentTotal, mesaTotal, onAdd, onRemove, onDelete, onSendToKitchen, onCheckout }) => {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 transition-colors">
      
      {/* Lista de productos */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 dark:text-gray-600 opacity-60">
            <ShoppingBag size={48} className="mb-2" />
            <p className="text-sm font-medium">Tu orden está vacía</p>
          </div>
        ) : (
          <AnimatePresence initial={false} mode="popLayout"> 
            {cart.map((item, index) => (
              <motion.div 
                key={`${item.id}-${item.precio}-${item.enviadoCocina ? 'sent' : 'new'}-${index}`}
                layout
                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.5, transition: { duration: 0.2 } }}
                className={`flex justify-between items-start pb-3 border-b dark:border-gray-700 last:border-0 group transition-all duration-300 rounded-lg p-2 -mx-2
                  ${item.enviadoCocina ? 'bg-orange-50/50 dark:bg-gray-800 border-orange-100 dark:border-gray-700/50 opacity-80' : 'bg-white dark:bg-gray-800 border-gray-50'}
                `}
              >
                <div className="flex-1 pr-2">
                  <div className={`flex justify-between text-sm ${item.enviadoCocina ? 'font-medium text-gray-600 dark:text-gray-400' : 'font-bold text-gray-800 dark:text-gray-200'}`}>
                    <span className="line-clamp-1 flex items-center gap-1.5">
                      {item.enviadoCocina && <Lock size={12} className="text-orange-400 shrink-0" />}
                      {item.qty > 1 && <span className="text-brand-primary">{item.qty}x</span>} {item.nombre}
                    </span>
                    <span>${(item.precio * item.qty).toFixed(2)}</span>
                  </div>
                  
                  <div className="mt-1 space-y-0.5 pl-4 border-l-2 border-gray-100 dark:border-gray-700 ml-1">
                     {item.preparaciones?.map((prep, idx) => (
                       <div key={idx} className="text-[10px] text-gray-400 dark:text-gray-500 italic">
                         {prep.tamano} {prep.leche && `• ${prep.leche}`}
                       </div>
                     ))}
                     {!item.preparaciones && item.detalles && (
                        <div className="text-[10px] text-brand-primary dark:text-brand-secondary font-medium uppercase">
                           {item.detalles}
                        </div>
                     )}
                  </div>
                  
                  {item.enviadoCocina && (
                    <div className="mt-2 inline-flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded text-[9px] font-black tracking-wider border border-orange-200 dark:border-orange-800/50">
                      <ChefHat size={10} /> EN COCINA
                    </div>
                  )}
                </div>

                {!item.enviadoCocina && (
                  <>
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-1 border border-gray-100 dark:border-gray-700 shrink-0">
                      <button onClick={() => onRemove(item.id, item.precio, item.enviadoCocina)} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded text-gray-400 hover:text-red-500 transition-colors"><Minus size={14}/></button>
                      <span className="text-xs font-bold w-4 text-center text-gray-700 dark:text-white">{item.qty}</span>
                      <button onClick={() => onAdd(item)} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded text-brand-primary hover:text-brand-dark transition-colors"><Plus size={14}/></button>
                    </div>
                    <button onClick={() => onDelete(item.id, item.precio, item.enviadoCocina)} className="ml-2 mt-1 text-gray-300 dark:text-gray-600 hover:text-red-500 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Trash2 size={16}/>
                    </button>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-10 transition-colors">
        
        {/* NUEVO: DESGLOSE MATEMÁTICO CLARO */}
        {(mesaTotal > 0 || unsentTotal > 0) && (
          <div className="mb-3 space-y-1.5 border-b border-gray-200 dark:border-gray-700 pb-3">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
              <span>{mesaTotal > 0 ? 'Cuenta Previa (Enviado)' : 'Cuenta Previa'}</span>
              <span>${(mesaTotal || 0).toFixed(2)}</span>
            </div>
            {unsentTotal > 0 && (
              <div className="flex justify-between text-xs text-brand-primary font-bold">
                <span>Nuevos Cargos (Por enviar)</span>
                <span>+ ${unsentTotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-end mb-4">
          <span className="text-gray-500 dark:text-gray-400 font-bold text-sm uppercase tracking-wide">
            Gran Total
          </span>
          <motion.span 
            key={mesaTotal + unsentTotal} 
            initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} 
            className="text-3xl font-black text-brand-dark dark:text-white"
          >
              ${(mesaTotal + unsentTotal).toFixed(2)}
          </motion.span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={onSendToKitchen}
            disabled={!hasUnsentItems}
            className="flex items-center justify-center gap-2 w-full bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/40 dark:hover:bg-orange-900/60 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed text-orange-700 dark:text-orange-400 py-3.5 rounded-xl font-bold transition-all active:scale-95"
          >
            <ChefHat size={18} />
            <span>COCINA</span>
          </button>

          <button 
            onClick={onCheckout}
            disabled={cart.length === 0 && mesaTotal === 0}
            className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-green-200 dark:shadow-none transition-all active:scale-95"
          >
            <CreditCard size={18} />
            <span>COBRAR</span>
          </button>
        </div>
      </div>
    </div>
  );
};