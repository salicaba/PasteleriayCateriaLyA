// src/modules/auth/views/LoginScreen.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// 🔥 Añadimos Eye y EyeOff
import { LogIn, User, Lock, ArrowLeft, ShieldAlert, WifiOff, RefreshCw, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import logoLyA from '../../../assets/logo.jpeg'; 
import client from '../../../api/client'; 

const motivationalPhrases = [
  "Preparando el aroma de un gran día...",
  "Encendiendo los hornos de 𝓛𝔂𝓪...",
  "La magia dulce está por comenzar...",
  "Alistando todo para un turno excelente...",
  "Un buen café, una sonrisa y a triunfar...",

  "Cada taza cuenta una historia...",
  "Transformando granos en momentos especiales...",
  "Hoy es un buen día para crear sonrisas...",
  "La pasión se sirve caliente...",
  "Comenzando un nuevo día lleno de oportunidades...",
  "Preparando experiencias inolvidables...",
  "El éxito se construye una orden a la vez...",
  "Donde hay café, hay inspiración...",
  "Horneando felicidad para nuestros clientes...",
  "La excelencia está en los pequeños detalles...",
  "Un equipo increíble está por entrar en acción...",
  "Cargando energía para un día extraordinario...",
  "Las mejores historias comienzan con un café...",
  "Listos para servir con pasión y calidad...",
  "Cada cliente merece lo mejor de nosotros...",
  "Con dedicación, todo sabe mejor...",
  "Creando momentos dulces desde temprano...",
  "La constancia de hoy es el éxito de mañana...",
  "Preparando sabores que alegran el día...",
  "El esfuerzo de cada día deja huella...",
  "La receta perfecta lleva pasión y compromiso...",
  "Dando lo mejor en cada preparación...",
  "Grandes metas comienzan con pequeños pasos...",
  "Iniciando la jornada con actitud positiva...",
  "Porque cada detalle cuenta...",
  "Café listo, actitud lista, ¡a brillar!"
];

export const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // 🔥 Nuevo estado para controlar la visibilidad
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotMode, setShowForgotMode] = useState(false);
  const [bootState, setBootState] = useState('booting'); 
  const [phrase, setPhrase] = useState('');

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
      setTimeout(() => {
        setBootState('ready');
      }, 1500);
    } catch (error) {
      console.error("Fallo al conectar con el servidor backend:", error);
      setBootState('error');
    }
  };

  useEffect(() => {
    runSystemCheck();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      return toast.error("Ingresa tus credenciales completas");
    }

    setIsLoading(true);
    
    try {
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
      const errorMsg = error.response?.data?.message || "Usuario o contraseña incorrectos";
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-100 dark:bg-gray-900 lya:bg-lya-bg flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-orange-500/20 lya:bg-lya-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-purple-500/20 lya:bg-lya-secondary/20 rounded-full blur-[100px] pointer-events-none" />

      <AnimatePresence mode="wait">
        
        {bootState === 'booting' && (
          <motion.div 
            key="splash"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="flex flex-col items-center justify-center relative z-10"
          >
            <motion.div 
              animate={{ scale: [1, 1.05, 1], boxShadow: ["0px 0px 0px rgba(0,0,0,0)", "0px 20px 40px rgba(212,163,115,0.3)", "0px 0px 0px rgba(0,0,0,0)"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 lya:border-lya-surface shadow-2xl mb-8"
            >
              <img src={logoLyA} alt="Pastelería 𝓛𝔂𝓪" className="w-full h-full object-cover" />
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight mb-4"
              style={{ letterSpacing: '-0.05em' }}
            >
              𝓛𝔂𝓪
            </motion.h1>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex flex-col items-center gap-4">
              <Loader2 size={28} className="text-orange-500 lya:text-lya-primary animate-spin" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/70 animate-pulse text-center max-w-[250px]">
                {phrase}
              </p>
            </motion.div>
          </motion.div>
        )}

        {bootState === 'error' && (
          <motion.div 
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm bg-white/80 dark:bg-gray-800/80 lya:bg-lya-surface/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-gray-700/50 lya:border-lya-border/40 p-8 sm:p-10 text-center relative z-10"
          >
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <WifiOff size={36} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-3">Sin Conexión</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/70 mb-8 leading-relaxed">
              El sistema de 𝓛𝔂𝓪 no puede comunicarse con el servidor. Revisa tu internet o asegúrate de que el equipo central esté encendido.
            </p>
            <button 
              onClick={runSystemCheck}
              className="w-full py-4 bg-gray-900 hover:bg-black dark:bg-orange-500 dark:hover:bg-orange-600 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white font-black rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} /> Reintentar Conexión
            </button>
          </motion.div>
        )}

        {bootState === 'ready' && (
          <motion.div 
            key="login"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md bg-white/80 dark:bg-gray-800/80 lya:bg-lya-surface/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-gray-700/50 lya:border-lya-border/40 overflow-hidden relative z-10"
          >
            <div className="p-8 sm:p-10">
              
              <div className="flex flex-col items-center mb-8">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 lya:border-lya-surface shadow-xl mb-6">
                  <img src={logoLyA} alt="Pastelería 𝓛𝔂𝓪" className="w-full h-full object-cover" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight mb-2" style={{ letterSpacing: '-0.05em' }}>
                  𝓛𝔂𝓪
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-medium uppercase tracking-widest">
                  Punto de Venta
                </p>
              </div>

              <AnimatePresence mode="wait">
                {!showForgotMode ? (
                  <motion.form 
                    key="login-form"
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
                    onSubmit={handleSubmit} 
                    className="space-y-5"
                  >
                    <div className="space-y-4">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                          <User size={18} className="text-gray-400 dark:text-gray-500" />
                        </div>
                        <input 
                          type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Usuario o Correo Electrónico" 
                          className="w-full pl-12 pr-5 py-4 bg-gray-50/50 dark:bg-gray-900/50 lya:bg-lya-bg/50 rounded-2xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-orange-500 lya:focus:ring-lya-primary focus:bg-white dark:focus:bg-gray-800 outline-none transition-all dark:text-white lya:text-lya-text text-sm font-medium"
                        />
                      </div>

                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                          <Lock size={18} className="text-gray-400 dark:text-gray-500" />
                        </div>
                        {/* 🔥 Ajustamos el type, el pr-12 para dar espacio al ícono y añadimos el botón */}
                        <input 
                          type={showPassword ? "text" : "password"} 
                          value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" 
                          className="w-full pl-12 pr-12 py-4 bg-gray-50/50 dark:bg-gray-900/50 lya:bg-lya-bg/50 rounded-2xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-orange-500 lya:focus:ring-lya-primary focus:bg-white dark:focus:bg-gray-800 outline-none transition-all dark:text-white lya:text-lya-text text-sm font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 lya:hover:text-lya-primary transition-colors focus:outline-none"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-1">
                      <button type="button" onClick={() => setShowForgotMode(true)} className="text-[11px] font-bold text-gray-500 hover:text-orange-500 lya:hover:text-lya-primary transition-colors outline-none">
                        ¿Olvidaste tus datos?
                      </button>
                    </div>

                    <button 
                      type="submit" disabled={isLoading}
                      className="w-full py-4 bg-gray-900 hover:bg-black dark:bg-orange-500 dark:hover:bg-orange-600 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white font-black rounded-2xl shadow-xl shadow-gray-900/20 dark:shadow-orange-500/20 lya:shadow-lya-primary/20 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                      {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><LogIn size={18} /> Iniciar Turno</>}
                    </button>
                  </motion.form>
                ) : (
                  <motion.div 
                    key="forgot-form"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
                    className="flex flex-col items-center text-center space-y-6"
                  >
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-2">
                      <ShieldAlert size={32} />
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white lya:text-lya-text mb-2">Acceso Restringido</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/70 leading-relaxed px-4">
                        Por protocolos de seguridad, los empleados no pueden modificar sus credenciales de manera externa.
                        <br /><br />
                        Por favor, contacta al <b className="text-gray-800 dark:text-gray-200">Administrador de la sucursal</b> para que reestablezca tu contraseña desde el panel de control.
                      </p>
                    </div>

                    <button onClick={() => setShowForgotMode(false)} className="w-full py-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 lya:bg-lya-bg lya:hover:opacity-80 text-gray-700 dark:text-gray-200 lya:text-lya-text font-bold rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4">
                      <ArrowLeft size={16} /> Volver al Inicio
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="absolute bottom-6 text-center w-full pointer-events-none z-0">
        <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 lya:text-lya-text/40 tracking-wider">
          SISTEMA POS <b>𝓛𝔂𝓪</b> • VERSIÓN 1.0.0
        </p>
      </div>
    </div>
  );
};