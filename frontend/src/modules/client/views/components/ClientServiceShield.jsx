import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Coffee, UtensilsCrossed, Home, RotateCcw } from 'lucide-react';

export const ClientServiceShield = ({ 
  activeOrdersCount = 0, 
  onForceLogout,
  type,
  tableId,
  isStandalone,
  isGridMode,
  systemConfig
}) => {

  // 🛡️ Regla 1: Si estamos en el Grid del inicio (Mapeo), este escudo NO actúa.
  if (isGridMode || !type) return null;

  const globalActive = systemConfig?.isQrActive ?? true;
  const disabledQrs = systemConfig?.disabledQrs || [];

  // 🔥 LÓGICA GRANULAR: ¿A quién le toca el escudo?
  const isLlevarDisabled = type === 'llevar' && disabledQrs.includes('llevar');
  const isThisMesaDisabled = type === 'mesa' && disabledQrs.includes(`mesa-${tableId}`);
  const isLocallyDisabled = isLlevarDisabled || isThisMesaDisabled;

  // Condición inquebrantable: Apagado global O local, Y sin pedidos activos
  const shouldShowShield = (!globalActive || isLocallyDisabled) && activeOrdersCount === 0;

  // Textos dinámicos dependiendo de QUÉ se apagó
  let shieldTitle = "Servicio Suspendido";
  let shieldMessage = "El servicio de pedidos digitales está temporalmente inactivo. Te invitamos a pasar al mostrador para realizar tu pedido.";
  let IconToRender = Store;

  if (isLocallyDisabled && globalActive) {
    if (isLlevarDisabled) {
      shieldTitle = "Solo Consumo en Sucursal";
      shieldMessage = "El servicio de pedidos digitales 'Para Llevar' está pausado por alta demanda. Sin embargo, nuestras mesas siguen disponibles. Puedes visitarnos y pedir en mesa o en mostrador.";
      IconToRender = Coffee;
    } else if (isThisMesaDisabled) {
      shieldTitle = "Mesa Fuera de Servicio";
      shieldMessage = `La Mesa ${tableId} se encuentra temporalmente fuera de servicio para pedidos digitales. Por favor, solicita a nuestro personal que te asigne otra mesa habilitada.`;
      IconToRender = UtensilsCrossed;
    }
  }

  return (
    <AnimatePresence>
      {shouldShowShield && (
        <motion.div 
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 p-6"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300, delay: 0.1 }}
            className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] shadow-2xl p-8 max-w-sm w-full border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 flex flex-col items-center text-center overflow-hidden relative"
          >
            <div className="absolute top-0 left-0 right-0 h-24 bg-orange-500/10 lya:bg-lya-primary/10 rounded-t-[2.5rem]" />

            <div className="w-20 h-20 bg-orange-100 dark:bg-orange-500/20 lya:bg-lya-primary/20 text-orange-600 lya:text-lya-primary rounded-full flex items-center justify-center mb-6 relative z-10 shadow-inner">
              <IconToRender size={40} strokeWidth={1.5} />
            </div>
            
            <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight mb-3 relative z-10">
              {shieldTitle}
            </h2>
            
            <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/70 leading-relaxed font-medium mb-8 relative z-10 text-center">
              {shieldMessage}
              <br/><br/>
              ¡Será un placer atenderte!
            </p>

            <div className="w-full relative z-10 flex flex-col gap-3">
              {/* 🔥 BOTÓN INTELIGENTE: Solo sale si están en la App (Standalone) */}
              {isStandalone && (
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={onForceLogout}
                  className="w-full bg-gray-900 dark:bg-white lya:bg-lya-primary text-white dark:text-gray-900 lya:text-lya-surface font-black py-4 rounded-2xl md:hover:shadow-lg transition-all flex items-center justify-center gap-2 outline-none"
                >
                  <Home size={18} />
                  Volver al Mapeo
                </motion.button>
              )}
              
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.reload()}
                className="w-full bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-gray-700 dark:text-gray-300 lya:text-lya-text font-bold py-4 rounded-2xl md:hover:bg-gray-200 dark:md:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 outline-none"
              >
                <RotateCcw size={18} />
                Comprobar Servicio
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};