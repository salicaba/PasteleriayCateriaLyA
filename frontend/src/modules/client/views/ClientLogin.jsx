// src/modules/client/views/ClientLogin.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, ArrowRight, Settings, Phone, CheckCircle2 } from 'lucide-react';
import ClientSettingsModal from './components/ClientSettingsModal';
import { THEME_CLASSES, SIZES, getInitialTheme, getInitialSize } from './utils/clientMenuUtils';

// 🔥 Importamos el logo de 𝓛𝔂𝓪 para la pantalla de carga
import logoLyA from '../../../assets/logo.jpeg'; 

export default function ClientLogin({ onLogin, isSubmitting, type, tableId }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(''); 
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (name.trim() && phone.trim()) {
      setShowLoadingScreen(true); 
      
      // Simulamos un pequeñísimo retraso visual
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      
      onLogin({ 
        name: name.trim(), 
        phone: phone.trim() 
      });
    }
  };

  return (
    // 🔥 SOLUCIÓN: min-h-[100dvh] permite que crezca si es necesario y overflow-y-auto permite deslizar con el teclado
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 sm:p-6 py-12 bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg relative overflow-y-auto transition-colors duration-500">
      
      {/* PANTALLA DE CARGA ELEGANTE 𝓛𝔂𝓪 */}
      <AnimatePresence>
        {showLoadingScreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg backdrop-blur-md"
          >
             <div className="relative w-28 h-28 mb-6">
                <div className="absolute inset-0 rounded-full border-[6px] border-gray-200 dark:border-gray-800 lya:border-lya-border/40" />
                <div className="absolute inset-0 rounded-full border-[6px] border-orange-500 dark:border-orange-400 lya:border-lya-primary border-t-transparent animate-spin" />
                <div className="absolute inset-0 m-2 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-inner">
                  <img src={logoLyA} alt="Logo Lya" className="w-full h-full object-cover animate-pulse" />
                </div>
             </div>
             
             <motion.h2 
                initial={{ y: 10, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                transition={{ delay: 0.2 }}
                className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight mb-2"
             >
                Preparando tu mesa...
             </motion.h2>
             <motion.p 
                initial={{ y: 10, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                transition={{ delay: 0.4 }}
                className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-medium text-sm flex items-center gap-2"
             >
                <CheckCircle2 size={16} className="text-green-500" />
                Cargando el menú más fresco
             </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FORMULARIO DE LOGIN PRINCIPAL */}
      <AnimatePresence>
        {!showLoadingScreen && (
          <>
            <motion.button 
              whileTap={{ scale: 0.95 }} 
              onClick={() => setShowSettings(true)} 
              // Se mantiene absolute pero relativo al scroll, no tapará el formulario
              className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 lya:bg-lya-surface border border-gray-200 dark:border-gray-700 lya:border-lya-border shadow-sm text-gray-600 dark:text-gray-300 lya:text-lya-text md:hover:bg-gray-100 dark:md:hover:bg-gray-700 transition-colors z-50 outline-none"
            >
              <Settings size={24} strokeWidth={2.5} />
            </motion.button>

            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25 }}
              // 🔥 my-auto y shrink-0 aseguran que se centre cuando hay espacio, pero no se aplaste cuando el teclado suba
              className="w-full max-w-md my-auto shrink-0 bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 relative z-10"
            >
              <div className="w-20 h-20 bg-orange-100 dark:bg-orange-500/20 lya:bg-lya-secondary/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Utensils size={32} className="text-orange-500 dark:text-orange-400 lya:text-lya-secondary" />
              </div>
              
              <h2 className="text-3xl font-black text-center text-gray-900 dark:text-white lya:text-lya-text mb-6 tracking-tight">
                ¡Bienvenido!
              </h2>
              
              {/* BLOQUE DE RESALTADO NEO-BENTO PARA MESA/LLEVAR */}
              <div className="bg-orange-50 dark:bg-orange-500/10 lya:bg-lya-secondary/10 border border-orange-100 dark:border-orange-500/20 lya:border-lya-secondary/20 rounded-2xl p-4 mb-6 flex flex-col items-center text-center shadow-inner">
                <span className="text-xs font-bold text-orange-400 dark:text-orange-500 lya:text-lya-secondary uppercase tracking-widest mb-1">
                  Estás en:
                </span>
                <span className="text-xl font-black text-orange-600 dark:text-orange-400 lya:text-lya-primary leading-none mb-2">
                  {type === 'mesa' ? `MESA ${tableId}` : 'PEDIDO PARA LLEVAR'}
                </span>
                <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/70 text-xs font-medium leading-relaxed px-2">
                  {type === 'mesa' 
                    ? "Ingresa tus datos para iniciar tu orden. Tu número de celular nos sirve para notificarte cualquier detalle de tu ticket."
                    : "Ingresa tus datos para comenzar. Te enviaremos tu nota digital y te avisaremos en cuanto tu pedido esté empacado."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2 text-left">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 lya:text-lya-text ml-2">¿Cómo te llamas?</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. María López"
                    disabled={isSubmitting || showLoadingScreen}
                    className="w-full px-5 py-4 rounded-[1.5rem] bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border-2 border-transparent focus:border-orange-500 dark:focus:border-orange-400 lya:focus:border-lya-primary focus:bg-white dark:focus:bg-gray-900 outline-none transition-all text-gray-900 dark:text-white lya:text-lya-text font-bold shadow-inner placeholder-gray-400 disabled:opacity-50"
                    required
                  />
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 lya:text-lya-text ml-2 flex items-center gap-2">
                    <Phone size={16} /> Número de Celular
                  </label>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9\s-]/g, ''))}
                    placeholder="Ej. 961 123 4567"
                    disabled={isSubmitting || showLoadingScreen}
                    className="w-full px-5 py-4 rounded-[1.5rem] bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border-2 border-transparent focus:border-orange-500 dark:focus:border-orange-400 lya:focus:border-lya-primary focus:bg-white dark:focus:bg-gray-900 outline-none transition-all text-gray-900 dark:text-white lya:text-lya-text font-bold shadow-inner placeholder-gray-400 disabled:opacity-50"
                    required
                  />
                </div>

                <motion.button 
                  whileTap={name.trim() && phone.trim() && !isSubmitting ? { scale: 0.95 } : {}}
                  disabled={!name.trim() || !phone.trim() || isSubmitting || showLoadingScreen}
                  type="submit"
                  className="w-full py-4 mt-2 rounded-[1.5rem] bg-orange-500 md:hover:bg-orange-600 dark:bg-orange-600 dark:md:hover:bg-orange-500 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white lya:text-lya-surface font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed outline-none"
                >
                  <span>Ir al Menú</span>
                  <ArrowRight size={20} strokeWidth={3} />
                </motion.button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal de Ajustes */}
      <AnimatePresence>
        {showSettings && (
          <ClientSettingsModal 
            themeIndex={themeIndex} 
            sizeIndex={sizeIndex} 
            cycleTheme={cycleTheme} 
            cycleSize={cycleSize} 
            onClose={() => setShowSettings(false)} 
            showLogout={false} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}