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
      // Cambia de color de fondo suavemente entre naranja claro e índigo profundo
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
        // Se mueve a la derecha (x: 32) si es dark, izquierda (x: 0) si es light
        animate={{
            x: isDark ? 32 : 0,
            // Cambia el color de la gota: Naranja brillante vs Índigo suave
            backgroundColor: isDark ? '#818cf8' : '#fb923c', // indigo-400 vs orange-400
        }}
        // La magia: mientras se mueve, se "estira" horizontalmente (scaleX: 1.2)
        // para dar sensación de velocidad y liquidez.
        whileTap={{ scaleX: 0.9, scaleY: 0.9 }} // Efecto al hacer clic
        transition={spring}
        className="w-6 h-6 rounded-full shadow-md relative z-10 flex items-center justify-center"
      >
        {/* Icono activo dentro de la gota (aparece/desaparece suavemente) */}
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