// src/modules/cafeteria/views/OpcionesCancelacionModal.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2, AlertCircle } from 'lucide-react';

const OpcionesCancelacionModal = ({ isOpen, onClose, cuentas, onConfirmar }) => {
  const [tipoCancelacion, setTipoCancelacion] = useState('mesa');
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState('');
  const [motivo, setMotivo] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (cuentas && cuentas.length === 1) {
        setTipoCancelacion('cuenta');
        setCuentaSeleccionada(cuentas[0]);
      } else {
        setTipoCancelacion('mesa');
        setCuentaSeleccionada(cuentas && cuentas.length > 0 ? cuentas[0] : '');
      }
      setMotivo('Cancelación desde POS');
      setIsProcessing(false);
      setErrorMessage('');
    }
  }, [isOpen, cuentas]);

  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 4000);
  };

  const handleConfirmar = async () => {
    setIsProcessing(true);
    setErrorMessage('');
    try {
      await onConfirmar(tipoCancelacion, cuentaSeleccionada, motivo);
    } catch (error) {
      console.error("Error al cancelar:", error);
      showError(error?.response?.data?.message || error.message || "Ocurrió un error al procesar la cancelación.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-gray-900/40 dark:bg-black/60 lya:bg-lya-dark/50 backdrop-blur-sm transition-colors">
          
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
            initial={{ scale: 0.95, y: 20, opacity: 0 }} 
            animate={{ scale: 1, y: 0, opacity: 1 }} 
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl flex flex-col items-center text-center border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 transition-colors"
          >
            {/* Ícono superior */}
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5 bg-red-50 dark:bg-red-500/10 lya:bg-red-500/10 shadow-sm">
              <AlertTriangle size={32} strokeWidth={1.5} className="text-red-500 lya:text-red-400" />
            </div>
            
            <h3 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-2 tracking-tight">
              Opciones de Cancelación
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/70 mb-6 leading-relaxed font-medium">
              Selecciona si deseas cancelar toda la orden o solo una cuenta específica.
            </p>

            <div className="w-full mb-8 space-y-4 text-left">
              {/* Opciones de Radio Buttons */}
              <div className="flex flex-col gap-3 mb-2">
                {cuentas?.length > 1 && (
                  <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    isProcessing ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 lya:hover:bg-lya-bg/50'
                  } ${
                    tipoCancelacion === 'mesa' 
                      ? 'border-red-200 dark:border-red-900/50 lya:border-red-500/30 bg-red-50/50 dark:bg-red-900/10 lya:bg-red-500/5' 
                      : 'border-gray-100 dark:border-gray-800 lya:border-lya-border/40'
                  }`}>
                    <input 
                      type="radio" 
                      name="tipoCancelacion" 
                      value="mesa"
                      checked={tipoCancelacion === 'mesa'}
                      onChange={(e) => setTipoCancelacion(e.target.value)}
                      disabled={isProcessing}
                      className="w-4 h-4 text-red-500 lya:text-red-400 focus:ring-red-500"
                    />
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text">Toda la Orden (Mesa)</span>
                  </label>
                )}

                <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  isProcessing ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 lya:hover:bg-lya-bg/50'
                } ${
                  tipoCancelacion === 'cuenta' 
                    ? 'border-red-200 dark:border-red-900/50 lya:border-red-500/30 bg-red-50/50 dark:bg-red-900/10 lya:bg-red-500/5' 
                    : 'border-gray-100 dark:border-gray-800 lya:border-lya-border/40'
                }`}>
                  <input 
                    type="radio" 
                    name="tipoCancelacion" 
                    value="cuenta"
                    checked={tipoCancelacion === 'cuenta'}
                    onChange={(e) => setTipoCancelacion(e.target.value)}
                    disabled={isProcessing}
                    className="w-4 h-4 text-red-500 lya:text-red-400 focus:ring-red-500"
                  />
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text">Cuenta Específica</span>
                </label>
              </div>

              {/* Selector de cuenta */}
              <AnimatePresence>
                {tipoCancelacion === 'cuenta' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">¿Qué cuenta eliminarás?</label>
                      <select
                        value={cuentaSeleccionada}
                        onChange={(e) => setCuentaSeleccionada(e.target.value)}
                        disabled={isProcessing}
                        className="w-full bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg text-gray-900 dark:text-white lya:text-lya-text text-sm rounded-2xl p-4 outline-none focus:ring-4 focus:ring-red-500/10 transition-all border-2 border-gray-100 dark:border-gray-800 lya:border-lya-border/40 focus:border-red-500 dark:focus:border-red-500 lya:focus:border-red-400 font-bold shadow-inner disabled:opacity-50 cursor-pointer"
                      >
                        {!cuentaSeleccionada && <option value="" disabled>Seleccione...</option>}
                        {cuentas?.map(acc => (
                          <option key={acc} value={acc}>Cuenta: {acc}</option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Motivo */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">Motivo (Opcional)</label>
                <input 
                  type="text" 
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  disabled={isProcessing}
                  placeholder="Ej. Cliente se retiró"
                  className="w-full bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg text-gray-900 dark:text-white lya:text-lya-text text-sm rounded-2xl p-4 outline-none focus:ring-4 focus:ring-red-500/10 transition-all border-2 border-gray-100 dark:border-gray-800 lya:border-lya-border/40 focus:border-red-500 dark:focus:border-red-500 lya:focus:border-red-400 font-bold shadow-inner disabled:opacity-50 placeholder-gray-400 dark:placeholder-gray-600 lya:placeholder-lya-text/40"
                />
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <button 
                onClick={onClose} 
                disabled={isProcessing}
                className="flex-[1] bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg hover:bg-gray-200 dark:hover:bg-gray-700 lya:hover:bg-lya-border/50 text-gray-600 dark:text-gray-300 lya:text-lya-text py-3.5 rounded-2xl font-bold text-sm transition-colors active:scale-95 disabled:opacity-50 border border-transparent dark:border-gray-700 lya:border-lya-border/30"
              >
                Volver
              </button>
              <button 
                onClick={handleConfirmar} 
                disabled={(tipoCancelacion === 'cuenta' && !cuentaSeleccionada) || isProcessing}
                className={`flex-[1.5] py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  isProcessing || (tipoCancelacion === 'cuenta' && !cuentaSeleccionada)
                    ? 'bg-gray-300 dark:bg-gray-800 text-gray-500 dark:text-gray-600 cursor-not-allowed shadow-none border border-transparent dark:border-gray-700'
                    : 'bg-red-500 hover:bg-red-600 text-white active:scale-95 shadow-lg shadow-red-500/30 dark:shadow-red-900/30 lya:shadow-red-500/20'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Cancelando...</span>
                  </>
                ) : (
                  'Confirmar'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default OpcionesCancelacionModal;