// src/modules/client/views/ClientLogin.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Utensils, ShoppingBag, Loader2, CheckCircle2, 
  AlertTriangle, AlertCircle, Phone, User, ChevronRight, Settings
} from 'lucide-react';
import logoLyA from '../../../assets/logo.jpeg';

// Importación de configuración visual
import ClientSettingsModal from './components/ClientSettingsModal';
import { THEME_CLASSES, SIZES, getInitialTheme, getInitialSize } from './utils/clientMenuUtils';

export default function ClientLogin({ onLogin, type, tableId }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState(null);

  // Estados visuales inyectados
  const [showSettings, setShowSettings] = useState(false);
  const [themeIndex, setThemeIndex] = useState(getInitialTheme);
  const [sizeIndex, setSizeIndex] = useState(getInitialSize);

  // PILAR 5: Cápsulas Neo-Bento para notificaciones
  const triggerNotification = (msg, notifType = 'warning') => {
    setNotification({ msg, type: notifType });
    setTimeout(() => setNotification(null), 3500);
  };

  // Efectos para inyectar el tema desde el Login
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

  const handlePhoneChange = (e) => {
    // Blindaje para aceptar SOLO números
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setPhone(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // PILAR 3: Locks Asíncronos
    if (isProcessing) return; 

    const trimmedName = name.trim();
    if (!trimmedName) {
      triggerNotification("Por favor, dinos cómo te llamas", "warning");
      return;
    }

    // Validación Estricta: El teléfono es opcional, pero si escriben algo, DEBEN ser 10 números
    if (phone && phone.length !== 10) {
      triggerNotification("El número de celular debe tener exactamente 10 dígitos", "warning");
      return;
    }

    setIsProcessing(true);

    try {
      // 🔥 MAGIA DE INTEGRACIÓN: Enviamos el formato separado por " | "
      const finalName = phone ? `${trimmedName} | ${phone}` : trimmedName;
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      onLogin({ 
        name: finalName, 
        rawName: trimmedName, 
        phone: phone,
        type: type,
        tableId: tableId
      });
    } catch (error) {
      triggerNotification("Error al iniciar sesión", "error");
      setIsProcessing(false);
    }
  };

  // PILAR 1: Responsividad Estricta y Flexbox (Anti-Ghost Scroll)
  return (
    <div className="h-full w-full flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 lya:bg-[#FAF6F0] relative items-center justify-center p-6">
      
      {/* BOTÓN FLOTANTE DE CONFIGURACIÓN */}
      <motion.button 
        whileTap={{ scale: 0.95 }} 
        onClick={() => setShowSettings(true)}
        className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] shadow-sm text-gray-600 dark:text-gray-300 lya:text-[#7A6353] md:hover:bg-gray-100 dark:md:hover:bg-gray-700 transition-colors z-40 outline-none"
      >
        <Settings size={20} strokeWidth={2.5} />
      </motion.button>

      {/* NOTIFICACIONES FLOTANTES (Cápsulas) */}
      <AnimatePresence>
        {notification && (
          <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
            <motion.div 
              initial={{ opacity: 0, y: -50, scale: 0.9 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className={`bg-white/95 dark:bg-gray-900/95 lya:bg-[#F3EBE0]/95 backdrop-blur-xl text-gray-800 dark:text-white lya:text-[#3E2723] px-6 py-4 rounded-full shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] flex items-center justify-center gap-3 font-bold border pointer-events-auto max-w-md w-full sm:w-auto text-center ${
                notification.type === 'success' ? 'border-emerald-200/50 dark:border-emerald-900/30 lya:border-emerald-400/30' :
                notification.type === 'warning' ? 'border-amber-200/50 dark:border-amber-900/30 lya:border-amber-500/30' :
                'border-red-200/50 dark:border-red-900/30 lya:border-red-500/30'
              }`}
            >
              <div className={`p-1.5 rounded-full shrink-0 ${
                notification.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500' :
                notification.type === 'warning' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-500' :
                'bg-red-100 dark:bg-red-500/20 text-red-500'
              }`}>
                {notification.type === 'success' ? <CheckCircle2 size={20} strokeWidth={2.5} /> : 
                 notification.type === 'warning' ? <AlertTriangle size={20} strokeWidth={2.5} /> : 
                 <AlertCircle size={20} strokeWidth={2.5} />}
              </div>
              <span className="text-sm tracking-wide">{notification.msg}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className="w-full max-w-sm bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] p-8 flex flex-col items-center border border-gray-100 dark:border-gray-700/50 lya:border-[#EADCC9] relative overflow-hidden"
      >
        {/* Barra de color superior */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-400 to-orange-600 lya:from-[#78350F] lya:to-orange-500" />

        {/* Logo Lya */}
        <div className="w-24 h-24 mb-6 rounded-[1.5rem] overflow-hidden shadow-lg border-[4px] border-white dark:border-gray-700 lya:border-[#D9C4A9] shrink-0">
           <img src={logoLyA} alt="Logo Lya" className="w-full h-full object-cover" />
        </div>

        {/* Encabezado */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 lya:bg-white rounded-xl border border-gray-100 dark:border-gray-700 lya:border-[#EADCC9] text-[11px] font-bold text-gray-700 dark:text-gray-300 lya:text-[#3E2723] mx-auto w-fit mb-3">
            {type === 'mesa' ? <Utensils size={14} className="text-orange-500 lya:text-[#78350F]" /> : <ShoppingBag size={14} className="text-orange-500 lya:text-[#78350F]" />}
            <span className="uppercase tracking-widest">{type === 'mesa' ? `Mesa ${tableId}` : 'Pedido Para Llevar'}</span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-[#3E2723] tracking-tight">
            ¡Bienvenido!
          </h2>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 lya:text-[#7A6353] mt-1">
            Ingresa tus datos para comenzar tu orden
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
               <User size={18} className="text-gray-400 dark:text-gray-500 lya:text-[#7A6353]" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="¿Cómo te llamas?"
              maxLength={30}
              className="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-900 lya:bg-white border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] text-gray-900 dark:text-white lya:text-[#3E2723] rounded-2xl font-bold placeholder-gray-400 dark:placeholder-gray-500 lya:placeholder-[#7A6353]/70 focus:outline-none focus:ring-2 focus:ring-orange-500/50 lya:focus:ring-[#78350F]/30 transition-all"
            />
          </div>

          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
               <Phone size={18} className="text-gray-400 dark:text-gray-500 lya:text-[#7A6353]" />
            </div>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="Celular (Opcional)"
              maxLength={10}
              className="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-900 lya:bg-white border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] text-gray-900 dark:text-white lya:text-[#3E2723] rounded-2xl font-bold placeholder-gray-400 dark:placeholder-gray-500 lya:placeholder-[#7A6353]/70 focus:outline-none focus:ring-2 focus:ring-orange-500/50 lya:focus:ring-[#78350F]/30 transition-all"
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={isProcessing}
            className={`w-full py-4 mt-2 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-xl outline-none md:hover:scale-[1.02] ${
              isProcessing 
                ? 'bg-gray-400 dark:bg-gray-600 lya:bg-[#EADCC9] cursor-not-allowed opacity-90 text-white' 
                : 'bg-orange-500 md:hover:bg-orange-600 dark:bg-orange-600 lya:bg-[#78350F] text-white shadow-orange-500/30'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Ingresando...</span>
              </>
            ) : (
              <>
                <span>Ver el Menú</span>
                <ChevronRight size={18} strokeWidth={3} />
              </>
            )}
          </motion.button>

        </form>
      </motion.div>

      {/* MODAL DE CONFIGURACIÓN INYECTADO */}
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