// src/modules/cafeteria/views/OpcionesMesaModal.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRightLeft, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export const OpcionesMesaModal = ({ isOpen, onClose, mesa, todasLasMesas, onUnir }) => {
  const [mesaDestino, setMesaDestino] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Limpiamos los estados cada vez que se abre el modal
  useEffect(() => {
    if (isOpen) {
      setMesaDestino('');
      setIsProcessing(false);
      setErrorMessage('');
    }
  }, [isOpen]);

  // Filtramos todas las mesas excepto la actual
  const mesasDisponibles = todasLasMesas.filter(m => m.id !== mesa.id);

  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 4000);
  };

  const handleConfirmarUnir = async () => {
    if (!mesaDestino || isProcessing) return;
    setIsProcessing(true);
    setErrorMessage('');
    try {
      await onUnir(mesa.id, parseInt(mesaDestino));
      onClose(); // Cerramos solo si tuvo éxito
    } catch (error) {
      console.error("Error al transferir mesa:", error);
      showError(error?.response?.data?.message || error.message || "No se pudo transferir la cuenta. Intenta de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/40 dark:bg-black/60 lya:bg-lya-dark/50 backdrop-blur-sm transition-colors">
          
          {/* CÁPSULA DE NOTIFICACIÓN DE ERROR LOCAL */}
          <AnimatePresence>
            {errorMessage && (
              <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
                <motion.div 
                  initial={{ opacity: 0, y: -50, scale: 0.9 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  className="bg-white dark:bg-gray-900 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 font-bold border border-red-100 dark:border-red-900/30 lya:border-red-500/30 pointer-events-auto"
                >
                  <div className="bg-red-100 dark:bg-red-500/20 lya:bg-red-500/20 p-1.5 rounded-full shrink-0">
                    <AlertCircle size={20} className="text-red-500 lya:text-red-400" />
                  </div>
                  <span className="text-sm">{errorMessage}</span>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] shadow-2xl flex flex-col border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 overflow-hidden transition-colors"
          >
            {/* Cabecera */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 bg-white dark:bg-gray-900 lya:bg-lya-surface transition-colors">
              <h3 className="font-black text-xl text-gray-900 dark:text-white lya:text-lya-text tracking-tight">
                Opciones de Mesa <span className="text-blue-500 lya:text-lya-secondary">#{mesa.numero}</span>
              </h3>
              <button 
                onClick={onClose} 
                disabled={isProcessing}
                className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 lya:bg-lya-bg lya:hover:bg-lya-border/50 text-gray-500 dark:text-gray-400 rounded-full transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cuerpo */}
            <div className="p-6 lg:p-8">
              <div className="mb-6 flex items-center gap-4 bg-blue-50/50 dark:bg-blue-900/10 lya:bg-lya-secondary/5 border-2 border-blue-100 dark:border-blue-900/30 lya:border-lya-secondary/20 p-4 rounded-3xl transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 lya:bg-lya-secondary/20 flex items-center justify-center text-blue-600 dark:text-blue-400 lya:text-lya-secondary shrink-0 shadow-sm">
                  <ArrowRightLeft size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 dark:text-white lya:text-lya-text text-base">Transferir Cuenta</h4>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-0.5 leading-tight">Mueve esta cuenta a otra mesa física del local.</p>
                </div>
              </div>

              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/70 mb-5 leading-relaxed">
                Selecciona a qué mesa quieres enviar los <strong className="font-black text-blue-600 dark:text-blue-400 lya:text-lya-secondary bg-blue-50 dark:bg-blue-900/30 lya:bg-lya-secondary/10 px-2 py-0.5 rounded-md">${mesa.total?.toFixed(2) || '0.00'}</strong> de esta cuenta:
              </p>
              
              {mesasDisponibles.length === 0 ? (
                <div className="p-5 bg-amber-50 dark:bg-amber-900/20 lya:bg-amber-900/10 border border-amber-200 dark:border-amber-900/50 lya:border-amber-900/30 text-amber-700 dark:text-amber-400 lya:text-amber-500 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-sm">
                  <AlertCircle size={24} className="shrink-0" />
                  <span>No hay otras mesas habilitadas en el restaurante en este momento.</span>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="relative">
                    <select 
                      value={mesaDestino} 
                      onChange={(e) => setMesaDestino(e.target.value)}
                      disabled={isProcessing}
                      className="w-full p-4 bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg border-2 border-gray-100 dark:border-gray-800 lya:border-lya-border/40 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 lya:focus:ring-lya-secondary/20 focus:border-blue-500 dark:focus:border-blue-500 lya:focus:border-lya-secondary text-gray-900 dark:text-white lya:text-lya-text font-bold shadow-inner transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <option value="" disabled>-- Seleccionar Mesa Destino --</option>
                      {mesasDisponibles.map(m => (
                        <option key={m.id} value={m.id}>
                          Mesa #{m.numero} {m.estado === 'ocupada' ? `(Ocupada: $${m.total?.toFixed(2)})` : '(Vacía)'}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex gap-3 w-full pt-2">
                    <button 
                      onClick={onClose} 
                      disabled={isProcessing}
                      className="flex-[1] bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg hover:bg-gray-200 dark:hover:bg-gray-700 lya:hover:bg-lya-border/50 text-gray-600 dark:text-gray-300 lya:text-lya-text py-4 rounded-2xl font-bold text-sm transition-colors active:scale-95 disabled:opacity-50 border border-transparent dark:border-gray-700 lya:border-lya-border/30"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleConfirmarUnir}
                      disabled={!mesaDestino || isProcessing}
                      className={`flex-[1.5] py-4 font-bold rounded-2xl text-sm transition-all flex justify-center items-center gap-2 ${
                        !mesaDestino || isProcessing
                          ? 'bg-gray-300 dark:bg-gray-800 text-gray-500 dark:text-gray-600 cursor-not-allowed shadow-none border border-transparent dark:border-gray-700'
                          : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 lya:bg-lya-secondary lya:hover:bg-lya-secondary/90 text-white lya:text-lya-surface active:scale-95 shadow-lg shadow-blue-500/30 dark:shadow-blue-900/30 lya:shadow-lya-secondary/30'
                      }`}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>Transfiriendo...</span>
                        </>
                      ) : (
                        <>
                          <span>Transferir Cuenta</span>
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}