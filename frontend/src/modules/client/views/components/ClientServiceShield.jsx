// frontend/src/modules/client/views/components/ClientServiceShield.jsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Coffee, UtensilsCrossed, RotateCcw, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// 🔥 COMPONENTE CONTROLADO Y BLINDADO (Locks Asíncronos + Motor de Escaneo Profundo)
export const ClientServiceShield = ({ 
  activeOrdersCount = 0, 
  hasActiveSession = false, 
  onForceLogout,
  type,
  tableId,
  isGridMode,
  isStandalone,
  systemConfig = { isQrActive: true, disabledQrs: [] }
}) => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const globalActive = systemConfig.isQrActive;
  const disabledQrs = systemConfig.disabledQrs || [];

  if (isGridMode) return null;

  // 🚀 LECTURA INTELIGENTE DE CACHÉ PARA REFORZAR EL MATCHING (ID vs Número)
  let sessionTableNumber = null;
  let sessionTableId = null;
  try {
    const session = JSON.parse(localStorage.getItem('lya_client_session') || '{}');
    sessionTableNumber = session.tableNumber;
    sessionTableId = session.tableId;
  } catch (e) {}

  const isLlevarDisabled = type === 'llevar' && (disabledQrs.includes('llevar') || disabledQrs.includes('takeaway'));
  
  // 🚀 MOTOR DE BÚSQUEDA PROFUNDA: Mapea la pausa por UUID, por Número o por Nombre de Sesión
  const isThisMesaDisabled = type === 'mesa' && disabledQrs.some(qr => {
     const normalizedQr = String(qr).toLowerCase();
     const possibleMatches = [
        `mesa-${tableId}`, `table-${tableId}`,
        sessionTableNumber ? `mesa-${sessionTableNumber}` : null,
        sessionTableNumber ? `table-${sessionTableNumber}` : null,
        sessionTableId ? `mesa-${sessionTableId}` : null,
        sessionTableId ? `table-${sessionTableId}` : null
     ].filter(Boolean).map(val => String(val).toLowerCase());
     
     return possibleMatches.includes(normalizedQr);
  });

  const isLocallyDisabled = isLlevarDisabled || isThisMesaDisabled;

  // Mostramos el escudo solo si está inactivo y NO ha confirmado pedidos aún
  const shouldShowShield = (!globalActive || isLocallyDisabled) && activeOrdersCount === 0;

  useEffect(() => {
    if (shouldShowShield && hasActiveSession && typeof onForceLogout === 'function') {
      onForceLogout();
    }
  }, [shouldShowShield, hasActiveSession, onForceLogout]);

  // 🛡️ PILAR 3: Lock Asíncrono y enrutamiento inteligente (vuelve a la raíz)
  const handleSafeExit = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (typeof onForceLogout === 'function') {
        await Promise.resolve(onForceLogout());
      }
      navigate('/', { replace: true });
    } catch (error) {
      console.error("Error al ejecutar salida segura:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  let shieldTitle = "Servicio Suspendido";
  let shieldMessage = "Puede que ya haya acabado nuestro horario de servicio y apagamos las peticiones en la App y QR. ¿Estamos abiertos?, pasa y consume sin compromiso.";
  let IconToRender = Store;

  if (isLocallyDisabled && globalActive) {
    if (isLlevarDisabled) {
      shieldTitle = "Solo Consumo en Sucursal";
      shieldMessage = "El servicio de pedidos digitales 'Para Llevar' está pausado por alta demanda. Sin embargo, nuestras mesas siguen disponibles. Puedes visitarnos y pedir en mesa o en mostrador.";
      IconToRender = Coffee;
    } else if (isThisMesaDisabled) {
      shieldTitle = "Mesa Fuera de Servicio";
      // 🛡️ MENSAJE DINÁMICO: Informa exactamente el número de mesa afectada
      shieldMessage = `La Mesa ${sessionTableNumber || tableId || ''} se encuentra temporalmente fuera de servicio para pedidos digitales. Por favor, solicita a nuestro personal que te asigne a otra mesa habilitada.${isStandalone ? ' Si estás en la App, selecciona otra Mesa o Para Llevar presionando el botón de abajo.' : ''}`;
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
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 p-6 pointer-events-auto"
        >
          {/* 🛡️ PILAR 4: Geometría Neo-Bento */}
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300, delay: 0.1 }}
            className="bg-white dark:bg-gray-900 lya:bg-[#F3EBE0] rounded-[2.5rem] shadow-2xl p-8 max-w-sm w-full border border-gray-100 dark:border-gray-800 lya:border-[#EADCC9] flex flex-col items-center text-center overflow-hidden relative"
          >
            <div className="absolute top-0 left-0 right-0 h-24 bg-orange-500/10 lya:bg-[#78350F]/10 rounded-t-[2.5rem]" />

            <div className="w-20 h-20 bg-orange-100 dark:bg-orange-500/20 lya:bg-[#EADCC9] text-orange-600 lya:text-[#78350F] rounded-full flex items-center justify-center mb-6 relative z-10 shadow-inner">
              <IconToRender size={40} strokeWidth={1.5} />
            </div>
            
            <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-[#3E2723] tracking-tight mb-4 relative z-10 text-center">
              {shieldTitle}
            </h2>
            
            <p className="text-gray-500 dark:text-gray-400 lya:text-[#7A6353] leading-relaxed font-medium mb-8 relative z-10 text-justify px-1">
              {shieldMessage}
              <br/><br/>
              <span className="block text-center font-bold">¡Será un placer atenderte!</span>
            </p>

            <div className="w-full relative z-10 flex flex-col gap-3">
              {isStandalone && (
                <motion.button 
                  whileTap={!isProcessing ? { scale: 0.95 } : {}}
                  disabled={isProcessing}
                  onClick={handleSafeExit} 
                  className={`w-full bg-gray-900 dark:bg-white lya:bg-[#78350F] text-white dark:text-gray-900 lya:text-[#F3EBE0] font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 outline-none select-none ${isProcessing ? 'opacity-70 cursor-not-allowed' : 'md:hover:shadow-xl'}`}
                >
                  {isProcessing ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Store size={20} />
                  )}
                  {isProcessing ? 'Saliendo...' : 'Volver a Seleccionar'}
                </motion.button>
              )}

              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.reload()}
                disabled={isProcessing}
                className="w-full bg-gray-100 dark:bg-gray-800 lya:bg-white text-gray-700 dark:text-gray-300 lya:text-[#7A6353] font-bold py-4 rounded-2xl border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] md:hover:bg-gray-200 dark:md:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 outline-none select-none"
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