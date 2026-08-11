// src/modules/client/views/TransferenciasView.jsx
// src/modules/client/views/TransferenciasView.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Landmark, Copy, Check, MessageCircle, AlertCircle, 
  Settings, Moon, Sun, Droplet, Type, Maximize, Minimize, X, ChevronDown, Phone 
} from 'lucide-react';
import client from '../../../api/client';

const THEMES = ['light', 'dark', 'theme-lya'];
const SIZES = [
  { label: 'Normal', val: '16px' },
  { label: 'Mediana', val: '18px' },
  { label: 'Grande', val: '20px' }
];

export const TransferenciasView = () => {
  const [accounts, setAccounts] = useState([]);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  
  // 🔥 Estado para el acordeón desplegable de cuentas bancarias
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [isProcessingWa, setIsProcessingWa] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // 🔥 ESTADOS DE CONFIGURACIÓN (Settings)
  const [showSettings, setShowSettings] = useState(false);
  const [themeIndex, setThemeIndex] = useState(() => parseInt(localStorage.getItem('lya_client_theme') || '2'));
  const [sizeIndex, setSizeIndex] = useState(() => parseInt(localStorage.getItem('lya_client_size') || '0'));
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Carga de datos unificada idéntica a ClientOrderSuccess
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await client.get('/settings');
        let rawData = res.data;
        
        if (rawData.data) rawData = rawData.data;

        let parsedAccounts = [];
        let parsedWa = "";

        if (Array.isArray(rawData)) {
            const accObj = rawData.find(item => item.key && (item.key.toLowerCase().includes('cuenta') || item.key.toLowerCase().includes('bank')));
            const waObj = rawData.find(item => item.key && item.key.toLowerCase().includes('whatsapp'));
            
            if (accObj) {
                try { parsedAccounts = typeof accObj.value === 'string' ? JSON.parse(accObj.value) : accObj.value; } catch(e){}
            } else if (rawData.length > 0 && (rawData[0].banco || rawData[0].bank_name)) {
                parsedAccounts = rawData;
            }
            if (waObj) parsedWa = waObj.value;
        } 
        else if (typeof rawData === 'object') {
            parsedAccounts = rawData.bank_accounts || rawData.cuentasBancarias || rawData.bankAccounts || rawData.cuentas || [];
            if (typeof parsedAccounts === 'string') {
                try { parsedAccounts = JSON.parse(parsedAccounts); } catch(e) { parsedAccounts = []; }
            }
            parsedWa = rawData.whatsapp_number || rawData.whatsappComprobantes || rawData.whatsapp || rawData.telefono || "";
        }

        setAccounts(Array.isArray(parsedAccounts) ? parsedAccounts : []);

        let cleanWa = String(parsedWa).replace(/\D/g, ''); 
        if (cleanWa.length === 10) cleanWa = '52' + cleanWa; 
        setWhatsappNumber(cleanWa);

      } catch (err) {
        console.error("Error al cargar configuraciones:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Aplicar Tema
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'theme-lya');
    root.classList.add(THEMES[themeIndex]);
    localStorage.setItem('lya_client_theme', themeIndex);
  }, [themeIndex]);

  // Aplicar Tamaño de Letra
  useEffect(() => {
    document.documentElement.style.fontSize = SIZES[sizeIndex].val;
    localStorage.setItem('lya_client_size', sizeIndex);
  }, [sizeIndex]);

  // Escudo anti-instalación PWA nativa en esta vista limpia
  useEffect(() => {
    const preventInstallPrompt = (e) => { e.preventDefault(); };
    window.addEventListener('beforeinstallprompt', preventInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', preventInstallPrompt);
  }, []);

  const cycleTheme = () => setThemeIndex((prev) => (prev + 1) % 3);
  const cycleSize = () => setSizeIndex((prev) => (prev + 1) % 3);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopy = async (text, label, id) => {
    setCopyingId(`${id}-${label}`);
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copiada exitosamente`);
    } catch (err) {
      showToast('Error al copiar al portapapeles');
    } finally {
      setTimeout(() => setCopyingId(null), 500);
    }
  };

  const handleWhatsApp = async () => {
    if (isProcessingWa || !whatsappNumber) return;
    setIsProcessingWa(true);
    try {
      const text = encodeURIComponent(`¡Hola! Envío mi comprobante de pago por transferencia.\n\n💳 *Cliente:* [Mi Cuenta / Mesa]\n💵 *Método:* Transferencia Bancaria\n\nAdjunto el comprobante:`);
      const waUrl = `https://wa.me/${whatsappNumber}?text=${text}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setIsProcessingWa(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-[#FAF6F0] p-6">
        <motion.div animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          <Landmark size={48} className="text-emerald-500 lya:text-[#78350F] mb-4" />
        </motion.div>
        <p className="font-bold text-gray-500 dark:text-gray-400 lya:text-[#7A6353] animate-pulse text-center">Obteniendo cuentas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-[#FAF6F0] p-6 text-center">
        <AlertCircle size={48} className="text-gray-300 dark:text-gray-700 lya:text-[#EADCC9] mb-4" />
        <h2 className="text-xl font-black text-gray-800 dark:text-white lya:text-[#3E2723] mb-2">No hay conexión disponible</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-[#7A6353] text-center">Ocurrió un error al cargar las configuraciones de pago.</p>
      </div>
    );
  }

  return (
    /* 🔥 PILAR 1: Raíz estrictamente bloqueada (Anti-Ghost Scroll) */
    <div className="h-[100dvh] w-full flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-[#FAF6F0] overflow-hidden relative transition-colors duration-300">
      
      {/* Notificación Cápsula Neo-Bento */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] flex justify-center w-max max-w-[90vw]"
          >
            <div className="bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] rounded-full shadow-2xl border border-gray-100 dark:border-gray-700 lya:border-[#EADCC9] px-5 py-2.5 flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Check size={16} strokeWidth={3} />
              </div>
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200 lya:text-[#3E2723] text-center">
                {toastMessage}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔥 BOTÓN DE AJUSTES FLOTANTE (Pilar 2: whileTap, md:hover) */}
      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowSettings(true)}
        className="fixed top-4 right-4 z-40 p-3 bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] rounded-full shadow-lg border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] text-gray-600 dark:text-gray-300 lya:text-[#7A6353] md:hover:bg-gray-50 dark:md:hover:bg-gray-700 transition-colors outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <Settings size={24} className="animate-spin-slow" style={{ animationDuration: '4s' }} />
      </motion.button>

      {/* 🔥 PILAR 1: Contenedor interno habilitado para Scroll */}
      <div className="flex-1 overflow-y-auto custom-scrollbar w-full flex flex-col items-center py-12 px-4 sm:px-6">
        
        {/* HEADER LOGO */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4, ease: "easeOut" }} 
          className="text-center mb-8 w-full max-w-md mt-6 shrink-0"
        >
          <div className="mx-auto w-16 h-16 bg-emerald-500/10 dark:bg-emerald-500/20 lya:bg-[#EADCC9] rounded-[1.5rem] flex items-center justify-center mb-4 text-emerald-500 lya:text-[#78350F] shadow-inner">
            <Landmark size={32} />
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white lya:text-[#3E2723] tracking-tighter" style={{ fontFamily: 'Times New Roman, serif', fontStyle: 'italic' }}>
            𝓛𝔂𝓪
          </h1>
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 lya:text-[#7A6353]/80 mt-2 text-center">Datos para Transferencia</p>
        </motion.div>

        {/* MÓDULO UNIFICADO ESTILO CLIENTORDER SUCCESS */}
        <div className="w-full max-w-md space-y-6 shrink-0">
          <div className="w-full bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] p-6 rounded-[2.5rem] border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] shadow-sm text-center relative overflow-hidden">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Landmark className="text-orange-500 lya:text-[#78350F]" size={20} strokeWidth={2.5} />
              <h3 className="font-black text-gray-900 dark:text-white lya:text-[#3E2723] text-sm uppercase tracking-wide">Cuentas Bancarias LyA</h3>
            </div>
            
            <p className="text-[11.5px] font-medium text-gray-500 dark:text-gray-400 lya:text-[#7A6353] text-justify mb-4 px-1 leading-relaxed">
              Consulta las cuentas oficiales de la cafetería para realizar tus pagos de manera rápida y segura. Despliega la información y envía tu comprobante.
            </p>

            {accounts.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-900/50 lya:bg-[#EADCC9]/30 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">No hay cuentas bancarias configuradas por el momento.</p>
              </div>
            ) : (
              <div className="space-y-3 mb-5">
                {/* 🚀 BOTÓN DESPLEGABLE (ACORDEÓN) */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowBankDetails(!showBankDetails)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gray-50 dark:bg-gray-900 lya:bg-white border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] flex items-center justify-between text-xs font-black text-gray-800 dark:text-gray-200 lya:text-[#3E2723] shadow-sm outline-none transition-colors md:hover:bg-gray-100 dark:md:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-2">
                    <Landmark size={16} className="text-orange-500 lya:text-[#78350F]" />
                    <span>{showBankDetails ? 'Ocultar cuentas bancarias' : `Ver cuentas bancarias (${accounts.length})`}</span>
                  </div>
                  <ChevronDown size={16} className={`transition-transform duration-300 ${showBankDetails ? 'rotate-180' : ''}`} />
                </motion.button>

                {/* 🚀 CAJÓN ANIMADO DE CUENTAS */}
                <AnimatePresence>
                  {showBankDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden space-y-3 pt-1"
                    >
                      {accounts.map((acc, index) => {
                        const banco = acc.bank_name || acc.banco || 'Banco';
                        const titular = acc.account_holder || acc.titular;
                        const cuenta = acc.account_number || acc.cuenta;
                        const clabe = acc.clabe;

                        return (
                          <div key={acc.id || index} className="bg-gray-50 dark:bg-gray-900 lya:bg-white rounded-2xl p-4 border border-gray-100 dark:border-gray-700 lya:border-[#EADCC9] text-left">
                            <div className="mb-2">
                              <p className="text-xs font-black text-gray-900 dark:text-white lya:text-[#3E2723] uppercase">{banco}</p>
                              {titular && <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 lya:text-[#7A6353] truncate">Titular: {titular}</p>}
                            </div>
                            
                            {cuenta && (
                              <div className="flex items-center justify-between bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] mb-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-[9px] uppercase font-extrabold text-gray-400 dark:text-gray-500 lya:text-[#7A6353]/70">Cuenta</p>
                                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200 lya:text-[#3E2723] tracking-wider truncate">{cuenta}</p>
                                </div>
                                <motion.button
                                  whileTap={{ scale: 0.90 }}
                                  onClick={() => handleCopy(cuenta, 'Cuenta', acc.id || index)}
                                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 lya:bg-white flex items-center justify-center text-gray-600 dark:text-gray-300 lya:text-[#7A6353] md:hover:bg-gray-200 dark:md:hover:bg-gray-600 outline-none shrink-0"
                                >
                                  {copyingId === `${acc.id || index}-Cuenta` ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                </motion.button>
                              </div>
                            )}

                            {clabe && (
                              <div className="flex items-center justify-between bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9]">
                                <div className="flex-1 min-w-0">
                                  <p className="text-[9px] uppercase font-extrabold text-gray-400 dark:text-gray-500 lya:text-[#7A6353]/70">CLABE Interbancaria</p>
                                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200 lya:text-[#3E2723] tracking-wider truncate">{clabe}</p>
                                </div>
                                <motion.button
                                  whileTap={{ scale: 0.90 }}
                                  onClick={() => handleCopy(clabe, 'CLABE', acc.id || index)}
                                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 lya:bg-white flex items-center justify-center text-gray-600 dark:text-gray-300 lya:text-[#7A6353] md:hover:bg-gray-200 dark:md:hover:bg-gray-600 outline-none shrink-0"
                                >
                                  {copyingId === `${acc.id || index}-CLABE` ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                </motion.button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* BOTÓN WHATSAPP EXACTO AL DE CLIENT ORDER SUCCESS */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleWhatsApp}
              disabled={isProcessingWa || !whatsappNumber}
              className="w-full py-3.5 rounded-2xl font-black text-sm bg-emerald-500 md:hover:bg-emerald-600 dark:bg-emerald-600 dark:md:hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30 outline-none transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isProcessingWa ? (
                <span className="animate-spin text-sm">⏳</span>
              ) : (
                <>
                  <MessageCircle size={18} strokeWidth={2.5} />
                  <span>{whatsappNumber ? 'Enviar Comprobante' : 'WhatsApp no configurado'}</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        <div className="mt-10 mb-6 opacity-30 pointer-events-none shrink-0 text-center">
           <h1 className="text-xl font-black text-gray-900 dark:text-white lya:text-[#3E2723]" style={{ fontFamily: 'Times New Roman, serif', fontStyle: 'italic' }}>𝓛𝔂𝓪</h1>
        </div>
      </div>

      {/* MODAL NEO-BENTO DE AJUSTES */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-gray-900/60 dark:bg-black/80 backdrop-blur-md transition-colors"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-gray-900 lya:bg-[#F3EBE0] p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-[340px] flex flex-col border border-gray-100 dark:border-gray-800 lya:border-[#EADCC9]"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-gray-900 dark:text-white lya:text-[#3E2723] tracking-tight flex items-center gap-2">
                  <Settings size={22} className="text-emerald-500 lya:text-[#78350F]"/> Ajustes
                </h3>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowSettings(false)} className="p-2 bg-gray-100 dark:bg-gray-800 lya:bg-white text-gray-500 dark:text-gray-400 rounded-full outline-none transition-colors"><X size={18}/></motion.button>
              </div>

              <div className="space-y-4">
                <motion.button whileTap={{ scale: 0.98 }} onClick={cycleTheme} className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 lya:bg-white border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] rounded-2xl md:hover:border-emerald-500 transition-colors outline-none group">
                  <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-gray-800 lya:bg-[#FAF6F0] p-2 rounded-xl shadow-sm">
                      {themeIndex === 0 ? <Sun size={18}/> : themeIndex === 1 ? <Moon size={18}/> : <Droplet size={18}/>}
                    </div>
                    <span className="font-bold text-gray-700 dark:text-gray-200 lya:text-[#3E2723] text-sm">Apariencia</span>
                  </div>
                  <span className="text-xs font-black uppercase text-emerald-500 lya:text-[#78350F] bg-emerald-50 dark:bg-emerald-500/10 lya:bg-[#EADCC9]/40 px-3 py-1 rounded-lg">
                    {THEMES[themeIndex] === 'light' ? 'Claro' : THEMES[themeIndex] === 'dark' ? 'Oscuro' : 'Lya'}
                  </span>
                </motion.button>

                <motion.button whileTap={{ scale: 0.98 }} onClick={cycleSize} className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 lya:bg-white border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] rounded-2xl md:hover:border-emerald-500 transition-colors outline-none group">
                  <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-gray-800 lya:bg-[#FAF6F0] p-2 rounded-xl shadow-sm">
                      <Type size={18}/>
                    </div>
                    <span className="font-bold text-gray-700 dark:text-gray-200 lya:text-[#3E2723] text-sm">Tamaño</span>
                  </div>
                  <span className="text-xs font-black uppercase text-emerald-500 lya:text-[#78350F] bg-emerald-50 dark:bg-emerald-500/10 lya:bg-[#EADCC9]/40 px-3 py-1 rounded-lg">
                    {SIZES[sizeIndex].label}
                  </span>
                </motion.button>

                <motion.button whileTap={{ scale: 0.98 }} onClick={toggleFullscreen} className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 lya:bg-white border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] rounded-2xl md:hover:border-emerald-500 transition-colors outline-none group">
                  <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-gray-800 lya:bg-[#FAF6F0] p-2 rounded-xl shadow-sm">
                      {isFullscreen ? <Minimize size={18}/> : <Maximize size={18}/>}
                    </div>
                    <span className="font-bold text-gray-700 dark:text-gray-200 lya:text-[#3E2723] text-sm">Pantalla</span>
                  </div>
                  <span className="text-xs font-black uppercase text-emerald-500 lya:text-[#78350F] bg-emerald-50 dark:bg-emerald-500/10 lya:bg-[#EADCC9]/40 px-3 py-1 rounded-lg">
                    {isFullscreen ? 'Salir' : 'Completa'}
                  </span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};