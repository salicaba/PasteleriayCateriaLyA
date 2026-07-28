// frontend/src/modules/client/ClientApp.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QrCode, ShieldAlert, UserCheck, MonitorSmartphone, Utensils, Coffee, Loader2, ArrowLeft, Download, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useRegisterSW } from 'virtual:pwa-register/react';

import ClientLogin from './views/ClientLogin';
import ClientMenu from './views/ClientMenu';
import ClientConnectionShield from './views/components/ClientConnectionShield';
import { ClientServiceShield } from './views/components/ClientServiceShield';
import { socket } from '../../api/socket';
import api from '../../api/client'; 
import { usePWA } from '../../hooks/usePWA';

const THEME_CLASSES = ['light', 'dark', 'theme-lya'];

const getInitialTheme = () => {
  const saved = localStorage.getItem('lya_client_theme');
  if (saved !== null) return Number(saved);
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 1;
  return 2;
};

export default function ClientApp({ type }) {
  const { tableId: urlTableId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const qrTokenUrl = searchParams.get('token') || '';
  const isScannedQr = searchParams.get('qr') === 'true';

  const [isUpdating, setIsUpdating] = useState(false); 

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 1000); 
      }
    }
  });

  const { isInstallable, promptInstall, isStandalone } = usePWA();
  
  const [standaloneSelection, setStandaloneSelection] = useState(null); 
  const [isProcessingSelection, setIsProcessingSelection] = useState(null); 
  const [isInstalling, setIsInstalling] = useState(false);

  const [systemConfig, setSystemConfig] = useState({ isQrActive: true, disabledQrs: [] });
  const [activeTables, setActiveTables] = useState([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);

  const effectiveType = standaloneSelection?.type || type || (urlTableId ? 'mesa' : 'llevar');
  const effectiveTableId = standaloneSelection?.tableId || urlTableId;

  const [themeIndex] = useState(getInitialTheme);
  const [isQrValid, setIsQrValid] = useState(true);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

  // 🔥 MAPEO FORZADO: Si la URL tiene ?grid=true o el usuario dio clic al botón de debug
  const forceGridInBrowser = searchParams.get('grid') === 'true';
  const isGridMode = (isStandalone || forceGridInBrowser) && !standaloneSelection && !isScannedQr;

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

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingTables(true);
      try {
        const response = await api.get('/pos/public/tables').catch(() => api.get('/pos/tables'));
        const payload = response.data;
        
        const tablesArray = payload?.tables || payload?.data || (Array.isArray(payload) ? payload : []);
        setActiveTables(tablesArray);

        if (payload?.disabled_qrs !== undefined || payload?.isQrActive !== undefined) {
          let isActive = true;
          if (payload.isQrActive !== undefined) {
            isActive = payload.isQrActive !== 'false' && payload.isQrActive !== false;
          }

          let disabled = payload.disabled_qrs || [];
          if (typeof disabled === 'string') {
            try { disabled = JSON.parse(disabled); } catch(e) { disabled = []; }
          }

          setSystemConfig({
            isQrActive: isActive,
            disabledQrs: Array.isArray(disabled) ? disabled : []
          });
        }
      } catch (error) {
        console.error('Error al cargar configuración del Kiosko:', error);
      } finally {
        setIsLoadingTables(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const handleConfigUpdate = (updates) => {
      if (!updates) return;
      setSystemConfig(prev => {
        const newState = { ...prev };
        if (updates.qr_service_active !== undefined) {
          newState.isQrActive = updates.qr_service_active !== 'false' && updates.qr_service_active !== false;
        }
        if (updates.disabled_qrs !== undefined) {
          let parsed = updates.disabled_qrs;
          if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch(e) { parsed = []; }
          }
          newState.disabledQrs = Array.isArray(parsed) ? parsed : [];
        }
        return newState;
      });
    };

    const handleStatusChange = (status) => {
      setSystemConfig(prev => ({ ...prev, isQrActive: status !== 'false' && status !== false }));
    };

    socket.on('config:update', handleConfigUpdate);
    socket.on('qr:status_changed', handleStatusChange); 
    
    return () => {
      socket.off('config:update', handleConfigUpdate);
      socket.off('qr:status_changed', handleStatusChange);
    };
  }, []);

  const handleClientLogout = React.useCallback(() => {
    localStorage.removeItem('lya_client_session');
    setClientData(null);
    setActiveOrdersCount(0);
    setStandaloneSelection(null); 
  }, []);

  useEffect(() => {
    if (clientData) {
      const { type: sessionType, tableId: sessionTableId } = clientData;
      let needsRedirect = false;
      let targetPath = '';

      if (sessionType && sessionType !== effectiveType) {
        needsRedirect = true;
        targetPath = sessionType === 'mesa' ? `/m/${sessionTableId}` : '/llevar';
      } else if (sessionType === 'mesa' && effectiveType === 'mesa' && sessionTableId && sessionTableId !== urlTableId) {
        needsRedirect = true;
        targetPath = `/m/${sessionTableId}`;
      }

      if (needsRedirect && targetPath) {
        navigate(targetPath, { replace: true });
      }
    }
  }, [clientData, effectiveType, urlTableId, navigate]);

  useEffect(() => {
    if (isStandalone || forceGridInBrowser) {
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
    return () => socket.off('qr_security_update', handleSecurityUpdate);
  }, [urlTableId, qrTokenUrl, handleClientLogout, isStandalone, forceGridInBrowser]);

  const handleStandaloneSelect = async (selectedType, selectedTableId) => {
    if (isProcessingSelection) return;
    setIsProcessingSelection(selectedTableId || 'takeaway');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      setStandaloneSelection({ type: selectedType, tableId: selectedTableId });
    } finally {
      setIsProcessingSelection(null);
    }
  };

  const isGlobalOff = !systemConfig.isQrActive;
  const safeDisabledQrs = Array.isArray(systemConfig.disabledQrs) ? systemConfig.disabledQrs : [];
  const isLlevarPaused = safeDisabledQrs.includes('llevar');
  const isLlevarDisabled = isGlobalOff || isLlevarPaused;

  return (
    <div className="h-[100dvh] w-full flex flex-col transition-colors duration-300 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg text-gray-900 dark:text-gray-100 lya:text-lya-text relative overflow-hidden">
      
      {/* ========================================================= */}
      {/* 🚀 BOTÓN FLOTANTE DE DEBUG: VER MAPEO EN NAVEGADOR         */}
      {/* ========================================================= */}
      {!isGridMode && !clientData && (
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => {
              const newParams = new URLSearchParams(searchParams);
              newParams.set('grid', 'true');
              setSearchParams(newParams);
            }}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-black px-3.5 py-2 rounded-full shadow-lg transition-all active:scale-95 outline-none"
            title="Forzar vista de mapeo para pruebas"
          >
            <LayoutGrid size={14} />
            <span>Ver Mapeo (Debug)</span>
          </button>
        </div>
      )}

      <AnimatePresence>
        {needRefresh && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-6 h-[100dvh] w-full bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] p-8 max-w-sm w-full text-center flex flex-col items-center shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-inner animate-bounce">
                <Download size={40} strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-black mb-3 text-gray-900 dark:text-white lya:text-lya-text leading-tight">
                Actualización Disponible
              </h2>
              <p className="text-gray-500 dark:text-gray-400 font-bold text-sm mb-8 text-justify px-2">
                Se han detectado nuevas funciones y correcciones en el sistema. Debes actualizar la aplicación para continuar operando.
              </p>
              
              <motion.button 
                whileTap={isUpdating ? {} : { scale: 0.95 }}
                disabled={isUpdating}
                onClick={async () => {
                  setIsUpdating(true);
                  try {
                    await updateServiceWorker(true);
                  } catch (e) {
                    setIsUpdating(false); 
                  }
                }} 
                className={`w-full text-white font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2 uppercase tracking-wider outline-none select-none transition-all ${
                  isUpdating 
                    ? 'bg-emerald-400 dark:bg-emerald-600 cursor-not-allowed opacity-80 shadow-none' 
                    : 'bg-emerald-500 md:hover:bg-emerald-600 shadow-lg shadow-emerald-500/30'
                }`}
              >
                {isUpdating ? (
                  <>
                    <Loader2 size={24} className="animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  'Actualizar Ahora'
                )}
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ClientConnectionShield>
        
        <ClientServiceShield 
          activeOrdersCount={!clientData ? 0 : activeOrdersCount} 
          onForceLogout={handleClientLogout}
          type={effectiveType} 
          tableId={effectiveTableId} 
          isStandalone={isStandalone}
          isGridMode={isGridMode}
          systemConfig={systemConfig}
        />

        <Toaster position="top-center" />
        
        <main className="flex-1 flex flex-col w-full max-w-md mx-auto relative h-full z-10">
          {!clientData ? (
            
            isGridMode ? (
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col h-full w-full">
                <header className="mb-6 mt-4 text-center relative">
                  {/* Botón para salir del modo debug en el navegador */}
                  {forceGridInBrowser && (
                    <button
                      onClick={() => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.delete('grid');
                        setSearchParams(newParams);
                      }}
                      className="absolute left-0 top-1 text-xs font-bold text-gray-500 hover:text-gray-900 underline"
                    >
                      Salir de Debug
                    </button>
                  )}
                  <h1 className="text-2xl font-black mb-1">Mapeo de Mesas</h1>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Selecciona cómo deseas ordenar</p>
                </header>

                <AnimatePresence>
                  {isGlobalOff && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3 mb-6">
                      <ShieldAlert className="text-red-500 shrink-0 w-6 h-6" />
                      <div>
                        <h4 className="text-red-600 dark:text-red-400 font-black text-sm">Servicio Digital Suspendido</h4>
                        <p className="text-red-500/80 text-xs font-bold mt-1 text-justify">El local está abierto, pero los pedidos desde la App están temporalmente pausados. Por favor ordene en mostrador.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
                  {/* Botón Para Llevar */}
                  <section>
                    <motion.button
                      whileTap={isProcessingSelection || isLlevarDisabled ? {} : { scale: 0.95 }}
                      disabled={isProcessingSelection !== null || isLlevarDisabled}
                      onClick={() => handleStandaloneSelect('llevar', null)}
                      className={`w-full relative overflow-hidden text-white dark:text-gray-900 rounded-[2rem] p-6 shadow-xl flex items-center justify-between transition-all outline-none select-none ${
                        isLlevarDisabled 
                          ? 'bg-gray-300 dark:bg-gray-700 opacity-60 cursor-not-allowed shadow-none'
                          : 'bg-gray-900 dark:bg-white md:hover:shadow-2xl'
                      } ${isProcessingSelection === 'takeaway' ? 'opacity-70' : ''}`}
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        <div className={`p-4 rounded-2xl ${isLlevarDisabled ? 'bg-gray-400 dark:bg-gray-600' : 'bg-white/10 dark:bg-gray-900/10'}`}>
                          <Coffee className="w-7 h-7" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-xl font-bold">Para Llevar</h3>
                          <p className="text-sm opacity-80 mt-1">{isLlevarDisabled ? 'Temporalmente inactivo' : 'Recoge en mostrador'}</p>
                        </div>
                      </div>
                      
                      {isLlevarDisabled && !isProcessingSelection && (
                        <div className="absolute inset-0 flex items-center justify-end pr-6 pointer-events-none">
                          <span className="bg-red-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md">Pausado</span>
                        </div>
                      )}
                      {isProcessingSelection === 'takeaway' && <Loader2 className="w-6 h-6 animate-spin relative z-10" />}
                    </motion.button>
                  </section>

                  {/* Mesas */}
                  <section>
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Consumo en Local</h2>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {isLoadingTables ? (
                        <div className="col-span-2 flex justify-center py-8">
                          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                      ) : activeTables.length === 0 ? (
                        <div className="col-span-2 text-center py-6 bg-gray-100 dark:bg-gray-800/50 rounded-2xl text-gray-500 text-sm font-bold">
                          No hay mesas disponibles en este momento.
                        </div>
                      ) : (
                        activeTables.map((table) => {
                          const isOccupied = table.status === 'occupied' || table.status === 'Ocupada';
                          const isMesaPaused = safeDisabledQrs.includes(`mesa-${table.number}`);
                          const isMesaDisabled = isGlobalOff || isMesaPaused || isOccupied;
                          const isThisProcessing = isProcessingSelection === table.id;

                          return (
                            <motion.button
                              key={table.id}
                              whileTap={isMesaDisabled || isProcessingSelection ? {} : { scale: 0.95 }}
                              disabled={isMesaDisabled || isProcessingSelection !== null}
                              onClick={() => handleStandaloneSelect('mesa', table.id)}
                              className={`relative overflow-hidden p-5 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border outline-none select-none ${
                                isMesaDisabled
                                  ? 'bg-gray-100 dark:bg-gray-800 border-transparent cursor-not-allowed opacity-60'
                                  : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm md:hover:shadow-md'
                              }`}
                            >
                              {isThisProcessing ? (
                                <Loader2 className="w-7 h-7 animate-spin z-10" />
                              ) : (
                                <Utensils className={`w-7 h-7 z-10 ${isMesaDisabled ? 'opacity-40' : ''}`} />
                              )}
                              <span className="font-bold text-sm z-10">{table.name || `Mesa ${table.number}`}</span>
                              
                              {(isMesaPaused || isGlobalOff) && !isOccupied && (
                                <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center backdrop-blur-[1px]">
                                   <span className="bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-md -rotate-6">Pausada</span>
                                </div>
                              )}
                            </motion.button>
                          );
                        })
                      )}
                    </div>
                  </section>
                </motion.div>
              </div>

            ) : (

              <div className="w-full flex-1 flex flex-col overflow-y-auto custom-scrollbar relative">
                
                {isStandalone && standaloneSelection && (
                  <div className="px-6 pt-6 pb-0 shrink-0 w-full max-w-sm mx-auto">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setStandaloneSelection(null)}
                      className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-bold transition-colors outline-none select-none"
                    >
                      <ArrowLeft size={18} /> 
                      <span>Volver al Mapeo</span>
                    </motion.button>
                  </div>
                )}

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
                        <h4 className="text-sm font-bold text-white dark:text-gray-900">App de Lya</h4>
                        <p className="text-[11px] text-gray-300 dark:text-gray-600 leading-tight mt-0.5">Más rápida, sin escanear QR.</p>
                      </div>
                    </div>
                    <motion.button
                      whileTap={isInstalling ? {} : { scale: 0.95 }}
                      disabled={isInstalling}
                      onClick={async (e) => {
                        e.preventDefault(); 
                        setIsInstalling(true);
                        try {
                          localStorage.setItem('lya_pwa_mode', 'client'); 
                          await promptInstall(); 
                        } finally {
                          setIsInstalling(false);
                        }
                      }}
                      className={`flex items-center gap-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-bold px-4 py-2 rounded-xl shrink-0 md:hover:opacity-90 transition-all outline-none select-none ${
                        isInstalling ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      {isInstalling && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>Instalar</span>
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
          {!isQrValid && !isStandalone && !forceGridInBrowser && (
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