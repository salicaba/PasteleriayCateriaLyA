import React from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, ShoppingBag } from 'lucide-react';

export const MesaCard = ({ mesa, onClick }) => {
  const isLlevar = mesa.zona === 'llevar';
  const partesNumero = mesa.numero.toString().split(' - ');
  const numeroReal = partesNumero[0]; 
  const nombreCliente = partesNumero[1]; 

  const etiquetaSuperior = isLlevar 
    ? (nombreCliente ? nombreCliente : 'Para Llevar') 
    : 'Mesa';

  const isOcupada = mesa.estado === 'ocupada';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        relative p-4 md:p-5 rounded-3xl cursor-pointer shadow-sm border-2 transition-all duration-200 flex flex-col justify-between h-36 md:h-40
        ${isOcupada 
          ? (isLlevar 
              ? 'bg-orange-500 border-orange-600 text-white lya:bg-lya-secondary lya:border-lya-secondary lya:text-lya-surface lya:shadow-lg lya:shadow-lya-secondary/20' 
              : 'bg-gray-900 dark:bg-orange-500 border-gray-900 dark:border-orange-500 text-white lya:bg-lya-primary lya:border-lya-primary lya:text-lya-surface lya:shadow-lg lya:shadow-lya-primary/20'
            ) 
          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-800 dark:text-white hover:border-gray-300 dark:hover:border-gray-600 lya:bg-lya-surface lya:border-lya-border/20 lya:text-lya-text lya:hover:border-lya-secondary'
        }
      `}
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col overflow-hidden pr-2">
          <span className={`text-xs font-bold uppercase tracking-wider truncate flex items-center gap-1.5 ${isOcupada ? 'text-white/80 lya:text-lya-surface/90' : 'text-gray-400 lya:text-lya-text/50'}`}>
            {isLlevar && <ShoppingBag size={14} />}
            <span className="truncate max-w-[100px]">{etiquetaSuperior}</span>
          </span>
          
          <span className="text-3xl md:text-4xl font-black leading-none mt-1 tracking-tight">
            {numeroReal}
          </span>
        </div>
        
        {isOcupada && (
          <span className="px-2.5 py-1 bg-white/20 lya:bg-lya-surface/20 rounded-lg text-[10px] font-black uppercase tracking-widest backdrop-blur-md lya:border lya:border-lya-surface/10">
            {isLlevar ? 'Activo' : 'Ocupada'}
          </span>
        )}
      </div>

      <div className="flex justify-between items-end mt-2">
        <div className={`flex flex-col gap-1 text-xs font-bold ${isOcupada ? 'text-white/90 lya:text-lya-surface/90' : 'text-gray-400 lya:text-lya-text/40'}`}>
          {!isLlevar && (
            <div className="flex items-center gap-1.5">
              <Users size={12} />
              <span>{mesa.personas || 0}</span>
            </div>
          )}
          {isOcupada && mesa.horaInicio && (
            <div className="flex items-center gap-1.5">
              <Clock size={12} />
              <span>{mesa.horaInicio}</span>
            </div>
          )}
        </div>
        
        <div className="text-right">
          {isOcupada ? (
            <span className="text-xl md:text-2xl font-black tracking-tight drop-shadow-sm lya:drop-shadow-md">
              ${(mesa.total || 0).toFixed(2)}
            </span>
          ) : (
            <span className="text-sm font-bold text-gray-400 dark:text-gray-500 lya:text-xs lya:font-black lya:uppercase lya:tracking-widest lya:text-lya-text lya:opacity-30">
              Libre
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};