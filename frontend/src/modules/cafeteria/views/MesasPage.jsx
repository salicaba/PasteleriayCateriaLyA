// src/modules/cafeteria/views/MesasPage.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Search, X, ShoppingBag, Plus, Zap } from 'lucide-react'; 
import { useMesasController } from '../controllers/useMesasController';
import { MesaCard } from './MesaCard';
import { PosModal } from './PosModal'; 
import { NuevoPedidoLlevarModal } from './NuevoPedidoLlevarModal';

const MesasSkeleton = () => (
  <motion.div 
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8"
  >
    {/* Header Skeleton */}
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 bg-white/60 dark:bg-gray-900/60 lya:bg-lya-surface/60 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0">
      <div className="flex items-center space-x-4">
        <div className="w-14 h-14 bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/30 rounded-2xl animate-pulse" />
        <div className="space-y-2">
          <div className="w-32 h-6 bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/30 rounded-lg animate-pulse" />
          <div className="w-48 h-4 bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/30 rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="w-full md:w-72 h-12 bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/30 rounded-xl animate-pulse" />
    </div>

    {/* Tabs Skeleton */}
    <div className="flex gap-2 mb-6 overflow-hidden">
      {[1, 2, 3].map(i => (
        <div key={i} className="w-32 h-10 bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/30 rounded-xl animate-pulse shrink-0" />
      ))}
    </div>

    {/* Grid Skeleton */}
    <div className="flex-1 overflow-hidden">
      <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar pb-24">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 items-start auto-rows-max">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-square bg-white/60 dark:bg-gray-900/60 lya:bg-lya-surface/60 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/30 rounded-full animate-pulse" />
                <div className="w-16 h-6 bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/30 rounded-full animate-pulse" />
              </div>
              <div className="space-y-3 mt-4 w-full">
                <div className="w-full h-4 bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/30 rounded-md animate-pulse" />
                <div className="w-2/3 h-4 bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/30 rounded-md animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </motion.div>
);

export const MesasPage = () => {
  // 🔥 SOLUCIÓN 1: Usamos 'isLoading' en lugar de 'loading'
  const { 
    mesasFiltradas, stats, liberarMesa, actualizarEstadoMesa, unirMesas, pagoParcialMesa,
    zonas, zonaActiva, setZonaActiva, nuevoPedidoLlevar, nuevoPedidoVitrina, isLoading 
  } = useMesasController();
  
  // 🔥 SOLUCIÓN 2: Todos los useState ANTES del return temprano
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [ordenVitrina, setOrdenVitrina] = useState(null); 
  const [busqueda, setBusqueda] = useState('');
  const [isModalLlevarOpen, setIsModalLlevarOpen] = useState(false);

  // AHORA SÍ: Cortamos la ejecución si está cargando
  if (isLoading) return <MesasSkeleton />;

  const mesasVisibles = mesasFiltradas.filter(mesa => 
    (mesa?.numero || '').toString().toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleCrearPedidoLlevar = async (nombreCliente, telefono) => {
    const nuevo = await nuevoPedidoLlevar(nombreCliente, telefono); 
    if (nuevo) setMesaSeleccionada(nuevo);      
  };

  const viewVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 15 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 250, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, y: -15, transition: { duration: 0.2 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 z-10 relative">
        <div className="flex items-center space-x-4">
          <div className="bg-orange-500 lya:bg-lya-primary text-white p-3 rounded-2xl shadow-md shadow-orange-500/20">
            {zonaActiva === 'salon' ? <LayoutGrid size={28} /> : (zonaActiva === 'vitrina' ? <Zap size={28}/> : <ShoppingBag size={28} />)}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text tracking-tight">
              {zonaActiva === 'salon' ? 'Mesas' : (zonaActiva === 'vitrina' ? 'Mostrador Rápido' : 'Para Llevar')}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              {zonaActiva === 'salon' && (
                <>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">{stats.ocupadas} Ocupadas</span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{stats.libres} Libres</span>
                </>
              )}
            </div>
          </div>
        </div>

        {zonaActiva !== 'vitrina' && (
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Buscar por número..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 transition-all text-gray-800 dark:text-white" />
          </div>
        )}
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 shrink-0 min-h-[48px]">
        <div className="flex gap-2 bg-gray-200 dark:bg-gray-800 p-1 rounded-2xl overflow-x-auto">
          {zonas && zonas.map(zona => (
            <button
              key={zona.id}
              onClick={async () => {
                setZonaActiva(zona.id);
                if (zona.id === 'vitrina') {
                   const orden = await nuevoPedidoVitrina();
                   setOrdenVitrina(orden);
                } else {
                   setOrdenVitrina(null);
                }
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${zonaActiva === zona.id ? 'bg-white dark:bg-gray-700 text-orange-500 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              {zona.id === 'salon' ? <LayoutGrid size={18} /> : (zona.id === 'vitrina' ? <Zap size={18} className="fill-current"/> : <ShoppingBag size={18} />)}
              {zona.label}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {zonaActiva === 'llevar' && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.8, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 20 }}
              onClick={() => setIsModalLlevarOpen(true)} 
              className="flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-2.5 rounded-xl font-bold transition-colors shadow-md"
            >
              <Plus size={20} /><span>Nuevo Pedido</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-hidden pr-2 pb-4">
        <AnimatePresence mode="wait">
          {zonaActiva === 'vitrina' ? (
             <motion.div 
               key="vista-vitrina"
               variants={viewVariants}
               initial="hidden"
               animate="visible"
               exit="exit"
               className="h-full w-full"
             >
                {ordenVitrina ? (
                  <PosModal
                    isOpen={true}
                    inline={true} 
                    mesa={ordenVitrina}
                    todasLasMesas={mesasFiltradas}
                    onClose={() => setZonaActiva('salon')}
                    onTableRelease={(id) => {
                       liberarMesa(id);
                       setOrdenVitrina(null);
                       setTimeout(() => { nuevoPedidoVitrina().then(setOrdenVitrina); }, 600);
                    }}
                    onUpdateTable={(id, monto) => actualizarEstadoMesa(id, monto)}
                    onUnirMesas={(origen, destino) => unirMesas(origen, destino)}
                    onPagoParcial={(id, monto) => pagoParcialMesa(id, monto)}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 font-bold bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                     <Zap className="animate-pulse mr-2 text-yellow-500" size={32} /> Preparando Vitrina...
                  </div>
                )}
             </motion.div>
          ) : (
             <motion.div 
               key={`vista-grid-${zonaActiva}`}
               variants={viewVariants}
               initial="hidden"
               animate="visible"
               exit="exit"
               className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar pb-24"
             >
                <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 items-start auto-rows-max relative">
                  <AnimatePresence mode='popLayout'>
                    {mesasVisibles.map(mesa => (
                      <motion.div key={mesa.id} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}>
                        <MesaCard mesa={mesa} onClick={() => setMesaSeleccionada(mesa)} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
                {mesasVisibles.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400"><Search size={64} className="mb-4 opacity-20" /><p className="text-xl font-bold">No hay mesas aquí</p></div>
                )}
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {mesaSeleccionada && (
          <PosModal 
            isOpen={!!mesaSeleccionada} mesa={mesaSeleccionada} todasLasMesas={mesasFiltradas} onClose={() => setMesaSeleccionada(null)}
            onTableRelease={(id) => { liberarMesa(id); setMesaSeleccionada(null); }}
            onUpdateTable={(id, monto) => actualizarEstadoMesa(id, monto)}
            onUnirMesas={(origen, destino) => { if (unirMesas) unirMesas(origen, destino); setMesaSeleccionada(null); }}
            onPagoParcial={(id, monto) => pagoParcialMesa(id, monto)}
          />
        )}
      </AnimatePresence>

      <NuevoPedidoLlevarModal isOpen={isModalLlevarOpen} onClose={() => setIsModalLlevarOpen(false)} onSubmit={handleCrearPedidoLlevar} />
    </motion.div>
  );
};