import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Coffee } from 'lucide-react';
import { socket } from '../../../../api/socket';

export const ClientServiceShield = ({ 
  initialQrStatus, 
  activeOrdersCount = 0 
}) => {
  const [isQrActive, setIsQrActive] = useState(initialQrStatus);

  useEffect(() => {
    // 1. Escuchar el evento de socket cuando el admin apaga/enciende el QR
    // NOTA: Ajusta 'config:update' o 'qr:status_changed' al nombre exacto del evento que emite tu backend.
    const handleConfigUpdate = (newConfig) => {
      if (newConfig.qrService !== undefined) {
        setIsQrActive(newConfig.qrService);
      }
    };

    socket.on('config:update', handleConfigUpdate);
    socket.on('qr:status_changed', (status) => setIsQrActive(status)); // Por si tienes un evento específico

    return () => {
      socket.off('config:update', handleConfigUpdate);
      socket.off('qr:status_changed');
    };
  }, []);

  // 2. Condición inquebrantable: 
  // Si el QR está APAGADO y el cliente NO tiene pedidos activos -> Mostrar Escudo
  const shouldShowShield = !isQrActive && activeOrdersCount === 0;

  return (
    <AnimatePresence>
      {shouldShowShield && (
        <motion.div 
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          // Pilar 1 y 4: Bloqueo total de pantalla, z-index supremo
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 p-6"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300, delay: 0.1 }}
            // Pilar 4: Geometría Premium (rounded-[2.5rem])
            className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] shadow-2xl p-8 max-w-sm w-full border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 flex flex-col items-center text-center overflow-hidden relative"
          >
            {/* Elemento decorativo de fondo */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-orange-500/10 lya:bg-lya-primary/10 rounded-t-[2.5rem]" />

            <div className="w-20 h-20 bg-orange-100 dark:bg-orange-500/20 lya:bg-lya-primary/20 text-orange-600 lya:text-lya-primary rounded-full flex items-center justify-center mb-6 relative z-10 shadow-inner">
              <Store size={40} strokeWidth={1.5} />
            </div>
            
            <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight mb-3 relative z-10">
              Servicio Digital Pausado
            </h2>
            
            {/* Pilar 4: Textos de alertas y modales SIEMPRE centrados */}
            <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/70 leading-relaxed font-medium mb-8 relative z-10 text-center">
              El menú QR se encuentra temporalmente inactivo. Si nuestra sucursal está abierta, te invitamos a pasar directamente al mostrador para realizar tu pedido sin compromiso. 
              <br/><br/>
              ¡Será un placer atenderte!
            </p>

            <div className="w-full relative z-10 flex flex-col gap-3">
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.reload()}
                // Pilar 2: Efectos hover solo en md
                className="w-full bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-gray-700 dark:text-gray-300 lya:text-lya-text font-bold py-4 rounded-2xl md:hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <Coffee size={18} />
                Comprobar Servicio
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};