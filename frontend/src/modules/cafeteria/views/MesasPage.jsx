import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMesasController } from '../controllers/useMesasController';
import { MesaCard } from './MesaCard';
import { PosModal } from './PosModal'; 

export const MesasPage = () => {
  // Ya solo extraemos lo que realmente usamos (quitamos zonas, zonaActiva, etc.)
  const { mesasFiltradas, stats, liberarMesa, actualizarEstadoMesa } = useMesasController();
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50/50 dark:bg-gray-900 transition-colors duration-300">
      
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-800">
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

      {/* Grid de Mesas (Ahora empieza justo debajo del header) */}
      <div className="p-6 overflow-y-auto flex-1 pb-24">
        <motion.div 
          layout
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
        >
          <AnimatePresence mode='popLayout'>
            {mesasFiltradas.map(mesa => (
              <MesaCard 
                key={mesa.id} 
                mesa={mesa} 
                onClick={() => setMesaSeleccionada(mesa)} 
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* POS Modal */}
      <AnimatePresence>
        {mesaSeleccionada && (
          <PosModal 
            isOpen={!!mesaSeleccionada}
            mesa={mesaSeleccionada}
            onClose={() => setMesaSeleccionada(null)}
            onTableRelease={(id) => {
              liberarMesa(id);
              setMesaSeleccionada(null); 
            }}
            onUpdateTable={(id, monto) => {
              actualizarEstadoMesa(id, monto);
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
};