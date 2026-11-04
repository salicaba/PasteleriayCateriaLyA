// src/components/animations/MenuLoader.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Cake, Coffee, Croissant, Cookie, Sparkles } from 'lucide-react';
import logo from '../../assets/logo.jpeg'; 

const MenuLoader = ({ 
  title = "Preparando tu mesa...", 
  subtitle = "Cargando el menú más fresco" 
}) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0b1120] lya:bg-lya-bg overflow-hidden rounded-[inherit] w-full h-full z-[150] transition-colors duration-300">
      
      {/* 🔥 ATMÓSFERA SUTIL DE FONDO (Adaptada a Claro, Oscuro y Lya) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Resplandor central ambiental */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] md:w-[460px] md:h-[460px] rounded-full bg-gradient-to-tr from-[#F49AC2]/20 via-blue-500/10 to-[#72CEC3]/20 dark:from-[#F49AC2]/10 dark:via-blue-600/15 dark:to-[#72CEC3]/10 lya:from-lya-primary/30 lya:via-lya-border/20 lya:to-lya-secondary/30 blur-3xl"
        />

        {/* Iconos flotantes suaves para que el contenedor grande no se vea vacío */}
        <motion.div
          animate={{ y: [-10, 10, -10], rotate: [-6, 6, -6] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[12%] left-[12%] text-slate-300/60 dark:text-slate-800/70 lya:text-lya-secondary/25"
        >
          <Coffee size={80} strokeWidth={1.4} />
        </motion.div>

        <motion.div
          animate={{ y: [10, -10, 10], rotate: [-5, 8, -5] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-[14%] right-[12%] text-slate-300/60 dark:text-slate-800/70 lya:text-lya-primary/25"
        >
          <Croissant size={85} strokeWidth={1.4} />
        </motion.div>

        <motion.div
          animate={{ y: [-8, 12, -8], rotate: [0, -12, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute bottom-[12%] left-[14%] text-slate-300/60 dark:text-slate-800/70 lya:text-lya-primary/25"
        >
          <Cookie size={90} strokeWidth={1.4} />
        </motion.div>

        <motion.div
          animate={{ y: [12, -8, 12], rotate: [-8, 8, -8] }}
          transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-[14%] right-[14%] text-slate-300/60 dark:text-slate-800/70 lya:text-lya-secondary/25"
        >
          <Cake size={85} strokeWidth={1.4} />
        </motion.div>

        <motion.div
          animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[28%] right-[28%] text-[#F49AC2]/40 dark:text-[#F49AC2]/25 lya:text-lya-primary/40"
        >
          <Sparkles size={44} strokeWidth={1.5} />
        </motion.div>
      </div>

      {/* 🌟 CONTENIDO CENTRAL DE CARGA */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex flex-col items-center justify-center z-10 w-full px-6"
      >
        {/* Medallón Circular con Anillos Orbitales */}
        <div className="relative flex items-center justify-center mb-8">
          
          {/* Anillo exterior punteado girando en sentido inverso */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
            className="absolute w-44 h-44 md:w-52 md:h-52 rounded-full border border-dashed border-[#F49AC2]/50 dark:border-[#72CEC3]/35 lya:border-lya-border/60"
          />

          {/* Anillo orbital luminoso con los colores de Lya */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
            className="absolute w-38 h-38 md:w-44 md:h-44 rounded-full border-[3px] border-transparent border-t-[#F49AC2] border-r-[#72CEC3] border-b-blue-400/40 lya:border-t-lya-primary lya:border-r-lya-secondary lya:border-b-lya-border/40"
            style={{ width: '10.25rem', height: '10.25rem' }}
          />

          {/* Medallón Circular del Logo (Sin esquinas blancas) */}
          <motion.div 
            animate={{ y: [-4, 4, -4], scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
            className="relative w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden shadow-[0_18px_45px_rgba(0,0,0,0.18)] dark:shadow-[0_18px_45px_rgba(0,0,0,0.45)] ring-4 ring-white dark:ring-slate-800 lya:ring-white bg-white flex items-center justify-center z-10"
          >
            <img 
              src={logo} 
              alt="Lya Pastelería" 
              className="w-full h-full object-cover rounded-full scale-[1.08]"
            />
          </motion.div>
        </div>

        {/* 📝 Título Principal Adaptable al Tema */}
        <h2 
          className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-3 text-center tracking-tight"
          style={{ letterSpacing: '-0.03em' }}
        >
          {title}
        </h2>
        
        {/* Barra de progreso shimmer rápida */}
        <div className="w-40 h-1.5 bg-gray-200/90 dark:bg-slate-800 lya:bg-lya-border/25 rounded-full overflow-hidden p-0.5 mb-4 shadow-inner">
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            className="w-2/3 h-full rounded-full bg-gradient-to-r from-[#F49AC2] via-blue-500 to-[#72CEC3] lya:from-lya-primary lya:via-lya-border lya:to-lya-secondary"
          />
        </div>

        {/* ✅ Subtítulo en Cápsula Glassmorphism con Check Verde */}
        <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-slate-800/70 lya:bg-white/75 backdrop-blur-md border border-gray-200/70 dark:border-slate-700/60 lya:border-lya-border/35 text-gray-600 dark:text-slate-300 lya:text-lya-text/80 shadow-sm">
          <CheckCircle2 size={17} className="text-emerald-500 shrink-0" strokeWidth={2.5} />
          <span className="text-xs md:text-sm font-bold tracking-tight">{subtitle}</span>
        </div>
      </motion.div>
    </div>
  );
};

export default MenuLoader;