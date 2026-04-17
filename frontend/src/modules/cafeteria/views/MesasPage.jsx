import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Search, X, ShoppingBag, Plus } from 'lucide-react';
import { useMesasController } from '../controllers/useMesasController';
import { MesaCard } from './MesaCard';
import { PosModal } from './PosModal'; 

export const MesasPage = () => {
  const { 
    mesasFiltradas, stats, liberarMesa, actualizarEstadoMesa, unirMesas, pagoParcialMesa,
    zonas, zonaActiva, setZonaActiva, nuevoPedidoLlevar 
  } = useMesasController();
  
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  const mesasVisibles = useMemo(() => {
    return mesasFiltradas.filter(mesa => 
      mesa.numero.toString().toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [mesasFiltradas, busqueda]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 p-4 md:p-8 transition-colors duration-300"
    >
      
      {/* HEADER DINÁMICO */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 shrink-0 z-10 relative">
        <div className="flex items-center space-x-4">
          <div className="bg-orange-500 text-white p-3 rounded-2xl shadow-md shadow-orange-500/20">
            {/* Ícono dinámico */}
            {zonaActiva === 'salon' ? <LayoutGrid size={28} /> : <ShoppingBag size={28} />}
          </div>
          <div>
            {/* Título dinámico */}
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">
              {zonaActiva === 'salon' ? 'Mesas' : 'Para Llevar'}
            </h1>
            
            {/* Badges dinámicos */}
            <div className="flex items-center gap-3 mt-1">
              {zonaActiva === 'salon' ? (
                <>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded-lg">
                    {stats.ocupadas} Ocupadas
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
                    {stats.libres} Libres
                  </span>
                </>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-lg">
                  {mesasFiltradas.length} Pedidos Activos
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar por número..."
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

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex gap-2 bg-gray-200 dark:bg-gray-800 p-1 rounded-2xl overflow-x-auto">
          {zonas && zonas.map(zona => (
            <button
              key={zona.id}
              onClick={() => setZonaActiva(zona.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                zonaActiva === zona.id 
                  ? 'bg-white dark:bg-gray-700 text-orange-500 shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {zona.id === 'salon' ? <LayoutGrid size={18} /> : <ShoppingBag size={18} />}
              {zona.label}
            </button>
          ))}
        </div>

        {zonaActiva === 'llevar' && (
          <button 
            onClick={() => {
              const nombreCliente = window.prompt("Ingresa el nombre del cliente para este pedido:");
              if (nombreCliente !== null) {
                 const nuevo = nuevoPedidoLlevar(nombreCliente); 
                 setMesaSeleccionada(nuevo);       
              }
            }}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 dark:bg-orange-600 dark:hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-md"
          >
            <Plus size={20} />
            <span>Nuevo Pedido</span>
          </button>
        )}
      </div>

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

        {mesasVisibles.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600"
          >
            <Search size={64} className="mb-4 opacity-10" />
            <p className="text-xl font-bold">No se encontró el registro "{busqueda}"</p>
            <button onClick={() => setBusqueda('')} className="mt-2 text-orange-500 font-bold hover:underline">Ver todo</button>
          </motion.div>
        )}
      </div>

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