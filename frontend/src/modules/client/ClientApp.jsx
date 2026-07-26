import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QrCode, ShieldAlert, UserCheck, Download, MonitorSmartphone, Utensils, Coffee, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

import ClientLogin from './views/ClientLogin';
import ClientMenu from './views/ClientMenu';
import ClientConnectionShield from './views/components/ClientConnectionShield';
import { ClientServiceShield } from './views/components/ClientServiceShield';
import { socket } from '../../api/socket';

// IMPORTANTE: Asegúrate de tener este hook creado (Paso 3 de la instrucción anterior)
import { usePWA } from '../../hooks/usePWA';

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
  const { tableId: urlTableId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qrTokenUrl = searchParams.get('token') || '';

  // ============================================================================
  // PWA & STANDALONE STATE
  // ============================================================================
  const { isInstallable, promptInstall, isStandalone } = usePWA();
  
  // Estado para manejar la selección manual en la App Instalada (Standalone)
  const [standaloneSelection, setStandaloneSelection] = useState(null); // { type, tableId }
  const [isProcessingSelection, setIsProcessingSelection] = useState(null); // Bloqueo Anti-Doble Clic (Pilar 3)

  // Variables efectivas: Priorizamos la selección standalone, luego la URL
  const effectiveType = standaloneSelection?.type || type;
  const effectiveTableId = standaloneSelection?.tableId || urlTableId;

  // ============================================================================
  // SESIÓN Y THEME STATE
  // ============================================================================
  const [themeIndex] = useState(getInitialTheme);
  const [isQrValid, setIsQrValid] = useState(true);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

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

  // ============================================================================
  // VALIDACIONES DE SEGURIDAD (CONTAMINACIÓN CRUZADA & QR)
  // ============================================================================
  useEffect(() => {
    if (clientData) {
      const { type: sessionType, tableId: sessionTableId } = clientData;
      let needsRedirect = false;
      let targetPath = '';

      if (sessionType && sessionType !== type) {
        needsRedirect = true;
        targetPath = sessionType === 'mesa' ? `/m/${sessionTableId}` : '/llevar';
      } else if (sessionType === 'mesa' && type === 'mesa' && sessionTableId && sessionTableId !== urlTableId) {
        needsRedirect = true;
        targetPath = `/m/${sessionTableId}`;
      }

      if (needsRedirect && targetPath) {
        navigate(targetPath, { replace: true });
      }
    }
  }, [clientData, type, urlTableId, navigate]);

  const handleClientLogout = React.useCallback(() => {
    localStorage.removeItem('lya_client_session');
    setClientData(null);
    setActiveOrdersCount(0);
    setStandaloneSelection(null); // Limpiamos la selección si es Standalone
  }, []);

  useEffect(() => {
    // Si la App está instalada nativamente, obviamos la validación del token QR
    // ya que el cliente entra desde la pantalla de inicio del dispositivo.
    if (isStandalone) {
      setIsQrValid(true);
      return;
    }

    const verifyQrTokenValidity = async () => {
      if (!urlTableId) return;
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
  }, [urlTableId, qrTokenUrl, handleClientLogout, isStandalone]);

  // ============================================================================
  // LÓGICA DE GRID STANDALONE (PWA)
  // ============================================================================
  const handleStandaloneSelect = async (selectedType, selectedTableId) => {
    if (isProcessingSelection) return;
    setIsProcessingSelection(selectedTableId || 'takeaway');
    
    try {
      // Retardo asíncrono para UX de carga (previene flickering)
      await new Promise(resolve => setTimeout(resolve, 600));
      setStandaloneSelection({ type: selectedType, tableId: selectedTableId });
      // Si se requiere enrutamiento para sincronizar la URL:
      // if (selectedType === 'mesa') navigate(`/m/${selectedTableId}`);
    } finally {
      setIsProcessingSelection(null);
    }
  };

  // Simulación de mesas activas (En producción debes mapear esto de tu backend/sockets)
  const activeTables = [
    { id: '1', name: 'Mesa 1', status: 'available' },
    { id: '2', name: 'Mesa 2', status: 'available' },
    { id: '3', name: 'Mesa 3', status: 'occupied' }, // status: occupied bloquea la selección
  ];

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================
  return (
    <div className="h-[100dvh] w-full flex flex-col transition-colors duration-300 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg text-gray-900 dark:text-gray-100 lya:text-lya-text relative overflow-hidden">
      <ClientConnectionShield>
        
        {/* 🚀 EL ESCUDO VERDUGO CON CONTEXTO GRANULAR */}
        <ClientServiceShield 
          activeOrdersCount={!clientData ? 0 : activeOrdersCount} 
          hasActiveSession={!!clientData}
          onForceLogout={handleClientLogout}
          type={effectiveType} 
          tableId={effectiveTableId} 
        />

        <Toaster position="top-center" />
        
        <main className="flex-1 flex flex-col w-full max-w-md mx-auto relative h-full z-10">
          {!clientData ? (
            
            // BIFURCACIÓN DE LOGIN: APP INSTALADA VS NAVEGADOR
            isStandalone && !standaloneSelection ? (
              
              /* PANTALLA GRID PWA (Sin necesidad de QR físico) */
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col h-full w-full">
                <header className="mb-8 mt-4 text-center">
                  <h1 className="text-2xl font-black mb-1">Bienvenido a LyA</h1>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Selecciona cómo deseas ordenar</p>
                </header>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
                  {/* Para Llevar */}
                  <section>
                    <motion.button
                      whileTap={isProcessingSelection ? {} : { scale: 0.95 }}
                      disabled={isProcessingSelection !== null}
                      onClick={() => handleStandaloneSelect('llevar', null)}
                      className={`w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-[2rem] p-6 shadow-xl flex items-center justify-between transition-all md:hover:shadow-2xl ${
                        isProcessingSelection === 'takeaway' ? 'opacity-70' : 'opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-white/10 dark:bg-gray-900/10 p-4 rounded-2xl">
                          <Coffee className="w-7 h-7" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-xl font-bold">Para Llevar</h3>
                          <p className="text-sm opacity-80 mt-1">Recoge en mostrador</p>
                        </div>
                      </div>
                      {isProcessingSelection === 'takeaway' && <Loader2 className="w-6 h-6 animate-spin" />}
                    </motion.button>
                  </section>

                  {/* En Mesa */}
                  <section>
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Consumo en Local</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {activeTables.map((table) => {
                        const isOccupied = table.status === 'occupied';
                        const isThisProcessing = isProcessingSelection === table.id;

                        return (
                          <motion.button
                            key={table.id}
                            whileTap={isOccupied || isProcessingSelection ? {} : { scale: 0.95 }}
                            disabled={isOccupied || isProcessingSelection !== null}
                            onClick={() => handleStandaloneSelect('mesa', table.id)}
                            className={`relative p-5 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border ${
                              isOccupied
                                ? 'bg-gray-100 dark:bg-gray-800 border-transparent cursor-not-allowed opacity-50'
                                : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm md:hover:shadow-md'
                            }`}
                          >
                            {isThisProcessing ? (
                              <Loader2 className="w-7 h-7 animate-spin" />
                            ) : (
                              <Utensils className={`w-7 h-7 ${isOccupied ? 'opacity-40' : ''}`} />
                            )}
                            <span className="font-bold text-sm">{table.name}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </section>
                </motion.div>
              </div>

            ) : (

              /* LOGIN TRADICIONAL (Ya sea escaneado por QR o seleccionado en Grid Standalone) */
              <div className="w-full flex-1 flex flex-col overflow-y-auto custom-scrollbar relative">
                
                {/* PROMPT INSTALACIÓN PWA (Sólo visible en Navegador) */}
                {!isStandalone && isInstallable && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                    className="m-4 mb-0 bg-gray-900 dark:bg-white rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4 z-20 shrink-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-white/10 dark:bg-gray-900/10 p-2 rounded-xl shrink-0">
                        <MonitorSmartphone className="w-5 h-5 text-white dark:text-gray-900" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white dark:text-gray-900">App de LyA</h4>
                        <p className="text-[11px] text-gray-300 dark:text-gray-600 leading-tight mt-0.5">Más rápida, sin escanear QR.</p>
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={promptInstall}
                      className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-bold px-4 py-2 rounded-xl shrink-0"
                    >
                      Instalar
                    </motion.button>
                  </motion.div>
                )}

                <ClientLogin 
                  onLogin={(data) => {
                    const sessionData = { ...data, type: effectiveType, tableId: effectiveTableId };
                    setClientData(sessionData);
                    localStorage.setItem('lya_client_session', JSON.stringify(sessionData));
                  }} 
                  type={effectiveType} 
                  tableId={effectiveTableId} 
                />
              </div>
            )
          ) : (
            <ClientMenu 
              clientData={clientData} 
              type={clientData.type || effectiveType} 
              tableId={clientData.tableId || effectiveTableId} 
              onLogout={handleClientLogout}
              setActiveOrdersCount={setActiveOrdersCount}
            />
          )}
        </main>

        <AnimatePresence>
          {!isQrValid && !isStandalone && (
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