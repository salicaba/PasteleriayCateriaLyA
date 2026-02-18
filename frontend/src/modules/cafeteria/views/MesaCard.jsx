import React from 'react';
import { Users, Clock, Receipt } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export const MesaCard = ({ mesa, onClick }) => {
  const isOcupada = mesa.estado === 'ocupada';

  return (
    <motion.div
      layout // ¡Magia! Esto hace que se muevan suavemente al cambiar de zona
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      onClick={() => onClick(mesa)}
      whileHover={{ y: -5, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)" }}
      whileTap={{ scale: 0.95 }}
      className={clsx(
        "relative p-4 rounded-2xl border-2 cursor-pointer select-none h-40 flex flex-col justify-between overflow-hidden transition-colors bg-white",
        isOcupada 
          ? "border-orange-200" 
          : "border-gray-100 hover:border-brand-primary/30"
      )}
    >
      {/* Fondo animado (Latido) solo si está ocupada */}
      {isOcupada && (
        <motion.div 
          animate={{ opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-orange-500 pointer-events-none"
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-start z-10 relative">
        <span className={clsx("text-3xl font-black font-lya", isOcupada ? "text-orange-600" : "text-gray-300")}>
          {mesa.numero}
        </span>
        <div className={clsx(
          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shadow-sm",
          isOcupada ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-gray-50 text-gray-400 border-gray-200"
        )}>
          {isOcupada ? "Ocupada" : "Libre"}
        </div>
      </div>

      {/* Info Central */}
      <div className="z-10 mt-2 relative">
        {isOcupada ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-gray-800">
              <Receipt size={16} className="text-orange-500"/>
              <span className="text-2xl font-bold">${mesa.total.toFixed(0)}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>{mesa.horaInicio}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users size={12} />
                <span>{mesa.personas}p</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center h-full opacity-10">
            <Users size={40} className="text-gray-400" />
          </div>
        )}
      </div>

      {/* Texto hover */}
      {!isOcupada && (
        <div className="absolute inset-x-0 bottom-3 text-center text-xs font-bold text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity">
          ABRIR MESA
        </div>
      )}
    </motion.div>
  );
};