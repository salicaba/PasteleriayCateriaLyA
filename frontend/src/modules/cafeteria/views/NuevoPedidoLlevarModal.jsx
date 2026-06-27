// src/modules/cafeteria/views/NuevoPedidoLlevarModal.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, Phone, Loader2, AlertCircle } from 'lucide-react';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (nombreCliente.trim() && !isSubmitting) {
      setIsSubmitting(true);
      setErrorMessage('');
      try {
        await onSubmit(nombreCliente.trim(), telefono.trim());
        onClose(); // Se cierra solo si tuvo éxito (el padre manejará el success toast)
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
            className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-800 lya:border-lya-border/30"
          >
            {/* --- CABECERA --- */}
            <div className="bg-orange-500 dark:bg-orange-600 lya:bg-lya-primary p-6 text-center relative transition-colors">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all disabled:opacity-50"
              >
                <X size={24} />
              </button>
              
              <div className="bg-white/20 dark:bg-black/20 p-3 rounded-2xl inline-block mb-3 shadow-inner">
                <ShoppingBag size={32} className="text-white drop-shadow-sm" />
              </div>
              
              <h2 className="text-2xl font-black text-white tracking-tight">
                Nuevo Pedido
              </h2>
              <p className="text-orange-100 dark:text-orange-200 lya:text-lya-surface/90 text-sm mt-1 font-bold tracking-wide uppercase">
                Para Llevar / Pick-up
              </p>
            </div>

            {/* --- CUERPO Y FORMULARIO --- */}
            <form onSubmit={handleSubmit} className="p-6 flex flex-col items-center">
              <div className="text-center mb-6 w-full">
                <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/70 text-sm leading-relaxed font-medium">
                  Ingresa los datos del cliente. El teléfono es opcional para avisarle cuando su orden esté lista.
                </p>
              </div>

              <div className="w-full space-y-4 mb-8">
                {/* Input Obligatorio: Nombre */}
                <div>
                  <input
                    type="text"
                    autoFocus
                    disabled={isSubmitting}
                    placeholder="Nombre del Cliente"
                    value={nombreCliente}
                    onChange={(e) => setNombreCliente(e.target.value)}
                    className="w-full text-center text-xl font-bold p-4 bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg border-2 border-gray-100 dark:border-gray-800 lya:border-lya-border/40 rounded-2xl focus:border-orange-500 dark:focus:border-orange-500 lya:focus:border-lya-secondary focus:ring-4 focus:ring-orange-500/10 dark:focus:ring-orange-500/10 lya:focus:ring-lya-secondary/20 outline-none transition-all dark:text-white lya:text-lya-text placeholder-gray-400 dark:placeholder-gray-600 lya:placeholder-lya-text/40 shadow-inner disabled:opacity-50"
                  />
                </div>
                
                {/* Input Opcional: Teléfono */}
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 lya:text-lya-text/40" size={20} />
                  <input
                    type="tel"
                    disabled={isSubmitting}
                    placeholder="Celular (Opcional)"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full text-center text-lg font-bold p-4 pl-10 bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg border-2 border-gray-100 dark:border-gray-800 lya:border-lya-border/40 rounded-2xl focus:border-orange-500 dark:focus:border-orange-500 lya:focus:border-lya-secondary focus:ring-4 focus:ring-orange-500/10 dark:focus:ring-orange-500/10 lya:focus:ring-lya-secondary/20 outline-none transition-all dark:text-white lya:text-lya-text placeholder-gray-400 dark:placeholder-gray-600 lya:placeholder-lya-text/40 shadow-inner disabled:opacity-50"
                  />
                </div>
              </div>

              {/* --- BOTONES DE ACCIÓN --- */}
              <div className="flex gap-3 w-full">
                <motion.button
                  whileTap={!isSubmitting ? { scale: 0.95 } : {}}
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 px-4 font-bold text-gray-600 dark:text-gray-300 lya:text-lya-text bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg hover:bg-gray-200 dark:hover:bg-gray-700 lya:hover:bg-lya-border/50 rounded-xl transition-colors disabled:opacity-50 border border-transparent dark:border-gray-700 lya:border-lya-border/30"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileTap={!isSubmitting && nombreCliente.trim() ? { scale: 0.95 } : {}}
                  type="submit"
                  disabled={!nombreCliente.trim() || isSubmitting}
                  className={`flex-1 py-3.5 px-4 font-bold text-white rounded-xl transition-all flex justify-center items-center gap-2 ${
                    nombreCliente.trim() && !isSubmitting
                      ? 'bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500 lya:bg-lya-primary lya:hover:bg-lya-primary/90 shadow-lg shadow-orange-500/30 dark:shadow-orange-900/30 lya:shadow-lya-primary/30'
                      : 'bg-gray-300 dark:bg-gray-800 text-gray-500 dark:text-gray-600 cursor-not-allowed shadow-none border border-transparent dark:border-gray-700'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Creando...
                    </>
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