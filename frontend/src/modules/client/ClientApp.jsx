import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QrCode, ShieldAlert, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

import ClientLogin from './views/ClientLogin';
import ClientMenu from './views/ClientMenu';
// Importación del escudo de conexión previamente desarrollado
import ClientConnectionShield from './views/components/ClientConnectionShield';

// 🔥 IMPORTACIÓN CLAVE: Tu instancia de WebSockets para comunicación en tiempo real
import socket from '../api/socket'; 

const THEME_CLASSES = ['light', 'dark', 'theme-lya'];

// Función para auto-detectar el tema preferido
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
  
  // Extraemos el token de seguridad de la URL actual (ejemplo: ?token=abc123xyz)
  const qrTokenUrl = searchParams.get('token') || '';

  const [themeIndex] = useState(getInitialTheme);
  const [isQrValid, setIsQrValid] = useState(true); // Estado de validación del QR escaneado

  // Inyecta el tema al cargar la app
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

  // 🔥 VALIDACIÓN DE SEGURIDAD DEL QR Y ESCUCHA EN TIEMPO REAL
  useEffect(() => {
    // 1. Verificación inicial pasiva/HTTP
    const verifyQrTokenValidity = async () => {
      if (!tableId) return;
      
      try {
        // AQUÍ HARÁ LA PETICIÓN AL BACKEND PARA VALIDAR EL TOKEN
        // const response = await api.get(`/client/verify-table/${tableId}?token=${qrTokenUrl}`);
        // if (!response.data.valid) { setIsQrValid(false); handleClientLogout(); return; }
        
        // Simulación de validación exitosa (remplaza esto con tu llamada real)
        setIsQrValid(true); 
      } catch (error) {
        setIsQrValid(false);
        handleClientLogout();
      }
    };

    verifyQrTokenValidity();

    // 2. EL PUENTE MÁGICO: Escucha activa de WebSockets para la expulsión en vivo
    const handleSecurityUpdate = () => {
      // Cuando el admin presiona "Regenerar QRs", el servidor emite 'qr_security_update'
      // Este bloque se ejecuta al instante en todos los celulares conectados.
      setIsQrValid(false);
      handleClientLogout();
    };

    // Nos suscribimos al evento de seguridad del socket
    socket.on('qr_security_update', handleSecurityUpdate);

    // Limpieza estricta: nos desuscribimos si el cliente cierra la pestaña o sale
    return () => {
      socket.off('qr_security_update', handleSecurityUpdate);
    };
  }, [tableId, qrTokenUrl]); // Las dependencias aseguran que si cambia de mesa, se re-suscriba

  // 🔥 FUNCIÓN CLAVE: Borra la sesión local y resetea la pantalla
  const handleClientLogout = () => {
    localStorage.removeItem('lya_client_session');
    setClientData(null);
  };

  return (
    // PILAR 1: h-[100dvh] para blindar el Viewport Móvil contra barras de navegación reactivas
    <div className="h-[100dvh] w-full flex flex-col transition-colors duration-300 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg text-gray-900 dark:text-gray-100 lya:text-lya-text relative overflow-hidden">
      
      <ClientConnectionShield>
        <Toaster position="top-center" />
        
        <main className="flex-1 flex flex-col w-full max-w-md mx-auto relative h-full z-10">
          {!clientData ? (
            <ClientLogin 
              onLogin={(data) => {
                setClientData(data);
                localStorage.setItem('lya_client_session', JSON.stringify(data));
              }} 
              type={type} 
              tableId={tableId} 
            />
          ) : (
            <ClientMenu 
              clientData={clientData} 
              type={type} 
              tableId={tableId} 
              onLogout={handleClientLogout}
            />
          )}
        </main>

        {/* PILAR 5: Bloqueo de Interfaz con Animación Fluida Neo-Bento en lugar de alerts */}
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
                {/* Iconografía Premium */}
                <div className="relative mb-5 flex items-center justify-center">
                  <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 rounded-[1.75rem] flex items-center justify-center border border-red-200 dark:border-red-500/20 shadow-inner">
                    <QrCode size={38} className="text-red-500" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-gray-800">
                    <ShieldAlert size={12} className="text-white" />
                  </div>
                </div>

                {/* Textos Informativos */}
                <h3 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text leading-tight mb-3">
                  Código QR Expirado
                </h3>
                
                {/* PILAR 4: Texto Justificado */}
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/70 text-justify leading-relaxed mb-6 px-1">
                  El enlace del menú digital que has escaneado ya no es válido debido a una actualización de seguridad del establecimiento. Esto evita que personas externas interfieran con las órdenes de las mesas.
                </p>

                {/* Caja de Ayuda Bento */}
                <div className="w-full bg-gray-50 dark:bg-gray-900/50 lya:bg-lya-bg p-4 rounded-[1.5rem] border border-gray-100 dark:border-gray-700/60 lya:border-lya-border/30 flex items-start gap-3 text-left">
                  <div className="p-2 bg-white dark:bg-gray-800 lya:bg-white rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 shadow-sm shrink-0">
                    <UserCheck size={18} className="text-orange-500 lya:text-lya-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-gray-900 dark:text-white lya:text-lya-text uppercase tracking-wider mb-0.5">¿Qué debes hacer?</h4>
                    <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-justify leading-snug">
                      Por favor, solicita al personal de 𝓛𝔂ὰ que te proporcione el nuevo código QR físico de la mesa para escanearlo y continuar con tu experiencia.
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