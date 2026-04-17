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
  // Si es para llevar y tiene nombre, muestra el nombre. Si no, muestra "Llevar" o "Mesa"
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
      // Clases dinámicas de Tailwind dependiendo del estado (Libre / Salón / Llevar)
      className={`
        relative p-4 md:p-5 rounded-3xl cursor-pointer shadow-sm border-2 transition-all duration-200 flex flex-col justify-between h-36 md:h-40
        ${isOcupada 
          ? (isLlevar 
              ? 'bg-orange-500 border-orange-600 text-white' // Color para Llevar activo
              : 'bg-brand-primary border-brand-dark text-white' // Color para Mesa ocupada
            ) 
          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-800 dark:text-white hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
    >
      {/* ---------------- ENCABEZADO DE LA TARJETA ---------------- */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col overflow-hidden pr-2">
          {/* Etiqueta superior (Aquí aparece el NOMBRE truncado para no romper el cuadro) */}
          <span className={`text-xs font-bold uppercase tracking-wider truncate flex items-center gap-1.5 ${isOcupada ? 'text-white/80' : 'text-gray-400'}`}>
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
          <span className="px-2.5 py-1 bg-white/20 rounded-lg text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
            {isLlevar ? 'Activo' : 'Ocupada'}
          </span>
        )}
      </div>

      {/* ---------------- PIE DE LA TARJETA (Tiempo y Total) ---------------- */}
      <div className="flex justify-between items-end mt-2">
        <div className={`flex flex-col gap-1 text-xs font-bold ${isOcupada ? 'text-white/90' : 'text-gray-400'}`}>
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
            <span className="text-xl md:text-2xl font-black tracking-tight drop-shadow-sm">
              ${(mesa.total || 0).toFixed(2)}
            </span>
          ) : (
            <span className="text-sm font-bold text-gray-400 dark:text-gray-500">Libre</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};