// src/components/animations/MenuLoader.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import logo from '../../assets/logo.jpeg'; 

const MenuLoader = ({ 
  title = "Preparando tu mesa...", 
  subtitle = "Cargando el menú más fresco" 
}) => {
  return (
    // 🎨 Fondo color crema idéntico a la imagen (adaptable a oscuro)
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FDF6E3] dark:bg-gray-950 lya:bg-[#FDF6E3] overflow-hidden rounded-[inherit] w-full h-full z-[150]">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col items-center justify-center z-10 w-full px-6"
      >
        {/* 🌟 Animación del Logo con los aros Rosa y Teal de Lya */}
        <div className="relative mb-6">
          <motion.div 
            animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="relative w-36 h-36 md:w-44 md:h-44 rounded-full border-[5px] border-[#F48FB1] p-1 flex items-center justify-center bg-transparent shadow-xl"
          >
            <div className="w-full h-full rounded-full border-[4px] border-[#4DD0E1] p-1 bg-white">
              <img 
                src={logo} 
                alt="Lya Pastelería" 
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          </motion.div>
        </div>

        {/* 📝 Título Principal (Café oscuro) */}
        <h2 className="text-[22px] md:text-3xl font-black text-[#5C4033] dark:text-white lya:text-[#5C4033] mb-3 text-center tracking-tight">
          {title}
        </h2>
        
        {/* ✅ Subtítulo con Check Verde */}
        <div className="flex items-center justify-center gap-2 text-[#7A6355] dark:text-gray-300 lya:text-[#7A6355]">
          <CheckCircle2 size={18} className="text-[#10B981]" strokeWidth={2.5} />
          <span className="text-sm md:text-base font-medium">{subtitle}</span>
        </div>
      </motion.div>
    </div>
  );
};

export default MenuLoader;