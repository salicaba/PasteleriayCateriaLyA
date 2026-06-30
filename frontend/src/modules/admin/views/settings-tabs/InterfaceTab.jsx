// src/modules/admin/views/settings-tabs/InterfaceTab.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Palette, Monitor, Maximize, Minimize, Layout, Save, Loader2 } from 'lucide-react';
import { ThemeSelector } from '../../../../components/ThemeSelector';

export const InterfaceTab = ({ uiSize, setUiSize, showNotification }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setFetching(false), 500);
    
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        showNotification('error', "El navegador bloqueó la pantalla completa automática.");
      });
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const handleSaveInterface = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showNotification('success', "¡Configuración de interfaz guardada exitosamente!");
    }, 500);
  };

  // ==========================================
  // PANTALLA DE CARGA ANIMADA NEO-BENTO (Centrada Absoluta)
  // ==========================================
  if (fetching) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg z-10 transition-colors duration-300">
        <motion.div
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-24 h-24 bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-700 lya:border-lya-border/40"
        >
          <Palette size={40} className="text-purple-500 lya:text-lya-primary" />
        </motion.div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">
          Cargando Interfaz
        </h2>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-purple-500 lya:text-lya-primary" /> Sincronizando preferencias visuales y temas...
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }} 
      className="space-y-6 relative"
    >
      <div className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 lya:border-lya-border/30 flex items-center gap-4">
        <div className="bg-purple-500 lya:bg-lya-primary p-3.5 rounded-2xl text-white shadow-lg shrink-0"><Palette size={28} /></div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight leading-none">Interfaz y Pantalla</h1>
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">Personaliza el aspecto, colores y tamaño visual de 𝓛𝔂𝓪</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-8 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 flex flex-col">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50 dark:border-gray-700 lya:border-lya-border/20">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0"><Palette size={20} /></div>
            <h2 className="font-bold text-lg text-gray-900 dark:text-white lya:text-lya-text">Apariencia</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-5 flex-1">Personaliza los colores del sistema POS.</p>
          
          <div className="flex bg-gray-100 dark:bg-gray-900 lya:bg-lya-bg rounded-xl p-1.5 border border-gray-100 dark:border-gray-700/50 lya:border-lya-border/30 h-[56px] w-full [&>div]:w-full [&>div]:h-full [&>div]:bg-transparent [&>div]:border-none [&>div]:p-0 [&>div]:flex [&>div]:gap-0 [&_button]:flex-1 [&_button]:h-full [&_button]:rounded-lg [&_button]:text-sm [&_button]:font-bold [&_button]:flex [&_button]:items-center [&_button]:justify-center">
            <ThemeSelector />
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-8 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 flex flex-col">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50 dark:border-gray-700 lya:border-lya-border/20">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0"><Layout size={20} /></div>
            <h2 className="font-bold text-lg text-gray-900 dark:text-white lya:text-lya-text">Tamaño de Interfaz</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-5 flex-1">Ajusta la escala visual para pantallas táctiles.</p>
          <div className="flex bg-gray-100 dark:bg-gray-900 lya:bg-lya-bg rounded-xl p-1.5 border border-gray-100 dark:border-gray-700/50 lya:border-lya-border/30 h-[56px] w-full">
            {['small', 'medium', 'large'].map((size) => (
              <button key={size} onClick={() => setUiSize(size)}
                className={`flex-1 flex items-center justify-center text-sm font-bold rounded-lg transition-all ${
                  uiSize === size ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface text-gray-900 dark:text-white lya:text-lya-primary shadow-sm lya:border lya:border-lya-border/30' : 'text-gray-500 dark:text-gray-400 lya:text-lya-text/60 hover:text-gray-700 dark:hover:text-gray-200 lya:hover:text-lya-text'
                }`}
              >
                {size === 'small' ? 'Chica' : size === 'medium' ? 'Media' : 'Grande'}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-8 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 flex flex-col">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50 dark:border-gray-700 lya:border-lya-border/20">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0"><Monitor size={20} /></div>
            <h2 className="font-bold text-lg text-gray-900 dark:text-white lya:text-lya-text">Pantalla</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-5 flex-1">Expande el sistema para una experiencia inmersiva libre de distracciones.</p>
          <button onClick={toggleFullscreen} className="w-full h-[56px] bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg text-gray-700 dark:text-gray-200 lya:text-lya-text font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98] border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 text-sm">
            {isFullscreen ? <Minimize size={18}/> : <Maximize size={18}/>} {isFullscreen ? 'Contraer' : 'Expandir'}
          </button>
        </section>
      </div>
      
      <div className="flex justify-end mt-4">
        <button onClick={handleSaveInterface} disabled={loading} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 hover:bg-black dark:bg-purple-500 dark:hover:bg-purple-600 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white rounded-xl text-sm font-black shadow-lg transition-all active:scale-95 disabled:opacity-50">
          {loading ? <><Loader2 className="animate-spin" size={18} /> Espere...</> : <><Save size={18} /> Guardar Interfaz</>}
        </button>
      </div>
    </motion.div>
  );
};