import React, { useState } from 'react';
import { 
  Trash2, Minus, Plus, ShoppingBag, ChefHat, 
  CreditCard, Lock, User, UserPlus, GripVertical, 
  ArrowRightLeft, Info 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export const TicketSidebar = ({ 
  cart, total, hasUnsentItems, unsentTotal, mesaTotal, 
  onAdd, onRemove, onDelete, onSendToKitchen, onCheckout,
  cuentaActiva, setCuentaActiva, cuentasDisponibles, addNewCuenta, getSubtotalByCuenta, onPayCuenta, onMoveItem
}) => {
  const [newCuentaName, setNewCuentaName] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [transferModeItem, setTransferModeItem] = useState(null);

  const activeAcc = cuentaActiva || 'General';
  const availableAccs = cuentasDisponibles || ['General'];

  const handleAddCuenta = (e) => {
    e.preventDefault();
    const name = newCuentaName.trim();
    if (name && addNewCuenta) addNewCuenta(name);
    setNewCuentaName('');
  };

  const groupedCart = availableAccs.map(cuentaName => {
    const items = cart.filter(item => (item.cuenta || 'General') === cuentaName);
    return { cuentaName, items };
  });

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 transition-colors">
      
      {/* HEADER: GESTIÓN DE CUENTAS */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-4 shadow-sm z-20 shrink-0 sticky top-0">
        <form onSubmit={handleAddCuenta} className="flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              value={newCuentaName} 
              onChange={(e) => setNewCuentaName(e.target.value)}
              placeholder="Dividir cuenta (Nombre)..."
              className="w-full bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white text-sm rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all border border-transparent focus:border-brand-primary/20"
            />
            <UserPlus size={18} className="absolute left-3 top-3.5 text-gray-400" />
          </div>
          <button 
            type="submit" 
            disabled={!newCuentaName.trim()}
            className="bg-brand-primary hover:bg-brand-dark disabled:bg-gray-200 dark:disabled:bg-gray-800 text-white px-5 rounded-2xl font-bold text-xs transition-all active:scale-95 shadow-lg shadow-brand-primary/20 flex items-center justify-center shrink-0"
          >
            Añadir
          </button>
        </form>
      </div>

      {/* LISTADO DE PRODUCTOS */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {cart.length === 0 && availableAccs.length === 1 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 dark:text-gray-700 opacity-60">
            <ShoppingBag size={64} strokeWidth={1} className="mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest">Orden vacía</p>
            <p className="text-xs">Añade productos del menú</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout"> 
            {groupedCart.map(({ cuentaName, items }) => {
              const isActive = activeAcc === cuentaName;
              const subtotalCuenta = items.reduce((acc, curr) => acc + (Number(curr.precio) * curr.qty), 0);

              return (
                <motion.div 
                  key={cuentaName} layout 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={clsx(
                    "rounded-3xl transition-all duration-300 border-2",
                    isActive 
                      ? "border-brand-primary/30 bg-white dark:bg-gray-900 shadow-xl shadow-brand-primary/5" 
                      : "border-transparent bg-gray-100/50 dark:bg-gray-800/30"
                  )}
                >
                  {/* CABECERA DE CUENTA */}
                  <div 
                    onClick={() => setCuentaActiva && setCuentaActiva(cuentaName)}
                    className="flex justify-between items-center p-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "p-2 rounded-xl transition-colors",
                        isActive ? "bg-brand-primary text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                      )}>
                        <User size={18} />
                      </div>
                      <div>
                        <h4 className={clsx("font-black text-sm uppercase tracking-tight", isActive ? "text-brand-primary" : "text-gray-600 dark:text-gray-400")}>
                          {cuentaName}
                        </h4>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{items.length} productos</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-lg font-black text-gray-900 dark:text-white">
                        ${subtotalCuenta.toFixed(2)}
                      </span>
                      {availableAccs.length > 1 && subtotalCuenta > 0 && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onPayCuenta && onPayCuenta(cuentaName); }}
                          className="text-[9px] font-black bg-blue-500 text-white px-2 py-1 rounded-lg shadow-md shadow-blue-500/20 active:scale-90 transition-transform uppercase"
                        >
                          Cobrar este
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ITEMS DE LA CUENTA */}
                  <div className="px-3 pb-3 space-y-2">
                    {items.map((item, index) => (
                      <motion.div 
                        key={`${item.id}-${index}`} layout
                        className={clsx(
                          "relative group flex flex-col p-3 rounded-2xl border transition-all",
                          item.enviadoCocina 
                            ? "bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700/50" 
                            : "bg-white dark:bg-gray-800 border-transparent shadow-sm hover:shadow-md"
                        )}
                      >
                        <div className="flex gap-3">
                          {/* MINI IMAGEN */}
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-950 flex-shrink-0 border border-gray-100 dark:border-gray-700 flex items-center justify-center relative">
                            {item.imagen || item.image ? (
                              <img src={item.imagen || item.image} alt="" className="w-full h-full object-contain" />
                            ) : <span className="text-xl">🧁</span>}
                            {item.enviadoCocina && (
                              <div className="absolute inset-0 bg-orange-500/20 backdrop-blur-[1px] flex items-center justify-center">
                                <Lock size={14} className="text-orange-600" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <h5 className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate pr-2">
                                {item.qty > 1 && <span className="text-brand-primary mr-1">{item.qty}x</span>}
                                {item.nombre}
                              </h5>
                              <span className="text-sm font-black text-gray-900 dark:text-white">
                                ${(Number(item.precio) * item.qty).toFixed(2)}
                              </span>
                            </div>

                            {/* OPCIONES / PREPARACIONES */}
                            <div className="space-y-1">
                              {item.preparaciones?.map((prep, pIdx) => {
                                if (!prep || (prep.tamano === 'Estándar' && !prep.leche && (!prep.extras || prep.extras.length === 0))) return null;
                                return (
                                  <div key={pIdx} className="bg-gray-100 dark:bg-gray-900/50 rounded-lg px-2 py-1 flex flex-col gap-0.5 border border-gray-200/50 dark:border-gray-700/30">
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                                      <Info size={10} /> {prep.tamano} {prep.leche && `• ${prep.leche}`}
                                    </span>
                                    {prep.extras?.length > 0 && (
                                      <span className="text-[9px] font-black text-brand-primary dark:text-orange-400">
                                        + {prep.extras.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* ESTADO Y ACCIONES RÁPIDAS */}
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {item.enviadoCocina ? (
                                  <span className="flex items-center gap-1 text-[9px] font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/10 uppercase">
                                    <ChefHat size={10} /> En cocina
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[9px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/10 uppercase tracking-tighter">
                                    Listo para enviar
                                  </span>
                                )}
                              </div>
                              
                              {!item.enviadoCocina && (
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => onRemove(item.id, item.precio, false, cuentaName)}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <span className="text-xs font-black text-gray-600 dark:text-gray-300 w-4 text-center">{item.qty}</span>
                                  <button 
                                    onClick={() => onAdd(item)}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-brand-primary transition-colors"
                                  >
                                    <Plus size={14} />
                                  </button>
                                  <div className="w-px h-3 bg-gray-200 dark:bg-gray-700 mx-1" />
                                  <button 
                                    onClick={() => onDelete(item.id, item.precio, false, cuentaName)}
                                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-gray-300 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* FOOTER: TOTALES Y ACCIONES DE COBRO */}
      <div className="p-5 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-30 shrink-0">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
            <span>Subtotal Mesa</span>
            <span>${mesaTotal.toFixed(2)}</span>
          </div>
          {hasUnsentItems && (
            <div className="flex justify-between items-center text-orange-500 text-xs font-black uppercase tracking-wider">
              <span>Por enviar</span>
              <span>+${unsentTotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-end pt-2">
            <span className="text-gray-900 dark:text-white font-black text-sm uppercase">Total a pagar</span>
            <span className="text-3xl font-black text-brand-dark dark:text-brand-primary tracking-tighter">
              ${(mesaTotal + unsentTotal).toFixed(2)}
            </span>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={onSendToKitchen} 
            disabled={!hasUnsentItems}
            className={clsx(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl font-black text-[10px] transition-all active:scale-95 border-2 uppercase",
              hasUnsentItems 
                ? "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 text-orange-600 dark:text-orange-400 shadow-lg shadow-orange-500/10" 
                : "bg-gray-50 dark:bg-gray-800/50 border-transparent text-gray-400 cursor-not-allowed"
            )}
          >
            <ChefHat size={18} />
            <span>Enviar Cocina</span>
          </button>
          
          <button 
            onClick={onCheckout} 
            disabled={cart.length === 0 && mesaTotal === 0}
            className={clsx(
              "flex-[1.5] flex flex-col items-center justify-center gap-1 py-3 rounded-2xl font-black text-[10px] transition-all active:scale-95 border-2 uppercase",
              (cart.length > 0 || mesaTotal > 0)
                ? "bg-green-500 border-green-600 text-white shadow-xl shadow-green-500/30 hover:bg-green-600"
                : "bg-gray-200 dark:bg-gray-800 border-transparent text-gray-400 cursor-not-allowed shadow-none"
            )}
          >
            <CreditCard size={18} />
            <span>Cobrar Mesa</span>
          </button>
        </div>
      </div>
    </div>
  );
};