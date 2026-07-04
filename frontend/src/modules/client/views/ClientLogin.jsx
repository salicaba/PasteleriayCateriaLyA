// src/modules/client/views/ClientLogin.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, ArrowRight, Loader2, Settings } from 'lucide-react';
import ClientSettingsModal from './components/ClientSettingsModal';
import { THEME_CLASSES, SIZES, getInitialTheme, getInitialSize } from './utils/clientMenuUtils';

export default function ClientLogin({ onLogin, isSubmitting, type, tableId }) {
  const [name, setName] = useState('');
  
  // Estados para Ajustes desde el Login
  const [showSettings, setShowSettings] = useState(false);
  const [themeIndex, setThemeIndex] = useState(getInitialTheme);
  const [sizeIndex, setSizeIndex] = useState(getInitialSize);

  // Sincronizar Tema y Tamaño globalmente
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'theme-lya');
    root.classList.add(THEME_CLASSES[themeIndex]);
    localStorage.setItem('lya_client_theme', themeIndex);
  }, [themeIndex]);

  useEffect(() => {
    document.documentElement.style.fontSize = SIZES[sizeIndex].val;
    localStorage.setItem('lya_client_size', sizeIndex);
  }, [sizeIndex]);

  const cycleTheme = () => setThemeIndex((prev) => (prev + 1) % 3);
  const cycleSize = () => setSizeIndex((prev) => (prev + 1) % 3);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) onLogin({ name: name.trim() });
  };

  return (
    <div className="h-full w-full flex-1 flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg overflow-hidden relative">
      
      {/* Botón de Ajustes en el Login */}
      <motion.button 
        whileTap={{ scale: 0.95 }} 
        onClick={() => setShowSettings(true)} 
        className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 lya:bg-lya-surface border border-gray-200 dark:border-gray-700 lya:border-lya-border shadow-sm text-gray-600 dark:text-gray-300 lya:text-lya-text md:hover:bg-gray-100 transition-colors z-50"
      >
        <Settings size={24} strokeWidth={2.5} />
      </motion.button>

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }} 
        transition={{ type: 'spring', damping: 25 }}
        className="w-full max-w-sm bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border border-gray-100 dark:border-gray-800 lya:border-lya-border/40"
      >
        <div className="w-20 h-20 bg-orange-100 dark:bg-orange-500/20 lya:bg-lya-secondary/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Utensils size={32} className="text-orange-500 dark:text-orange-400 lya:text-lya-secondary" />
        </div>
        
        <h2 className="text-3xl font-black text-center text-gray-900 dark:text-white lya:text-lya-text mb-2 tracking-tight">
          ¡Bienvenido!
        </h2>
        
        {/* REGLA TIPOGRÁFICA: Justificado */}
        <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-sm text-justify mb-8 px-2 font-medium">
          {type === 'mesa' 
            ? `Estás en la Mesa ${tableId}. Por favor, ingresa tu nombre para iniciar tu orden digital y personalizar tus platillos.`
            : `Estás en la sección para Llevar. Por favor, ingresa tu nombre para que podamos llamarte cuando tu pedido esté listo.`}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 lya:text-lya-text ml-2">¿Cómo te llamas?</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. María López"
              disabled={isSubmitting}
              className="w-full px-5 py-4 rounded-[1.5rem] bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border-2 border-transparent focus:border-orange-500 dark:focus:border-orange-400 lya:focus:border-lya-primary focus:bg-white dark:focus:bg-gray-900 outline-none transition-all text-gray-900 dark:text-white lya:text-lya-text font-bold shadow-inner placeholder-gray-400 disabled:opacity-50"
              required
              autoFocus
            />
          </div>

          <motion.button 
            whileTap={name.trim() && !isSubmitting ? { scale: 0.95 } : {}}
            disabled={!name.trim() || isSubmitting}
            type="submit"
            className="w-full py-4 rounded-[1.5rem] bg-orange-500 md:hover:bg-orange-600 dark:bg-orange-600 lya:bg-lya-primary text-white lya:text-lya-surface font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {isSubmitting ? <><Loader2 size={20} className="animate-spin" /><span>Entrando...</span></> : <><span>Ir al Menú</span><ArrowRight size={20} strokeWidth={3} /></>}
          </motion.button>
        </form>
      </motion.div>

      {/* Modal de Ajustes (Ocultando Cerrar Sesión) */}
      <AnimatePresence>
        {showSettings && (
          <ClientSettingsModal 
            themeIndex={themeIndex} 
            sizeIndex={sizeIndex} 
            cycleTheme={cycleTheme} 
            cycleSize={cycleSize} 
            onClose={() => setShowSettings(false)} 
            showLogout={false} // 🔥 Ocultamos "Abandonar Mesa" en el Login
          />
        )}
      </AnimatePresence>
    </div>
  );
}