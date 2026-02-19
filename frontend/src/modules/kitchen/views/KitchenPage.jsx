import React from 'react';
import { useKitchenController } from '../controllers/useKitchenController';
import { KitchenOrderCard } from './KitchenOrderCard';
import { ChefHat, RefreshCw } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

export const KitchenPage = () => {
  const { orders, completeOrder } = useKitchenController();

  return (
    // CAMBIO: Fondo gris claro en Light, Gris 900 (Casi negro) en Dark
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col transition-colors duration-300">
      
      {/* Header KDS */}
      {/* CAMBIO: El header se mantiene oscuro por identidad, pero ajustamos el borde y sombra para Dark Mode */}
      <header className="bg-gray-900 dark:bg-gray-800 text-white p-4 shadow-lg dark:shadow-gray-950/50 sticky top-0 z-10 transition-colors border-b border-transparent dark:border-gray-700">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-primary rounded-lg shadow-lg shadow-brand-primary/20">
              <ChefHat className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-xl leading-none tracking-tight">Cocina LyA</h1>
              <span className="text-xs text-gray-400 font-medium">Sistema de Comandas (KDS)</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex gap-4 text-sm font-medium">
              <span className="px-3 py-1 bg-gray-800 dark:bg-gray-700 rounded-full text-orange-400 border border-orange-400/20 transition-colors">
                Pendientes: {orders.length}
              </span>
            </div>
            <button className="p-2 hover:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition-colors">
              <RefreshCw size={20} className="text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Grid de Comandas */}
      <main className="flex-1 p-4 md:p-6 overflow-x-auto">
        {orders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 transition-colors">
            <ChefHat size={64} className="mb-4 opacity-20" />
            <p className="text-xl font-medium">Todo limpio por ahora, Chef.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 items-start content-start">
            <AnimatePresence>
              {orders.map(order => (
                <KitchenOrderCard 
                  key={order.id} 
                  order={order} 
                  onComplete={completeOrder} 
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};