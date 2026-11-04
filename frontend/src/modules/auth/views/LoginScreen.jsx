// src/modules/auth/views/LoginScreen.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogIn, User, Lock, ArrowLeft, ShieldAlert, WifiOff, RefreshCw, 
  Loader2, Eye, EyeOff, CheckCircle2, AlertTriangle, AlertCircle, 
  Sparkles, Cake, Coffee, Croissant, Cookie, ChefHat, IceCream, 
  CupSoda, UtensilsCrossed 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import logoLyA from '../../../assets/logo.jpeg'; 
import client from '../../../api/client'; 

const motivationalPhrases = [
  "Preparando el aroma de un gran día...",
  "Encendiendo los hornos de 𝓛𝔂𝓪...",
  "La magia dulce está por comenzar...",
  "Alistando todo para un turno excelente...",
  "Un buen café, una sonrisa y a triunfar...",
  "Transformando granos en momentos especiales...",
  "Horneando felicidad para nuestros clientes...",
  "Café listo, actitud lista, ¡a brillar!"
];

export const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotMode, setShowForgotMode] = useState(false);
  const [bootState, setBootState] = useState('booting'); 
  const [phrase, setPhrase] = useState('');
  
  const [notification, setNotification] = useState(null);

  const [blockedUntil, setBlockedUntil] = useState(() => {
    const savedBlock = localStorage.getItem('lya_blockedUntil');
    if (savedBlock && parseInt(savedBlock, 10) > Date.now()) {
      return parseInt(savedBlock, 10);
    }
    localStorage.removeItem('lya_blockedUntil');
    return null;
  });
  
  const [timeLeft, setTimeLeft] = useState('');

  // Generador de Huella de Dispositivo robusto
  const getDeviceId = () => {
    let deviceId = localStorage.getItem('lyA_deviceId');
    if (!deviceId) {
      if (window.crypto && window.crypto.randomUUID) {
        deviceId = crypto.randomUUID();
      } else {
        deviceId = 'dev-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      }
      localStorage.setItem('lyA_deviceId', deviceId);
    }
    return deviceId;
  };

  const triggerNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    if (!blockedUntil) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const difference = blockedUntil - now;

      if (difference <= 0) {
        setBlockedUntil(null);
        setTimeLeft('');
        localStorage.removeItem('lya_blockedUntil');
        clearInterval(interval);
        return;
      }

      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      const formattedTime = [
        hours > 0 ? `${hours}h` : null,
        `${minutes}m`,
        `${seconds}s`
      ].filter(Boolean).join(' ');

      setTimeLeft(formattedTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [blockedUntil]);

  const runSystemCheck = async () => {
    setBootState('booting');
    const randomPhrase = motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)];
    setPhrase(randomPhrase);

    if (!navigator.onLine) {
      setTimeout(() => setBootState('error'), 1500);
      return;
    }

    try {
      await client.get('/settings');
      setTimeout(() => setBootState('ready'), 1500);
    } catch (error) {
      console.error("Fallo al conectar con el servidor backend:", error);
      setBootState('error');
    }
  };

  useEffect(() => {
    runSystemCheck();
  }, []);

  const handleFocus = (e) => {
    const target = e.target;
    setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (blockedUntil) {
      return triggerNotification(`Dispositivo bloqueado para este usuario. Espera ${timeLeft}`, 'warning');
    }

    if (!username || !password) {
      return triggerNotification("Ingresa tus credenciales completas", 'warning');
    }

    setIsLoading(true);
    
    try {
      const response = await client.post('/auth/login', { 
        username, 
        password,
        deviceId: getDeviceId() 
      });
      
      if (response.data && response.data.user) {
        localStorage.setItem('lya_token', response.data.token);

        const loggedUser = response.data.user;
        const firstName = loggedUser.fullName ? loggedUser.fullName.split(' ')[0] : loggedUser.username;
        
        if (loggedUser.role === 'Administrador') {
          toast.success(`¡Bienvenido de vuelta, ${firstName}!`);
        } else {
          toast.success(`Turno iniciado: ${firstName}`);
        }
        
        onLogin(loggedUser);
      }
    } catch (error) {
      console.error("Error en inicio de sesión:", error);
      
      if (error.response?.status === 429 && error.response?.data?.remainingMs) {
        const localBlockTimestamp = Date.now() + error.response.data.remainingMs;
        setBlockedUntil(localBlockTimestamp);
        localStorage.setItem('lya_blockedUntil', localBlockTimestamp.toString());
        triggerNotification("Límite de intentos excedido. Dispositivo bloqueado.", 'error');
      } else {
        const errorMsg = error.response?.data?.message || "Usuario o contraseña incorrectos";
        if (errorMsg.includes('Intentos restantes')) {
          triggerNotification(errorMsg, 'warning');
        } else {
          triggerNotification(errorMsg, 'error');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 py-8 pb-28 bg-slate-50 dark:bg-[#0b1120] lya:bg-lya-bg relative overflow-y-auto custom-scrollbar transition-colors duration-500">
      
      {/* 🔥 ATMÓSFERA Y ARTE DE FONDO: LUCES AMBIENTALES + ICONOGRAFÍA FLOTANTE */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        
        {/* Halos de luz ambiental súper sutiles para quitar lo plano/pálido */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-gradient-to-tr from-[#F49AC2]/15 via-blue-500/10 to-[#72CEC3]/15 dark:from-[#F49AC2]/10 dark:via-blue-600/15 dark:to-[#72CEC3]/10 lya:from-lya-primary/25 lya:via-lya-border/15 lya:to-lya-secondary/25 blur-3xl"
        />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#F49AC2]/10 dark:bg-blue-500/[0.06] lya:bg-lya-primary/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#72CEC3]/10 dark:bg-teal-500/[0.06] lya:bg-lya-secondary/15 blur-3xl" />

        {/* Lado Derecho */}
        <motion.div 
          animate={{ y: [-15, 15, -15], rotate: [-6, 6, -6] }} 
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} 
          className="absolute top-[11%] right-[14%] text-slate-300/70 dark:text-slate-800/80 lya:text-lya-primary/25"
        >
          <Croissant size={105} strokeWidth={1.4} />
        </motion.div>

        <motion.div 
          animate={{ x: [-12, 12, -12], y: [-8, 8, -8], rotate: [-10, 12, -10] }} 
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }} 
          className="absolute top-[48%] right-[8%] text-slate-300/60 dark:text-slate-800/75 lya:text-lya-secondary/25"
        >
          <CupSoda size={82} strokeWidth={1.4} />
        </motion.div>

        <motion.div 
          animate={{ y: [12, -12, 12], rotate: [-4, 14, -4] }} 
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 1 }} 
          className="absolute bottom-[16%] right-[12%] text-slate-300/70 dark:text-slate-800/80 lya:text-lya-primary/25"
        >
          <IceCream size={95} strokeWidth={1.4} />
        </motion.div>

        {/* Lado Izquierdo */}
        <motion.div 
          animate={{ y: [-12, 12, -12], rotate: [-10, 8, -10] }} 
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 3 }} 
          className="absolute top-[14%] left-[12%] text-slate-300/70 dark:text-slate-800/80 lya:text-lya-secondary/25"
        >
          <ChefHat size={92} strokeWidth={1.4} />
        </motion.div>

        <motion.div 
          animate={{ x: [12, -12, 12], rotate: [12, -12, 12] }} 
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 4 }} 
          className="absolute top-[46%] left-[6%] text-slate-300/60 dark:text-slate-800/75 lya:text-lya-primary/25"
        >
          <UtensilsCrossed size={76} strokeWidth={1.4} />
        </motion.div>
        
        <motion.div 
          animate={{ y: [15, -15, 15], rotate: [0, -15, 0] }} 
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} 
          className="absolute bottom-[14%] left-[10%] text-slate-300/70 dark:text-slate-800/80 lya:text-lya-secondary/25"
        >
          <Cookie size={120} strokeWidth={1.4} />
        </motion.div>

        {/* Chispitas/Sparkles animadas */}
        <motion.div 
          animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.4, 0.8, 0.4], rotate: [0, 12, 0] }} 
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }} 
          className="absolute top-[28%] left-[25%] text-[#F49AC2]/40 dark:text-[#F49AC2]/20 lya:text-lya-primary/35"
        >
          <Sparkles size={54} strokeWidth={1.5} />
        </motion.div>
        
        <motion.div 
          animate={{ scale: [0.9, 1.2, 0.9], opacity: [0.4, 0.8, 0.4], rotate: [0, -12, 0] }} 
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} 
          className="absolute bottom-[32%] right-[26%] text-[#72CEC3]/40 dark:text-[#72CEC3]/20 lya:text-lya-secondary/35"
        >
          <Sparkles size={64} strokeWidth={1.5} />
        </motion.div>
      </div>

      {/* NOTIFICACIÓN SUPERIOR FLOTANTE */}
      <AnimatePresence>
        {notification && (
          <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
            <motion.div 
              initial={{ opacity: 0, y: -12, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className={`bg-white/95 dark:bg-slate-800/95 lya:bg-lya-surface/95 backdrop-blur-md text-gray-800 dark:text-white lya:text-lya-text px-5 py-3 rounded-full shadow-2xl flex items-center justify-center gap-3 font-semibold tracking-tight border pointer-events-auto max-w-md w-full sm:w-auto text-center ${
                notification.type === 'error' ? 'border-red-200 dark:border-red-900/40' : 
                notification.type === 'warning' ? 'border-amber-200 dark:border-amber-900/40' :
                'border-emerald-200 dark:border-emerald-900/40 lya:border-lya-primary/40'
              }`}
            >
              <div className={`p-1.5 rounded-full shrink-0 ${
                notification.type === 'error' ? 'bg-red-100 dark:bg-red-500/20 text-red-500' : 
                notification.type === 'warning' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-500' :
                'bg-emerald-100 dark:bg-emerald-500/20 lya:bg-lya-primary/20 text-emerald-500 lya:text-lya-primary'
              }`}>
                {notification.type === 'error' ? <AlertCircle size={18} /> : notification.type === 'warning' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              </div>
              <span className="text-sm">{notification.msg}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        
        {/* ==========================================
            1. PANTALLA DE CARGA (SPLASH REDISEÑADO)
           ========================================== */}
        {bootState === 'booting' && (
          <motion.div 
            key="splash"
            initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.04, filter: "blur(6px)" }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="flex flex-col items-center justify-center relative z-10 my-auto shrink-0 px-4"
          >
            {/* Contenedor Orbital del Medallón Circular */}
            <div className="relative flex items-center justify-center mb-8">
              
              {/* Resplandor suave detrás del logo */}
              <motion.div
                animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0.75, 0.4] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-gradient-to-tr from-[#F49AC2]/30 via-blue-500/20 to-[#72CEC3]/30 blur-2xl"
              />

              {/* Anillo exterior punteado girando lento */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border border-dashed border-[#F49AC2]/40 dark:border-[#72CEC3]/30 lya:border-lya-border/50"
              />

              {/* Anillo orbital luminoso principal */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
                className="absolute w-38 h-38 sm:w-44 sm:h-44 rounded-full border-2 border-transparent border-t-[#F49AC2] border-r-[#72CEC3] dark:border-t-[#F49AC2] dark:border-r-blue-400 lya:border-t-lya-primary lya:border-r-lya-secondary opacity-90"
                style={{ width: '10.5rem', height: '10.5rem' }}
              />

              {/* Medallón Circular del Logo (Sin esquinas cuadradas blancas) */}
              <motion.div 
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] ring-4 ring-white/90 dark:ring-slate-800/90 lya:ring-white bg-white relative z-10 flex items-center justify-center"
              >
                <img 
                  src={logoLyA} 
                  alt="Pastelería 𝓛𝔂𝓪" 
                  className="w-full h-full object-cover rounded-full scale-[1.08]" 
                />
              </motion.div>
            </div>
            
            {/* Nombre y Subtítulo Corporativo */}
            <div className="text-center mb-7">
              <h1 
                className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight mb-1.5 drop-shadow-sm" 
                style={{ letterSpacing: '-0.04em' }}
              >
                𝓛𝔂𝓪
              </h1>
              <span className="inline-block text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#D4A373] dark:text-slate-400 lya:text-lya-text/60">
                Pastelería & Cafetería
              </span>
            </div>

            {/* Barra de carga minimalista + Frase motivacional */}
            <div className="flex flex-col items-center gap-4 w-64 sm:w-72">
              <div className="w-44 h-1.5 bg-gray-200/80 dark:bg-slate-800/90 lya:bg-lya-border/25 rounded-full overflow-hidden p-0.5 shadow-inner">
                <motion.div
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-2/3 h-full rounded-full bg-gradient-to-r from-[#F49AC2] via-blue-500 to-[#72CEC3] lya:from-lya-primary lya:via-lya-border lya:to-lya-secondary"
                />
              </div>

              <div className="px-4 py-2 rounded-2xl bg-white/60 dark:bg-slate-800/40 lya:bg-white/60 backdrop-blur-md border border-gray-200/50 dark:border-slate-700/40 lya:border-lya-border/30 shadow-sm">
                <p className="text-xs font-bold text-gray-600 dark:text-slate-300 lya:text-lya-text/80 text-center leading-relaxed">
                  {phrase}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==========================================
            2. PANTALLA DE ERROR DE CONEXIÓN
           ========================================== */}
        {bootState === 'error' && (
          <motion.div 
            key="error"
            initial={{ opacity: 0, y: 20, scale: 0.96 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            className="w-full max-w-sm bg-white/90 dark:bg-[#151f32]/90 lya:bg-lya-surface/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-gray-200/70 dark:border-slate-700/60 lya:border-lya-border/40 p-9 text-center z-10 my-auto shrink-0 relative overflow-hidden"
          >
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="w-20 h-20 bg-red-50 dark:bg-red-500/15 text-red-500 rounded-full border border-red-200/60 dark:border-red-500/20 flex items-center justify-center mx-auto mb-6 shadow-inner relative z-10">
              <WifiOff size={34} strokeWidth={2.2} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-2.5">Sin Conexión</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 lya:text-lya-text/70 mb-8 leading-relaxed text-center px-1">
              El sistema de <b>𝓛𝔂𝓪</b> no puede comunicarse con el servidor. Revisa tu internet o asegúrate de que el equipo central esté encendido.
            </p>
            <motion.button 
              whileTap={{ scale: 0.96 }} 
              onClick={runSystemCheck}
              className="w-full py-4 bg-gray-900 md:hover:bg-black dark:bg-blue-600 dark:md:hover:bg-blue-500 lya:bg-lya-primary lya:md:hover:opacity-90 text-white font-black rounded-2xl shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2.5 outline-none transition-all"
            >
              <RefreshCw size={18} /> Reintentar Conexión
            </motion.button>
          </motion.div>
        )}

        {/* ==========================================
            3. TARJETA PRINCIPAL DE LOGIN
           ========================================== */}
        {bootState === 'ready' && (
          <motion.div 
            key="login"
            initial={{ opacity: 0, scale: 0.96, y: 12 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-[420px] bg-white/90 dark:bg-[#151f32]/90 lya:bg-lya-surface/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.35)] border border-white/80 dark:border-slate-700/60 lya:border-lya-border/40 overflow-hidden relative z-10 my-auto shrink-0"
          >
            {/* Barra superior decorativa muy fina con los colores de Lya */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#F49AC2] via-blue-500 to-[#72CEC3]" />

            {/* Luz ambiental interna en la cabecera de la tarjeta */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-44 bg-gradient-to-b from-[#F49AC2]/15 via-blue-500/10 to-transparent dark:from-blue-500/15 dark:via-[#72CEC3]/5 dark:to-transparent lya:from-lya-primary/20 rounded-full blur-2xl pointer-events-none" />

            {/* INNER WATERMARK: 4 ICONOS EN LAS ESQUINAS DE LA TARJETA */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-[2.5rem]">
              <Cake 
                className="absolute -top-6 -right-8 w-40 h-40 text-gray-900/[0.035] dark:text-white/[0.03] lya:text-lya-primary/[0.07] -rotate-12" 
                strokeWidth={1.5} 
              />
              <Coffee 
                className="absolute -bottom-8 -left-10 w-40 h-40 text-gray-900/[0.035] dark:text-white/[0.03] lya:text-lya-secondary/[0.07] rotate-12" 
                strokeWidth={1.5} 
              />
              <Cookie 
                className="absolute -top-8 -left-6 w-32 h-32 text-gray-900/[0.035] dark:text-white/[0.025] lya:text-lya-secondary/[0.06] -rotate-[15deg]" 
                strokeWidth={1.5} 
              />
              <ChefHat 
                className="absolute -bottom-4 -right-6 w-32 h-32 text-gray-900/[0.035] dark:text-white/[0.025] lya:text-lya-primary/[0.06] rotate-[20deg]" 
                strokeWidth={1.5} 
              />
            </div>

            {/* OVERLAY DE BLOQUEO POR INTENTOS FALLIDOS */}
            <AnimatePresence>
              {blockedUntil && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-white/95 dark:bg-[#151f32]/95 lya:bg-lya-surface/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
                >
                  <div className="bg-red-50 dark:bg-red-500/15 border border-red-200/50 dark:border-red-500/20 p-5 rounded-full mb-6 relative z-10 shadow-inner">
                    <Lock className="w-11 h-11 text-red-500 animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-2 tracking-tight relative z-10">
                    Acceso Restringido
                  </h3>
                  <p className="text-sm font-medium text-gray-500 dark:text-slate-400 lya:text-lya-text/70 mb-8 leading-relaxed relative z-10">
                    Múltiples intentos fallidos detectados. Por seguridad, el acceso a esta cuenta desde este dispositivo ha sido bloqueado.
                  </p>
                  <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 px-8 py-4 rounded-2xl flex items-center gap-3 relative z-10 shadow-sm">
                    <Sparkles size={20} className="animate-spin opacity-60" />
                    <span className="font-mono text-3xl font-black tracking-widest">{timeLeft}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-8 sm:p-10 relative z-10">
              
              {/* CABECERA CON LOGO CIRCULAR PERFECTO */}
              <div className="flex flex-col items-center mb-8">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="relative mb-5"
                >
                  {/* Halo decorativo alrededor del logo */}
                  <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-[#F49AC2]/60 via-blue-500/40 to-[#72CEC3]/60 opacity-75 blur-sm" />
                  
                  {/* Contenedor circular que recorta las esquinas blancas del JPEG */}
                  <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white dark:ring-slate-800 lya:ring-lya-surface shadow-xl bg-white relative z-10 flex items-center justify-center">
                    <img 
                      src={logoLyA} 
                      alt="Logo LyA" 
                      className="w-full h-full object-cover rounded-full scale-[1.08]" 
                    />
                  </div>
                </motion.div>

                <h1 
                  className="text-2xl sm:text-[26px] font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight text-center" 
                  style={{ letterSpacing: '-0.04em' }}
                >
                  Bienvenido a 𝓛𝔂𝓪
                </h1>

                {/* Badge de Terminal de Servicio con indicador activo */}
                <div className="mt-2.5 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gray-100/90 dark:bg-slate-800/90 lya:bg-lya-bg border border-gray-200/70 dark:border-slate-700/70 lya:border-lya-border/40 shadow-inner">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-extrabold text-gray-500 dark:text-slate-300 lya:text-lya-text/80 uppercase tracking-[0.2em]">
                    Terminal de Servicio
                  </span>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {!showForgotMode ? (
                  <motion.form 
                    key="login-form"
                    variants={containerVariants} 
                    initial="hidden" 
                    animate="show" 
                    exit={{ opacity: 0, x: -10 }}
                    onSubmit={handleSubmit} 
                    className="space-y-5"
                  >
                    <div className="space-y-3.5">
                      {/* INPUT USUARIO */}
                      <motion.div variants={itemVariants} className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-20">
                          <div className="w-9 h-9 rounded-xl bg-gray-200/60 dark:bg-slate-800/90 lya:bg-white/70 flex items-center justify-center text-gray-400 dark:text-slate-400 lya:text-lya-text/50 group-focus-within:bg-blue-500/15 group-focus-within:text-blue-500 lya:group-focus-within:bg-lya-primary/20 lya:group-focus-within:text-lya-primary transition-all">
                            <User size={17} strokeWidth={2.2} />
                          </div>
                        </div>
                        <input 
                          type="text" 
                          value={username} 
                          onChange={(e) => setUsername(e.target.value)} 
                          onFocus={handleFocus}
                          placeholder="Usuario o Correo" 
                          disabled={isLoading || blockedUntil}
                          className="w-full pl-14 pr-5 py-4 bg-gray-50/90 dark:bg-[#0b1120]/90 lya:bg-lya-bg/80 rounded-2xl border border-gray-200/80 dark:border-slate-800 lya:border-lya-border/40 focus:border-blue-500/60 dark:focus:border-blue-500/60 lya:focus:border-lya-primary outline-none transition-all text-gray-900 dark:text-white lya:text-lya-text text-sm font-bold placeholder-gray-400 dark:placeholder-slate-500 disabled:opacity-50 focus:ring-4 focus:ring-blue-500/10 lya:focus:ring-lya-primary/15 relative z-10"
                        />
                      </motion.div>

                      {/* INPUT CONTRASEÑA */}
                      <motion.div variants={itemVariants} className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-20">
                          <div className="w-9 h-9 rounded-xl bg-gray-200/60 dark:bg-slate-800/90 lya:bg-white/70 flex items-center justify-center text-gray-400 dark:text-slate-400 lya:text-lya-text/50 group-focus-within:bg-blue-500/15 group-focus-within:text-blue-500 lya:group-focus-within:bg-lya-primary/20 lya:group-focus-within:text-lya-primary transition-all">
                            <Lock size={17} strokeWidth={2.2} />
                          </div>
                        </div>
                        <input 
                          type={showPassword ? "text" : "password"} 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          onFocus={handleFocus}
                          placeholder="Contraseña" 
                          disabled={isLoading || blockedUntil}
                          className="w-full pl-14 pr-12 py-4 bg-gray-50/90 dark:bg-[#0b1120]/90 lya:bg-lya-bg/80 rounded-2xl border border-gray-200/80 dark:border-slate-800 lya:border-lya-border/40 focus:border-blue-500/60 dark:focus:border-blue-500/60 lya:focus:border-lya-primary outline-none transition-all text-gray-900 dark:text-white lya:text-lya-text text-sm font-bold placeholder-gray-400 dark:placeholder-slate-500 disabled:opacity-50 focus:ring-4 focus:ring-blue-500/10 lya:focus:ring-lya-primary/15 relative z-10"
                        />
                        <button
                          type="button"
                          disabled={isLoading || blockedUntil}
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 dark:text-slate-500 md:hover:text-gray-600 dark:md:hover:text-slate-300 lya:md:hover:text-lya-primary transition-colors focus:outline-none disabled:opacity-50 z-20"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </motion.div>
                    </div>

                    {/* LINK DE AYUDA */}
                    <motion.div variants={itemVariants} className="flex items-center justify-center pt-0.5">
                      <button 
                        type="button" 
                        disabled={isLoading || blockedUntil}
                        onClick={() => setShowForgotMode(true)} 
                        className="text-xs font-bold text-gray-500 dark:text-slate-400 md:hover:text-blue-500 dark:md:hover:text-blue-400 lya:md:hover:text-lya-primary transition-colors outline-none disabled:opacity-50 underline underline-offset-4 decoration-gray-300 dark:decoration-slate-700 md:hover:decoration-blue-400 lya:md:hover:decoration-lya-primary/50 relative z-10"
                      >
                        ¿Necesitas ayuda con tu acceso?
                      </button>
                    </motion.div>

                    {/* BOTÓN INICIAR TURNO */}
                    <motion.div variants={itemVariants}>
                      <motion.button 
                        whileTap={!isLoading && !blockedUntil ? { scale: 0.97 } : {}}
                        type="submit" 
                        disabled={isLoading || blockedUntil}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 md:hover:from-blue-500 md:hover:to-blue-600 lya:from-lya-primary lya:to-[#e882b0] text-white font-black rounded-2xl shadow-lg shadow-blue-600/25 lya:shadow-lya-primary/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2.5 outline-none relative z-10 border border-white/10"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 size={19} className="animate-spin" />
                            <span>Validando credenciales...</span>
                          </>
                        ) : (
                          <>
                            <LogIn size={19} strokeWidth={2.5} /> 
                            <span>Iniciar Turno</span>
                          </>
                        )}
                      </motion.button>
                    </motion.div>
                  </motion.form>
                ) : (
                  /* VISTA DE RECUPERACIÓN / ACCESO RESTRINGIDO */
                  <motion.div 
                    key="forgot-form"
                    initial={{ opacity: 0, x: 10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: 10 }} 
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center text-center space-y-5"
                  >
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-500/15 border border-red-200/60 dark:border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-1 relative z-10 shadow-inner">
                      <ShieldAlert size={30} />
                    </div>
                    
                    <div className="relative z-10">
                      <h3 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-2.5">
                        Protocolo de Seguridad
                      </h3>
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400 lya:text-lya-text/70 leading-relaxed px-2 text-center">
                        Por protocolos de seguridad internos, el personal no puede modificar sus credenciales de manera externa.
                        <br /><br />
                        Contacta al <b className="text-gray-800 dark:text-slate-200 lya:text-lya-text font-black">Administrador de la sucursal</b> para restablecer tu contraseña en el sistema central.
                      </p>
                    </div>

                    <motion.button 
                      whileTap={{ scale: 0.96 }} 
                      onClick={() => setShowForgotMode(false)} 
                      className="w-full py-4 bg-gray-100 md:hover:bg-gray-200 dark:bg-slate-800 dark:md:hover:bg-slate-700 lya:bg-lya-bg lya:md:hover:bg-lya-border/40 text-gray-700 dark:text-slate-200 lya:text-lya-text font-black rounded-2xl transition-all flex items-center justify-center gap-2 mt-2 outline-none relative z-10 border border-gray-200/60 dark:border-slate-700"
                    >
                      <ArrowLeft size={18} /> Volver al Login
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* FOOTER CORPORATIVO */}
      <div className="absolute bottom-6 text-center w-full pointer-events-none z-10">
        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 lya:text-lya-text/50 tracking-[0.22em]">
          SISTEMA POS <b>𝓛𝔂𝓪</b> • v1.0.0
        </p>
      </div>
    </div>
  );
};