import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMesasController } from '../controllers/useMesasController';
import { MesaCard } from './MesaCard';
import clsx from 'clsx';

export const MesasPage = ({ onSelectMesa }) => {
  const { zonas, zonaActiva, setZonaActiva, mesasFiltradas, stats } = useMesasController();

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50/50">
      
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-gray-800">Mapa de Mesas</h1>
        <p className="text-sm text-gray-400 flex gap-2 mt-1">
          <span className="text-orange-500 font-bold bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">{stats.ocupadas} Ocupadas</span> 
          <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-md border border-green-100">{stats.libres} Libres</span>
        </p>
      </div>

      {/* Tabs de Zonas (Pestañas) */}
      <div className="px-6 flex gap-6 border-b border-gray-200 overflow-x-auto hide-scrollbar">
        {zonas.map(zona => (
          <button
            key={zona.id}
            onClick={() => setZonaActiva(zona.id)}
            className={clsx(
              "pb-3 px-1 text-sm font-medium transition-colors relative outline-none",
              zonaActiva === zona.id ? "text-brand-primary" : "text-gray-400 hover:text-gray-600"
            )}
          >
            {zona.label}
            {/* Línea animada debajo de la pestaña activa */}
            {zonaActiva === zona.id && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-t-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Grid de Mesas */}
      <div className="p-6 overflow-y-auto flex-1">
        <motion.div 
          layout
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
        >
          <AnimatePresence mode='popLayout'>
            {mesasFiltradas.map(mesa => (
              <MesaCard 
                key={mesa.id} 
                mesa={mesa} 
                onClick={onSelectMesa} 
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};