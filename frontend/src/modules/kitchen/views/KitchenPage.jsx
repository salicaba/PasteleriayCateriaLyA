import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKitchenController } from '../controllers/useKitchenController';
import { KitchenOrderCard } from './KitchenOrderCard';
import { Flame, UtensilsCrossed } from 'lucide-react';

export const KitchenPage = () => {
  const { orders, toggleItemReady, completeOrder } = useKitchenController();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6 flex flex-col transition-colors duration-300">
      {/* Header Premium */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 relative z-10">
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
          <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-5 py-2.5 rounded-xl font-bold shadow-sm">
            <UtensilsCrossed size={20} />
            <span>{orders.length} Órdenes Activas</span>
          </div>
        </div>
      </header>

      {/* Grid de Tickets con Animaciones */}
      <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
        {orders.length === 0 ? (
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
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start auto-rows-max"
          >
            <AnimatePresence mode="popLayout">
              {orders.map(order => (
                <KitchenOrderCard
                  key={order.id}
                  order={order}
                  onToggleItem={toggleItemReady}
                  onComplete={completeOrder}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};