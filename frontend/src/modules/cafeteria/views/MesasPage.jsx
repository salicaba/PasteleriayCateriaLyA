import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Search, Utensils, X } from 'lucide-react';
import { useMesasController } from '../controllers/useMesasController';
import { MesaCard } from './MesaCard';
import { PosModal } from './PosModal'; 

export const MesasPage = () => {
  const { mesasFiltradas, stats, liberarMesa, actualizarEstadoMesa, unirMesas, pagoParcialMesa } = useMesasController();
  
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  // Lógica de filtrado solo por búsqueda (Número de mesa)
  const mesasVisibles = useMemo(() => {
    return mesasFiltradas.filter(mesa => 
      mesa.numero.toString().includes(busqueda)
    );
  }, [mesasFiltradas, busqueda]);

  return (
    // ANIMACIÓN DE ENTRADA SUAVIZADA (Consistente con toda la App)
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 p-4 md:p-8 transition-colors duration-300"
    >
      
      {/* HEADER SIMPLIFICADO Y FIJO */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 shrink-0 z-10 relative">
        <div className="flex items-center space-x-4">
          <div className="bg-orange-500 text-white p-3 rounded-2xl shadow-md shadow-orange-500/20">
            <LayoutGrid size={28} />
          </div>
          <div>
            {/* Título cambiado de "Salón & Mesas" a solo "Mesas" */}
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">Mesas</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded-lg">
                {stats.ocupadas} Ocupadas
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
                {stats.libres} Libres
              </span>
            </div>
          </div>
        </div>

        {/* Buscador Rápido (Se queda como única herramienta de control) */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar por número de mesa..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      {/* MAPA DE MESAS CON SCROLL INDEPENDIENTE */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-24">
        <motion.div 
          layout 
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 items-start auto-rows-max"
        >
          <AnimatePresence mode='popLayout'>
            {mesasVisibles.map(mesa => (
              <MesaCard 
                key={mesa.id} 
                mesa={mesa} 
                onClick={() => setMesaSeleccionada(mesa)} 
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Estado vacío si no hay resultados en la búsqueda */}
        {mesasVisibles.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600"
          >
            <Search size={64} className="mb-4 opacity-10" />
            <p className="text-xl font-bold">No se encontró la mesa "{busqueda}"</p>
            <button onClick={() => setBusqueda('')} className="mt-2 text-orange-500 font-bold hover:underline">Ver todas las mesas</button>
          </motion.div>
        )}
      </div>

      {/* POS MODAL */}
      <AnimatePresence>
        {mesaSeleccionada && (
          <PosModal 
            isOpen={!!mesaSeleccionada}
            mesa={mesaSeleccionada}
            todasLasMesas={mesasFiltradas}
            onClose={() => setMesaSeleccionada(null)}
            onTableRelease={(id) => {
              liberarMesa(id);
              setMesaSeleccionada(null); 
            }}
            onUpdateTable={(id, monto) => {
              actualizarEstadoMesa(id, monto);
            }}
            onUnirMesas={(origen, destino) => {
              unirMesas(origen, destino);
              setMesaSeleccionada(null);
            }}
            onPagoParcial={(id, monto) => {
              pagoParcialMesa(id, monto);
              setMesaSeleccionada(null); 
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};