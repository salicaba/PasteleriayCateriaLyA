// frontend/src/modules/client/views/components/ClientServiceShield.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Coffee, UtensilsCrossed, Home, RotateCcw } from 'lucide-react';
import { socket } from '../../../../api/socket';
import client from '../../../../api/client';

export const ClientServiceShield = ({ 
  activeOrdersCount = 0, 
  hasActiveSession = false, 
  onForceLogout,
  type,
  tableId,
  isGridMode, 
  isStandalone 
}) => {
  const [globalActive, setGlobalActive] = useState(true);
  const [disabledQrs, setDisabledQrs] = useState([]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await client.get('/settings');
      const data = res?.data || {};
      
      // Verificamos el estado global de forma segura
      setGlobalActive(data.qr_service_active !== 'false' && data.qr_service_active !== false);
      
      // Verificamos de forma defensiva la lista negra de QRs apagados
      if (data.disabled_qrs !== undefined) {
        let parsed = data.disabled_qrs;
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch (e) { parsed = []; }
        }
        setDisabledQrs(Array.isArray(parsed) ? parsed : []);
      } else {
        setDisabledQrs([]);
      }
    } catch (error) {
      console.error("Error al consultar estado de servicios", error);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const intervalId = setInterval(fetchStatus, 5000); 

    const handleConfigUpdate = (updates) => {
      if (!updates) return;
      if (updates.qr_service_active !== undefined) {
        setGlobalActive(updates.qr_service_active !== 'false' && updates.qr_service_active !== false);
      }
      if (updates.disabled_qrs !== undefined) {
        let parsed = updates.disabled_qrs;
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch (e) { parsed = []; }
        }
        setDisabledQrs(Array.isArray(parsed) ? parsed : []);
      }
    };

    const handleStatusChange = (status) => {
      setGlobalActive(status !== 'false' && status !== false);
    };

    socket.on('config:update', handleConfigUpdate);
    socket.on('qr:status_changed', handleStatusChange);
    socket.on('pos:update', fetchStatus); 

    return () => {
      clearInterval(intervalId);
      socket.off('config:update', handleConfigUpdate);
      socket.off('qr:status_changed', handleStatusChange);
      socket.off('pos:update', fetchStatus);
    };
  }, [fetchStatus]);

  // Si estamos en el Mapa/Grid principal, el Escudo se oculta para permitir elegir otra mesa u opción
  if (isGridMode) return null;

  // Blindaje estricto de arreglos para evitar errores de tipo
  const safeDisabledQrs = Array.isArray(disabledQrs) ? disabledQrs : [];

  // Lógica granular de desactivación
  const isLlevarDisabled = type === 'llevar' && (safeDisabledQrs.includes('llevar') || safeDisabledQrs.includes('takeaway'));
  const isThisMesaDisabled = type === 'mesa' && (
    safeDisabledQrs.includes(`mesa-${tableId}`) || 
    safeDisabledQrs.includes(`table-${tableId}`) ||
    safeDisabledQrs.includes(`mesa-${tableId?.toString()}`)
  );
  
  const isLocallyDisabled = isLlevarDisabled || isThisMesaDisabled;

  // Condición de visualización del escudo: Apagado global o local, y sin pedidos activos en curso
  const shouldShowShield = (!globalActive || isLocallyDisabled) && activeOrdersCount === 0;

  useEffect(() => {
    if (shouldShowShield && hasActiveSession && typeof onForceLogout === 'function') {
      onForceLogout();
    }
  }, [shouldShowShield, hasActiveSession, onForceLogout]);

  // Textos y componentes dinámicos de acuerdo al estado
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
      shieldMessage = `La Mesa ${tableId || ''} se encuentra temporalmente fuera de servicio para pedidos digitales. Por favor, solicita a nuestro personal que te asigne otra mesa habilitada.`;
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
              {/* Botón para volver al Mapeo si está en la App standalone / PWA */}
              {isStandalone && (
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={onForceLogout} 
                  className="w-full bg-gray-900 dark:bg-white lya:bg-lya-primary text-white dark:text-gray-900 lya:text-lya-surface font-black py-4 rounded-2xl md:hover:shadow-lg transition-all flex items-center justify-center gap-2 outline-none select-none"
                >
                  <Home size={18} />
                  Volver al Mapeo
                </motion.button>
              )}

              {/* Botón de comprobar servicio / recargar */}
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.reload()}
                className="w-full bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-gray-700 dark:text-gray-300 lya:text-lya-text font-bold py-4 rounded-2xl md:hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 outline-none select-none"
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