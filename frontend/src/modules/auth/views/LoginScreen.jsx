import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2, Cake, Quote, Sparkles } from 'lucide-react';
import { useAuthController } from '../controllers/useAuthController';
import { SplitText } from '../../../components/animations/SplitText';

const AnimatedBackground = () => {
  const boxColors = ['bg-brand-primary/20', 'bg-brand-border/20', 'bg-brand-primary/10', 'bg-brand-text/5'];
  return (
    <div className="absolute inset-0 overflow-hidden -z-10 bg-brand-bg transition-colors duration-700">
      <div className="absolute top-[-5%] left-[-5%] w-[60%] h-[60%] rounded-full bg-brand-primary/15 blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[60%] h-[60%] rounded-full bg-brand-border/20 blur-[120px] animate-pulse" />

      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute backdrop-blur-2xl border border-brand-border/30 rounded-3xl ${boxColors[i % boxColors.length]}`}
          style={{
            width: Math.random() * 100 + 50,
            height: Math.random() * 100 + 50,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -40, 0],
            rotate: [0, 180, 0],
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.5, 0.2]
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

  // Frase dividida para forzar el salto de línea
  const phrase1 = "La excelencia no es un acto, es un hábito.";
  const phrase2 = "Hagamos de hoy algo delicioso.";

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-brand-bg relative overflow-y-auto md:overflow-hidden transition-colors duration-500">
      
      <AnimatedBackground />

      {/* SECCIÓN DE BIENVENIDA: Ahora visible en móviles (arriba del form) */}
      <div className="flex flex-col items-center justify-center p-6 md:p-12 relative flex-1 mt-8 md:mt-0">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl text-center space-y-6 md:space-y-8 w-full flex flex-col items-center"
        >
          <div className="space-y-3 md:space-y-4">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="inline-block p-3 md:p-4 bg-brand-surface/40 backdrop-blur-md rounded-2xl md:rounded-3xl border border-brand-border/50 shadow-xl mb-2"
            >
              <Cake size={40} className="text-brand-primary md:w-[60px] md:h-[60px]" strokeWidth={1.5} />
            </motion.div>
            
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-brand-text tracking-tighter font-lya leading-tight md:leading-none">
              Bienvenido a <br />
              <span className="text-brand-primary italic">𝓛𝔂𝓐</span>
            </h1>
          </div>

          <div className="relative p-6 md:p-10 bg-brand-surface/60 backdrop-blur-2xl rounded-[2.5rem] md:rounded-[3.5rem] border border-brand-border/40 shadow-2xl w-full flex flex-col items-center">
            <Quote size={24} className="text-brand-primary opacity-30 absolute -top-3 -left-3 md:-top-4 md:-left-4" />
            
            <div className="py-1 w-full text-center flex flex-col gap-1">
              <SplitText 
                text={phrase1} 
                className="text-base md:text-xl font-bold text-brand-text/80 leading-relaxed italic"
              />
              <SplitText 
                text={phrase2} 
                className="text-lg md:text-2xl font-black text-brand-primary leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-center gap-2 mt-4 md:mt-6 text-brand-primary font-bold tracking-widest text-[9px] md:text-[10px] uppercase">
              <Sparkles size={12} />
              <span>Equipo LyA Elite</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* SECCIÓN DEL FORMULARIO */}
      <div className="flex flex-col items-center justify-center p-4 md:p-8 z-10 flex-1 mb-8 md:mb-0">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-brand-surface/80 backdrop-blur-3xl rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl border border-brand-border/30 overflow-hidden"
        >
          <div className="p-8 md:p-12">
            <h2 className="text-brand-text mb-6 md:mb-8 text-center">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Acceso Privado</span>
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-text opacity-60 ml-5">Usuario</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-brand-text opacity-40 group-focus-within:opacity-100 group-focus-within:text-brand-primary transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 md:py-5 bg-brand-bg/60 border border-transparent focus:bg-brand-surface rounded-2xl md:rounded-[1.8rem] focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all text-brand-text text-sm md:text-base"
                    placeholder="admin@lya.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-text opacity-60 ml-5">Contraseña</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-brand-text opacity-40 group-focus-within:opacity-100 group-focus-within:text-brand-primary transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-14 pr-14 py-4 md:py-5 bg-brand-bg/60 border border-transparent focus:bg-brand-surface rounded-2xl md:rounded-[1.8rem] focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all text-brand-text text-sm md:text-base"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-6 text-brand-text opacity-40 hover:opacity-100 hover:text-brand-primary transition-colors">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-[10px] text-center font-bold uppercase tracking-widest animate-pulse">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 md:py-5 bg-brand-primary hover:opacity-90 text-brand-surface rounded-2xl md:rounded-[1.8rem] font-black shadow-lg flex items-center justify-center gap-3 transition-all active:scale-[0.96] mt-4 md:mt-6 tracking-widest text-[10px] md:text-xs border border-transparent"
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