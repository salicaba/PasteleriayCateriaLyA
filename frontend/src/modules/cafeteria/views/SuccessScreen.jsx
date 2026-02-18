import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export const SuccessScreen = () => {
  return (
    <div className="absolute inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center">
      
      {/* Círculo Animado */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-xl shadow-green-200 mb-6"
      >
        <motion.div
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Check size={48} color="white" strokeWidth={4} />
        </motion.div>
      </motion.div>

      {/* Texto Animado */}
      <motion.h2 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-black text-gray-800 mb-2"
      >
        ¡Orden Enviada!
      </motion.h2>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-gray-400 font-medium"
      >
        Imprimiendo en cocina...
      </motion.p>
    </div>
  );
};