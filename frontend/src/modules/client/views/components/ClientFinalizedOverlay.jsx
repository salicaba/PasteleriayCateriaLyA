// src/modules/client/views/components/ClientFinalizedOverlay.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Timer, FileText, CheckCircle2, XCircle } from 'lucide-react';

export default function ClientFinalizedOverlay({ finalizedStatus, type, handleDownloadTicket, handleLogout }) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const storedTime = localStorage.getItem('lya_client_finalized_at');
    if (storedTime) {
      const elapsed = Math.floor((Date.now() - parseInt(storedTime, 10)) / 1000);
      return Math.max(0, 60 - elapsed);
    }
    return 60;
  });

  useEffect(() => {
    let storedTime = localStorage.getItem('lya_client_finalized_at');
    if (!storedTime) {
      storedTime = Date.now().toString();
      localStorage.setItem('lya_client_finalized_at', storedTime);
    }
    
    const finalizedAt = parseInt(storedTime, 10);

    const tickTimer = () => {
      const elapsedSeconds = Math.floor((Date.now() - finalizedAt) / 1000);
      const remaining = Math.max(0, 60 - elapsedSeconds);
      setTimeLeft(remaining);
      return remaining;
    };

    const initialRemaining = tickTimer();
    if (initialRemaining <= 0) {
      handleLogout();
      return;
    }

    const timerId = setInterval(() => {
      const currentRemaining = tickTimer();
      if (currentRemaining <= 0) {
        clearInterval(timerId); 
        handleLogout();
      }
    }, 1000);
    
    return () => clearInterval(timerId); 
  }, [finalizedStatus, handleLogout]);

  const isClosed = finalizedStatus === 'CLOSED';
  const isTakeawayMode = type === 'llevar';
  const bgColor = isClosed ? 'bg-emerald-500 dark:bg-emerald-600 lya:bg-[#03543F]' : 'bg-red-500 dark:bg-red-600 lya:bg-[#9B1C1C]';
  const TitleIcon = isClosed ? CheckCircle2 : XCircle;

  // Pilar 4: Determinación de Textos Dinámicos Premium Justificados
  let headerText = isClosed ? '¡Mesa Liberada!' : 'Pedido Cancelado';
  let subText = isClosed ? 'Tu mesa ha sido cerrada exitosamente. ¡Gracias por tu visita!' : 'La orden ha sido cancelada desde caja.';

  if (isTakeawayMode) {
    headerText = isClosed ? '¡Cuenta Archivada!' : 'Pedido Cancelado';
    subText = isClosed ? 'Tu pedido para llevar ha sido completado y archivado. ¡Disfruta tus delicias!' : 'Esta cuenta para llevar ha sido cancelada por caja.';
  }

  return (
    <div className={`h-full w-full flex-1 flex flex-col items-center justify-center ${bgColor} p-6 overflow-hidden text-white relative`}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        className="max-w-[400px] w-full flex flex-col items-center text-center relative z-10"
      >
        <TitleIcon size={64} className="mb-4 shadow-sm rounded-full bg-white/20 p-2 animate-bounce" />
        
        <h2 className="text-3xl font-black tracking-tight mb-2 text-center">
           {headerText}
        </h2>
        <p className="font-medium text-sm mb-6 opacity-90 text-center px-4 text-justify">
           {subText}
        </p>

        <div className="text-5xl font-black mb-8 flex items-center justify-center gap-3 drop-shadow-md">
          <Timer size={36} className="animate-pulse text-white" />
          <span>00:{timeLeft.toString().padStart(2, '0')}</span>
        </div>

        <div className="w-full space-y-3">
          <motion.button 
            whileTap={{ scale: 0.95 }} 
            onClick={handleDownloadTicket} 
            className={`w-full py-4 bg-white ${isClosed ? 'text-emerald-600' : 'text-red-600'} rounded-2xl font-black shadow-xl outline-none flex items-center justify-center gap-2`}
          >
            <FileText size={20} />
            Bajar Comprobante
          </motion.button>
          
          <motion.button 
            whileTap={{ scale: 0.95 }} 
            onClick={handleLogout} 
            className="w-full py-4 text-white/70 md:hover:text-white underline font-bold rounded-2xl transition-all outline-none text-center"
          >
            {isTakeawayMode ? 'Salir de la cuenta ahora' : 'Salir de la mesa ahora'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}