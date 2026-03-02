import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ArrowRightLeft, ArrowRight, Calculator, 
  User, Users, CheckCircle2, ChevronRight, Plus, Minus 
} from 'lucide-react';

export const OpcionesMesaModal = ({ isOpen, onClose, mesa, todasLasMesas, cart, onUnir, onPagoParcial }) => {
  const [activeTab, setActiveTab] = useState('transferir'); // 'transferir' o 'dividir'
  const [splitMode, setSplitMode] = useState('iguales'); // 'iguales' o 'items'
  const [numPersonas, setNumPersonas] = useState(2);
  const [mesaDestino, setMesaDestino] = useState('');
  
  // Estado para la cuenta separada (items seleccionados para pagar)
  const [selectedItems, setSelectedItems] = useState({});

  const mesasDisponibles = todasLasMesas.filter(m => m.id !== mesa.id);

  // Solo consideramos ítems que ya están "en la cuenta" (enviados a cocina)
  const itemsEnCuenta = useMemo(() => cart.filter(item => item.enviadoCocina), [cart]);

  const toggleItemSelection = (itemId, maxQty) => {
    setSelectedItems(prev => {
      const currentQty = prev[itemId] || 0;
      if (currentQty >= maxQty) return { ...prev, [itemId]: 0 };
      return { ...prev, [itemId]: currentQty + 1 };
    });
  };

  const subtotalSeparado = useMemo(() => {
    return itemsEnCuenta.reduce((acc, item) => {
      const qty = selectedItems[item.id] || 0;
      return acc + (item.precio * qty);
    }, 0);
  }, [itemsEnCuenta, selectedItems]);

  const handleConfirmarSplitIguales = () => {
    const monto = mesa.total / numPersonas;
    onPagoParcial(mesa.id, monto);
  };

  const handleConfirmarCuentasSeparadas = () => {
    if (subtotalSeparado <= 0) return;
    onPagoParcial(mesa.id, subtotalSeparado);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]" />
          
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 m-auto w-full max-w-lg h-fit max-h-[90vh] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl z-[120] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
          >
            {/* Header con Tabs */}
            <div className="p-1 bg-gray-100 dark:bg-gray-800 shrink-0">
               <div className="flex">
                  <button onClick={() => setActiveTab('transferir')} className={`flex-1 py-3 text-sm font-bold rounded-2xl transition-all ${activeTab === 'transferir' ? 'bg-white dark:bg-gray-700 text-orange-500 shadow-sm' : 'text-gray-500'}`}>
                     Transferir Mesa
                  </button>
                  <button onClick={() => setActiveTab('dividir')} className={`flex-1 py-3 text-sm font-bold rounded-2xl transition-all ${activeTab === 'dividir' ? 'bg-white dark:bg-gray-700 text-orange-500 shadow-sm' : 'text-gray-500'}`}>
                     Dividir Cuenta
                  </button>
                  <button onClick={onClose} className="p-3 text-gray-400 hover:text-gray-600"><X size={20}/></button>
               </div>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              {activeTab === 'transferir' ? (
                /* VISTA TRANSFERIR (EXISTENTE MEJORADA) */
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex gap-4">
                    <ArrowRightLeft className="text-blue-500 shrink-0" size={24}/>
                    <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">Mueve los <span className="font-bold">${mesa.total?.toFixed(2)}</span> a otra mesa.</p>
                  </div>
                  <select value={mesaDestino} onChange={(e) => setMesaDestino(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white">
                    <option value="">-- Seleccionar Destino --</option>
                    {mesasDisponibles.map(m => (
                      <option key={m.id} value={m.id}>Mesa #{m.numero} {m.estado === 'ocupada' ? `(Ocupada: $${m.total?.toFixed(2)})` : '(Vacía)'}</option>
                    ))}
                  </select>
                  <button onClick={() => onUnir(mesa.id, parseInt(mesaDestino))} disabled={!mesaDestino} className="w-full py-4 bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 disabled:opacity-50 transition-all flex justify-center items-center gap-2">
                    Transferir Cuenta <ArrowRight size={18}/>
                  </button>
                </div>
              ) : (
                /* VISTA DIVIDIR CUENTA */
                <div className="space-y-6">
                  {/* Selector de modo de división */}
                  <div className="flex bg-gray-50 dark:bg-gray-800 p-1 rounded-xl">
                    <button onClick={() => setSplitMode('iguales')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${splitMode === 'iguales' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-400'}`}>Por Partes</button>
                    <button onClick={() => setSplitMode('items')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${splitMode === 'items' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-400'}`}>Cuentas Separadas</button>
                  </div>

                  {splitMode === 'iguales' ? (
                    <div className="space-y-6 text-center py-4">
                      <p className="text-sm text-gray-500">¿Entre cuántas personas se divide la cuenta?</p>
                      <div className="flex items-center justify-center gap-6">
                        <button onClick={() => setNumPersonas(Math.max(2, numPersonas - 1))} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300"><Minus size={24}/></button>
                        <span className="text-5xl font-black text-gray-800 dark:text-white">{numPersonas}</span>
                        <button onClick={() => setNumPersonas(numPersonas + 1)} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300"><Plus size={24}/></button>
                      </div>
                      <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                        <span className="text-xs text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider">Cada uno paga</span>
                        <h2 className="text-3xl font-black text-gray-800 dark:text-white">${(mesa.total / numPersonas).toFixed(2)}</h2>
                      </div>
                      <button onClick={handleConfirmarSplitIguales} className="w-full py-4 bg-orange-500 text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2">
                        Pagar una Parte <ChevronRight size={18}/>
                      </button>
                    </div>
                  ) : (
                    /* CUENTAS SEPARADAS: SELECCIÓN DE ÍTEMS */
                    <div className="space-y-4">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Selecciona los productos a cobrar:</p>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {itemsEnCuenta.map(item => {
                          const qtySeleccionada = selectedItems[item.id] || 0;
                          return (
                            <div key={item.id} onClick={() => toggleItemSelection(item.id, item.qty)} 
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${qtySeleccionada > 0 ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/50' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${qtySeleccionada > 0 ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                                  {qtySeleccionada || item.qty}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{item.nombre}</p>
                                  <p className="text-xs text-gray-400">${item.precio.toFixed(2)} c/u</p>
                                </div>
                              </div>
                              <span className="font-bold text-gray-700 dark:text-white">${(item.precio * (qtySeleccionada || 0)).toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex justify-between items-center mb-4">
                          <span className="font-bold text-gray-500">Total Seleccionado:</span>
                          <span className="text-2xl font-black text-orange-500">${subtotalSeparado.toFixed(2)}</span>
                        </div>
                        <button onClick={handleConfirmarCuentasSeparadas} disabled={subtotalSeparado <= 0} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 disabled:opacity-50 flex justify-center items-center gap-2">
                          Cobrar Selección <CheckCircle2 size={18}/>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};