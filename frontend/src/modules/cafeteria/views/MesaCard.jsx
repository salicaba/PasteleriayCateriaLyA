import React from 'react';
import { motion } from 'framer-motion';
import { Users, DollarSign, Clock } from 'lucide-react';
import clsx from 'clsx';

export const MesaCard = ({ mesa, onClick }) => {
  const isOcupada = mesa.estado === 'ocupada';

  return (
    <motion.div
      layout
      // --- ANIMACIONES DE ENTRADA Y SALIDA ---
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      // --- LA ANIMACIÓN QUE FALTABA (HOVER) ---
      whileHover={{ 
        scale: 1.03, // Crece un poco
        y: -5,       // Se levanta hacia arriba
        transition: { type: "spring", stiffness: 300 } 
      }}
      whileTap={{ scale: 0.95 }} // Efecto de clic
      onClick={() => onClick(mesa)}
      className={clsx(
        "relative p-4 rounded-2xl cursor-pointer border transition-colors duration-300 shadow-sm hover:shadow-xl flex flex-col justify-between h-40",
        // ESTILOS DE ESTADO
        isOcupada 
          ? "bg-orange-50 border-orange-200 dark:bg-gray-800 dark:border-orange-500/50" 
          : "bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700 hover:border-brand-primary/50 dark:hover:border-brand-primary/50"
      )}
    >
      {/* Header de la Mesa */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
            {/* Badge del Número */}
            <div className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors",
                isOcupada 
                    ? "bg-orange-100 text-orange-600 dark:bg-orange-500 dark:text-white" 
                    : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300"
            )}>
                {mesa.numero}
            </div>
            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">
                {mesa.zona}
            </span>
        </div>

        {/* Indicador de Estado (Onda expansiva / Radar) */}
        {isOcupada && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>
        )}
      </div>

      {/* Contenido Central */}
      <div className="flex-1 flex flex-col justify-center items-center py-2">
         {isOcupada ? (
             <div className="text-center">
                 <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1 flex items-center gap-1 justify-center">
                    <Clock size={12}/> 
                    <span>24 min</span>
                 </p>
                 <p className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">
                    ${mesa.total?.toFixed(0) || '0'}
                 </p>
             </div>
         ) : (
             <div className="text-center opacity-40 dark:opacity-20 group-hover:opacity-60 transition-opacity">
                <Users size={32} className="mx-auto mb-1 text-gray-400 dark:text-gray-500" />
                <span className="text-xs font-medium text-gray-400">Disponible</span>
             </div>
         )}
      </div>

      {/* Footer: Modificado para ocultar la capacidad y alinear a la derecha */}
      <div className="flex justify-end items-center text-xs border-t border-gray-100 dark:border-gray-700/50 pt-2 mt-1 min-h-[28px]">
        {isOcupada && <span className="text-orange-500 dark:text-orange-400 font-bold">Ver Cuenta →</span>}
      </div>

    </motion.div>
  );
};