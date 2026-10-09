// src/modules/kitchen/views/KitchenPage.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKitchenController } from '../controllers/useKitchenController';
import { KitchenOrderCard } from './KitchenOrderCard';
import { Flame, UtensilsCrossed, ShoppingBag, Loader2, CheckCircle2, AlertCircle, Store, Filter } from 'lucide-react';

export const KitchenPage = () => {
  const { 
    orders, toggleItemReady, completeOrder, markAllReady, 
    loading, processingItems, processingOrders, toast
  } = useKitchenController();

  const [filtroActivo, setFiltroActivo] = useState('todos');

  // ==========================================
  // PANTALLA DE CARGA ANIMADA
  // ==========================================
  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg">
        <motion.div
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-24 h-24 bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-800"
        >
          <Flame size={40} className="text-orange-500 lya:text-lya-primary" />
        </motion.div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">
          Cargando KDS Cocina
        </h2>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-orange-500 lya:text-lya-primary" /> Sincronizando comandas...
        </p>
      </div>
    );
  }

  // ==========================================
  // LÓGICA DE CATEGORIZACIÓN A PRUEBA DE FALLOS
  // ==========================================
  const getOrderCategory = (order) => {
    const rawMesa = String(order.mesa || '').toUpperCase();
    const rawTipo = String(order.tipo || '').toLowerCase();
    
    if (rawMesa.includes('MOSTRADOR') || rawMesa === 'S/N' || rawTipo === 'express') return 'mostrador';
    if (rawTipo === 'llevar' || rawMesa.includes('LLEVAR')) return 'llevar';
    return 'salon'; // Todo lo demás cae en salón por defecto
  };

  const filteredOrders = orders.filter(o => filtroActivo === 'todos' || getOrderCategory(o) === filtroActivo);

  const conteos = {
    todos: orders.length,
    salon: orders.filter(o => getOrderCategory(o) === 'salon').length,
    llevar: orders.filter(o => getOrderCategory(o) === 'llevar').length,
    mostrador: orders.filter(o => getOrderCategory(o) === 'mostrador').length,
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full flex flex-col bg-gray-50/50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-6 transition-colors duration-300 overflow-hidden relative"
    >
      {/* CÁPSULA DE NOTIFICACIÓN FLOTANTE */}
      <AnimatePresence>
        {toast?.show && (
          <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
            <motion.div 
              initial={{ opacity: 0, y: -50, scale: 0.9 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 font-bold border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 pointer-events-auto"
            >
              <div className={`p-1.5 rounded-full shrink-0 ${toast.type === 'error' ? 'bg-red-100 dark:bg-red-500/20 text-red-500' : 'bg-emerald-100 dark:bg-emerald-500/20 lya:bg-lya-primary/20'}`}>
                {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} className="text-emerald-500 lya:text-lya-primary" />}
              </div>
              <span className="text-sm">{toast.message}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HEADER PRINCIPAL */}
      <header className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4 mb-6 bg-white dark:bg-gray-900 lya:bg-lya-surface p-4 md:p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 relative z-10 shrink-0">
        <div className="flex items-center space-x-4">
          <div className="bg-orange-500/10 dark:bg-orange-500/20 lya:bg-lya-primary/10 p-3.5 rounded-2xl text-orange-500 lya:text-lya-primary border border-orange-500/20 lya:border-lya-primary/20">
            <Flame size={32} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text tracking-tight">
              KDS Cocina
            </h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-0.5">
              Sistema Inteligente de Despacho
            </p>
          </div>
        </div>
        
        {/* BOTONES DE FILTRO FLUIDOS */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={16} className="text-gray-400 mx-2 hidden sm:block" />
          
          <FilterButton 
            active={filtroActivo === 'todos'} 
            onClick={() => setFiltroActivo('todos')}
            label="Todas" 
            count={conteos.todos}
            colorClass="bg-gray-800 text-white dark:bg-white dark:text-gray-900"
            inactiveClass="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          />
          <FilterButton 
            active={filtroActivo === 'salon'} 
            onClick={() => setFiltroActivo('salon')}
            icon={UtensilsCrossed} label="Mesas" count={conteos.salon}
            colorClass="bg-emerald-500 text-white"
            inactiveClass="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
          />
          <FilterButton 
            active={filtroActivo === 'llevar'} 
            onClick={() => setFiltroActivo('llevar')}
            icon={ShoppingBag} label="Llevar" count={conteos.llevar}
            colorClass="bg-orange-500 text-white"
            inactiveClass="bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
          />
          <FilterButton 
            active={filtroActivo === 'mostrador'} 
            onClick={() => setFiltroActivo('mostrador')}
            icon={Store} label="Mostrador" count={conteos.mostrador}
            colorClass="bg-purple-500 text-white"
            inactiveClass="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400"
          />
        </div>
      </header>

      {/* GRID FLUIDO (MASONRY) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-1 pb-10">
        {filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 lya:text-lya-text/50 space-y-5"
          >
            <div className="p-8 rounded-full bg-white dark:bg-gray-900 lya:bg-lya-surface shadow-sm border border-gray-100 dark:border-gray-800">
              <CheckCircle2 size={72} className="opacity-40 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-600 dark:text-gray-300 lya:text-lya-text/80">
              {filtroActivo === 'todos' ? 'La cocina está al día' : `Sin órdenes en esta categoría`}
            </h2>
            <p className="text-lg font-medium">Esperando nuevas comandas...</p>
          </motion.div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 2xl:columns-4 gap-4 md:gap-6">
            <AnimatePresence>
              {filteredOrders.map(order => (
                <motion.div
                  key={order.id}
                  layout="position"
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="break-inside-avoid mb-4 md:mb-6"
                >
                  <KitchenOrderCard 
                    order={order} 
                    category={getOrderCategory(order)} // 🔥 Pasamos la categoría para los colores
                    onToggleItem={toggleItemReady} 
                    onComplete={completeOrder} 
                    onMarkAllReady={markAllReady}
                    processingItems={processingItems}
                    processingOrders={processingOrders}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Subcomponente para los botones de filtro
const FilterButton = ({ active, onClick, icon: Icon, label, count, colorClass, inactiveClass }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 py-2 px-4 text-sm font-bold rounded-xl transition-all border ${
      active 
        ? `${colorClass} shadow-md border-transparent scale-105` 
        : `${inactiveClass} border-gray-200 dark:border-gray-700/50 hover:scale-105`
    }`}
  >
    {Icon && <Icon size={16} />}
    <span className="hidden sm:inline">{label}</span>
    <span className={`px-2 py-0.5 rounded-lg text-xs ${active ? 'bg-black/20 dark:bg-white/20' : 'bg-white dark:bg-gray-800 shadow-sm'}`}>
      {count}
    </span>
  </button>
);