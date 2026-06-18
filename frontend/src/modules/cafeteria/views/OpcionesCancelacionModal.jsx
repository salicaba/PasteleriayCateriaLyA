import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

const OpcionesCancelacionModal = ({ isOpen, onClose, cuentas, onConfirmar }) => {
  const [tipoCancelacion, setTipoCancelacion] = useState('mesa');
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState('');
  const [motivo, setMotivo] = useState('');

  // 🐛 AQUÍ ESTÁ LA SOLUCIÓN AL BUG:
  // Solo configuramos el estado inicial cuando 'isOpen' cambia a true.
  // Quitamos 'cuentas' del arreglo de dependencias (al final) para que no reescriba tu selección.
  useEffect(() => {
    if (isOpen) {
      if (cuentas && cuentas.length === 1) {
        setTipoCancelacion('cuenta');
        setCuentaSeleccionada(cuentas[0]);
      } else {
        setTipoCancelacion('mesa');
        setCuentaSeleccionada(cuentas && cuentas.length > 0 ? cuentas[0] : '');
      }
      setMotivo('Cancelación desde POS'); // Valor por defecto
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleConfirmar = () => {
    onConfirmar(tipoCancelacion, cuentaSeleccionada, motivo);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.9, y: 20, opacity: 0 }} 
          animate={{ scale: 1, y: 0, opacity: 1 }} 
          exit={{ scale: 0.9, y: 20, opacity: 0 }} 
          className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl flex flex-col items-center text-center border border-gray-100 dark:border-gray-800"
        >
          {/* Ícono superior */}
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-red-100 dark:bg-red-900/30">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          
          <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
            Opciones de Cancelación
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            Selecciona si deseas cancelar toda la mesa o solo una cuenta específica.
          </p>

          <div className="w-full mb-6 space-y-3 text-left">
            {/* Opciones de Radio Buttons */}
            <div className="flex flex-col gap-2 mb-4">
              {cuentas?.length > 1 && (
                <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <input 
                    type="radio" 
                    name="tipoCancelacion" 
                    value="mesa"
                    checked={tipoCancelacion === 'mesa'}
                    onChange={(e) => setTipoCancelacion(e.target.value)}
                    className="w-4 h-4 text-red-500"
                  />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Toda la Orden (Mesa Completa)</span>
                </label>
              )}

              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input 
                  type="radio" 
                  name="tipoCancelacion" 
                  value="cuenta"
                  checked={tipoCancelacion === 'cuenta'}
                  onChange={(e) => setTipoCancelacion(e.target.value)}
                  className="w-4 h-4 text-red-500"
                />
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Cuenta Específica</span>
              </label>
            </div>

            {/* Selector de cuenta (Solo se muestra si seleccionó "cuenta") */}
            {tipoCancelacion === 'cuenta' && (
              <div className="animate-fade-in mb-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">¿Qué cuenta deseas eliminar?</label>
                <select
                  value={cuentaSeleccionada}
                  onChange={(e) => setCuentaSeleccionada(e.target.value)}
                  className="w-full mt-1 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500/50 transition-all border border-gray-200 dark:border-gray-700 appearance-none font-bold shadow-sm cursor-pointer"
                >
                  {!cuentaSeleccionada && <option value="" disabled>Seleccione...</option>}
                  {cuentas?.map(acc => (
                    <option key={acc} value={acc}>Cuenta: {acc}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Motivo */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Motivo (Opcional)</label>
              <input 
                type="text" 
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej. Cliente se retiró"
                className="w-full mt-1 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500/50 transition-all border border-gray-200 dark:border-gray-700 font-medium shadow-inner"
              />
            </div>
          </div>

          <div className="flex gap-3 w-full">
            <button 
              onClick={onClose} 
              className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-2xl font-bold uppercase text-[11px] tracking-wider transition-colors active:scale-95"
            >
              Volver
            </button>
            <button 
              onClick={handleConfirmar} 
              disabled={tipoCancelacion === 'cuenta' && !cuentaSeleccionada}
              className="flex-[1.5] py-3 rounded-2xl font-black uppercase text-[11px] tracking-wider transition-transform active:scale-95 shadow-md bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default OpcionesCancelacionModal;