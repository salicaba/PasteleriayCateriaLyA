import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKitchenController } from '../controllers/useKitchenController';
import { KitchenOrderCard } from './KitchenOrderCard';
import { Flame, UtensilsCrossed, ShoppingBag } from 'lucide-react';

export const KitchenPage = () => {
  const { orders, toggleItemReady, completeOrder } = useKitchenController();

  // Estado para controlar qué vista se muestra en móviles
  const [vistaMovilActiva, setVistaMovilActiva] = useState('salon');

  // Separar órdenes por tipo
  const ordersMesa = orders.filter(o => o.tipo !== 'llevar');
  const ordersLlevar = orders.filter(o => o.tipo === 'llevar');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 p-4 md:p-6 transition-colors duration-300 overflow-hidden"
    >
      
      {/* HEADER FIJO */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4 md:mb-6 bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 relative z-10 shrink-0">
        <div className="flex items-center space-x-4">
          <div className="bg-orange-500/10 dark:bg-orange-500/20 p-3.5 rounded-xl text-orange-500 border border-orange-500/20">
            <Flame size={32} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">
              KDS Cocina <span className="text-orange-500">LyA</span>
            </h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">
              Pijijiapan, Chis. — Sistema Inteligente de Despacho
            </p>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-5 py-2.5 rounded-xl font-bold shadow-sm">
            <span>{orders.length} Órdenes Activas</span>
          </div>
        </div>
      </header>

      {/* BOTONES DE NAVEGACIÓN (SÓLO MÓVIL) */}
      {orders.length > 0 && (
        <div className="md:hidden flex bg-gray-200 dark:bg-gray-800 p-1.5 rounded-xl mb-4 shrink-0">
          <button
            onClick={() => setVistaMovilActiva('salon')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
              vistaMovilActiva === 'salon' 
                ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <UtensilsCrossed size={16} />
            Salón ({ordersMesa.length})
          </button>
          <button
            onClick={() => setVistaMovilActiva('llevar')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
              vistaMovilActiva === 'llevar' 
                ? 'bg-orange-500 text-white shadow' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <ShoppingBag size={16} />
            Para Llevar ({ordersLlevar.length})
          </button>
        </div>
      )}

      {/* ÁREA DE CONTENIDO */}
      <div className="flex-1 overflow-hidden">
        {orders.length === 0 ? (
          // ESTADO VACÍO
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 space-y-5"
          >
            <div className="p-8 rounded-full bg-gray-100 dark:bg-gray-900">
              <UtensilsCrossed size={72} className="opacity-40" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-600 dark:text-gray-300">La cocina está al día</h2>
            <p className="text-lg font-medium">Esperando nuevas tandas de comandas...</p>
          </motion.div>
        ) : (
          // VISTA DIVIDIDA (DESKTOP) / ALTERNADA (MÓVIL)
          <div className="h-full flex flex-col md:flex-row gap-6">
            
            {/* ---------------- COLUMNA 1: SALÓN ---------------- */}
            <div className={`flex-1 flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden ${
              vistaMovilActiva === 'salon' ? 'flex' : 'hidden md:flex'
            }`}>
              {/* Header de Columna Salón */}
              <div className="bg-emerald-50 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-900/20 p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed size={20} className="text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-300">Mesas (Local)</h2>
                </div>
                {/* LA PRIORIDAD AHORA ESTÁ AQUÍ */}
                <span className="bg-emerald-500 text-white text-[10px] uppercase px-2.5 py-1 rounded-full font-black tracking-wider animate-pulse">
                  Prioridad
                </span>
              </div>
              
              {/* Lista Scrollable de Salón */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-gray-50/50 dark:bg-transparent">
                {ordersMesa.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm font-medium">Sin comandas de salón</div>
                ) : (
                  <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start auto-rows-max">
                    <AnimatePresence mode="popLayout">
                      {ordersMesa.map(order => (
                        <KitchenOrderCard key={order.id} order={order} onToggleItem={toggleItemReady} onComplete={completeOrder} />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
            </div>

            {/* ---------------- COLUMNA 2: PARA LLEVAR ---------------- */}
            <div className={`flex-1 flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden ${
              vistaMovilActiva === 'llevar' ? 'flex' : 'hidden md:flex'
            }`}>
              {/* Header de Columna Para Llevar */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={20} className="text-gray-500 dark:text-gray-400" />
                  <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300">Para Llevar / Pick-up</h2>
                </div>
              </div>
              
              {/* Lista Scrollable Para Llevar */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-gray-50/50 dark:bg-transparent">
                {ordersLlevar.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm font-medium">Sin pedidos para llevar</div>
                ) : (
                  <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start auto-rows-max">
                    <AnimatePresence mode="popLayout">
                      {ordersLlevar.map(order => (
                        <KitchenOrderCard key={order.id} order={order} onToggleItem={toggleItemReady} onComplete={completeOrder} />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </motion.div>
  );
};