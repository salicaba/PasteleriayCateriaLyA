// frontend/src/modules/cafeteria/views/MesaCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, ShoppingBag, SplitSquareHorizontal, ChefHat } from 'lucide-react';

export const MesaCard = ({ mesa, onClick }) => {
  const isLlevar = mesa.zona === 'llevar';
  const partesNumero = mesa.numero.toString().split(' - ');
  const numeroReal = partesNumero[0]; 
  const nombreCliente = partesNumero[1]; 

  const isOcupada = mesa.estado === 'ocupada';
  const numeroCuentas = mesa.cuentasActivas || 0;

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }} onClick={onClick}
      className={`
        relative p-5 rounded-[2rem] cursor-pointer shadow-sm border-2 transition-all duration-300 flex flex-col justify-between h-44
        ${isOcupada 
          ? 'bg-gray-900 dark:bg-orange-500 border-gray-900 dark:border-orange-500 text-white shadow-xl lya:bg-lya-primary lya:border-lya-primary' 
          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-800 dark:text-white hover:border-orange-200'
        }
      `}
    >
      {/* SECCIÓN SUPERIOR: NÚMERO Y ESTADO */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <span className={`text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1.5 ${isOcupada ? 'text-white/60' : 'text-gray-400'}`}>
            {isLlevar ? <ShoppingBag size={12} /> : <Users size={12} />}
            {isLlevar ? (nombreCliente || 'Para Llevar') : `Mesa ${numeroReal}`}
          </span>
          <span className="text-4xl font-black tracking-tighter">
            {isLlevar ? numeroReal.charAt(0) : numeroReal}
          </span>
        </div>
        
        {isOcupada && (
          <div className="flex flex-col items-end gap-1.5">
            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border border-white/10">
              Ocupada
            </span>
            {numeroCuentas > 1 && (
              <span className="bg-blue-500 text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 shadow-lg">
                <SplitSquareHorizontal size={10} /> {numeroCuentas} Cuentas
              </span>
            )}
          </div>
        )}
      </div>

      {/* SECCIÓN INFERIOR: TIEMPO Y TOTAL */}
      <div className="flex justify-between items-end border-t border-white/10 pt-3">
        <div className={`flex flex-col gap-0.5 ${isOcupada ? 'text-white/70' : 'text-gray-400'}`}>
          {isOcupada && mesa.horaInicio && (
            <div className="flex items-center gap-1 text-[10px] font-bold">
              <Clock size={12} />
              <span>{new Date(mesa.horaInicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-[10px] font-bold">
             <ChefHat size={12} />
             <span>{isOcupada ? 'En preparación' : 'Disponible'}</span>
          </div>
        </div>
        
        <div className="text-right">
          {isOcupada ? (
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black uppercase opacity-60 tracking-widest">Consumo</span>
              <span className="text-2xl font-black leading-none">${mesa.total.toFixed(2)}</span>
            </div>
          ) : (
            <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Libre</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};