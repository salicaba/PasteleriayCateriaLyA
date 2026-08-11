// src/modules/client/views/TransferenciasView.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Landmark, Copy, Check, MessageCircle, AlertCircle, 
  Settings, Moon, Sun, Droplet, Type, Maximize, Minimize, X 
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

  // 🔥 ESTADOS DE CONFIGURACIÓN (Settings)
  const [showSettings, setShowSettings] = useState(false);
  const [themeIndex, setThemeIndex] = useState(() => parseInt(localStorage.getItem('lya_client_theme') || '2'));
  const [sizeIndex, setSizeIndex] = useState(() => parseInt(localStorage.getItem('lya_client_size') || '0'));
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 🔥 EXTRACTOR INTELIGENTE + TIEMPO REAL
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
            parsedAccounts = rawData.cuentasBancarias || rawData.bankAccounts || rawData.bank_accounts || rawData.cuentas || rawData.cuentas_bancarias || [];
            if (typeof parsedAccounts === 'string') {
                try { parsedAccounts = JSON.parse(parsedAccounts); } catch(e) { parsedAccounts = []; }
            }
            parsedWa = rawData.whatsappComprobantes || rawData.whatsapp_number || rawData.whatsapp || rawData.telefono || "";
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

    // ⚡ TIEMPO REAL: Actualización instantánea en pantallas de transferencia
    socket.on('settingsUpdated', fetchSettings);
    socket.on('businessConfigUpdated', fetchSettings);

    return () => {
      socket.off('settingsUpdated', fetchSettings);
      socket.off('businessConfigUpdated', fetchSettings);
    };
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

  // 🔥 ESCUDO ANTI-INSTALACIÓN: Bloquea el banner nativo de Chrome/Android para instalar la PWA
  useEffect(() => {
    const preventInstallPrompt = (e) => {
      e.preventDefault(); 
    };
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

  const handleCopy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Error copiando al portapapeles', err);
    }
  };

  // PANTALLAS DE CARGA Y ERROR (Cumplen con Pilar 1: overflow-hidden)
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-6">
        <motion.div animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          <Landmark size={48} className="text-emerald-500 lya:text-lya-primary mb-4" />
        </motion.div>
        <p className="font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 animate-pulse text-center">Obteniendo cuentas...</p>
      </div>
    );
  }

  if (error || accounts.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-6 text-center">
        <AlertCircle size={48} className="text-gray-300 dark:text-gray-700 lya:text-lya-text/30 mb-4" />
        <h2 className="text-xl font-black text-gray-800 dark:text-white lya:text-lya-text mb-2">No hay cuentas disponibles</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-center">En este momento no hay información de transferencias registrada.</p>
      </div>
    );
  }

  return (
    /* 🔥 PILAR 1: Raíz estrictamente bloqueada (Anti-Ghost Scroll) */
    <div className="h-[100dvh] w-full flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg overflow-hidden relative transition-colors duration-300">
      
      {/* 🔥 BOTÓN DE AJUSTES FLOTANTE (Pilar 2: whileTap, md:hover) */}
      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowSettings(true)}
        className="fixed top-4 right-4 z-40 p-3 bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-full shadow-lg border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 text-gray-600 dark:text-gray-300 lya:text-lya-text md:hover:bg-gray-50 dark:md:hover:bg-gray-700 lya:md:hover:bg-lya-bg transition-colors outline-none focus:ring-2 focus:ring-emerald-500"
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
          className="text-center mb-10 w-full max-w-md mt-6 shrink-0"
        >
          <div className="mx-auto w-16 h-16 bg-emerald-500/10 dark:bg-emerald-500/20 lya:bg-lya-primary/10 rounded-[1.5rem] flex items-center justify-center mb-4 text-emerald-500 lya:text-lya-primary shadow-inner">
            <Landmark size={32} />
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tighter" style={{ fontFamily: 'Times New Roman, serif', fontStyle: 'italic' }}>
            𝓛𝔂𝓪
          </h1>
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 lya:text-lya-text/50 mt-2 text-center">Datos para Transferencia</p>
        </motion.div>

        {/* LISTA DE CUENTAS */}
        <div className="w-full max-w-md space-y-6 shrink-0">
          <AnimatePresence>
            {accounts.map((acc, index) => {
              // Desestructuración defensiva adaptativa
              const banco = acc.banco || acc.bank_name || 'Banco';
              const titular = acc.titular || acc.account_holder;
              const cuenta = acc.cuenta || acc.account_number;
              const clabe = acc.clabe;

              return (
                <motion.div 
                  key={acc.id || index}
                  /* 🔥 PILAR 5: Animación de entrada estándar */
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.1 }}
                  /* 🔥 PILAR 4: Geometría Neo-Bento (rounded-[2rem]) */
                  className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2rem] p-6 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 lya:bg-lya-primary/5 rounded-bl-[100%] pointer-events-none" />
                  
                  {/* 🔥 PILAR 4: truncate en el título de la tarjeta */}
                  <h3 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-4 flex items-center gap-2 truncate">
                    <div className="w-2 h-6 bg-emerald-500 lya:bg-lya-primary rounded-full shrink-0" /> 
                    <span className="truncate">{banco}</span>
                  </h3>
                  
                  <div className="space-y-4 relative z-10">
                    {titular && (
                      <div className="bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg p-3 rounded-2xl border border-gray-100 dark:border-gray-800 lya:border-lya-border/30">
                        <span className="block text-[10px] font-black uppercase text-gray-400 lya:text-lya-text/50 mb-1">Titular de la cuenta</span>
                        {/* 🔥 PILAR 4: truncate por si el nombre es kilométrico */}
                        <span className="font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text text-sm block truncate">{titular}</span>
                      </div>
                    )}

                    {cuenta && (
                      <div className="bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg p-3 rounded-2xl border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex justify-between items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <span className="block text-[10px] font-black uppercase text-gray-400 lya:text-lya-text/50 mb-1">Número de Cuenta / Tarjeta</span>
                          <span className="font-mono font-black text-gray-900 dark:text-white lya:text-lya-text tracking-widest truncate block">{cuenta}</span>
                        </div>
                        {/* 🔥 PILAR 2: whileTap estricto */}
                        <motion.button 
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleCopy(cuenta, `acc-${acc.id || index}`)}
                          className={`shrink-0 p-3 rounded-xl transition-colors outline-none ${copiedId === `acc-${acc.id || index}` ? 'bg-emerald-500 lya:bg-lya-primary text-white shadow-md' : 'bg-white dark:bg-gray-700 lya:bg-lya-surface text-gray-500 dark:text-gray-300 lya:text-lya-text border border-gray-200 dark:border-gray-600 lya:border-lya-border/40 shadow-sm md:hover:border-emerald-500 lya:md:hover:border-lya-primary'}`}
                        >
                          {copiedId === `acc-${acc.id || index}` ? <Check size={18} /> : <Copy size={18} />}
                        </motion.button>
                      </div>
                    )}

                    {clabe && (
                      <div className="bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg p-3 rounded-2xl border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex justify-between items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <span className="block text-[10px] font-black uppercase text-gray-400 lya:text-lya-text/50 mb-1">CLABE Interbancaria</span>
                          <span className="font-mono font-black text-gray-900 dark:text-white lya:text-lya-text tracking-widest truncate block">{clabe}</span>
                        </div>
                        {/* 🔥 PILAR 2: whileTap estricto */}
                        <motion.button 
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleCopy(clabe, `clabe-${acc.id || index}`)}
                          className={`shrink-0 p-3 rounded-xl transition-colors outline-none ${copiedId === `clabe-${acc.id || index}` ? 'bg-emerald-500 lya:bg-lya-primary text-white shadow-md' : 'bg-white dark:bg-gray-700 lya:bg-lya-surface text-gray-500 dark:text-gray-300 lya:text-lya-text border border-gray-200 dark:border-gray-600 lya:border-lya-border/40 shadow-sm md:hover:border-emerald-500 lya:md:hover:border-lya-primary'}`}
                        >
                          {copiedId === `clabe-${acc.id || index}` ? <Check size={18} /> : <Copy size={18} />}
                        </motion.button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* WHATSAPP FOOTER */}
        {whatsappNumber && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
            className="mt-8 w-full max-w-md shrink-0 bg-emerald-50 dark:bg-emerald-900/20 lya:bg-lya-primary/10 border border-emerald-100 dark:border-emerald-800/50 lya:border-lya-primary/20 rounded-[2rem] p-6 text-center shadow-sm"
          >
            <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-800/50 lya:bg-lya-primary/20 rounded-full flex items-center justify-center mb-3 text-emerald-600 dark:text-emerald-400 lya:text-lya-primary">
              <MessageCircle size={24} />
            </div>
            <h4 className="font-black text-emerald-800 dark:text-emerald-300 lya:text-lya-text text-sm uppercase tracking-wider mb-2 text-center">Envía tu comprobante</h4>
            {/* 🔥 PILAR 4: Textos largos siempre text-justify o text-center estricto */}
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400/80 lya:text-lya-text/70 mb-4 leading-relaxed text-center">
              Por favor, no olvides escribir tu nombre o detalles en el concepto de tu transferencia y enviarnos el comprobante al dar clic abajo.
            </p>
            {/* 🔥 PILAR 2: md:hover y whileTap para enlaces */}
            <motion.a 
              whileTap={{ scale: 0.95 }}
              href={`https://wa.me/${whatsappNumber}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-emerald-500 lya:bg-lya-primary md:hover:bg-emerald-600 lya:md:hover:opacity-90 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 lya:shadow-lya-primary/30 transition-all outline-none"
            >
              Abrir WhatsApp
            </motion.a>
          </motion.div>
        )}

        <div className="mt-10 mb-6 opacity-30 pointer-events-none shrink-0 text-center">
           <h1 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text" style={{ fontFamily: 'Times New Roman, serif', fontStyle: 'italic' }}>𝓛𝔂𝓪</h1>
        </div>
      </div>

      {/* 🔥 MODAL NEO-BENTO DE AJUSTES (Cumple con Pilar 4 y 5) */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-gray-900/60 dark:bg-black/80 lya:bg-lya-dark/70 backdrop-blur-md transition-colors"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              /* 🔥 PILAR 4: Geometría modal rounded-[2.5rem] */
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-[340px] flex flex-col border border-gray-100 dark:border-gray-800 lya:border-lya-border/40"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight flex items-center gap-2">
                  <Settings size={22} className="text-emerald-500 lya:text-lya-primary"/> Ajustes
                </h3>
                {/* 🔥 PILAR 2: md:hover estricto */}
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowSettings(false)} className="p-2 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg md:hover:bg-gray-200 dark:md:hover:bg-gray-700 text-gray-500 dark:text-gray-400 lya:text-lya-text/50 rounded-full outline-none transition-colors"><X size={18}/></motion.button>
              </div>

              <div className="space-y-4">
                <motion.button whileTap={{ scale: 0.98 }} onClick={cycleTheme} className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 rounded-2xl md:hover:border-emerald-500 dark:md:hover:border-emerald-400 lya:md:hover:border-lya-primary transition-colors outline-none group">
                  <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-gray-800 lya:bg-lya-surface p-2 rounded-xl shadow-sm md:group-hover:text-emerald-500 lya:md:group-hover:text-lya-primary transition-colors">
                      {themeIndex === 0 ? <Sun size={18}/> : themeIndex === 1 ? <Moon size={18}/> : <Droplet size={18}/>}
                    </div>
                    <span className="font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text text-sm">Apariencia</span>
                  </div>
                  <span className="text-xs font-black uppercase text-emerald-500 lya:text-lya-primary bg-emerald-50 dark:bg-emerald-500/10 lya:bg-lya-primary/10 px-3 py-1 rounded-lg">
                    {THEMES[themeIndex] === 'light' ? 'Claro' : THEMES[themeIndex] === 'dark' ? 'Oscuro' : 'Lya'}
                  </span>
                </motion.button>

                <motion.button whileTap={{ scale: 0.98 }} onClick={cycleSize} className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 rounded-2xl md:hover:border-emerald-500 dark:md:hover:border-emerald-400 lya:md:hover:border-lya-primary transition-colors outline-none group">
                  <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-gray-800 lya:bg-lya-surface p-2 rounded-xl shadow-sm md:group-hover:text-emerald-500 lya:md:group-hover:text-lya-primary transition-colors">
                      <Type size={18}/>
                    </div>
                    <span className="font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text text-sm">Tamaño</span>
                  </div>
                  <span className="text-xs font-black uppercase text-emerald-500 lya:text-lya-primary bg-emerald-50 dark:bg-emerald-500/10 lya:bg-lya-primary/10 px-3 py-1 rounded-lg">
                    {SIZES[sizeIndex].label}
                  </span>
                </motion.button>

                <motion.button whileTap={{ scale: 0.98 }} onClick={toggleFullscreen} className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 rounded-2xl md:hover:border-emerald-500 dark:md:hover:border-emerald-400 lya:md:hover:border-lya-primary transition-colors outline-none group">
                  <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-gray-800 lya:bg-lya-surface p-2 rounded-xl shadow-sm md:group-hover:text-emerald-500 lya:md:group-hover:text-lya-primary transition-colors">
                      {isFullscreen ? <Minimize size={18}/> : <Maximize size={18}/>}
                    </div>
                    <span className="font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text text-sm">Pantalla</span>
                  </div>
                  <span className="text-xs font-black uppercase text-emerald-500 lya:text-lya-primary bg-emerald-50 dark:bg-emerald-500/10 lya:bg-lya-primary/10 px-3 py-1 rounded-lg">
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