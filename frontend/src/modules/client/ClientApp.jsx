// frontend/src/modules/client/ClientApp.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { QrCode, ShieldAlert, UserCheck, MonitorSmartphone, Utensils, Coffee, Loader2, ArrowLeft, Download, WifiOff, AlertTriangle } from 'lucide-react';
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qrTokenUrl = searchParams.get('token') || '';
  const isScannedQr = searchParams.get('qr') === 'true';

  const [isUpdating, setIsUpdating] = useState(false); 
  const [runtimeError, setRuntimeError] = useState(null);
  
  const [isAppReady, setIsAppReady] = useState(false);
  
  const [isGuarding, setIsGuarding] = useState(false);
  const [guardMessage, setGuardMessage] = useState(null);

  useEffect(() => {
    const updateMetaColor = () => {
      let metaThemeColor = document.querySelector("meta[name='theme-color']");
      if (!metaThemeColor) {
        metaThemeColor = document.createElement("meta");
        metaThemeColor.name = "theme-color";
        document.head.appendChild(metaThemeColor);
      }
      const root = document.documentElement;
      if (root.classList.contains('dark')) {
        metaThemeColor.content = '#111827';
      } else if (root.classList.contains('theme-lya')) {
        metaThemeColor.content = '#FAF6F0';
      } else {
        metaThemeColor.content = '#F9FAFB';
      }
    };

    updateMetaColor(); 
    
    const observer = new MutationObserver(updateMetaColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleError = (event) => {
      if (event.message?.includes('Failed to update a ServiceWorker')) return;
      setRuntimeError(event.message || String(event.error || 'Error desconocido de JavaScript'));
    };
    const handleRejection = (event) => {
      const msg = event.reason?.message || String(event.reason || '');
      if (msg.includes('Failed to update a ServiceWorker') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        return; 
      }
      setRuntimeError(msg || 'Promesa rechazada no manejada');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        setInterval(() => {
          if (navigator.onLine) {
            r.update().catch(() => {});
          }
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
  const effectiveTableId = standaloneSelection?.tableId 
    ? String(standaloneSelection.tableId) 
    : (urlTableId ? String(urlTableId) : undefined);

  const [themeIndex] = useState(getInitialTheme);
  const [isQrValid, setIsQrValid] = useState(true);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

  const [clientData, setClientData] = useState(() => {
    const saved = localStorage.getItem('lya_client_session');
    return saved ? JSON.parse(saved) : null;
  });

  const isGridMode = !clientData && !urlTableId && !isScannedQr && !standaloneSelection;

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'theme-lya');
    root.classList.add(THEME_CLASSES[themeIndex]);
    if (localStorage.getItem('lya_client_theme') === null) {
      localStorage.setItem('lya_client_theme', themeIndex);
    }
  }, [themeIndex]);

  const fetchStoreData = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) setIsLoadingTables(true);
    
    try {
      const ts = Date.now();
      const [tablesRes, settingsRes] = await Promise.all([
        api.get(`/pos/public/tables?_t=${ts}`).catch(() => api.get(`/pos/tables?_t=${ts}`)),
        api.get(`/settings?_t=${ts}`).catch(() => ({ data: {} }))
      ]);
      
      const payload = tablesRes.data;
      const tablesArray = payload?.tables || payload?.data || (Array.isArray(payload) ? payload : []);
      setActiveTables(tablesArray);

      const settingsData = settingsRes.data || {};
      const isActive = settingsData.qr_service_active !== 'false' && settingsData.qr_service_active !== false;

      let disabled = settingsData.disabled_qrs || payload?.disabled_qrs || [];
      if (typeof disabled === 'string') {
        try { disabled = JSON.parse(disabled); } catch(e) { disabled = []; }
      }

      setSystemConfig({
        isQrActive: isActive,
        disabledQrs: Array.isArray(disabled) ? disabled : []
      });
    } catch (error) {
      console.error('Error al cargar configuración:', error);
    } finally {
      if (isInitialLoad) {
        setIsLoadingTables(false);
        setTimeout(() => setIsAppReady(true), 600);
      }
    }
  }, []);

  useEffect(() => {
    fetchStoreData(true);
  }, [fetchStoreData]);

  useEffect(() => {
    const handleUpdate = () => fetchStoreData(false);
    const socketEvents = [
      'config:update', 'business_config_updated', 'settings:updated',
      'settings_updated', 'qr:status_changed', 'service_status_changed', 
      'pos:update', 'table_status_updated', 'table:updated'
    ];

    socketEvents.forEach(event => socket.on(event, handleUpdate));
    return () => {
      socketEvents.forEach(event => socket.off(event, handleUpdate));
    };
  }, [fetchStoreData]);

  const handleClientLogout = React.useCallback(() => {
    localStorage.removeItem('lya_client_session');
    localStorage.removeItem('lya_client_order_id');
    setClientData(null);
    setActiveOrdersCount(0);
    setStandaloneSelection(null); 
  }, []);

  // 🔥 3. FIX: EL GUARDIA COMPASIVO (Session Recovery)
  useEffect(() => {
    const validateAndRouteSession = async () => {
      if (!clientData) return;
      
      const { type: sessionType, tableId: sessionTableId } = clientData;
      let isCollision = false;
      let recoveryPath = '';

      if (sessionType && sessionType !== effectiveType) {
        isCollision = true;
        recoveryPath = sessionType === 'mesa' ? `/m/${sessionTableId}` : '/llevar';
      } else if (sessionType === 'mesa' && effectiveType === 'mesa' && sessionTableId && sessionTableId !== effectiveTableId) {
        isCollision = true;
        recoveryPath = `/m/${sessionTableId}`;
      }

      if (isCollision) {
        setIsGuarding(true);
        const activeOrderId = localStorage.getItem('lya_client_order_id');
        
        if (activeOrderId) {
          try {
            const res = await api.get(`/pos/orders/${activeOrderId}/status`, {
              params: { cuenta: clientData?.name }
            });
            const { status, accountStatus } = res.data || {};
            
            // 🔥 LA SOLUCIÓN: Si está abierta o pagada, o si CUALQUIERA de las banderas locales dice
            // que la persona seguía interactuando con su nota... NO lo echamos al login, lo redirigimos a su mesa.
            const hasLocalConfirm = localStorage.getItem('lya_client_is_confirmed') === 'true';
            const hasLocalPaid = localStorage.getItem('lya_client_order_paid') === 'true';
            const hasFinalized = localStorage.getItem('lya_client_finalized_status');

            if (status === 'OPEN' || accountStatus === 'PAID' || hasLocalConfirm || hasLocalPaid || hasFinalized) {
              const locationName = sessionType === 'mesa' ? `Mesa ${sessionTableId}` : 'Para Llevar';
              setGuardMessage(`Reconectando con tu cuenta en ${locationName}...`);
              
              setTimeout(() => {
                navigate(recoveryPath, { replace: true });
                setIsGuarding(false);
                setGuardMessage(null);
              }, 2000);
              return; 
            }
          } catch (error) {
            console.error("Fallo al validar sesión con backend, procediendo a purga.", error);
          }
        }
        
        handleClientLogout();
        setIsGuarding(false);
        return; 
      }

      if (!isCollision && sessionType === 'mesa' && urlTableId !== sessionTableId) {
        navigate(`/m/${sessionTableId}`, { replace: true });
      } else if (!isCollision && sessionType === 'llevar' && window.location.pathname !== '/llevar') {
        navigate('/llevar', { replace: true });
      }
    };

    validateAndRouteSession();
  }, [clientData, effectiveType, effectiveTableId, urlTableId, navigate, handleClientLogout]);

  useEffect(() => {
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
    return () => socket.off('qr_security_update', handleSecurityUpdate);
  }, [urlTableId, qrTokenUrl, handleClientLogout, isStandalone]);

  const handleStandaloneSelect = async (selectedType, selectedTableId) => {
    if (isProcessingSelection) return;
    
    const isGlobalOff = !systemConfig.isQrActive;
    const safeDisabledQrs = Array.isArray(systemConfig.disabledQrs) ? systemConfig.disabledQrs : [];

    if (selectedType === 'llevar') {
      if (isGlobalOff || safeDisabledQrs.includes('llevar') || safeDisabledQrs.includes('takeaway')) return;
    } else if (selectedType === 'mesa') {
      const targetTable = activeTables.find(t => t.id === selectedTableId);
      const isMesaPaused = safeDisabledQrs.includes(`mesa-${targetTable?.number}`) || safeDisabledQrs.includes(`table-${selectedTableId}`) || safeDisabledQrs.includes(`mesa-${selectedTableId}`);
      const isOccupied = targetTable?.status === 'occupied' || targetTable?.status === 'Ocupada';
      const isTableActive = targetTable?.isActive ?? targetTable?.qrActive ?? targetTable?.active ?? true;

      if (isGlobalOff || isMesaPaused || isOccupied || !isTableActive) return;
    }

    setIsProcessingSelection(selectedTableId || 'takeaway');
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setStandaloneSelection({ type: selectedType, tableId: selectedTableId ? String(selectedTableId) : null });
    } finally {
      setIsProcessingSelection(null);
    }
  };

  const isGlobalOff = !systemConfig.isQrActive;
  const safeDisabledQrs = Array.isArray(systemConfig.disabledQrs) ? systemConfig.disabledQrs : [];
  const isLlevarPaused = safeDisabledQrs.includes('llevar') || safeDisabledQrs.includes('takeaway');
  const isLlevarDisabled = isGlobalOff || isLlevarPaused;

  if (runtimeError) {
    return (
      <div className="h-full w-full flex-1 flex flex-col items-center justify-center bg-red-950 text-white p-6 text-center overflow-hidden">
        <div className="bg-red-900/50 border border-red-500 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl">
          <h2 className="text-2xl font-black mb-3 text-red-200">⚠️ Error Detectado</h2>
          <p className="text-sm text-red-300 mb-6 font-mono bg-black/40 p-4 rounded-xl overflow-y-auto custom-scrollbar text-left max-h-40">
            {runtimeError}
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full py-4 bg-white text-red-950 font-black rounded-2xl text-sm shadow outline-none">
              Borrar Caché y Recargar
            </button>
            <button onClick={() => setRuntimeError(null)} className="w-full py-2 bg-transparent text-red-300 text-xs font-bold underline outline-none">
              Intentar Ocultar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {guardMessage && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed top-8 left-0 right-0 z-[9999999] flex justify-center pointer-events-none px-4"
          >
            <div className="bg-amber-100 dark:bg-amber-900/95 border border-amber-300 dark:border-amber-700 rounded-full shadow-2xl px-6 py-3 flex items-center gap-4 max-w-sm w-full">
              <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-300" />
              </div>
              <p className="text-amber-900 dark:text-amber-100 text-sm font-bold text-center flex-1 leading-tight">
                {guardMessage}
              </p>
              <Loader2 className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-spin shrink-0" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isAppReady && (
          <motion.div
            key="splash-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999998] bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg flex flex-col items-center justify-center"
          >
            <motion.div 
              animate={{ scale: [0.95, 1.05, 0.95] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="w-24 h-24 mb-6 rounded-3xl bg-orange-100 dark:bg-orange-500/20 lya:bg-lya-primary/20 text-orange-600 lya:text-lya-primary flex items-center justify-center shadow-inner"
            >
              <Coffee size={48} strokeWidth={1.5} />
            </motion.div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-2 tracking-tight">Lya</h1>
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-bold text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Cargando servicios...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-[100dvh] w-full flex flex-col transition-colors duration-300 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg text-gray-900 dark:text-gray-100 lya:text-lya-text relative overflow-hidden">
        
        <AnimatePresence>
          {needRefresh && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md pointer-events-auto">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] p-8 max-w-sm w-full text-center flex flex-col items-center shadow-2xl border border-gray-100 dark:border-gray-800"
              >
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-inner animate-bounce">
                  <Download size={40} strokeWidth={2.5} />
                </div>
                <h2 className="text-2xl font-black mb-3 text-gray-900 dark:text-white leading-tight">Actualización Disponible</h2>
                <p className="text-gray-500 dark:text-gray-400 font-bold text-sm mb-8 text-justify px-2">Se han detectado nuevas funciones y correcciones. Debes actualizar la aplicación para continuar operando.</p>
                <motion.button 
                  whileTap={isUpdating ? {} : { scale: 0.95 }}
                  disabled={isUpdating}
                  onClick={async () => {
                    if (!navigator.onLine) {
                      toast.error("Sin conexión. Conéctate a internet para actualizar.", { icon: <WifiOff size={16}/> });
                      return;
                    }
                    setIsUpdating(true);
                    try { 
                      await updateServiceWorker(true); 
                    } catch (error) {
                      setIsUpdating(false); 
                      toast.error("Fallo al actualizar. Tu internet es inestable.");
                    }
                  }} 
                  className={`w-full text-white font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2 uppercase tracking-wider outline-none transition-all md:hover:shadow-xl ${isUpdating ? 'bg-emerald-600 cursor-wait opacity-90 shadow-inner' : 'bg-emerald-500 shadow-lg'}`}
                >
                  {isUpdating ? <><Loader2 size={24} className="animate-spin" /> Actualizando...</> : 'Actualizar Ahora'}
                </motion.button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <ClientConnectionShield>
          <ClientServiceShield 
            key={`shield-mode-${isGridMode ? 'grid' : 'login'}`} 
            activeOrdersCount={!clientData ? 0 : activeOrdersCount} 
            hasActiveSession={!!clientData}
            onForceLogout={handleClientLogout}
            type={effectiveType} 
            tableId={effectiveTableId} 
            isStandalone={isStandalone}
            isGridMode={isGridMode}
            systemConfig={systemConfig}
          />
          <Toaster position="top-center" />
          
          <main className="flex-1 flex flex-col w-full max-w-md mx-auto relative h-full z-10 overflow-hidden">
            <AnimatePresence mode="wait">
              {isGuarding ? (
                <motion.div
                  key="guarding"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm z-[9000]"
                >
                  <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                </motion.div>
              ) : !clientData ? (
                isGridMode ? (
                  <motion.div
                    key="grid"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30, filter: 'blur(5px)' }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 flex flex-col overflow-y-auto custom-scrollbar p-6 w-full"
                  >
                    <header className="mb-6 mt-4 text-center">
                      <h1 className="text-2xl font-black mb-1">Bienvenido a Lya</h1>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Selecciona cómo deseas ordenar</p>
                    </header>

                    <AnimatePresence>
                      {isGlobalOff && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-red-500/10 border border-red-500/20 p-4 rounded-[2rem] flex items-start gap-3 mb-6">
                          <ShieldAlert className="text-red-500 shrink-0 w-6 h-6 mt-1" />
                          <div>
                            <h4 className="text-red-600 dark:text-red-400 font-black text-sm text-center">Servicio Digital Suspendido</h4>
                            <p className="text-red-500/80 text-xs font-bold mt-2 text-justify">El local está abierto, pero los pedidos desde la App están temporalmente pausados. Pase y consuma sin compromiso.</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex flex-col gap-6">
                      <section>
                        <motion.button
                          whileTap={isProcessingSelection || isLlevarDisabled ? {} : { scale: 0.95 }}
                          disabled={isProcessingSelection !== null || isLlevarDisabled}
                          onClick={() => handleStandaloneSelect('llevar', null)}
                          className={`w-full relative overflow-hidden text-white dark:text-gray-900 rounded-[2rem] p-6 shadow-xl flex items-center justify-between transition-all outline-none select-none ${isLlevarDisabled ? 'bg-gray-300 dark:bg-gray-700 opacity-60 cursor-not-allowed shadow-none' : 'bg-gray-900 dark:bg-white md:hover:shadow-2xl'}`}
                        >
                          <div className={`flex items-center gap-4 relative z-10 ${isProcessingSelection === 'takeaway' ? 'opacity-30' : ''}`}>
                            <div className={`p-4 rounded-2xl ${isLlevarDisabled ? 'bg-gray-400 dark:bg-gray-600' : 'bg-white/10 dark:bg-gray-900/10'}`}>
                              <Coffee className="w-7 h-7" />
                            </div>
                            <div className="text-left">
                              <h3 className="text-xl font-bold">Para Llevar</h3>
                              <p className="text-sm opacity-80 mt-1">{isLlevarDisabled ? 'Desactivado / Apagado' : 'Recoge en mostrador'}</p>
                            </div>
                          </div>
                          {isLlevarDisabled && !isProcessingSelection && (
                            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20">
                              <span className="bg-red-600 text-white text-[11px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                                <WifiOff className="w-4 h-4" /> Apagado
                              </span>
                            </div>
                          )}
                          {isProcessingSelection === 'takeaway' && (
                            <div className="absolute inset-0 flex items-center justify-center z-30">
                              <Loader2 className="w-8 h-8 animate-spin" />
                            </div>
                          )}
                        </motion.button>
                      </section>

                      <section>
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-2 text-center">Consumo en Local</h2>
                        <div className="grid grid-cols-2 gap-4">
                          {isLoadingTables ? (
                            <div className="col-span-2 flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
                          ) : activeTables.length === 0 ? (
                            <div className="col-span-2 text-center py-6 bg-gray-100 dark:bg-gray-800/50 rounded-[2rem] text-gray-500 text-sm font-bold">No hay mesas disponibles en este momento.</div>
                          ) : (
                            activeTables.map((table) => {
                              const isOccupied = table.status === 'occupied' || table.status === 'Ocupada';
                              const isMesaPaused = safeDisabledQrs.includes(`mesa-${table.number}`) || safeDisabledQrs.includes(`table-${table.id}`) || safeDisabledQrs.includes(`mesa-${table.id}`);
                              const isTableActive = table.isActive ?? table.qrActive ?? table.active ?? true;
                              const isMesaDisabled = isGlobalOff || isMesaPaused || isOccupied || !isTableActive;
                              const isThisProcessing = isProcessingSelection === table.id;

                              return (
                                <motion.button
                                  key={table.id}
                                  whileTap={isMesaDisabled || isProcessingSelection ? {} : { scale: 0.95 }}
                                  disabled={isMesaDisabled || isProcessingSelection !== null}
                                  onClick={() => handleStandaloneSelect('mesa', table.id)}
                                  className={`relative overflow-hidden p-5 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border outline-none select-none ${isMesaDisabled ? 'bg-gray-100 dark:bg-gray-800 border-transparent cursor-not-allowed opacity-60' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm md:hover:shadow-md'}`}
                                >
                                  {isThisProcessing ? <Loader2 className="w-7 h-7 animate-spin z-10" /> : <Utensils className={`w-7 h-7 z-10 ${isMesaDisabled ? 'opacity-40' : ''}`} />}
                                  <span className="font-bold text-sm z-10">{table.name || `Mesa ${table.number}`}</span>
                                  {isMesaDisabled && (
                                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 text-center z-20">
                                      <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1">
                                        <WifiOff className="w-3.5 h-3.5" /> {isOccupied ? 'Ocupada' : 'Apagado'}
                                      </span>
                                    </div>
                                  )}
                                </motion.button>
                              );
                            })
                          )}
                        </div>
                      </section>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30, filter: 'blur(5px)' }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 flex flex-col w-full h-full overflow-hidden"
                  >
                    {standaloneSelection && (
                      <div className="absolute top-6 left-6 z-50">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setStandaloneSelection(null)}
                          className="flex items-center justify-center w-11 h-11 bg-white/80 dark:bg-gray-800/80 lya:bg-[#EADCC9]/80 backdrop-blur-md border border-gray-200 dark:border-gray-700 lya:border-[#D9C4A9] rounded-full shadow-lg text-gray-700 dark:text-gray-200 lya:text-[#3E2723] outline-none select-none transition-all md:hover:shadow-xl"
                        >
                          <ArrowLeft size={22} strokeWidth={2.5} /> 
                        </motion.button>
                      </div>
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

                    {!isStandalone && isInstallable && (
                      <div className="absolute bottom-6 left-6 right-6 z-50">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-900 dark:bg-white rounded-[2rem] p-5 shadow-2xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-white/10 dark:bg-gray-900/10 p-3 rounded-2xl shrink-0"><MonitorSmartphone className="w-5 h-5 text-white dark:text-gray-900" /></div>
                            <div>
                              <h4 className="text-sm font-bold text-white dark:text-gray-900">App de Lya</h4>
                              <p className="text-[11px] text-gray-300 dark:text-gray-600 leading-tight mt-0.5">Más rápida, sin escanear QR.</p>
                            </div>
                          </div>
                          <motion.button
                            whileTap={isInstalling ? {} : { scale: 0.95 }} disabled={isInstalling}
                            onClick={async (e) => { e.preventDefault(); setIsInstalling(true); try { localStorage.setItem('lya_pwa_mode', 'client'); await promptInstall(); } finally { setIsInstalling(false); } }}
                            className={`flex items-center gap-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-bold px-4 py-3 rounded-xl shrink-0 transition-all outline-none select-none md:hover:scale-105 ${isInstalling ? 'opacity-70 cursor-not-allowed' : ''}`}
                          >
                            {isInstalling ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Instalar</span>}
                          </motion.button>
                        </motion.div>
                      </div>
                    )}
                  </motion.div>
                )
              ) : (
                <motion.div
                  key="menu"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 w-full h-full"
                >
                  <ClientMenu 
                    clientData={clientData} 
                    type={clientData.type || effectiveType} 
                    tableId={clientData.tableId || effectiveTableId} 
                    onLogout={handleClientLogout}
                    setActiveOrdersCount={setActiveOrdersCount}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          <AnimatePresence>
            {!isQrValid && !isStandalone && (
              <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-md pointer-events-auto">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 40 }} transition={{ type: 'spring', damping: 25, stiffness: 230 }}
                  className="bg-white dark:bg-gray-800 lya:bg-lya-surface w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 border border-gray-200 dark:border-gray-700 flex flex-col items-center text-center overflow-hidden"
                >
                  <div className="relative mb-6 flex items-center justify-center">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 rounded-[1.75rem] flex items-center justify-center border border-red-200 shadow-inner">
                      <QrCode size={38} className="text-red-500" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-gray-800">
                      <ShieldAlert size={14} className="text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight mb-3">Código QR Expirado</h3>
                  <p className="text-sm font-bold text-gray-500 dark:text-gray-400 text-justify leading-relaxed px-1">El enlace del menú digital que has escaneado ya no es válido debido a una actualización de seguridad. Solicita al personal el nuevo código QR.</p>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </ClientConnectionShield>
      </div>
    </>
  );
}