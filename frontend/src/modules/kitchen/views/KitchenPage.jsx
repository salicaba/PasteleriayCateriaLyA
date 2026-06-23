// src/modules/kitchen/views/KitchenPage.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKitchenController } from '../controllers/useKitchenController';
import { KitchenOrderCard } from './KitchenOrderCard';
import { Flame, UtensilsCrossed, ShoppingBag, Loader2 } from 'lucide-react';

export const KitchenPage = () => {
  const { 
    orders, toggleItemReady, completeOrder, markAllReady, 
    loading, processingItems, processingOrders 
  } = useKitchenController();

  const [vistaMovilActiva, setVistaMovilActiva] = useState('salon');

  // ==========================================
  // PANTALLA DE CARGA ANIMADA NEO-BENTO
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

  const ordersMesa = orders.filter(o => o.tipo !== 'llevar');
  const ordersLlevar = orders.filter(o => o.tipo === 'llevar');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-6 transition-colors duration-300 overflow-hidden"
    >
      
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4 md:mb-6 bg-white dark:bg-gray-900 lya:bg-lya-surface p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 relative z-10 shrink-0">
        <div className="flex items-center space-x-4">
          <div className="bg-orange-500/10 dark:bg-orange-500/20 lya:bg-lya-primary/10 p-3.5 rounded-xl text-orange-500 lya:text-lya-primary border border-orange-500/20 lya:border-lya-primary/20">
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
        
        <div className="flex items-center">
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 text-gray-600 dark:text-gray-300 lya:text-lya-text px-5 py-2.5 rounded-xl font-bold shadow-sm">
            <span>{orders.length} Órdenes Activas</span>
          </div>
        </div>
      </header>

      {orders.length > 0 && (
        <div className="md:hidden flex bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/20 p-1.5 rounded-xl mb-4 shrink-0">
          <button
            onClick={() => setVistaMovilActiva('salon')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
              vistaMovilActiva === 'salon' 
                ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-primary shadow' 
                : 'text-gray-500 dark:text-gray-400 lya:text-lya-text/60'
            }`}
          >
            <UtensilsCrossed size={16} />
            Salón ({ordersMesa.length})
          </button>
          <button
            onClick={() => setVistaMovilActiva('llevar')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
              vistaMovilActiva === 'llevar' 
                ? 'bg-orange-500 lya:bg-lya-primary text-white lya:text-lya-surface shadow' 
                : 'text-gray-500 dark:text-gray-400 lya:text-lya-text/60'
            }`}
          >
            <ShoppingBag size={16} />
            Para Llevar ({ordersLlevar.length})
          </button>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 lya:text-lya-text/50 space-y-5"
          >
            <div className="p-8 rounded-full bg-gray-100 dark:bg-gray-900 lya:bg-lya-surface lya:border lya:border-lya-border/30">
              <UtensilsCrossed size={72} className="opacity-40" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-600 dark:text-gray-300 lya:text-lya-text/80">La cocina está al día</h2>
            <p className="text-lg font-medium">Esperando nuevas tandas de comandas...</p>
          </motion.div>
        ) : (
          <div className="h-full flex flex-col md:flex-row gap-6">
            
            <div className={`flex-1 flex flex-col bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-2xl border border-gray-200 dark:border-gray-800 lya:border-lya-border/30 shadow-sm overflow-hidden ${
              vistaMovilActiva === 'salon' ? 'flex' : 'hidden md:flex'
            }`}>
              <div className="bg-emerald-50 dark:bg-emerald-900/10 lya:bg-lya-secondary/10 border-b border-emerald-100 dark:border-emerald-900/20 lya:border-lya-secondary/20 p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed size={20} className="text-emerald-600 dark:text-emerald-400 lya:text-lya-secondary" />
                  <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-300 lya:text-lya-secondary">Mesas (Local)</h2>
                </div>
                <span className="bg-emerald-500 lya:bg-lya-secondary text-white lya:text-lya-surface text-[10px] uppercase px-2.5 py-1 rounded-full font-black tracking-wider animate-pulse">
                  Prioridad
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-gray-50/50 dark:bg-transparent lya:bg-lya-bg/30">
                {ordersMesa.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 lya:text-lya-text/50 text-sm font-medium">Sin comandas de salón</div>
                ) : (
                  <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start auto-rows-max">
                    <AnimatePresence mode="popLayout">
                      {ordersMesa.map(order => (
                        <motion.div
                          key={order.id}
                          layout
                          initial={{ opacity: 0, scale: 0.8, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                          transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        >
                          <KitchenOrderCard 
                            order={order} 
                            onToggleItem={toggleItemReady} 
                            onComplete={completeOrder} 
                            onMarkAllReady={markAllReady}
                            processingItems={processingItems}
                            processingOrders={processingOrders}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
            </div>

            <div className={`flex-1 flex flex-col bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-2xl border border-gray-200 dark:border-gray-800 lya:border-lya-border/30 shadow-sm overflow-hidden ${
              vistaMovilActiva === 'llevar' ? 'flex' : 'hidden md:flex'
            }`}>
              <div className="bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg/50 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={20} className="text-gray-500 dark:text-gray-400 lya:text-lya-text/70" />
                  <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300 lya:text-lya-text">Para Llevar / Pick-up</h2>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-gray-50/50 dark:bg-transparent lya:bg-lya-bg/30">
                {ordersLlevar.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 lya:text-lya-text/50 text-sm font-medium">Sin pedidos para llevar</div>
                ) : (
                  <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start auto-rows-max">
                    <AnimatePresence mode="popLayout">
                      {ordersLlevar.map(order => (
                        <motion.div
                          key={order.id}
                          layout
                          initial={{ opacity: 0, scale: 0.8, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                          transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        >
                          <KitchenOrderCard 
                            order={order} 
                            onToggleItem={toggleItemReady} 
                            onComplete={completeOrder} 
                            onMarkAllReady={markAllReady}
                            processingItems={processingItems}
                            processingOrders={processingOrders}
                          />
                        </motion.div>
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