import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRightLeft, AlertCircle, ArrowRight } from 'lucide-react';

export const OpcionesMesaModal = ({ isOpen, onClose, mesa, todasLasMesas, onUnir }) => {
  const [mesaDestino, setMesaDestino] = useState('');

  // Filtramos todas las mesas excepto la actual
  const mesasDisponibles = todasLasMesas.filter(m => m.id !== mesa.id);

  const handleConfirmarUnir = () => {
    if (!mesaDestino) return;
    onUnir(mesa.id, parseInt(mesaDestino));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]" />
          
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 m-auto w-full max-w-md h-fit bg-white dark:bg-gray-900 rounded-3xl shadow-2xl z-[120] overflow-hidden flex flex-col border border-white/20 dark:border-gray-800"
          >
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h3 className="font-bold text-xl text-gray-800 dark:text-white">Opciones de Mesa #{mesa.numero}</h3>
              <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition-colors"><X size={18} /></button>
            </div>

            <div className="p-6">
              <div className="mb-6 flex items-center gap-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0"><ArrowRightLeft size={24}/></div>
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-white">Cambiar / Unir Mesa</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Mueve esta cuenta a otra mesa física.</p>
                </div>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Selecciona a qué mesa quieres enviar los <strong className="text-blue-500">${mesa.total?.toFixed(2) || '0.00'}</strong> de esta cuenta:
              </p>
              
              {mesasDisponibles.length === 0 ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl flex items-center gap-3 text-sm">
                  <AlertCircle size={20} className="shrink-0" />
                  No hay otras mesas en el restaurante.
                </div>
              ) : (
                <div className="space-y-4">
                  <select 
                    value={mesaDestino} 
                    onChange={(e) => setMesaDestino(e.target.value)}
                    className="w-full p-4 bg-white dark:bg-black/50 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white appearance-none"
                  >
                    <option value="">-- Seleccionar Mesa Destino --</option>
                    {mesasDisponibles.map(m => (
                      <option key={m.id} value={m.id}>
                        Mesa #{m.numero} {m.estado === 'ocupada' ? `(Ocupada: $${m.total?.toFixed(2)})` : '(Vacía)'}
                      </option>
                    ))}
                  </select>
                  
                  <button 
                    onClick={handleConfirmarUnir}
                    disabled={!mesaDestino}
                    className="w-full mt-2 p-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center gap-2"
                  >
                    Transferir Cuenta <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}