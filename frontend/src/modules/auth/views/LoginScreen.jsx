// src/modules/auth/views/LoginScreen.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// 🔥 Agregamos toda la panadería: ChefHat, IceCream, CupSoda, UtensilsCrossed
import { LogIn, User, Lock, ArrowLeft, ShieldAlert, WifiOff, RefreshCw, Loader2, Eye, EyeOff, CheckCircle2, AlertTriangle, AlertCircle, Sparkles, Cake, Coffee, Croissant, Cookie, ChefHat, IceCream, CupSoda, UtensilsCrossed } from 'lucide-react';
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
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 py-8 pb-32 bg-gray-50 dark:bg-[#0f172a] lya:bg-lya-bg relative overflow-y-auto custom-scrollbar transition-colors duration-500">
      
      {/* 🔥 ARTE DE FONDO EXTERNO: MUCHAS MÁS FIGURITAS FLOTANTES */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        
        {/* Lado Derecho */}
        <motion.div 
          animate={{ y: [-15, 15, -15], rotate: [-5, 5, -5] }} 
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} 
          className="absolute top-[12%] right-[15%] text-gray-300 dark:text-gray-800 lya:text-lya-primary/20"
        >
          <Croissant size={110} strokeWidth={1.5} />
        </motion.div>

        <motion.div 
          animate={{ x: [-15, 15, -15], rotate: [-10, 15, -10] }} 
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }} 
          className="absolute top-[50%] right-[8%] text-gray-300 dark:text-gray-800 lya:text-lya-secondary/20"
        >
          <CupSoda size={85} strokeWidth={1.5} />
        </motion.div>

        <motion.div 
          animate={{ y: [10, -10, 10], rotate: [0, 20, 0] }} 
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 1 }} 
          className="absolute bottom-[20%] right-[12%] text-gray-300 dark:text-gray-800 lya:text-lya-primary/20"
        >
          <IceCream size={100} strokeWidth={1.5} />
        </motion.div>

        {/* Lado Izquierdo */}
        <motion.div 
          animate={{ y: [-10, 10, -10], rotate: [-10, 10, -10] }} 
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 3 }} 
          className="absolute top-[15%] left-[12%] text-gray-300 dark:text-gray-800 lya:text-lya-secondary/20"
        >
          <ChefHat size={95} strokeWidth={1.5} />
        </motion.div>

        <motion.div 
          animate={{ x: [15, -15, 15], rotate: [15, -15, 15] }} 
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 4 }} 
          className="absolute top-[45%] left-[6%] text-gray-300 dark:text-gray-800 lya:text-lya-primary/20"
        >
          <UtensilsCrossed size={80} strokeWidth={1.5} />
        </motion.div>
        
        <motion.div 
          animate={{ y: [15, -15, 15], rotate: [0, -15, 0] }} 
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} 
          className="absolute bottom-[15%] left-[10%] text-gray-300 dark:text-gray-800 lya:text-lya-secondary/20"
        >
          <Cookie size={130} strokeWidth={1.5} />
        </motion.div>

        {/* Chispitas/Sparkles animadas */}
        <motion.div 
          animate={{ scale: [1, 1.15, 1], rotate: [0, 10, 0] }} 
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }} 
          className="absolute top-[30%] left-[25%] text-gray-300 dark:text-gray-800 lya:text-lya-primary/20"
        >
          <Sparkles size={60} strokeWidth={1.5} />
        </motion.div>
        
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, -10, 0] }} 
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} 
          className="absolute bottom-[35%] right-[28%] text-gray-300 dark:text-gray-800 lya:text-lya-secondary/20"
        >
          <Sparkles size={75} strokeWidth={1.5} />
        </motion.div>
      </div>

      <AnimatePresence>
        {notification && (
          <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`bg-white dark:bg-gray-800 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text px-5 py-3 rounded-full shadow-2xl flex items-center justify-center gap-3 font-semibold tracking-tight border pointer-events-auto max-w-md w-full sm:w-auto text-center ${
                notification.type === 'error' ? 'border-red-100 dark:border-red-900/30' : 
                notification.type === 'warning' ? 'border-amber-100 dark:border-amber-900/30' :
                'border-emerald-100 dark:border-emerald-900/30 lya:border-lya-primary/30'
              }`}
            >
              <div className={`p-1 rounded-full shrink-0 ${
                notification.type === 'error' ? 'bg-red-100 dark:bg-red-500/20 text-red-500' : 
                notification.type === 'warning' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-500' :
                'bg-emerald-100 dark:bg-emerald-500/20 lya:bg-lya-primary/20 text-emerald-500 lya:text-lya-primary'
              }`}>
                {notification.type === 'error' ? <AlertCircle size={20} /> : notification.type === 'warning' ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
              </div>
              <span className="text-sm">{notification.msg}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        
        {bootState === 'booting' && (
          <motion.div 
            key="splash"
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(5px)" }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="flex flex-col items-center justify-center relative z-10 my-auto shrink-0"
          >
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2rem] overflow-hidden border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 shadow-xl mb-6 bg-white"
            >
              <img src={logoLyA} alt="Pastelería 𝓛𝔂𝓪" className="w-full h-full object-cover" />
            </motion.div>
            
            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight mb-6" style={{ letterSpacing: '-0.05em' }}>
              𝓛𝔂𝓪
            </h1>

            <div className="flex flex-col items-center gap-3">
              <Loader2 size={24} className="text-blue-500 lya:text-lya-primary animate-spin" />
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/70 animate-pulse text-center max-w-[250px]">
                {phrase}
              </p>
            </div>
          </motion.div>
        )}

        {bootState === 'error' && (
          <motion.div 
            key="error"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm bg-white dark:bg-[#1e293b] lya:bg-lya-surface rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 p-10 text-center z-10 my-auto shrink-0"
          >
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
              <WifiOff size={36} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Sin Conexión</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed text-justify px-2">
              El sistema de 𝓛𝔂𝓪 no puede comunicarse con el servidor. Revisa tu internet o asegúrate de que el equipo central esté encendido.
            </p>
            <motion.button 
              whileTap={{ scale: 0.95 }} onClick={runSystemCheck}
              className="w-full py-4 bg-gray-900 md:hover:bg-black dark:bg-gray-800 dark:md:hover:bg-gray-700 lya:bg-lya-primary lya:md:hover:opacity-90 text-white font-black rounded-[1.5rem] shadow-md flex items-center justify-center gap-2 outline-none transition-all"
            >
              <RefreshCw size={18} /> Reintentar Conexión
            </motion.button>
          </motion.div>
        )}

        {bootState === 'ready' && (
          <motion.div 
            key="login"
            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-[420px] bg-white dark:bg-[#1e293b] lya:bg-lya-surface rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-700/50 lya:border-lya-border/40 overflow-hidden relative z-10 my-auto shrink-0"
          >
            {/* 🔥 INNER WATERMARK: 4 ICONOS REPARTIDOS DENTRO DEL CUADRO */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-[2.5rem]">
              <Cake 
                className="absolute -top-8 -right-8 w-44 h-44 text-gray-900/[0.04] dark:text-white/[0.04] lya:text-lya-primary/[0.07] -rotate-12" 
                strokeWidth={1.5} 
              />
              <Coffee 
                className="absolute -bottom-8 -left-10 w-44 h-44 text-gray-900/[0.04] dark:text-white/[0.04] lya:text-lya-secondary/[0.07] rotate-12" 
                strokeWidth={1.5} 
              />
              <Cookie 
                className="absolute -top-10 -left-6 w-36 h-36 text-gray-900/[0.04] dark:text-white/[0.03] lya:text-lya-secondary/[0.06] -rotate-[15deg]" 
                strokeWidth={1.5} 
              />
              <ChefHat 
                className="absolute -bottom-4 -right-6 w-32 h-32 text-gray-900/[0.04] dark:text-white/[0.03] lya:text-lya-primary/[0.06] rotate-[20deg]" 
                strokeWidth={1.5} 
              />
            </div>

            <AnimatePresence>
              {blockedUntil && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-white/95 dark:bg-[#1e293b]/95 lya:bg-lya-surface/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
                >
                  <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-[1.5rem] mb-6 relative z-10">
                    <Lock className="w-12 h-12 text-red-500 animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-2 tracking-tight relative z-10">
                    Acceso Restringido
                  </h3>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/70 mb-8 leading-relaxed relative z-10">
                    Múltiples intentos fallidos detectados. Por seguridad, el acceso a esta cuenta desde este dispositivo ha sido bloqueado.
                  </p>
                  <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 px-8 py-4 rounded-[1.5rem] flex items-center gap-3 relative z-10">
                    <Sparkles size={20} className="animate-spin-slow opacity-50" />
                    <span className="font-mono text-3xl font-black tracking-widest">{timeLeft}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-8 sm:p-10 relative z-10">
              <div className="flex flex-col items-center mb-8">
                <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 shadow-sm mb-5 bg-white relative z-10">
                  <img src={logoLyA} alt="LyA" className="w-full h-full object-cover" />
                </div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight text-center" style={{ letterSpacing: '-0.05em' }}>
                  Bienvenido a 𝓛𝔂𝓪
                </h1>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] text-center mt-2">
                  Terminal de Servicio
                </p>
              </div>

              <AnimatePresence mode="wait">
                {!showForgotMode ? (
                  <motion.form 
                    key="login-form"
                    variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, x: -10 }}
                    onSubmit={handleSubmit} 
                    className="space-y-5"
                  >
                    <div className="space-y-4">
                      <motion.div variants={itemVariants} className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors">
                          <User size={18} className="text-gray-400 dark:text-gray-500 lya:text-lya-text/40 group-focus-within:text-blue-500 lya:group-focus-within:text-lya-primary transition-colors" />
                        </div>
                        <input 
                          type="text" 
                          value={username} 
                          onChange={(e) => setUsername(e.target.value)} 
                          onFocus={handleFocus}
                          placeholder="Usuario o Correo" 
                          disabled={isLoading || blockedUntil}
                          className="w-full pl-12 pr-5 py-4 bg-gray-50/90 dark:bg-[#0f172a]/90 lya:bg-lya-bg/90 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 focus:border-blue-500/50 lya:focus:border-lya-primary/50 outline-none transition-all dark:text-white lya:text-lya-text text-sm font-bold placeholder-gray-400 disabled:opacity-50 focus:ring-4 focus:ring-blue-500/10 lya:focus:ring-lya-primary/10 relative z-10 backdrop-blur-sm"
                        />
                      </motion.div>

                      <motion.div variants={itemVariants} className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-20">
                          <Lock size={18} className="text-gray-400 dark:text-gray-500 lya:text-lya-text/40 group-focus-within:text-blue-500 lya:group-focus-within:text-lya-primary transition-colors" />
                        </div>
                        <input 
                          type={showPassword ? "text" : "password"} 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          onFocus={handleFocus}
                          placeholder="Contraseña" 
                          disabled={isLoading || blockedUntil}
                          className="w-full pl-12 pr-12 py-4 bg-gray-50/90 dark:bg-[#0f172a]/90 lya:bg-lya-bg/90 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 focus:border-blue-500/50 lya:focus:border-lya-primary/50 outline-none transition-all dark:text-white lya:text-lya-text text-sm font-bold placeholder-gray-400 disabled:opacity-50 focus:ring-4 focus:ring-blue-500/10 lya:focus:ring-lya-primary/10 relative z-10 backdrop-blur-sm"
                        />
                        <button
                          type="button"
                          disabled={isLoading || blockedUntil}
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-400 md:hover:text-gray-600 dark:md:hover:text-gray-300 lya:md:hover:text-lya-primary transition-colors focus:outline-none disabled:opacity-50 z-20"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </motion.div>
                    </div>

                    <motion.div variants={itemVariants} className="flex items-center justify-center py-1">
                      <button 
                        type="button" 
                        disabled={isLoading || blockedUntil}
                        onClick={() => setShowForgotMode(true)} 
                        className="text-[11px] font-bold text-gray-500 dark:text-gray-400 md:hover:text-blue-500 lya:md:hover:text-lya-primary transition-colors outline-none disabled:opacity-50 underline underline-offset-4 decoration-gray-200 dark:decoration-gray-700 md:hover:decoration-blue-300 lya:md:hover:decoration-lya-primary/50 relative z-10"
                      >
                        ¿Necesitas ayuda con tu acceso?
                      </button>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <motion.button 
                        whileTap={!isLoading && !blockedUntil ? { scale: 0.95 } : {}}
                        type="submit" 
                        disabled={isLoading || blockedUntil}
                        className="w-full py-4 bg-blue-600 md:hover:bg-blue-700 lya:bg-lya-primary lya:md:hover:opacity-90 text-white font-black rounded-[1.5rem] shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 outline-none relative z-10"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>Validando...</span>
                          </>
                        ) : (
                          <>
                            <LogIn size={18} /> 
                            <span>Iniciar Turno</span>
                          </>
                        )}
                      </motion.button>
                    </motion.div>
                  </motion.form>
                ) : (
                  <motion.div 
                    key="forgot-form"
                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}
                    className="flex flex-col items-center text-center space-y-5"
                  >
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-[1.5rem] flex items-center justify-center mb-2 relative z-10">
                      <ShieldAlert size={32} />
                    </div>
                    
                    <div className="relative z-10">
                      <h3 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-3">Acceso Restringido</h3>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/70 leading-relaxed px-2 text-justify">
                        Por protocolos de seguridad internos, los empleados no pueden modificar sus credenciales de manera externa.
                        <br /><br />
                        Por favor, contacta al <b className="text-gray-800 dark:text-gray-200 lya:text-lya-text font-black">Administrador de la sucursal</b> para reestablecer tu contraseña en el sistema central.
                      </p>
                    </div>

                    <motion.button 
                      whileTap={{ scale: 0.95 }} onClick={() => setShowForgotMode(false)} 
                      className="w-full py-4 bg-gray-100 md:hover:bg-gray-200 dark:bg-gray-800 dark:md:hover:bg-gray-700 lya:bg-lya-bg lya:md:hover:bg-lya-border/40 text-gray-700 dark:text-gray-200 lya:text-lya-text font-black rounded-[1.5rem] transition-all flex items-center justify-center gap-2 mt-2 outline-none relative z-10"
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
      
      <div className="absolute bottom-6 text-center w-full pointer-events-none z-10">
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 lya:text-lya-text/40 tracking-[0.2em]">
          SISTEMA POS <b>𝓛𝔂𝓪</b> • v1.0.0
        </p>
      </div>
    </div>
  );
};