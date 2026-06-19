import React from 'react';
import { motion } from 'framer-motion';

const MenuLoader = () => {
  return (
    <motion.div
      key="menu-loader"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      className="w-full h-full min-h-[50vh] flex flex-col items-center justify-center space-y-6 p-6"
    >
      {/* Contenedor del Logo con respiración adaptado a los 3 temas */}
      <motion.div
        animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="bg-white/60 dark:bg-gray-800/60 lya:bg-lya-surface/60 backdrop-blur-xl p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 flex items-center justify-center"
      >
        <span 
          // El texto se verá Naranja en Claro/Oscuro y tomará tu color primario en el tema Lya
          className="text-6xl font-bold text-orange-500 lya:text-orange-400" 
          style={{ fontFamily: 'cursive' }}
        >
          𝓛𝔂𝓪
        </span>
      </motion.div>

      {/* Texto de carga adaptado a los 3 temas */}
      <motion.p
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        // Gris normal, Gris claro en Oscuro, y el color de texto de tu tema Lya
        className="text-gray-500 dark:text-gray-400 lya:text-lya-text/70 font-medium tracking-widest uppercase text-sm"
      >
        Cargando Delicias...
      </motion.p>
    </motion.div>
  );
};

export default MenuLoader;