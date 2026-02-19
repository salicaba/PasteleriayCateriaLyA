import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMesasController } from '../controllers/useMesasController';
import { MesaCard } from './MesaCard';
import clsx from 'clsx';

export const MesasPage = ({ onSelectMesa }) => {
  const { zonas, zonaActiva, setZonaActiva, mesasFiltradas, stats } = useMesasController();

  return (
    // CAMBIO: Fondo gris claro en Light, Gris muy oscuro (casi negro) en Dark
    <div className="flex-1 flex flex-col h-full bg-gray-50/50 dark:bg-gray-900 transition-colors duration-300">
      
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        {/* CAMBIO: Texto oscuro en Light, Blanco en Dark */}
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white transition-colors">
            Mapa de Mesas
        </h1>
        
        <p className="text-sm text-gray-400 dark:text-gray-500 flex gap-2 mt-1">
          {/* Badges de estado adaptados */}
          <span className="text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-md border border-orange-100 dark:border-orange-900/50 transition-colors">
            {stats.ocupadas} Ocupadas
          </span> 
          <span className="text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-md border border-green-100 dark:border-green-900/50 transition-colors">
            {stats.libres} Libres
          </span>
        </p>
      </div>

      {/* Tabs de Zonas */}
      {/* CAMBIO: Borde inferior ajustado para Dark Mode */}
      <div className="px-6 flex gap-6 border-b border-gray-200 dark:border-gray-800 overflow-x-auto hide-scrollbar transition-colors">
        {zonas.map(zona => (
          <button
            key={zona.id}
            onClick={() => setZonaActiva(zona.id)}
            className={clsx(
              "pb-3 px-1 text-sm font-medium transition-colors relative outline-none",
              zonaActiva === zona.id 
                ? "text-brand-primary dark:text-brand-primary" // Activo
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" // Inactivo
            )}
          >
            {zona.label}
            {zonaActiva === zona.id && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-t-full shadow-[0_-2px_10px_rgba(217,70,239,0.5)]"
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