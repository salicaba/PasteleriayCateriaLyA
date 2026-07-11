// src/modules/client/views/components/ClientFinalizedOverlay.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Timer, FileText, CheckCircle2, XCircle, Loader2, LogOut } from 'lucide-react';

export default function ClientFinalizedOverlay({ finalizedStatus, type, handleDownloadTicket, handleLogout }) {
  // Guardar handleLogout en una referencia para evitar que cambios de referencia reinicien el setInterval
  const logoutRef = useRef(handleLogout);
  useEffect(() => {
    logoutRef.current = handleLogout;
  }, [handleLogout]);

  // Estados de bloqueo asíncrono para cumplir con el Pilar 3
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Inicialización del tiempo restante basada en localStorage
  const [timeLeft, setTimeLeft] = useState(() => {
    let storedTime = localStorage.getItem('lya_client_finalized_at');
    if (!storedTime) {
      storedTime = Date.now().toString();
      localStorage.setItem('lya_client_finalized_at', storedTime);
    }
    const elapsed = Math.floor((Date.now() - parseInt(storedTime, 10)) / 1000);
    return Math.max(0, 60 - elapsed);
  });

  // Efecto del Temporizador Reactivo Inmune a Interferencias
  useEffect(() => {
    const storedTime = localStorage.getItem('lya_client_finalized_at');
    const finalizedAt = storedTime ? parseInt(storedTime, 10) : Date.now();

    const tickTimer = () => {
      const elapsedSeconds = Math.floor((Date.now() - finalizedAt) / 1000);
      const remaining = Math.max(0, 60 - elapsedSeconds);
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        if (logoutRef.current) logoutRef.current();
        return false;
      }
      return true;
    };

    // Verificación inicial inmediata
    const shouldContinue = tickTimer();
    if (!shouldContinue) return;

    // Intervalo de actualización estricto cada 1 segundo
    const timerId = setInterval(() => {
      const active = tickTimer();
      if (!active) {
        clearInterval(timerId);
      }
    }, 1000);
    
    return () => clearInterval(timerId); 
  }, [finalizedStatus]);

  // Formateo correcto del tiempo para solucionar el Problema 1 (01:00 en lugar de 00:60)
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const isClosed = finalizedStatus === 'CLOSED';
  const isTakeawayMode = type === 'llevar';
  
  // Colores semánticos según la marca 𝓛𝔂𝓪
  const bgColor = isClosed 
    ? 'bg-emerald-500 dark:bg-emerald-600 lya:bg-[#03543F]' 
    : 'bg-red-500 dark:bg-red-600 lya:bg-[#9B1C1C]';
    
  const TitleIcon = isClosed ? CheckCircle2 : XCircle;

  // Pilar 4: Determinación de Textos Dinámicos Premium Justificados y Centrados
  let headerText = isClosed ? '¡Mesa Liberada!' : 'Pedido Cancelado';
  let subText = isClosed ? 'Tu mesa ha sido cerrada exitosamente. ¡Gracias por tu visita a 𝓛𝔂𝓪!' : 'La orden ha sido cancelada desde caja.';

  if (isTakeawayMode) {
    headerText = isClosed ? '¡Cuenta Archivada!' : 'Pedido Cancelado';
    subText = isClosed ? 'Tu pedido para llevar ha sido completado y archivado. ¡Disfruta tus delicias de 𝓛𝔂𝓪!' : 'Esta cuenta para llevar ha sido cancelada por caja.';
  }

  // Manejadores asíncronos con Locks de protección anti-doble clic (Pilar 3)
  const onDownloadTicket = async () => {
    if (isDownloading || isLoggingOut) return;
    setIsDownloading(true);
    try {
      await handleDownloadTicket();
    } catch (error) {
      console.error("Error al descargar el comprobante:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const onLogoutClick = async () => {
    if (isLoggingOut || isDownloading) return;
    setIsLoggingOut(true);
    try {
      await handleLogout();
    } catch (error) {
      console.error("Error al salir de la cuenta:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    // PILAR 1: Contenedor raíz con anti-ghost scroll absoluto
    <div className={`h-full w-full flex-1 flex flex-col items-center justify-center ${bgColor} p-6 overflow-hidden text-white relative`}>
      
      {/* Animación fluida de entrada Neo-Bento */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="max-w-[420px] w-full bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-[2.5rem] flex flex-col items-center text-center relative z-10 shadow-2xl"
      >
        <TitleIcon size={68} className="mb-5 shadow-lg rounded-full bg-white/20 p-3 animate-bounce" />
        
        {/* PILAR 4: Títulos con alineación semántica estricta */}
        <h2 className="text-3xl font-black tracking-tight mb-3 text-center uppercase drop-shadow-sm">
           {headerText}
        </h2>
        
        {/* PILAR 4: Textos descriptivos largos obligatoriamente justificados */}
        <p className="font-medium text-sm mb-6 opacity-90 text-justify px-2 leading-relaxed">
           {subText}
        </p>

        {/* Muestra del cronómetro en tiempo real corregido */}
        <div className="text-5xl font-black mb-8 flex items-center justify-center gap-3 drop-shadow-lg bg-black/10 px-6 py-3 rounded-2xl border border-white/10 w-full select-none">
          <Timer size={36} className="animate-pulse text-white" />
          <span className="tabular-nums font-mono tracking-wider">{formattedTime}</span>
        </div>

        <div className="w-full space-y-3">
          {/* PILAR 2 y 3: Blindaje táctil en móviles, hovers restringidos a desktop y lock asíncrono */}
          <motion.button 
            whileTap={{ scale: 0.95 }} 
            onClick={onDownloadTicket} 
            disabled={isDownloading || isLoggingOut}
            className={`w-full py-4 bg-white ${isClosed ? 'text-emerald-700' : 'text-red-700'} rounded-2xl font-black shadow-xl outline-none flex items-center justify-center gap-2 transition-all md:hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isDownloading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <FileText size={20} />
            )}
            {isDownloading ? 'Generando...' : 'Bajar Comprobante'}
          </motion.button>
          
          {/* PILAR 2 y 3: Botón secundario con feedback táctil y bloqueo */}
          <motion.button 
            whileTap={{ scale: 0.95 }} 
            onClick={onLogoutClick} 
            disabled={isLoggingOut || isDownloading}
            className="w-full py-4 text-white/80 md:hover:text-white underline font-bold rounded-2xl transition-all outline-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-center text-sm"
          >
            {isLoggingOut ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <LogOut size={18} />
            )}
            {isTakeawayMode ? 'Salir de la cuenta ahora' : 'Salir de la mesa ahora'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}