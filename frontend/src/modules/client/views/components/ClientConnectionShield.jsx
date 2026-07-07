// src/modules/client/views/components/ClientConnectionShield.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, Loader2, AlertTriangle, UserCheck } from 'lucide-react';
import clsx from 'clsx';

export default function ClientConnectionShield({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [hasCheckedOnce, setHasCheckedOnce] = useState(false);

  // Función de alta fidelidad para verificar la conexión real midiendo latencia
  const verifyRealConnectivity = useCallback(async () => {
    if (!navigator.onLine) {
      setIsOnline(false);
      setIsSlowConnection(false);
      return false;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5 segundos máximo de espera

    try {
      // Realizamos un mini-ping a un endpoint ligero del propio dominio para medir velocidad real
      const startTime = performance.now();
      await fetch('/index.html', { 
        method: 'HEAD', 
        cache: 'no-store',
        signal: controller.signal 
      });
      const duration = performance.now() - startTime;
      clearTimeout(timeoutId);

      setIsOnline(true);
      // Si la petición tarda más de 2.2 segundos, consideramos la señal críticamente lenta
      if (duration > 2200) {
        setIsSlowConnection(true);
        return false;
      }

      setIsSlowConnection(false);
      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      setIsOnline(true); // Está en la red, pero no llega al servidor
      setIsSlowConnection(true); // Lo tratamos como falla de latencia/señal muerta
      return false;
    }
  }, []);

  // Escuchadores nativos del navegador para cambios drásticos de red
  useEffect(() => {
    const handleOnline = () => {
      verifyRealConnectivity();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setIsSlowConnection(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificación inicial automática al montar el cliente
    verifyRealConnectivity().finally(() => setHasCheckedOnce(true));

    // Intervalo de seguridad pasivo cada 15 segundos para prever caídas silenciosas
    const interval = setInterval(() => {
      if (navigator.onLine && !isSlowConnection) {
        // Chequeo rápido en segundo plano sin alterar loaders si todo está correcto
        fetch('/index.html', { method: 'HEAD', cache: 'no-store' }).catch(() => {
          setIsSlowConnection(true);
        });
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [verifyRealConnectivity, isSlowConnection]);

  // Manejador manual del botón "Reintentar Conexión"
  const handleRetry = async (e) => {
    e.preventDefault();
    if (isChecking) return; // PILAR 3: Bloqueo anti-doble clic
    setIsChecking(true);

    // Agregamos un retraso artificial mínimo de 800ms para feedback visual óptimo en el loader táctil
    await new Promise((resolve) => setTimeout(resolve, 800));
    await verifyRealConnectivity();
    
    setIsChecking(false);
  };

  const showOverlay = !isOnline || isSlowConnection;

  return (
    <>
      {/* Contenido principal de la aplicación del cliente */}
      <div className={clsx("w-full h-full flex-1", showOverlay && "pointer-events-none select-none blur-[2px] transition-all")}>
        {children}
      </div>

      {/* Pantalla de Bloqueo Ininterrumpible en formato Neo-Bento */}
      <AnimatePresence>
        {showOverlay && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 h-[100dvh] w-full overflow-hidden bg-black/40 dark:bg-black/60 pointer-events-auto backdrop-blur-md">
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 240 }}
              className="bg-white dark:bg-gray-800 lya:bg-lya-surface w-full max-w-sm rounded-[2.5rem] shadow-2xl p-6 border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 flex flex-col items-center text-center max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              {/* Contenedor del Icono Neo-Bento */}
              <div className="relative mb-6 flex items-center justify-center">
                <div className="w-20 h-20 bg-orange-100 dark:bg-orange-500/10 lya:bg-lya-secondary/10 rounded-[1.75rem] flex items-center justify-center border border-orange-200 dark:border-orange-500/20 lya:border-lya-secondary/20 shadow-inner">
                  {isOnline ? (
                    <AlertTriangle size={40} className="text-orange-500 lya:text-lya-secondary" />
                  ) : (
                    <WifiOff size={40} className="text-red-500" />
                  )}
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center animate-pulse shadow-md">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              </div>

              {/* TÍTULO CENTRAL */}
              <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text leading-tight mb-3">
                {isOnline ? 'Señal muy Débil' : 'Sin Conexión'}
              </h2>

              {/* TEXTO DESCRIPTIVO JUSTIFICADO (PILAR 4) */}
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/70 text-justify leading-relaxed mb-6 px-1">
                {isOnline 
                  ? 'Detectamos que tu señal de internet es demasiado lenta o inestable. Para evitar que tus productos se dupliquen o que tu pedido se envíe incorrectamente a cocina, hemos pausado temporalmente la pantalla.'
                  : 'Parece que has perdido la conexión a internet. Verifica que estés conectado a la red Wi-Fi de la sucursal o que tus datos móviles se encuentren activos para poder continuar con tu orden.'}
              </p>

              {/* CONTENEDOR DE AVISO AL PERSONAL */}
              <div className="w-full bg-gray-50 dark:bg-gray-900/50 lya:bg-lya-bg p-4 rounded-[1.5rem] border border-gray-100 dark:border-gray-700/60 lya:border-lya-border/30 flex items-start gap-3 text-left mb-6">
                <div className="p-2 bg-white dark:bg-gray-800 lya:bg-white rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 shadow-sm shrink-0">
                  <UserCheck size={18} className="text-orange-600 lya:text-lya-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-black text-gray-900 dark:text-white lya:text-lya-text uppercase tracking-wider mb-0.5">¿El problema persiste?</h4>
                  <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-justify leading-snug">
                    Por favor, solicita la asistencia de un miembro del personal. Con gusto tomaremos tu orden directamente en tu mesa.
                  </p>
                </div>
              </div>

              {/* BOTÓN DE REINTENTAR CON ACCIÓN TÁCTIL BLINDADA (PILAR 2 Y 3) */}
              <motion.button
                type="button"
                whileTap={isChecking ? {} : { scale: 0.95 }}
                disabled={isChecking}
                onClick={handleRetry}
                className={clsx(
                  "w-full py-4 rounded-[1.5rem] font-black text-base flex items-center justify-center gap-2 transition-all outline-none select-none touch-manipulation shadow-lg",
                  isChecking
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed shadow-none"
                    : "bg-orange-500 md:hover:bg-orange-600 text-white shadow-orange-500/30 lya:bg-lya-primary lya:text-lya-surface lya:shadow-lya-primary/30"
                )}
              >
                {isChecking ? (
                  <>
                    <Loader2 className="animate-spin pointer-events-none" size={20} />
                    <span>Verificando red...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="pointer-events-none" size={18} strokeWidth={2.5} />
                    <span>Reintentar conexión</span>
                  </>
                )}
              </motion.button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}