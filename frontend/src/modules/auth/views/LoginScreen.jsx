import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2, Cake, Quote, Sparkles } from 'lucide-react';
import { useAuthController } from '../controllers/useAuthController';
import { SplitText } from '../../../components/animations/SplitText';

// --- ANIMACIÓN DE FONDO RESTAURADA ---
const AnimatedBackground = () => {
  const boxColors = ['bg-brand-primary/20', 'bg-brand-secondary/20', 'bg-blue-400/20', 'bg-purple-400/20'];
  return (
    <div className="absolute inset-0 overflow-hidden -z-10 bg-gray-50 dark:bg-gray-950 transition-colors duration-700">
      {/* Gradientes intensos */}
      <div className="absolute top-[-5%] left-[-5%] w-[60%] h-[60%] rounded-full bg-brand-primary/15 blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[60%] h-[60%] rounded-full bg-brand-secondary/15 blur-[120px] animate-pulse" />

      {/* Cuadros de colores vibrantes */}
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute backdrop-blur-2xl border border-white/30 dark:border-white/10 rounded-3xl ${boxColors[i % boxColors.length]}`}
          style={{
            width: Math.random() * 120 + 60,
            height: Math.random() * 120 + 60,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -60, 0],
            rotate: [0, 180, 0],
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.7, 0.3]
          }}
          transition={{
            duration: Math.random() * 8 + 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};

export const LoginScreen = ({ onLogin }) => {
  const {
    email, setEmail, password, setPassword,
    showPassword, setShowPassword, error, isLoading, handleSubmit
  } = useAuthController(onLogin);

  const motivationalPhrase = "La excelencia no es un acto, es un hábito. Hagamos de hoy algo delicioso.";

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950 relative overflow-hidden transition-colors duration-500">
      {/* Llamada al componente de fondo */}
      <AnimatedBackground />

      {/* LADO IZQUIERDO: Bienvenida y Frase */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center p-12 relative">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-xl text-center space-y-8"
        >
          <div className="space-y-4">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="inline-block p-4 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl mb-4"
            >
              <Cake size={60} className="text-brand-primary" strokeWidth={1.5} />
            </motion.div>
            
            <h1 className="text-7xl font-black text-gray-800 dark:text-white tracking-tighter font-lya leading-none">
              Bienvenido a <br />
              <span className="text-brand-primary">𝓛𝔂𝓐</span>
            </h1>
          </div>

          <div className="relative p-10 bg-white/40 dark:bg-gray-900/40 backdrop-blur-2xl rounded-[3.5rem] border border-white dark:border-white/5 shadow-2xl">
            <Quote size={32} className="text-brand-primary opacity-30 absolute -top-4 -left-4" />
            <div className="py-2">
              {/* HE REDUCIDO EL TAMAÑO A 'text-xl' PARA QUE NO SE CORTE LA PALABRA 'HÁBITO' */}
              <SplitText 
                text={motivationalPhrase} 
                className="text-xl font-bold text-gray-700 dark:text-gray-200 leading-relaxed italic px-4"
              />
            </div>
            <div className="flex items-center justify-center gap-2 mt-6 text-brand-primary font-bold tracking-widest text-[10px] uppercase">
              <Sparkles size={14} />
              <span>Equipo LyA Elite</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* LADO DERECHO: Formulario */}
      <div className="flex-1 flex items-center justify-center p-4 z-10">
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md bg-white/70 dark:bg-gray-900/80 backdrop-blur-3xl rounded-[3.5rem] shadow-2xl border border-white dark:border-gray-800 overflow-hidden"
        >
          <div className="p-8 sm:p-12">
            <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-8 tracking-tight uppercase text-xs tracking-[0.2em] opacity-50">Acceso Privado</h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* ... Los inputs se mantienen igual ... */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 ml-5">Usuario</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-primary transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-gray-100/40 dark:bg-gray-800/40 border border-transparent focus:bg-white/80 dark:focus:bg-gray-800/80 rounded-[1.8rem] focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all dark:text-white"
                    placeholder="admin@lya.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 ml-5">Contraseña</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-primary transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-14 pr-14 py-5 bg-gray-100/40 dark:bg-gray-800/40 border border-transparent focus:bg-white/80 dark:focus:bg-gray-800/80 rounded-[1.8rem] focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all dark:text-white"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-6 text-gray-400 hover:text-brand-primary transition-colors">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-5 bg-gray-900 dark:bg-brand-primary hover:bg-black dark:hover:bg-brand-primary/90 text-white rounded-[1.8rem] font-black shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.96] mt-6 tracking-widest text-xs"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><span>ENTRAR AL SISTEMA</span><LogIn size={20} /></>}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};