// src/modules/admin/views/settings-tabs/InterfaceTab.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Palette, Monitor, Maximize, Minimize, Layout, Save, Loader2, Pin, ArrowUpDown } from 'lucide-react';
import { ThemeSelector } from '../../../../components/ThemeSelector';

export const InterfaceTab = ({ uiSize, setUiSize, globalScroll, setGlobalScroll, showNotification }) => {
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
      document.documentElement.requestFullscreen().catch(() => {
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
    }, 600);
  };

  if (fetching) {
    return (
      <div className={`w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg transition-colors duration-300 ${globalScroll ? 'min-h-[60vh]' : 'h-full'}`}>
        <motion.div
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-24 h-24 bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-700 lya:border-lya-border/40"
        >
          <Palette size={40} className="text-purple-500 lya:text-lya-primary" />
        </motion.div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight text-center">
          Cargando Interfaz
        </h2>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2 text-center">
          <Loader2 size={16} className="animate-spin text-purple-500 lya:text-lya-primary" /> Sincronizando preferencias...
        </p>
      </div>
    );
  }

  return (
    // 🔥 CONTENEDOR MAESTRO: Hereda la lógica de MesasPage
    <div className={`flex flex-col w-full transition-all duration-300 ${globalScroll ? 'space-y-6' : 'h-full overflow-hidden'}`}>
      
      {/* ENCABEZADO NEO-BENTO (Shrink-0 lo ancla a la parte superior cuando el contenedor inferior hace scroll) */}
      <div className={`shrink-0 bg-white dark:bg-gray-800 lya:bg-lya-surface p-5 sm:p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 lya:border-lya-border/30 flex items-center gap-4 shadow-sm ${globalScroll ? '' : 'mb-6 z-10'}`}>
        <div className="bg-purple-500 lya:bg-lya-primary p-3.5 rounded-2xl text-white shadow-lg shrink-0">
          <Palette size={28} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight leading-none">Interfaz y Pantalla</h1>
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">Personaliza el aspecto, colores y tamaño visual de 𝓛𝔂𝓪</p>
        </div>
      </div>

      {/* CONTENEDOR DE SCROLL INTERNO (Se activa en modo Fijo) */}
      <div className={`flex-1 w-full relative ${globalScroll ? '' : 'overflow-y-auto custom-scrollbar pr-1 sm:pr-2 pb-24'}`}>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* SECCIÓN: APARIENCIA */}
          <section className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2.5rem] p-8 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 flex flex-col">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50 dark:border-gray-700 lya:border-lya-border/20">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0"><Palette size={20} /></div>
              <h2 className="font-bold text-lg text-gray-900 dark:text-white lya:text-lya-text">Apariencia</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-5 flex-1 text-justify">
              Personaliza los colores del sistema POS para adaptarlos al entorno visual que prefieras durante la operación.
            </p>
            
            <div className="flex bg-gray-100 dark:bg-gray-900 lya:bg-lya-bg rounded-xl p-1.5 border border-gray-100 dark:border-gray-700/50 lya:border-lya-border/30 h-[56px] w-full [&>div]:w-full [&>div]:h-full [&>div]:bg-transparent [&>div]:border-none [&>div]:p-0 [&>div]:flex [&>div]:gap-0 [&_button]:flex-1 [&_button]:h-full [&_button]:rounded-lg [&_button]:text-sm [&_button]:font-bold [&_button]:flex [&_button]:items-center [&_button]:justify-center">
              <ThemeSelector />
            </div>
          </section>

          {/* SECCIÓN: TAMAÑO DE INTERFAZ */}
          <section className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2.5rem] p-8 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 flex flex-col">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50 dark:border-gray-700 lya:border-lya-border/20">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0"><Layout size={20} /></div>
              <h2 className="font-bold text-lg text-gray-900 dark:text-white lya:text-lya-text">Tamaño Visual</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-5 flex-1 text-justify">
              Ajusta la escala visual y el tamaño de los elementos del sistema para mejorar la precisión en pantallas táctiles.
            </p>
            
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

          {/* SECCIÓN: NAVEGACIÓN Y SCROLL */}
          <section className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2.5rem] p-8 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 flex flex-col">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50 dark:border-gray-700 lya:border-lya-border/20">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0"><Monitor size={20} /></div>
              <h2 className="font-bold text-lg text-gray-900 dark:text-white lya:text-lya-text">Navegación</h2>
            </div>
            
            <div className="space-y-6 flex-1">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-3 text-justify">
                  Expande el sistema para obtener una experiencia inmersiva libre de distracciones externas del navegador.
                </p>
                <button onClick={toggleFullscreen} className="w-full h-[48px] bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg text-gray-700 dark:text-gray-200 lya:text-lya-text font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98] border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 text-sm">
                  {isFullscreen ? <Minimize size={18}/> : <Maximize size={18}/>} {isFullscreen ? 'Contraer Pantalla' : 'Expandir Pantalla'}
                </button>
              </div>

              <div className="pt-5 border-t border-gray-50 dark:border-gray-700 lya:border-lya-border/20">
                <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-3 text-justify">
                  Libera el scroll para ocultar encabezados al bajar. Excelente opción para maximizar el área de visión en móviles.
                </p>
                <div className="flex bg-gray-100 dark:bg-gray-900 lya:bg-lya-bg rounded-xl p-1.5 border border-gray-100 dark:border-gray-700/50 lya:border-lya-border/30 h-[48px] w-full">
                  <button 
                    onClick={() => setGlobalScroll(false)}
                    className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold rounded-lg transition-all ${
                      !globalScroll ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface text-gray-900 dark:text-white lya:text-lya-primary shadow-sm lya:border lya:border-lya-border/30' : 'text-gray-500 dark:text-gray-400 lya:text-lya-text/60 hover:text-gray-700 dark:hover:text-gray-200 lya:hover:text-lya-text'
                    }`}
                  >
                    <Pin size={16} /> Fijos
                  </button>
                  <button 
                    onClick={() => setGlobalScroll(true)}
                    className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold rounded-lg transition-all ${
                      globalScroll ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface text-gray-900 dark:text-white lya:text-lya-primary shadow-sm lya:border lya:border-lya-border/30' : 'text-gray-500 dark:text-gray-400 lya:text-lya-text/60 hover:text-gray-700 dark:hover:text-gray-200 lya:hover:text-lya-text'
                    }`}
                  >
                    <ArrowUpDown size={16} /> Libre
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
        
        {/* BOTÓN GUARDAR (Dentro del área que hace scroll) */}
        <div className="flex justify-end mt-4">
          <button 
            onClick={handleSaveInterface} 
            disabled={loading} 
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-gray-900 hover:bg-black dark:bg-purple-500 dark:hover:bg-purple-600 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white rounded-xl text-sm font-black shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? <><Loader2 className="animate-spin" size={18} /> Guardando...</> : <><Save size={18} /> Guardar Cambios</>}
          </button>
        </div>

      </div>
    </div>
  );
};