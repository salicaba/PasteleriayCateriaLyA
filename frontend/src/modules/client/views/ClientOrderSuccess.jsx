// src/modules/client/views/ClientOrderSuccess.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ShoppingBag, Eye, ArrowLeft, Utensils, ChevronRight, HelpCircle, ReceiptText, Check, PowerOff, Settings } from 'lucide-react';

export default function ClientOrderSuccess({ cart, totalCart, clientData, type, tableId, products, categories, getCategoryName, onReset, isQrActive, onOpenSettings }) {
  const [showReadOnlyMenu, setShowReadOnlyMenu] = useState(false);

  // Obtenemos solo el primer nombre para un trato más cercano
  const primerNombre = clientData?.name?.split(' ')[0] || 'Cliente';

  // --- VISTA: Menú Solo Lectura ---
  if (showReadOnlyMenu) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 15 }}
        className="flex-1 flex flex-col w-full h-full pb-10"
      >
        <header className="px-6 pt-6 pb-4 sticky top-0 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg border-b border-gray-200 dark:border-gray-800 lya:border-lya-border/40 transition-colors z-30 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowReadOnlyMenu(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 lya:bg-lya-surface border border-gray-200 dark:border-gray-700 lya:border-lya-border shadow-sm text-gray-600 dark:text-gray-300 lya:text-lya-text active:scale-90 transition-transform md:hover:bg-gray-100 dark:md:hover:bg-gray-700"
            >
              <ArrowLeft size={20} strokeWidth={2.5} />
            </button>
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text leading-tight">Menú de Consulta</h3>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 lya:text-lya-text/50 uppercase tracking-wider mt-0.5">Modo Solo Lectura</p>
            </div>
          </div>

          {/* 🔥 BOTÓN DE AJUSTES EN MODO SOLO LECTURA */}
          <button 
            onClick={onOpenSettings} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 lya:bg-lya-surface border border-gray-200 dark:border-gray-700 lya:border-lya-border shadow-sm text-gray-600 dark:text-gray-300 lya:text-lya-text active:scale-90 transition-transform md:hover:bg-gray-100 dark:md:hover:bg-gray-700"
          >
             <Settings size={20} strokeWidth={2.5} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
          {products.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-medium text-sm">No hay productos disponibles para mostrar.</div>
          ) : (
            products.map(product => {
              const hasImage = product.imagen && !product.imagen.includes('default-product');
              return (
                <div key={product.id} className="flex items-center gap-4 p-3 rounded-[2rem] bg-white dark:bg-gray-800 lya:bg-lya-surface border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 shadow-sm">
                  <div className="w-20 h-20 shrink-0 rounded-[1.25rem] overflow-hidden bg-gray-100 dark:bg-gray-900 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 flex items-center justify-center shadow-inner">
                    {hasImage ? <img src={product.imagen} alt={product.nombre} className="w-full h-full object-cover" /> : <span className="text-2xl opacity-30">🍽️</span>}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-orange-500 dark:text-orange-400 lya:text-lya-secondary block truncate mb-0.5">
                      {getCategoryName(product.categoria)}
                    </span>
                    <h4 className="font-extrabold text-base text-gray-900 dark:text-white lya:text-lya-text leading-tight truncate">
                      {product.nombre}
                    </h4>
                    <span className="font-black text-base text-gray-900 dark:text-white lya:text-lya-text tracking-tight mt-1.5 block">
                      ${product.precio}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="fixed bottom-6 left-0 right-0 px-6 z-40 max-w-md mx-auto">
          <button 
            onClick={() => setShowReadOnlyMenu(false)}
            className="w-full py-4 rounded-2xl font-black bg-gray-900 md:hover:bg-gray-800 dark:bg-white dark:md:hover:bg-gray-100 lya:bg-lya-text text-white dark:text-gray-900 lya:text-lya-bg shadow-xl active:scale-95 transition-transform text-sm uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <ReceiptText size={18} strokeWidth={2.5} /> <span>Volver a mi Nota</span>
          </button>
        </div>
      </motion.div>
    );
  }

  // --- VISTA: Resumen de Éxito (ESTILO BILLETERA DIGITAL PREMIUM) ---
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      className="flex-1 flex flex-col items-center justify-start p-6 text-center space-y-7 w-full max-w-sm mx-auto overflow-y-auto custom-scrollbar pt-12 pb-12 relative"
    >
      
      {/* 🔥 BOTÓN DE AJUSTES FLOTANTE EN EL TICKET */}
      <motion.button 
        whileTap={{ scale: 0.95 }} 
        onClick={onOpenSettings}
        className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 lya:bg-lya-surface border border-gray-200 dark:border-gray-700 lya:border-lya-border shadow-sm text-gray-600 dark:text-gray-300 lya:text-lya-text md:hover:bg-gray-100 dark:md:hover:bg-gray-700 transition-colors z-50"
      >
        <Settings size={20} strokeWidth={2.5} />
      </motion.button>

      {/* Icono de Éxito Animado (Spring + Latido + Glow) */}
      <div className="relative mb-4 mt-2">
        {/* Resplandor de fondo latiendo */}
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="absolute inset-0 bg-green-500 rounded-full blur-2xl z-0"
        />
        
        {/* Contenedor del icono con entrada tipo resorte */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="relative z-10 w-24 h-24 mx-auto bg-gradient-to-tr from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-xl border-4 border-white dark:border-gray-900 lya:border-lya-bg"
        >
          {/* El check late ligeramente */}
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
          >
            <Check size={48} strokeWidth={4} className="text-white drop-shadow-md" />
          </motion.div>
        </motion.div>
      </div>

      <div className="space-y-1.5">
        <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white lya:text-lya-text leading-none">
          ¡Listo, {primerNombre}!
        </h2>
        <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/70 px-4">
          Tu orden está siendo preparada en cocina con mucho amor.
        </p>
      </div>

      {/* Tarjeta Minimalista tipo Apple Pay / Fintech */}
      <div className="w-full bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2.5rem] p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border border-gray-100 dark:border-gray-700/80 lya:border-lya-border/40 relative overflow-hidden shrink-0">
        
        {/* Barra de color superior */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-400 to-orange-600 lya:from-lya-primary lya:to-lya-secondary" />

        {/* Encabezado del Recibo */}
        <div className="flex justify-between items-end border-b border-gray-100 dark:border-gray-700/50 lya:border-lya-border/20 pb-4 mb-4 mt-2">
          <div className="text-left flex flex-col gap-1">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-gray-400 dark:text-gray-500 lya:text-lya-text/40">
              Comprobante
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-white lya:text-lya-text capitalize">
              {clientData?.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/30 text-[11px] font-bold text-gray-700 dark:text-gray-300 lya:text-lya-text">
            {type === 'mesa' ? <Utensils size={14} className="text-orange-500" /> : <ShoppingBag size={14} className="text-orange-500" />}
            <span>{type === 'mesa' ? `Mesa ${tableId}` : 'Llevar'}</span>
          </div>
        </div>

        {/* Lista de Productos */}
        <div className="space-y-4 max-h-[25vh] overflow-y-auto custom-scrollbar pr-2">
          {cart.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start text-sm font-medium text-gray-800 dark:text-gray-200 lya:text-lya-text pb-4 border-b border-gray-50 dark:border-gray-700/30 lya:border-lya-border/10 last:border-0 last:pb-0">
              
              <div className="flex-1 pr-3 min-w-0 flex items-start gap-2.5">
                <span className="text-xs font-black text-orange-500 dark:text-orange-400 lya:text-lya-secondary bg-orange-50 dark:bg-orange-500/10 lya:bg-lya-secondary/10 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                  x{item.qty}
                </span>
                
                <div className="flex-1 min-w-0 text-left">
                  <span className="font-bold block text-gray-900 dark:text-white lya:text-lya-text leading-tight">
                    {item.nombre}
                  </span>
                  
                  {item.detalles && (
                    <div className="text-[10px] opacity-70 mt-1 leading-snug font-semibold text-gray-500 dark:text-gray-400">
                      {item.detalles.tamano && <span>{item.detalles.tamano}</span>}
                      {item.detalles.leche && <span> • {item.detalles.leche}</span>}
                      {item.detalles.extras && item.detalles.extras.length > 0 && <span> • +{item.detalles.extras.join(', ')}</span>}
                      {item.isTakeaway && <span className="block text-orange-500 dark:text-orange-400 lya:text-lya-secondary font-bold mt-1">Empaque P/Llevar</span>}
                    </div>
                  )}
                  
                  {/* Etiqueta de Precio Unitario */}
                  {item.qty > 1 && (
                    <span className="inline-block mt-1.5 text-[9px] font-extrabold text-gray-400 dark:text-gray-500 lya:text-lya-text/40 tracking-wide uppercase">
                      Precio Unitario: ${item.precioUnitario.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              
              <span className="font-black text-[15px] shrink-0 text-gray-900 dark:text-white lya:text-lya-text">
                ${(item.precioUnitario * item.qty).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Zona del Total */}
        <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700 lya:border-lya-border/40 flex flex-col items-center justify-center gap-1">
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-gray-400 dark:text-gray-500 lya:text-lya-text/50">
            Total a Pagar
          </span>
          <span className="text-4xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tighter">
            ${totalCart.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 🔥 Mensaje Importante: Dudas y Cuenta (Centrado según la regla para notificaciones) */}
      <div className="w-full text-xs font-semibold text-gray-600 dark:text-gray-300 lya:text-lya-text bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg/50 px-5 py-4 rounded-[1.5rem] border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 shadow-sm shrink-0 text-center">
        <p className="flex items-center justify-center gap-2 mb-1.5 text-gray-900 dark:text-white font-black text-sm">
          <span className="text-orange-500 lya:text-lya-secondary">🛎️</span> ¿Necesitas tu cuenta?
        </p>
        <p className="leading-relaxed opacity-80 text-[11.5px] text-justify">
          Para solicitar tu cuenta final, realizar modificaciones al pedido o resolver cualquier duda, <b>por favor solicita asistencia a nuestro personal</b>.
        </p>
      </div>

      {/* Botones de Acción Posterior */}
      <div className="w-full space-y-4 shrink-0 pt-1">
        
        {/* 🔥 KILL-SWITCH: Evaluamos si mostrar el botón o el mensaje de pausado */}
        {isQrActive ? (
          <div className="space-y-2">
            <button 
              onClick={onReset} 
              className="w-full py-4 rounded-2xl font-black text-sm bg-gray-900 md:hover:bg-gray-800 dark:bg-white dark:md:hover:bg-gray-100 lya:bg-lya-text text-white dark:text-gray-900 lya:text-lya-surface shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>Quiero pedir algo más</span>
              <ChevronRight size={16} strokeWidth={3} />
            </button>
            <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 lya:text-lya-text/50 text-center px-4">
              Puedes seguir agregando bebidas o postres a tu cuenta de forma autónoma.
            </p>
          </div>
        ) : (
          <div className="w-full bg-gray-200/50 dark:bg-gray-800/50 lya:bg-lya-bg/50 p-5 rounded-[1.5rem] border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 shrink-0 text-center">
             <p className="flex items-center justify-center gap-2 mb-2 text-gray-500 dark:text-gray-400 lya:text-lya-text/50 font-black text-sm">
               <PowerOff size={16} strokeWidth={2.5} /> Servicio Pausado
             </p>
             <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-[11.5px] font-medium leading-relaxed px-2 text-justify">
               Los pedidos digitales se han apagado temporalmente. Si deseas ordenar algo más, por favor habla directamente con nuestro personal en mostrador o en tu mesa.
             </p>
          </div>
        )}

        <div className="border-t border-gray-200 dark:border-gray-800 lya:border-lya-border/30 w-3/4 mx-auto my-4"></div>

        {/* Botón Secundario: Solo lectura */}
        <div className="space-y-2">
          <button 
            onClick={() => setShowReadOnlyMenu(true)} 
            className="w-full py-3.5 rounded-2xl font-bold text-sm bg-white dark:bg-gray-800 lya:bg-white text-gray-600 dark:text-gray-300 lya:text-lya-text border border-gray-200 dark:border-gray-700 lya:border-lya-border shadow-sm md:hover:bg-gray-50 dark:md:hover:bg-gray-700/50 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Eye size={16} strokeWidth={2.5} />
            <span>Ver menú solo de lectura</span>
          </button>
          <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 lya:text-lya-text/50 text-center px-2">
            Si prefieres, revisa el catálogo aquí y pídele a un empleado que tome tu nueva orden.
          </p>
        </div>

      </div>
    </motion.div>
  );
}