import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QrCode, ShieldAlert, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

import ClientLogin from './views/ClientLogin';
import ClientMenu from './views/ClientMenu';
import ClientConnectionShield from './views/components/ClientConnectionShield';

import { socket } from '../../api/socket'; 

const THEME_CLASSES = ['light', 'dark', 'theme-lya'];

const getInitialTheme = () => {
  const saved = localStorage.getItem('lya_client_theme');
  if (saved !== null) return Number(saved);
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 1; 
  }
  return 2; 
};

export default function ClientApp({ type }) {
  const { tableId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const qrTokenUrl = searchParams.get('token') || '';

  const [themeIndex] = useState(getInitialTheme);
  const [isQrValid, setIsQrValid] = useState(true);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'theme-lya');
    root.classList.add(THEME_CLASSES[themeIndex]);
    if (localStorage.getItem('lya_client_theme') === null) {
      localStorage.setItem('lya_client_theme', themeIndex);
    }
  }, [themeIndex]);

  const [clientData, setClientData] = useState(() => {
    const saved = localStorage.getItem('lya_client_session');
    return saved ? JSON.parse(saved) : null;
  });

  // 🔥 VALIDACIÓN DE CONTAMINACIÓN CRUZADA (Redirección Inteligente)
  useEffect(() => {
    if (clientData) {
      const { type: sessionType, tableId: sessionTableId } = clientData;
      
      let needsRedirect = false;
      let targetPath = '';

      if (sessionType && sessionType !== type) {
        needsRedirect = true;
        targetPath = sessionType === 'mesa' ? `/m/${sessionTableId}` : '/llevar';
      } 
      else if (sessionType === 'mesa' && type === 'mesa' && sessionTableId && sessionTableId !== tableId) {
        needsRedirect = true;
        targetPath = `/m/${sessionTableId}`;
      }

      if (needsRedirect && targetPath) {
        navigate(targetPath, { replace: true });
      }
    }
  }, [clientData, type, tableId, navigate]);

  useEffect(() => {
    const verifyQrTokenValidity = async () => {
      if (!tableId) return;
      try {
        setIsQrValid(true); 
      } catch (error) {
        setIsQrValid(false);
        handleClientLogout();
      }
    };

    verifyQrTokenValidity();

    const handleSecurityUpdate = () => {
      setIsQrValid(false);
      handleClientLogout();
    };

    socket.on('qr_security_update', handleSecurityUpdate);

    return () => {
      socket.off('qr_security_update', handleSecurityUpdate);
    };
  }, [tableId, qrTokenUrl]);

  const handleClientLogout = () => {
    localStorage.removeItem('lya_client_session');
    setClientData(null);
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col transition-colors duration-300 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg text-gray-900 dark:text-gray-100 lya:text-lya-text relative overflow-hidden">
      
      <ClientConnectionShield>
        <Toaster position="top-center" />
        
        <main className="flex-1 flex flex-col w-full max-w-md mx-auto relative h-full z-10">
          {!clientData ? (
            <ClientLogin 
              onLogin={(data) => {
                const sessionData = { ...data, type, tableId };
                setClientData(sessionData);
                localStorage.setItem('lya_client_session', JSON.stringify(sessionData));
              }} 
              type={type} 
              tableId={tableId} 
            />
          ) : (
            <ClientMenu 
              clientData={clientData} 
              // 🔥 ESCUDO DE INTERFAZ: Si ya hay una sesión, la UI SIEMPRE muestra la mesa real guardada
              type={clientData.type || type} 
              tableId={clientData.tableId || tableId} 
              onLogout={handleClientLogout}
            />
          )}
        </main>

        <AnimatePresence>
          {!isQrValid && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 h-[100dvh] w-full bg-black/50 dark:bg-black/70 backdrop-blur-md pointer-events-auto">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 40 }}
                transition={{ type: 'spring', damping: 25, stiffness: 230 }}
                className="bg-white dark:bg-gray-800 lya:bg-lya-surface w-full max-w-sm rounded-[2.5rem] shadow-2xl p-6 border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 flex flex-col items-center text-center overflow-hidden"
              >
                <div className="relative mb-5 flex items-center justify-center">
                  <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 rounded-[1.75rem] flex items-center justify-center border border-red-200 dark:border-red-500/20 shadow-inner">
                    <QrCode size={38} className="text-red-500" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-gray-800">
                    <ShieldAlert size={12} className="text-white" />
                  </div>
                </div>

                <h3 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text leading-tight mb-3">
                  Código QR Expirado
                </h3>
                
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/70 text-justify leading-relaxed mb-6 px-1">
                  El enlace del menú digital que has escaneado ya no es válido debido a una actualización de seguridad del establecimiento. Esto evita que personas externas interfieran con las órdenes de las mesas.
                </p>

                <div className="w-full bg-gray-50 dark:bg-gray-900/50 lya:bg-lya-bg p-4 rounded-[1.5rem] border border-gray-100 dark:border-gray-700/60 lya:border-lya-border/30 flex items-start gap-3 text-left">
                  <div className="p-2 bg-white dark:bg-gray-800 lya:bg-white rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 shadow-sm shrink-0">
                    <UserCheck size={18} className="text-orange-500 lya:text-lya-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-gray-900 dark:text-white lya:text-lya-text uppercase tracking-wider mb-0.5">¿Qué debes hacer?</h4>
                    <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-justify leading-snug">
                      Por favor, solicita al personal de 𝓛𝔂𝓪 que te proporcione el nuevo código QR físico de la mesa para escanearlo y continuar con tu experiencia.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </ClientConnectionShield>
    </div>
  );
}