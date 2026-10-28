// src/modules/client/views/components/ClientFinalizedOverlay.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Timer, FileText, CheckCircle2, XCircle, Loader2, LogOut } from 'lucide-react';
import client from '../../../../api/client.js';

export default function ClientFinalizedOverlay({ finalizedStatus, type, handleDownloadTicket, handleLogout }) {
  const logoutRef = useRef(handleLogout);
  useEffect(() => {
    logoutRef.current = handleLogout;
  }, [handleLogout]);

  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Detectar si todos los productos de esta cuenta fueron trasladados a otra cuenta
  const [allTransferred, setAllTransferred] = useState(() => {
    if (localStorage.getItem('lya_client_all_transferred') === 'true') return true;
    try {
      const snapStr = localStorage.getItem('lya_client_snapshot');
      if (snapStr) {
        const snap = JSON.parse(snapStr);
        const regular = (snap.items || []).filter(i => !i.isVirtualDiscount && i.promoType !== 'TICKET_DISCOUNT' && i.status !== 'CANCELLED');
        if (regular.length === 0) return true;
      }
    } catch (e) {}
    return false;
  });

  const [transferredToAccounts, setTransferredToAccounts] = useState(() => {
    try {
      const saved = localStorage.getItem('lya_client_transferred_to');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    const verifyFinalAccountState = async () => {
      const orderId = localStorage.getItem('lya_client_order_id');
      const sessionStr = localStorage.getItem('lya_client_session');
      if (!orderId || !sessionStr || type !== 'mesa') return;

      try {
        const session = JSON.parse(sessionStr);
        const res = await client.get(`/pos/orders/${orderId}/status`, {
          params: { cuenta: session?.name }
        });
        const data = res.data || {};
        if (typeof data.allTransferred === 'boolean') {
          setAllTransferred(data.allTransferred);
        }
        if (Array.isArray(data.transferredToAccounts) && data.transferredToAccounts.length > 0) {
          setTransferredToAccounts(data.transferredToAccounts);
        }
      } catch (e) {}
    };

    verifyFinalAccountState();
  }, [type]);

  // Inicialización inteligente que evalúa la diferencia de tiempo al vuelo
  const [timeLeft, setTimeLeft] = useState(() => {
    let storedTime = localStorage.getItem('lya_client_finalized_at');
    if (!storedTime) {
      storedTime = Date.now().toString();
      localStorage.setItem('lya_client_finalized_at', storedTime);
    }
    const elapsed = Math.floor((Date.now() - parseInt(storedTime, 10)) / 1000);
    return Math.max(0, 60 - elapsed);
  });

  // 🔥 MOTOR DE TIEMPO ABSOLUTO (Anti-Throttling)
  useEffect(() => {
    const storedTime = localStorage.getItem('lya_client_finalized_at');
    const finalizedAt = storedTime ? parseInt(storedTime, 10) : Date.now();

    const checkTimeExact = () => {
      const elapsedSeconds = Math.floor((Date.now() - finalizedAt) / 1000);
      const remaining = Math.max(0, 60 - elapsedSeconds);
      
      if (remaining <= 0) {
        setTimeLeft(0);
        if (logoutRef.current) logoutRef.current();
        return false;
      }
      
      setTimeLeft(remaining);
      return true;
    };

    if (!checkTimeExact()) return;

    const timerId = setInterval(checkTimeExact, 500);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkTimeExact();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(timerId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [finalizedStatus]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const isClosed = finalizedStatus === 'CLOSED';
  const isTakeawayMode = type === 'llevar';
  
  const bgColor = isClosed 
    ? 'bg-emerald-500 dark:bg-emerald-600 lya:bg-[#03543F]' 
    : 'bg-red-500 dark:bg-red-600 lya:bg-[#9B1C1C]';
    
  const TitleIcon = isClosed ? CheckCircle2 : XCircle;

  const destStr = transferredToAccounts.length > 0
    ? `la cuenta de ${transferredToAccounts.join(' y ')}`
    : 'otra cuenta de la mesa';

  let headerText = isClosed ? '¡Mesa Liberada!' : 'Pedido Cancelado';
  let subText = isClosed
    ? (allTransferred
        ? `Tus productos fueron trasladados a ${destStr} y la mesa ha sido cerrada exitosamente. ¡Gracias por tu visita a 𝓛𝔂𝓪!`
        : 'Tu mesa ha sido cerrada exitosamente. ¡Gracias por tu visita a 𝓛𝔂𝓪!')
    : 'La orden ha sido cancelada desde caja.';

  if (isTakeawayMode) {
    headerText = isClosed ? '¡Cuenta Archivada!' : 'Pedido Cancelado';
    subText = isClosed ? 'Tu pedido para llevar ha sido completado y archivado. ¡Disfruta tus delicias de 𝓛𝔂𝓪!' : 'Esta cuenta para llevar ha sido cancelada por caja.';
  }

  // 🔥 Solo mostrar botón de descarga si la orden se cerró y el cliente realmente tuvo productos propios que pagar
  const canDownloadTicket = isClosed && !allTransferred;

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
    <div className={`h-full w-full flex-1 flex flex-col items-center justify-center ${bgColor} p-6 overflow-hidden text-white relative`}>
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="max-w-[420px] w-full bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-[2.5rem] flex flex-col items-center text-center relative z-10 shadow-2xl"
      >
        <TitleIcon size={68} className="mb-5 shadow-lg rounded-full bg-white/20 p-3 animate-bounce" />
        <h2 className="text-3xl font-black tracking-tight mb-3 text-center uppercase drop-shadow-sm">
          {headerText}
        </h2>
        <p className="font-medium text-sm mb-6 opacity-90 text-justify px-2 leading-relaxed">
          {subText}
        </p>

        <div className="text-5xl font-black mb-8 flex items-center justify-center gap-3 drop-shadow-lg bg-black/10 px-6 py-3 rounded-2xl border border-white/10 w-full select-none">
          <Timer size={36} className="animate-pulse text-white" />
          <span className="tabular-nums font-mono tracking-wider">{formattedTime}</span>
        </div>

        <div className="w-full space-y-3">
          {canDownloadTicket && (
            <motion.button 
              whileTap={{ scale: 0.95 }} 
              onClick={onDownloadTicket} 
              disabled={isDownloading || isLoggingOut}
              className="w-full py-4 bg-white text-emerald-700 rounded-2xl font-black shadow-xl outline-none flex items-center justify-center gap-2 transition-all md:hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
              {isDownloading ? 'Generando...' : 'Bajar Comprobante'}
            </motion.button>
          )}
          
          <motion.button 
            whileTap={{ scale: 0.95 }} 
            onClick={onLogoutClick} 
            disabled={isLoggingOut || isDownloading}
            className="w-full py-4 text-white/80 md:hover:text-white underline font-bold rounded-2xl transition-all outline-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-center text-sm"
          >
            {isLoggingOut ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
            {isTakeawayMode ? 'Salir de la cuenta ahora' : 'Salir de la mesa ahora'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}