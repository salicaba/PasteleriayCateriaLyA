// src/modules/cafeteria/views/NuevoPedidoLlevarModal.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, Phone, Loader2, AlertTriangle } from 'lucide-react';

export const NuevoPedidoLlevarModal = ({ isOpen, onClose, onSubmit }) => {
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNombreCliente('');
      setTelefono('');
      setIsSubmitting(false);
      setErrorMessage('');
    }
  }, [isOpen]);

  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 4000);
  };

  // 🔥 BLINDAJE: Solo permite teclear números y un máximo de 10
  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setTelefono(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 🔥 VALIDACIÓN ESTRICTA
    if (telefono && telefono.length !== 10) {
      showError("El número de celular debe tener exactamente 10 dígitos.");
      return;
    }

    if (nombreCliente.trim() && !isSubmitting) {
      setIsSubmitting(true);
      setErrorMessage('');
      try {
        await onSubmit(nombreCliente.trim(), telefono.trim());
        onClose(); 
      } catch (error) {
        console.error("Error al crear el pedido:", error);
        showError(error.message || "Ocurrió un error al crear el pedido. Intenta de nuevo.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 dark:bg-black/60 lya:bg-lya-dark/50 backdrop-blur-sm transition-colors">
          
          {/* CÁPSULA NEO-BENTO ÁMBAR IDÉNTICA AL LOGIN */}
          <AnimatePresence>
            {errorMessage && (
              <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
                <motion.div 
                  initial={{ opacity: 0, y: -50, scale: 0.9 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  className="bg-white/95 dark:bg-gray-900/95 lya:bg-lya-surface/95 backdrop-blur-xl text-gray-800 dark:text-white lya:text-lya-text px-6 py-4 rounded-full shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] flex items-center justify-center gap-3 font-bold border border-amber-200/50 dark:border-amber-900/30 lya:border-amber-500/30 pointer-events-auto text-center"
                >
                  <div className="bg-amber-100 dark:bg-amber-500/20 text-amber-500 p-1.5 rounded-full shrink-0">
                    <AlertTriangle size={20} strokeWidth={2.5} />
                  </div>
                  <span className="text-sm tracking-wide">{errorMessage}</span>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 relative"
          >
            {/* Barra de color superior */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-400 to-orange-600 lya:from-lya-primary lya:to-lya-secondary z-10" />

            {/* --- CABECERA --- */}
            <div className="pt-8 pb-4 text-center relative transition-colors">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-white bg-gray-100 dark:bg-gray-800 md:hover:bg-gray-200 p-2 rounded-full transition-all disabled:opacity-50 outline-none"
              >
                <X size={20} strokeWidth={3} />
              </button>
              
              <div className="bg-orange-50 dark:bg-orange-500/10 lya:bg-lya-primary/10 p-4 rounded-[1.5rem] inline-block mb-3 border border-orange-100 dark:border-orange-500/20 lya:border-lya-primary/20">
                <ShoppingBag size={32} className="text-orange-500 lya:text-lya-primary" />
              </div>
              
              <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">
                Nuevo Pedido
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 font-bold tracking-widest uppercase">
                Para Llevar / Pick-up
              </p>
            </div>

            {/* --- CUERPO Y FORMULARIO --- */}
            <form onSubmit={handleSubmit} className="p-6 pt-2 flex flex-col items-center">
              <div className="text-center mb-6 w-full">
                <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/70 text-[13px] leading-relaxed font-medium">
                  El teléfono es opcional para notificar al cliente.
                </p>
              </div>

              <div className="w-full space-y-4 mb-8">
                <div>
                  <input
                    type="text"
                    autoFocus
                    disabled={isSubmitting}
                    placeholder="Nombre del Cliente"
                    value={nombreCliente}
                    onChange={(e) => setNombreCliente(e.target.value)}
                    className="w-full text-center text-xl font-bold p-4 bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg border border-gray-200 dark:border-gray-800 lya:border-lya-border/40 rounded-2xl focus:border-orange-500 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all dark:text-white lya:text-lya-text placeholder-gray-400 dark:placeholder-gray-600 shadow-inner disabled:opacity-50"
                  />
                </div>
                
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
                  <input
                    type="tel"
                    disabled={isSubmitting}
                    placeholder="Celular (Opcional)"
                    value={telefono}
                    onChange={handlePhoneChange} // Blindaje activo
                    className="w-full text-center text-lg font-bold p-4 pl-10 bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg border border-gray-200 dark:border-gray-800 lya:border-lya-border/40 rounded-2xl focus:border-orange-500 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all dark:text-white lya:text-lya-text placeholder-gray-400 dark:placeholder-gray-600 shadow-inner disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <motion.button
                  whileTap={!isSubmitting ? { scale: 0.95 } : {}}
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 py-4 font-bold text-gray-600 dark:text-gray-300 lya:text-lya-text bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg md:hover:bg-gray-200 rounded-[1rem] transition-colors disabled:opacity-50 border border-transparent dark:border-gray-700 outline-none"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileTap={!isSubmitting && nombreCliente.trim() ? { scale: 0.95 } : {}}
                  type="submit"
                  disabled={!nombreCliente.trim() || isSubmitting}
                  className={`flex-1 py-4 font-black text-white rounded-[1rem] transition-all flex justify-center items-center gap-2 outline-none ${
                    nombreCliente.trim() && !isSubmitting
                      ? 'bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 lya:bg-lya-primary shadow-lg shadow-orange-500/30'
                      : 'bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed shadow-none'
                  }`}
                >
                  {isSubmitting ? (
                    <><Loader2 size={20} className="animate-spin" /> Creando</>
                  ) : (
                    'Confirmar'
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};