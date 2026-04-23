import React from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, ShoppingBag } from 'lucide-react';

export const MesaCard = ({ mesa, onClick }) => {
  // 1. Separamos el texto que viene guardado (Ej: "L-01 - Emmanuel")
  const isLlevar = mesa.zona === 'llevar';
  const partesNumero = mesa.numero.toString().split(' - ');
  const numeroReal = partesNumero[0]; // Se queda con "L-01" o "1"
  const nombreCliente = partesNumero[1]; // Se queda con "Emmanuel" (si existe)

  // 2. Decidimos qué decir en el letrero chiquito de arriba
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
      // REFACTORIZACIÓN DE COLORES CORPORATIVOS LYA
      className={`
        relative p-4 md:p-5 rounded-3xl cursor-pointer shadow-sm border-2 transition-all duration-200 flex flex-col justify-between h-36 md:h-40
        ${isOcupada 
          ? (isLlevar 
              ? 'bg-brand-secondary border-brand-secondary text-brand-surface shadow-lg shadow-brand-secondary/20' // Turquesa para Llevar activo
              : 'bg-brand-primary border-brand-primary text-brand-surface shadow-lg shadow-brand-primary/20' // Rosa para Mesa ocupada
            ) 
          : 'bg-brand-surface border-brand-border/20 text-brand-text hover:border-brand-secondary' // Colores base (Marrón y Vainilla)
        }
      `}
    >
      {/* ---------------- ENCABEZADO DE LA TARJETA ---------------- */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col overflow-hidden pr-2">
          {/* Etiqueta superior */}
          <span className={`text-[10px] font-black uppercase tracking-widest truncate flex items-center gap-1.5 ${isOcupada ? 'text-brand-surface/90' : 'text-brand-text opacity-50'}`}>
            {isLlevar && <ShoppingBag size={14} />}
            <span className="truncate max-w-[100px]">{etiquetaSuperior}</span>
          </span>
          
          {/* Número grande principal */}
          <span className="text-3xl md:text-4xl font-black leading-none mt-1 tracking-tight">
            {numeroReal}
          </span>
        </div>
        
        {/* BADGE DE ESTADO (Esquina superior derecha) */}
        {isOcupada && (
          <span className="px-2.5 py-1 bg-brand-surface/20 rounded-lg text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-brand-surface/10">
            {isLlevar ? 'Activo' : 'Ocupada'}
          </span>
        )}
      </div>

      {/* ---------------- PIE DE LA TARJETA (Tiempo y Total) ---------------- */}
      <div className="flex justify-between items-end mt-2">
        <div className={`flex flex-col gap-1 text-[11px] font-bold ${isOcupada ? 'text-brand-surface/90' : 'text-brand-text opacity-40'}`}>
          {/* Mostrar personas solo si NO es para llevar */}
          {!isLlevar && (
            <div className="flex items-center gap-1.5">
              <Users size={12} />
              <span>{mesa.personas || 0}</span>
            </div>
          )}
          {/* Mostrar hora de inicio si está ocupada/activa */}
          {isOcupada && mesa.horaInicio && (
            <div className="flex items-center gap-1.5">
              <Clock size={12} />
              <span>{mesa.horaInicio}</span>
            </div>
          )}
        </div>
        
        {/* Total monetario */}
        <div className="text-right">
          {isOcupada ? (
            <span className="text-xl md:text-2xl font-black tracking-tight drop-shadow-md">
              ${Number(mesa.total || 0).toFixed(2)}
            </span>
          ) : (
            <span className="text-xs font-black uppercase tracking-widest text-brand-text opacity-30">
              Libre
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};