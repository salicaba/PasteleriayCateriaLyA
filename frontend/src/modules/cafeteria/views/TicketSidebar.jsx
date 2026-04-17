import React, { useState } from 'react';
import { Trash2, Minus, Plus, ShoppingBag, ChefHat, CreditCard, Lock, User, UserPlus, GripVertical, ArrowRightLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    if (name) {
      if (addNewCuenta) addNewCuenta(name);
    }
    setNewCuentaName('');
  };

  const handleAdd = (item) => {
    if(setCuentaActiva && item.cuenta !== activeAcc) setCuentaActiva(item.cuenta || 'General');
    onAdd(item);
  };
  
  const handleRemove = (item) => onRemove(item.id, item.precio, item.enviadoCocina, item.cuenta || 'General');
  const handleDelete = (item) => onDelete(item.id, item.precio, item.enviadoCocina, item.cuenta || 'General');

  const groupedCart = availableAccs.map(cuentaName => {
    const items = cart.filter(item => (item.cuenta || 'General') === cuentaName);
    return { cuentaName, items };
  });

  const subtotalActiva = getSubtotalByCuenta ? getSubtotalByCuenta(activeAcc) : 0;

  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetCuenta) => {
    e.preventDefault();
    if (draggedItem && draggedItem.cuenta !== targetCuenta && onMoveItem) {
      onMoveItem(draggedItem, targetCuenta);
    }
    setDraggedItem(null);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 transition-colors">
      
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 shadow-sm z-20 shrink-0 sticky top-0">
        <form onSubmit={handleAddCuenta} className="flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              value={newCuentaName} 
              onChange={(e) => setNewCuentaName(e.target.value)}
              placeholder="Nombre para cuenta..."
              className="w-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white text-sm rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all placeholder-gray-400"
            />
            <UserPlus size={18} className="absolute left-3 top-3.5 text-gray-400" />
          </div>
          <button 
            type="submit" 
            disabled={!newCuentaName.trim()}
            className="bg-brand-primary hover:bg-brand-dark disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white px-5 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-md flex items-center justify-center shrink-0"
          >
            Agregar
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {cart.length === 0 && availableAccs.length === 1 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 dark:text-gray-600 opacity-60">
            <ShoppingBag size={48} className="mb-2" />
            <p className="text-sm font-medium">Orden vacía, añade productos</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout"> 
            {groupedCart.map(({ cuentaName, items }) => {
              const isActive = activeAcc === cuentaName;
              const isDropTarget = draggedItem && draggedItem.cuenta !== cuentaName;

              return (
                <motion.div 
                  key={cuentaName} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, cuentaName)}
                  className={`relative border-2 rounded-2xl overflow-hidden transition-all duration-300 ${
                    isDropTarget 
                      ? 'border-dashed border-brand-primary bg-brand-primary/10 scale-[1.02] shadow-lg' 
                      : isActive 
                        ? 'border-brand-primary bg-white dark:bg-gray-800 shadow-md' 
                        : 'border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hover:border-brand-primary/30'
                  }`}
                >
                  <div 
                    onClick={() => setCuentaActiva && setCuentaActiva(cuentaName)}
                    className={`flex justify-between items-center p-3 cursor-pointer transition-colors ${
                      isActive ? 'bg-brand-primary/10 dark:bg-brand-primary/20' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isActive ? 'bg-brand-primary text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'}`}>
                        <User size={16} />
                      </div>
                      <div>
                        <h4 className={`font-bold text-sm ${isActive ? 'text-brand-primary dark:text-brand-secondary' : 'text-gray-700 dark:text-gray-300'}`}>
                          {cuentaName}
                        </h4>
                        {isActive && <span className="text-[10px] text-brand-primary font-medium uppercase tracking-wider">Activa</span>}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="block text-sm font-black text-gray-800 dark:text-gray-200">
                        ${items.reduce((acc, curr) => acc + (curr.precio * curr.qty), 0).toFixed(2)}
                      </span>
                      {availableAccs.length > 1 && (
                         <button 
                           onClick={(e) => { e.stopPropagation(); onPayCuenta && onPayCuenta(cuentaName); }}
                           disabled={items.length === 0}
                           className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                           COBRAR A ÉL
                         </button>
                      )}
                    </div>
                  </div>

                  <div className="p-2 space-y-2">
                    {items.length === 0 ? (
                      <div className="text-center text-xs text-gray-400 py-4 italic border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
                        {isDropTarget ? '¡Suelta el producto aquí!' : 'Arrastra productos aquí'}
                      </div>
                    ) : (
                      items.map((item, index) => (
                        <motion.div 
                          key={`${item.id}-${item.precio}-${item.enviadoCocina}-${index}`} layout
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          onDragEnd={handleDragEnd}
                          className={`flex flex-col bg-gray-50 dark:bg-gray-700/50 rounded-xl p-2.5 border border-gray-100 dark:border-gray-600 transition-shadow ${
                             draggedItem === item ? 'opacity-50 shadow-none' : 'shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing'
                          }`}
                        >
                          <div className="flex justify-between items-start w-full gap-2">
                            <div className="pt-0.5 text-gray-300 dark:text-gray-500">
                               <GripVertical size={16} />
                            </div>

                            <div className="flex-1">
                              <div className={`flex justify-between text-sm ${item.enviadoCocina ? 'font-medium text-gray-600 dark:text-gray-400' : 'font-bold text-gray-800 dark:text-gray-200'}`}>
                                <span className="line-clamp-1 flex items-center gap-1.5">
                                  {item.enviadoCocina && <Lock size={12} className="text-orange-400 shrink-0" />}
                                  {item.qty > 1 && <span className="text-brand-primary">{item.qty}x</span>} {item.nombre}
                                </span>
                                <span>${(item.precio * item.qty).toFixed(2)}</span>
                              </div>
                              
                              {/* RENDERIZADO CORREGIDO DE EXTRAS Y TAMAÑOS */}
                              <div className="mt-1 space-y-1 pl-2 border-l-2 border-gray-200 dark:border-gray-600 ml-1">
                                 {item.preparaciones?.map((prep, idx) => (
                                   <div key={idx} className="flex flex-col">
                                     <span className="text-[10px] text-gray-500 dark:text-gray-400 italic">
                                       {prep.tamano} {prep.leche && `• ${prep.leche}`}
                                     </span>
                                     {/* AQUÍ ESTÁ LA MAGIA QUE FALTABA */}
                                     {prep.extras && prep.extras.length > 0 && (
                                       <span className="text-[10px] text-brand-primary dark:text-brand-secondary font-medium">
                                         + {prep.extras.join(', ')}
                                       </span>
                                     )}
                                   </div>
                                 ))}
                                 {!item.preparaciones && item.detalles && (
                                    <div className="text-[10px] text-brand-primary dark:text-brand-secondary font-medium uppercase">
                                       {typeof item.detalles === 'string' ? item.detalles : item.detalles.tamano}
                                    </div>
                                 )}
                              </div>

                              <div className="mt-2 flex items-center gap-2 flex-wrap">
                                {item.enviadoCocina && (
                                  <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider">
                                    <ChefHat size={10} /> EN COCINA
                                  </span>
                                )}
                                
                                {availableAccs.length > 1 && (
                                  <button 
                                    onClick={() => setTransferModeItem(transferModeItem === item ? null : item)}
                                    className="text-[10px] flex items-center gap-1 font-bold text-gray-500 hover:text-blue-500 transition-colors"
                                  >
                                    <ArrowRightLeft size={10} /> {transferModeItem === item ? 'Cancelar mover' : 'Mover'}
                                  </button>
                                )}
                              </div>

                              <AnimatePresence>
                                {transferModeItem === item && (
                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 flex gap-1 overflow-x-auto pt-1 border-t border-gray-200 dark:border-gray-600">
                                    {availableAccs.filter(acc => acc !== (item.cuenta || 'General')).map(acc => (
                                      <button key={acc} onClick={() => { onMoveItem(item, acc); setTransferModeItem(null); }} className="text-[10px] font-bold bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-2 py-1 rounded hover:bg-brand-primary hover:text-white transition-colors shrink-0">
                                        A {acc}
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {!item.enviadoCocina && (
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-0.5 border border-gray-200 dark:border-gray-600 shadow-sm">
                                  <button onClick={() => handleRemove(item)} className="p-1 text-gray-400 hover:text-red-500"><Minus size={12}/></button>
                                  <span className="text-xs font-bold w-3 text-center">{item.qty}</span>
                                  <button onClick={() => handleAdd(item)} className="p-1 text-brand-primary"><Plus size={12}/></button>
                                </div>
                                <button onClick={() => handleDelete(item)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-10 shrink-0">
        <div className="flex justify-between items-end mb-3">
          <span className="text-gray-500 font-bold text-sm uppercase tracking-wide">Gran Total Mesa</span>
          <span className="text-2xl font-black text-brand-dark dark:text-white">${(mesaTotal > 0 ? mesaTotal + unsentTotal : total).toFixed(2)}</span>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={onSendToKitchen} disabled={!hasUnsentItems}
            className="flex-1 flex items-center justify-center gap-1 bg-orange-100 hover:bg-orange-200 disabled:bg-gray-100 disabled:text-gray-400 text-orange-700 py-3 rounded-xl font-bold transition-all active:scale-95 text-xs"
          >
            <ChefHat size={16} /> <span>A COCINA</span>
          </button>
          <button 
            onClick={onCheckout} disabled={cart.length === 0 && mesaTotal === 0}
            className="flex-[1.5] flex items-center justify-center gap-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-200 dark:shadow-none transition-all active:scale-95 text-xs"
          >
            <CreditCard size={16} /> <span>COBRAR MESA</span>
          </button>
        </div>
      </div>
    </div>
  );
};