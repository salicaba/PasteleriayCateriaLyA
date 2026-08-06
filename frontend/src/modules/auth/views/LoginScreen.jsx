// src/modules/auth/views/LoginScreen.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, User, Lock, ArrowLeft, ShieldAlert, WifiOff, RefreshCw, Loader2, Eye, EyeOff, CheckCircle2, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react';
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
      return triggerNotification(`Cuenta bloqueada. Espera ${timeLeft}`, 'warning');
    }

    if (!username || !password) {
      return triggerNotification("Ingresa tus credenciales completas", 'warning');
    }

    setIsLoading(true);
    
    try {
      // Petición completamente limpia, sin headers extraños
      const response = await client.post('/auth/login', { username, password });
      
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
        triggerNotification("Límite de intentos excedido. Cuenta protegida.", 'error');
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
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 py-8 pb-32 bg-[#FDFBF7] dark:bg-gray-950 lya:bg-lya-bg relative overflow-y-auto custom-scrollbar transition-colors duration-500">
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-amber-400/20 dark:bg-orange-600/20 lya:bg-lya-primary/20 rounded-full blur-[100px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], x: [0, -60, 0], y: [0, 50, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-orange-500/20 dark:bg-rose-900/30 lya:bg-lya-secondary/20 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.5, 1], y: [0, -40, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute top-[20%] left-[20%] w-[40vw] h-[40vw] bg-rose-300/15 dark:bg-amber-800/15 rounded-full blur-[90px]" 
        />
      </div>

      <AnimatePresence>
        {notification && (
          <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
            <motion.div 
              initial={{ opacity: 0, y: -50, scale: 0.9 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className={`bg-white/90 dark:bg-gray-900/90 lya:bg-lya-surface/90 backdrop-blur-xl text-gray-800 dark:text-white lya:text-lya-text px-6 py-4 rounded-full shadow-2xl flex items-center justify-center gap-3 font-bold border pointer-events-auto transition-colors max-w-md w-full sm:w-auto text-center ${
                notification.type === 'success' ? 'border-emerald-200/50 dark:border-emerald-900/30' :
                notification.type === 'warning' ? 'border-amber-200/50 dark:border-amber-900/30' :
                'border-red-200/50 dark:border-red-900/30'
              }`}
            >
              <div className={`p-2 rounded-full shrink-0 shadow-inner ${
                notification.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500' :
                notification.type === 'warning' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-500' :
                'bg-red-100 dark:bg-red-500/20 text-red-500'
              }`}>
                {notification.type === 'success' ? <CheckCircle2 size={18} strokeWidth={3} /> : 
                 notification.type === 'warning' ? <AlertTriangle size={18} strokeWidth={3} /> : 
                 <AlertCircle size={18} strokeWidth={3} />}
              </div>
              <span className="text-sm tracking-wide text-center">{notification.msg}</span>
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
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="flex flex-col items-center justify-center relative z-10 my-auto shrink-0"
          >
            <motion.div 
              animate={{ boxShadow: ["0px 0px 0px rgba(0,0,0,0)", "0px 20px 60px rgba(249,115,22,0.3)", "0px 0px 0px rgba(0,0,0,0)"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border-[6px] border-white/80 dark:border-gray-800/80 backdrop-blur-md shadow-2xl mb-8"
            >
              <img src={logoLyA} alt="Pastelería 𝓛𝔂𝓪" className="w-full h-full object-cover" />
            </motion.div>
            
            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight mb-6" style={{ letterSpacing: '-0.05em' }}>
              𝓛𝔂𝓪
            </h1>

            <div className="flex flex-col items-center gap-4 bg-white/40 dark:bg-gray-800/40 backdrop-blur-lg px-8 py-4 rounded-3xl border border-white/30 dark:border-gray-700/30">
              <Loader2 size={24} className="text-orange-500 lya:text-lya-primary animate-spin" />
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300 lya:text-lya-text/80 animate-pulse text-center max-w-[250px]">
                {phrase}
              </p>
            </div>
          </motion.div>
        )}

        {bootState === 'error' && (
          <motion.div 
            key="error"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm bg-white/70 dark:bg-gray-900/70 lya:bg-lya-surface/70 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] border border-white/50 dark:border-gray-700/50 p-10 text-center z-10 my-auto shrink-0"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/40 dark:to-red-900/10 text-red-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
              <WifiOff size={36} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Sin Conexión</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 leading-relaxed text-justify px-2">
              El sistema de 𝓛𝔂𝓪 no puede comunicarse con el servidor. Revisa tu internet o asegúrate de que el equipo central esté encendido.
            </p>
            <motion.button 
              whileTap={{ scale: 0.95 }} onClick={runSystemCheck}
              className="w-full py-4 bg-gray-900 md:hover:bg-black dark:bg-orange-500 text-white font-black rounded-[1.5rem] shadow-xl flex items-center justify-center gap-2 outline-none"
            >
              <RefreshCw size={18} /> Reintentar Conexión
            </motion.button>
          </motion.div>
        )}

        {bootState === 'ready' && (
          <motion.div 
            key="login"
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-[420px] bg-white/60 dark:bg-gray-900/60 lya:bg-lya-surface/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] border border-white/60 dark:border-gray-700/50 overflow-hidden relative z-10 my-auto shrink-0"
          >
            <AnimatePresence>
              {blockedUntil && (
                <motion.div 
                  initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                  animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
                  exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                  className="absolute inset-0 z-50 bg-white/80 dark:bg-gray-950/80 flex flex-col items-center justify-center p-8 text-center"
                >
                  <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-full mb-6 shadow-inner">
                    <Lock className="w-12 h-12 text-red-500 animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
                    Acceso Restringido
                  </h3>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                    Múltiples intentos fallidos detectados. Por seguridad, el acceso a esta cuenta ha sido bloqueado temporalmente.
                  </p>
                  <div className="bg-gradient-to-r from-red-100 to-rose-50 dark:from-red-900/40 dark:to-rose-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 px-8 py-4 rounded-[1.5rem] shadow-inner flex items-center gap-3">
                    <Sparkles size={20} className="animate-spin-slow opacity-50" />
                    <span className="font-mono text-3xl font-black tracking-widest">{timeLeft}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-8 sm:p-10 relative z-10">
              <div className="flex flex-col items-center mb-10">
                <motion.div 
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="w-24 h-24 rounded-[2rem] overflow-hidden border-4 border-white/80 dark:border-gray-700/80 shadow-lg mb-5"
                >
                  <img src={logoLyA} alt="LyA" className="w-full h-full object-cover" />
                </motion.div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight text-center" style={{ letterSpacing: '-0.05em' }}>
                  Bienvenido a 𝓛𝔂𝓪
                </h1>
                <p className="text-xs font-bold text-orange-500/80 dark:text-orange-400/80 uppercase tracking-[0.2em] text-center mt-2">
                  Terminal de Servicio
                </p>
              </div>

              <AnimatePresence mode="wait">
                {!showForgotMode ? (
                  <motion.form 
                    key="login-form"
                    variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, x: -20 }}
                    onSubmit={handleSubmit} 
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      <motion.div variants={itemVariants} className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-orange-500">
                          <User size={18} className="text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors" />
                        </div>
                        <input 
                          type="text" 
                          value={username} 
                          onChange={(e) => setUsername(e.target.value)} 
                          onFocus={handleFocus}
                          placeholder="Usuario o Correo" 
                          disabled={isLoading || blockedUntil}
                          className="w-full pl-12 pr-5 py-4 bg-white/70 dark:bg-gray-900/70 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 focus:border-orange-500/50 dark:focus:border-orange-400/50 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all dark:text-white text-sm font-bold shadow-inner placeholder-gray-400 disabled:opacity-50 focus:ring-4 focus:ring-orange-500/10"
                        />
                      </motion.div>

                      <motion.div variants={itemVariants} className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                          <Lock size={18} className="text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors" />
                        </div>
                        <input 
                          type={showPassword ? "text" : "password"} 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          onFocus={handleFocus}
                          placeholder="Contraseña" 
                          disabled={isLoading || blockedUntil}
                          className="w-full pl-12 pr-12 py-4 bg-white/70 dark:bg-gray-900/70 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 focus:border-orange-500/50 dark:focus:border-orange-400/50 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all dark:text-white text-sm font-bold shadow-inner placeholder-gray-400 disabled:opacity-50 focus:ring-4 focus:ring-orange-500/10"
                        />
                        <button
                          type="button"
                          disabled={isLoading || blockedUntil}
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-400 md:hover:text-gray-600 dark:md:hover:text-gray-200 transition-colors focus:outline-none disabled:opacity-50"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </motion.div>
                    </div>

                    <motion.div variants={itemVariants} className="flex items-center justify-center">
                      <button 
                        type="button" 
                        disabled={isLoading || blockedUntil}
                        onClick={() => setShowForgotMode(true)} 
                        className="text-[12px] font-bold text-gray-500 md:hover:text-orange-500 transition-colors outline-none disabled:opacity-50 underline underline-offset-4 decoration-gray-300 md:hover:decoration-orange-300"
                      >
                        ¿Necesitas ayuda con tu acceso?
                      </button>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <motion.button 
                        whileTap={!isLoading && !blockedUntil ? { scale: 0.95 } : {}}
                        type="submit" 
                        disabled={isLoading || blockedUntil}
                        className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 md:hover:from-orange-600 md:hover:to-amber-600 text-white font-black rounded-[1.5rem] shadow-lg shadow-orange-500/30 transition-all disabled:opacity-70 disabled:shadow-none flex items-center justify-center gap-2 outline-none relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 w-full h-full bg-white/20 transform -translate-x-full md:group-hover:animate-[shimmer_1.5s_infinite]" />
                        
                        {isLoading ? (
                          <>
                            <Loader2 size={20} className="animate-spin" />
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
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
                    className="flex flex-col items-center text-center space-y-6"
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-rose-50 dark:from-red-900/40 dark:to-rose-900/10 text-red-500 rounded-[1.5rem] shadow-inner flex items-center justify-center mb-2">
                      <ShieldAlert size={32} />
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white mb-3">Acceso Restringido</h3>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed px-2 text-justify">
                        Por protocolos de seguridad internos, los empleados no pueden modificar sus credenciales de manera externa.
                        <br /><br />
                        Por favor, contacta al <b className="text-gray-800 dark:text-gray-200 font-black">Administrador de la sucursal</b> para reestablecer tu contraseña en el sistema central.
                      </p>
                    </div>

                    <motion.button 
                      whileTap={{ scale: 0.95 }} onClick={() => setShowForgotMode(false)} 
                      className="w-full py-4 bg-white/80 dark:bg-gray-800/80 md:hover:bg-white dark:md:hover:bg-gray-700 text-gray-800 dark:text-white font-black rounded-[1.5rem] shadow-sm md:hover:shadow-md transition-all flex items-center justify-center gap-2 mt-4 outline-none border border-gray-200 dark:border-gray-700"
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
        <p className="text-[10px] font-bold text-gray-400/80 dark:text-gray-500/80 tracking-[0.2em]">
          SISTEMA POS <b>𝓛𝔂𝓪</b> • v1.0.0
        </p>
      </div>
    </div>
  );
};