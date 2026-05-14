import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, Phone } from 'lucide-react';

export const NuevoPedidoLlevarModal = ({ isOpen, onClose, onSubmit }) => {
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefono, setTelefono] = useState('');

  // Limpiar los inputs cada vez que se abre el modal
  useEffect(() => {
    if (isOpen) {
      setNombreCliente('');
      setTelefono('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nombreCliente.trim()) {
      // Pasamos ambos valores al componente padre
      onSubmit(nombreCliente.trim(), telefono.trim());
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-800 lya:border-lya-border/30"
          >
            {/* --- CABECERA --- */}
            <div className="bg-orange-500 lya:bg-lya-primary p-6 text-center relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
              
              <div className="bg-white/20 p-3 rounded-2xl inline-block mb-3 shadow-inner">
                <ShoppingBag size={32} className="text-white drop-shadow-sm" />
              </div>
              
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Nuevo Pedido
              </h2>
              <p className="text-orange-100 lya:text-lya-surface/90 text-sm mt-1 font-medium tracking-wide uppercase">
                Para Llevar / Pick-up
              </p>
            </div>

            {/* --- CUERPO Y FORMULARIO --- */}
            <form onSubmit={handleSubmit} className="p-6 flex flex-col items-center">
              <div className="text-center mb-6 w-full">
                <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/80 text-sm leading-relaxed font-medium">
                  Ingresa los datos del cliente. El teléfono es opcional para avisarle cuando su orden esté lista.
                </p>
              </div>

              <div className="w-full space-y-3 mb-8">
                {/* Input Obligatorio: Nombre */}
                <input
                  type="text"
                  autoFocus
                  placeholder="Ej. Juan Pérez"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  className="w-full text-center text-xl font-bold p-4 bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg border-2 border-gray-200 dark:border-gray-700 lya:border-lya-border/50 rounded-2xl focus:border-orange-500 lya:focus:border-lya-primary focus:ring-0 outline-none transition-colors dark:text-white lya:text-lya-text placeholder-gray-300 dark:placeholder-gray-600 shadow-inner"
                />
                
                {/* Input Opcional: Teléfono */}
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 lya:text-lya-text/40" size={20} />
                  <input
                    type="tel"
                    placeholder="Celular (Opcional)"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full text-center text-lg font-bold p-4 pl-10 bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg border-2 border-gray-200 dark:border-gray-700 lya:border-lya-border/50 rounded-2xl focus:border-orange-500 lya:focus:border-lya-primary focus:ring-0 outline-none transition-colors dark:text-white lya:text-lya-text placeholder-gray-300 dark:placeholder-gray-600 shadow-inner"
                  />
                </div>
              </div>

              {/* --- BOTONES DE ACCIÓN --- */}
              <div className="flex gap-3 w-full">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3.5 px-4 font-bold text-gray-600 dark:text-gray-300 lya:text-lya-text bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg hover:bg-gray-200 dark:hover:bg-gray-700 lya:hover:bg-lya-border/50 rounded-xl transition-colors"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={!nombreCliente.trim()}
                  className={`flex-1 py-3.5 px-4 font-bold text-white rounded-xl transition-all shadow-md ${
                    nombreCliente.trim()
                      ? 'bg-orange-500 hover:bg-orange-600 lya:bg-lya-primary lya:hover:opacity-90 shadow-orange-500/30'
                      : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed shadow-none'
                  }`}
                >
                  Confirmar
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};