import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMesasController } from '../controllers/useMesasController';
import { MesaCard } from './MesaCard';
import { PosModal } from './PosModal'; // 1. Importamos el Modal
import clsx from 'clsx';

export const MesasPage = () => { // Ya no necesitamos props externas para selección
  // 2. Extraemos 'liberarMesa' y 'actualizarEstadoMesa' del hook
  const { zonas, zonaActiva, setZonaActiva, mesasFiltradas, stats, liberarMesa, actualizarEstadoMesa } = useMesasController();
  
  // 3. Estado local para controlar qué mesa se está editando
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50/50 dark:bg-gray-900 transition-colors duration-300">
      
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white transition-colors">
            Mapa de Mesas
        </h1>
        
        <p className="text-sm text-gray-400 dark:text-gray-500 flex gap-2 mt-1">
          <span className="text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-md border border-orange-100 dark:border-orange-900/50 transition-colors">
            {stats.ocupadas} Ocupadas
          </span> 
          <span className="text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-md border border-green-100 dark:border-green-900/50 transition-colors">
            {stats.libres} Libres
          </span>
        </p>
      </div>

      {/* Tabs de Zonas */}
      <div className="px-6 flex gap-6 border-b border-gray-200 dark:border-gray-800 overflow-x-auto hide-scrollbar transition-colors">
        {zonas.map(zona => (
          <button
            key={zona.id}
            onClick={() => setZonaActiva(zona.id)}
            className={clsx(
              "pb-3 px-1 text-sm font-medium transition-colors relative outline-none",
              zonaActiva === zona.id 
                ? "text-brand-primary dark:text-brand-primary" 
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
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
      <div className="p-6 overflow-y-auto flex-1 pb-24"> {/* pb-24 para dar espacio si hay elementos flotantes */}
        <motion.div 
          layout
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
        >
          <AnimatePresence mode='popLayout'>
            {mesasFiltradas.map(mesa => (
              <MesaCard 
                key={mesa.id} 
                mesa={mesa} 
                // 4. Al hacer clic, guardamos la mesa en el estado local
                onClick={() => setMesaSeleccionada(mesa)} 
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* 5. Renderizado Condicional del POS Modal */}
      {/* Al estar aquí dentro, comparte el estado del 'useMesasController' de arriba */}
      <AnimatePresence>
        {mesaSeleccionada && (
          <PosModal 
            isOpen={!!mesaSeleccionada}
            mesa={mesaSeleccionada}
            onClose={() => setMesaSeleccionada(null)}
            // LÓGICA DE LIBERACIÓN DE MESA (Al Cobrar)
            onTableRelease={(id) => {
              liberarMesa(id);
              setMesaSeleccionada(null); // Aseguramos que se cierre el modal
            }}
            // LÓGICA DE ACTUALIZACIÓN (Al enviar a Cocina)
            onUpdateTable={(id, monto) => {
              actualizarEstadoMesa(id, monto);
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
};