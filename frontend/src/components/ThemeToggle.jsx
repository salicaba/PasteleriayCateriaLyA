import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle = ({ theme, toggleTheme }) => {
  const isDark = theme === 'dark';

  // --- Configuración de Animaciones (Física de Resorte) ---
  const spring = {
    type: "spring",
    stiffness: 700,
    damping: 30,
  };

  return (
    <motion.button
      onClick={toggleTheme}
      // 1. El Contenedor (Píldora)
      animate={{
        backgroundColor: isDark ? '#1e1b4b' : '#ffedd5', // indigo-950 vs orange-100
      }}
      transition={{ duration: 0.5 }}
      className="relative w-16 h-8 rounded-full p-1 flex items-center cursor-pointer shadow-inner overflow-hidden"
      aria-label="Cambiar Tema"
    >
        {/* Iconos de fondo estáticos (para dar contexto) */}
        <div className="absolute inset-0 flex justify-between items-center px-2">
            <Sun size={14} className="text-orange-300 opacity-50" />
            <Moon size={14} className="text-indigo-300 opacity-50" />
        </div>

      {/* 2. La Gota Líquida (El orbe que se mueve) */}
      <motion.div
        animate={{
            // SOLUCIÓN AQUÍ: Usamos '2rem' en lugar de 32 píxeles fijos
            // Así la distancia de movimiento escala automáticamente con el tamaño de la interfaz
            x: isDark ? '2rem' : '0rem',
            backgroundColor: isDark ? '#818cf8' : '#fb923c', // indigo-400 vs orange-400
        }}
        whileTap={{ scaleX: 0.9, scaleY: 0.9 }} // Efecto al hacer clic
        transition={spring}
        className="w-6 h-6 rounded-full shadow-md relative z-10 flex items-center justify-center"
      >
        {/* Icono activo dentro de la gota */}
        <motion.div
            initial={false}
            animate={{
                opacity: isDark ? 1 : 0,
                scale: isDark ? 1 : 0.5,
                rotate: isDark ? 0 : -90
            }}
            className="absolute text-indigo-950"
        >
            <Moon size={12} fill="currentColor" />
        </motion.div>
        <motion.div
            initial={false}
            animate={{
                opacity: !isDark ? 1 : 0,
                scale: !isDark ? 1 : 0.5,
                rotate: !isDark ? 0 : 90
            }}
            className="absolute text-white"
        >
            <Sun size={12} fill="currentColor" />
        </motion.div>

      </motion.div>
    </motion.button>
  );
};