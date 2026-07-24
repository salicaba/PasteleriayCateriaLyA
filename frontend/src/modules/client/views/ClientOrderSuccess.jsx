// src/modules/client/views/ClientOrderSuccess.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, ShoppingBag, Eye, ArrowLeft, Utensils, ChevronRight, ReceiptText, Check, PowerOff, Settings, Phone, Gift } from 'lucide-react';

export default function ClientOrderSuccess({ cart, totalCart, clientData, type, tableId, products, categories, getCategoryName, onReset, isQrActive, onOpenSettings, isOrderPaid }) {
  const [showReadOnlyMenu, setShowReadOnlyMenu] = useState(false);

  // 🔥 PARSER DEL NOMBRE Y TELÉFONO PARA EL TICKET
  const parsedNameData = clientData?.name || 'Cliente';
  let displayName = parsedNameData;
  let displayPhone = null;

  if (parsedNameData.includes(' | ')) {
    [displayName, displayPhone] = parsedNameData.split(' | ');
  } else if (parsedNameData.includes(' - ')) {
    [displayName, displayPhone] = parsedNameData.split(' - ');
  }
  
  displayName = displayName.trim();
  if (displayPhone) displayPhone = displayPhone.trim();

  // Obtenemos solo el primer nombre para un trato más cercano
  const primerNombre = displayName.split(' ')[0] || 'Cliente';

  // --- VISTA: Menú Solo Lectura ---
  if (showReadOnlyMenu) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 15 }}
        className="flex-1 flex flex-col w-full h-full pb-10"
      >
        <header className="px-6 pt-6 pb-4 sticky top-0 bg-gray-50 dark:bg-gray-900 lya:bg-[#FAF6F0] border-b border-gray-200 dark:border-gray-800 lya:border-[#EADCC9] transition-colors z-30 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowReadOnlyMenu(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] shadow-sm text-gray-600 dark:text-gray-300 lya:text-[#7A6353] outline-none md:hover:bg-gray-100 dark:md:hover:bg-gray-700"
            >
              <ArrowLeft size={20} strokeWidth={2.5} />
            </motion.button>
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white lya:text-[#3E2723] leading-tight">Menú de Consulta</h3>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 lya:text-[#7A6353] uppercase tracking-wider mt-0.5">Modo Solo Lectura</p>
            </div>
          </div>

          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={onOpenSettings} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] shadow-sm text-gray-600 dark:text-gray-300 lya:text-[#7A6353] outline-none md:hover:bg-gray-100 dark:md:hover:bg-gray-700"
          >
             <Settings size={20} strokeWidth={2.5} />
          </motion.button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
          {products.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-medium text-sm">No hay productos disponibles para mostrar.</div>
          ) : (
            products.map(product => {
              const hasImage = product.imagen && !product.imagen.includes('default-product');
              return (
                <div key={product.id} className="flex items-center gap-4 p-3 rounded-[2rem] bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] shadow-sm">
                  <div className="w-20 h-20 shrink-0 rounded-[1.25rem] overflow-hidden bg-gray-100 dark:bg-gray-900 lya:bg-[#EADCC9] border border-gray-200 dark:border-gray-700 lya:border-[#D9C4A9] flex items-center justify-center shadow-inner pointer-events-none">
                    {hasImage ? <img src={product.imagen} alt={product.nombre} className="w-full h-full object-cover" /> : <span className="text-2xl opacity-30">🍽️</span>}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-orange-500 dark:text-orange-400 lya:text-[#78350F] block truncate mb-0.5 text-left">
                      {getCategoryName(product.categoria)}
                    </span>
                    <h4 className="font-extrabold text-base text-gray-900 dark:text-white lya:text-[#3E2723] leading-tight truncate text-left">
                      {product.nombre}
                    </h4>
                    <span className="font-black text-base text-gray-900 dark:text-white lya:text-[#5D4037] tracking-tight mt-1.5 block text-left">
                      ${product.precio}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="fixed bottom-6 left-0 right-0 px-6 z-40 max-w-md mx-auto">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowReadOnlyMenu(false)}
            className="w-full py-4 rounded-2xl font-black bg-gray-900 md:hover:bg-gray-800 dark:bg-white dark:md:hover:bg-gray-100 lya:bg-[#78350F] text-white dark:text-gray-900 lya:text-white shadow-xl outline-none transition-transform text-sm uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <ReceiptText size={18} strokeWidth={2.5} /> <span>Volver a mi Nota</span>
          </motion.button>
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
      
      {/* BOTÓN DE AJUSTES FLOTANTE EN EL TICKET */}
      <motion.button 
        whileTap={{ scale: 0.95 }} 
        onClick={onOpenSettings}
        className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] shadow-sm text-gray-600 dark:text-gray-300 lya:text-[#7A6353] md:hover:bg-gray-100 dark:md:hover:bg-gray-700 transition-colors z-50 outline-none"
      >
        <Settings size={20} strokeWidth={2.5} />
      </motion.button>

      {/* Icono de Éxito Animado (Spring + Latido + Glow) */}
      <div className="relative mb-4 mt-2">
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="absolute inset-0 bg-green-500 rounded-full blur-2xl z-0"
        />
        
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="relative z-10 w-24 h-24 mx-auto bg-gradient-to-tr from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-xl border-4 border-white dark:border-gray-900 lya:border-[#FAF6F0]"
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
          >
            <Check size={48} strokeWidth={4} className="text-white drop-shadow-md" />
          </motion.div>
        </motion.div>
      </div>

      <div className="space-y-1.5">
        <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white lya:text-[#3E2723] leading-none text-center">
          ¡Listo, {primerNombre}!
        </h2>
        <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 lya:text-[#7A6353] px-4 text-center">
          Tu orden está siendo preparada en cocina con mucho amor.
        </p>
      </div>

      {/* Tarjeta Minimalista tipo Apple Pay / Fintech */}
      <div className="w-full bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] rounded-[2.5rem] p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border border-gray-100 dark:border-gray-700/80 lya:border-[#EADCC9] relative overflow-hidden shrink-0">
        
        {/* Barra de color superior */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-400 to-orange-600 lya:from-[#78350F] lya:to-orange-500" />

        {/* 🔥 SELLO GIGANTE DE MARCA DE AGUA */}
        <AnimatePresence>
          {isOrderPaid && (
            <motion.div 
              initial={{ scale: 2, opacity: 0, rotate: -25 }} 
              animate={{ scale: 1, opacity: 1, rotate: -25 }} 
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center overflow-hidden"
            >
              <div className="border-[6px] border-emerald-500/30 text-emerald-500/30 dark:border-emerald-400/20 dark:text-emerald-400/20 font-black text-5xl sm:text-6xl uppercase tracking-widest px-8 py-3 rounded-[2rem] backdrop-blur-[1.5px] select-none">
                PAGADA
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Encabezado del Recibo */}
        <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700/50 lya:border-[#EADCC9]/50 pb-4 mb-4 mt-2 relative z-10">
          <div className="text-left flex flex-col gap-1">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-gray-400 dark:text-gray-500 lya:text-[#7A6353]/70">
              Comprobante
            </span>
            <div className="flex flex-col">
               <span className="text-sm font-bold text-gray-900 dark:text-white lya:text-[#3E2723] capitalize">
                 {displayName}
               </span>
               {displayPhone && (
                 <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                   <Phone size={10} /> {displayPhone}
                 </span>
               )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 items-end">
             <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 lya:bg-white rounded-xl border border-gray-100 dark:border-gray-700 lya:border-[#EADCC9] text-[11px] font-bold text-gray-700 dark:text-gray-300 lya:text-[#3E2723]">
               {type === 'mesa' ? <Utensils size={14} className="text-orange-500 lya:text-[#78350F]" /> : <ShoppingBag size={14} className="text-orange-500 lya:text-[#78350F]" />}
               <span>{type === 'mesa' ? `Mesa ${tableId}` : 'Llevar'}</span>
             </div>
          </div>
        </div>

        {/* Lista de Productos BLINDADA ANTI-AMNESIA */}
        <div className="space-y-4 max-h-[25vh] overflow-y-auto custom-scrollbar pr-2 relative z-10">
          {cart.map((item, idx) => {
            const isGhost = item.isAutoPromo && item.precioUnitario === 0;

            return (
              <div key={idx} className="flex justify-between items-start text-sm font-medium text-gray-800 dark:text-gray-200 lya:text-[#3E2723] pb-4 border-b border-gray-50 dark:border-gray-700/30 lya:border-[#EADCC9]/50 last:border-0 last:pb-0">
                
                <div className="flex-1 pr-3 min-w-0 flex items-start gap-2.5">
                  {isGhost ? (
                     <div className="flex flex-col items-center justify-center bg-orange-50 dark:bg-orange-900/20 lya:bg-[#EADCC9]/50 rounded-lg px-2 py-1 shrink-0 border border-orange-100 dark:border-orange-800/30 lya:border-[#EADCC9] mt-0.5">
                       <Gift size={14} className="text-orange-500 lya:text-[#78350F] mb-0.5" />
                       <span className="font-black text-center text-[10px] text-orange-600 dark:text-orange-400 lya:text-[#78350F] tracking-wider">x{item.qty}</span>
                     </div>
                  ) : (
                     <span className="text-xs font-black text-orange-500 dark:text-orange-400 lya:text-[#78350F] bg-orange-50 dark:bg-orange-500/10 lya:bg-[#EADCC9]/50 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                       x{item.qty}
                     </span>
                  )}
                  
                  <div className="flex-1 min-w-0 text-left">
                    <span className="font-bold block text-gray-900 dark:text-white lya:text-[#3E2723] leading-tight">
                      {item.nombre}
                    </span>
                    
                    {item.detalles && !isGhost && (
                      <div className="text-[10px] opacity-70 mt-1 leading-snug font-semibold text-gray-500 dark:text-gray-400 lya:text-[#7A6353]">
                        {item.detalles.tamano && <span>{item.detalles.tamano}</span>}
                        {item.detalles.leche && <span> • {item.detalles.leche}</span>}
                        {item.detalles.extras && item.detalles.extras.length > 0 && <span> • +{item.detalles.extras.join(', ')}</span>}
                        {item.isTakeaway && <span className="block text-orange-500 dark:text-orange-400 lya:text-[#78350F] font-bold mt-1">Empaque P/Llevar</span>}
                      </div>
                    )}
                    
                    {/* MEMORIA VISUAL ANTI-AMNESIA EN RECIBO */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {item.promoLabel && (
                        <span className="bg-orange-100 dark:bg-orange-900/30 lya:bg-[#EADCC9] text-orange-600 dark:text-orange-400 lya:text-[#78350F] px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase shrink-0 border border-orange-200 dark:border-orange-800/30 lya:border-transparent">
                          {item.promoLabel}
                        </span>
                      )}
                      
                      {item.qty > 1 && !isGhost && (
                        <span className="inline-block text-[9px] font-extrabold text-gray-400 dark:text-gray-500 lya:text-[#7A6353] tracking-wide uppercase">
                          Unit: ${item.precioUnitario.toFixed(2)}
                        </span>
                      )}
                      
                      {item.precioOriginal && !isGhost && (
                        <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 lya:text-[#7A6353] line-through shrink-0">
                          Normal: ${(item.precioOriginal).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end shrink-0">
                  <span className="font-black text-[15px] text-gray-900 dark:text-white lya:text-[#3E2723]">
                    ${(item.precioUnitario * item.qty).toFixed(2)}
                  </span>
                  {item.precioOriginal && item.qty > 1 && !isGhost && (
                     <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 lya:text-[#7A6353] line-through mt-0.5">
                       ${(item.precioOriginal * item.qty).toFixed(2)}
                     </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Zona del Total */}
        <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] flex flex-col items-center justify-center gap-1 relative z-10">
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-gray-400 dark:text-gray-500 lya:text-[#7A6353]/80">
            Total a Pagar
          </span>
          <span className="text-4xl font-black text-gray-900 dark:text-white lya:text-[#3E2723] tracking-tighter">
            ${totalCart.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Mensaje Informativo Común */}
      <div className="w-full text-xs font-semibold text-gray-600 dark:text-gray-300 lya:text-[#7A6353] bg-gray-100 dark:bg-gray-800 lya:bg-white px-5 py-4 rounded-[1.5rem] border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] shadow-sm shrink-0 text-center">
        <p className="flex items-center justify-center gap-2 mb-1.5 text-gray-900 dark:text-white lya:text-[#3E2723] font-black text-sm">
          <span className="text-orange-500">🛎️</span> ¿Necesitas tu cuenta?
        </p>
        <p className="leading-relaxed opacity-80 text-[11.5px] text-justify">
          Para solicitar tu cuenta final, realizar modificaciones al pedido o resolver cualquier duda, <b>por favor solicita asistencia a nuestro personal</b>.
        </p>
      </div>

      {/* Botones de Acción / Modos Restringidos */}
      <div className="w-full space-y-4 shrink-0 pt-1 relative z-30">
        <AnimatePresence mode="wait">
          {isOrderPaid ? (
            /* 🔥 BLOQUEO POR PAGO */
            <motion.div 
              key="paid-message"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-[1.5rem] border border-emerald-200 dark:border-emerald-800/30 shrink-0 text-center shadow-sm"
            >
              <p className="flex items-center justify-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400 font-black text-sm uppercase tracking-widest">
                <CheckCircle size={18} strokeWidth={2.5} /> Cuenta Pagada
              </p>
              <p className="text-emerald-700/80 dark:text-emerald-300/80 text-[11.5px] font-bold leading-relaxed px-2 text-justify mb-4">
                Tu cuenta ha sido saldada exitosamente y este ticket ha sido bloqueado. En breve nuestro personal liberará la mesa digitalmente. ¡Gracias por elegir 𝓛𝔂𝓪!
              </p>
              
              <div className="border-t border-emerald-200/60 dark:border-emerald-800/50 pt-4">
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowReadOnlyMenu(true)} 
                  className="w-full py-3.5 rounded-[1rem] font-bold text-sm bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40 shadow-sm md:hover:bg-emerald-50 outline-none transition-all flex items-center justify-center gap-2"
                >
                  <Eye size={16} strokeWidth={2.5} />
                  <span>Ojear menú (Solo Lectura)</span>
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="action-buttons" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="space-y-4 w-full"
            >
              {isQrActive ? (
                <div className="space-y-2">
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={onReset} 
                    className="w-full py-4 rounded-2xl font-black text-sm bg-gray-900 md:hover:bg-gray-800 dark:bg-white dark:md:hover:bg-gray-100 lya:bg-[#78350F] text-white dark:text-gray-900 lya:text-white shadow-xl outline-none transition-all flex items-center justify-center gap-2"
                  >
                    <span>Quiero pedir algo más</span>
                    <ChevronRight size={16} strokeWidth={3} />
                  </motion.button>
                  <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 lya:text-[#7A6353] text-center px-4">
                    Puedes seguir agregando bebidas o postres a tu cuenta de forma autónoma.
                  </p>
                </div>
              ) : (
                <div className="w-full bg-gray-200/50 dark:bg-gray-800/50 lya:bg-[#EADCC9]/50 p-5 rounded-[1.5rem] border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] shrink-0 text-center">
                   <p className="flex items-center justify-center gap-2 mb-2 text-gray-500 dark:text-gray-400 lya:text-[#78350F] font-black text-sm">
                     <PowerOff size={16} strokeWidth={2.5} /> Servicio Pausado
                   </p>
                   <p className="text-gray-500 dark:text-gray-400 lya:text-[#7A6353] text-[11.5px] font-medium leading-relaxed px-2 text-justify">
                     Los pedidos digitales se han apagado temporalmente. Si deseas ordenar algo más, por favor habla directamente con nuestro personal en mostrador o en tu mesa.
                   </p>
                </div>
              )}

              <div className="border-t border-gray-200 dark:border-gray-800 lya:border-[#EADCC9] w-3/4 mx-auto my-4"></div>

              <div className="space-y-2">
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowReadOnlyMenu(true)} 
                  className="w-full py-3.5 rounded-2xl font-bold text-sm bg-white dark:bg-gray-800 lya:bg-white text-gray-600 dark:text-gray-300 lya:text-[#7A6353] border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] shadow-sm md:hover:bg-gray-50 dark:md:hover:bg-gray-700/50 outline-none transition-all flex items-center justify-center gap-2"
                >
                  <Eye size={16} strokeWidth={2.5} />
                  <span>Ver menú solo de lectura</span>
                </motion.button>
                <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 lya:text-[#7A6353]/80 text-center px-2">
                  Si prefieres, revisa el catálogo aquí y pídele a un empleado que tome tu nueva orden.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}