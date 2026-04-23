import React, { useState } from 'react';
import { X, Search, ChevronDown, ChevronUp, MoreVertical, Info, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { usePosController } from '../controllers/usePosController';
import { ProductCard } from './ProductCard';
import { TicketSidebar } from './TicketSidebar'; 
import { CategoryBar } from './CategoryBar';
import { SuccessScreen } from './SuccessScreen';
import { ProductOptionsModal } from './ProductOptionsModal';
import { CheckoutModal } from './CheckoutModal'; 
import { OpcionesMesaModal } from './OpcionesMesaModal';

const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalVariants = { 
  hidden: { y: "100%", opacity: 0 }, 
  visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 25, stiffness: 300 } },
  exit: { y: "100%", opacity: 0 } 
};

export const PosModal = ({ isOpen, onClose, mesa, todasLasMesas, onTableRelease, onUpdateTable, onUnirMesas, onPagoParcial }) => {
  const [showMobileTicket, setShowMobileTicket] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOpcionesMesa, setShowOpcionesMesa] = useState(false);
  
  const [checkoutTarget, setCheckoutTarget] = useState({ type: 'full', cuentaName: null, amount: 0 });

  const { 
    cart, total, addToCart, removeFromCart, deleteLine, filtroTexto, setFiltroTexto, 
    categoriaActiva, setCategoriaActiva, filteredProducts, getProductQty, 
    handleCheckout, isSuccess,
    unsentTotal, hasUnsentItems, simulateKitchenSend,
    cuentaActiva, setCuentaActiva, cuentasDisponibles, addNewCuenta, getSubtotalByCuenta, payCuenta,
    moveItemToCuenta,
    dbCategories 
  } = usePosController();

  const handleConfirmOption = (productWithOptions) => {
    addToCart(productWithOptions);
    setSelectedProduct(null);
  };

  const handleSendToKitchen = () => {
    if (!hasUnsentItems) return; 
    simulateKitchenSend(() => {
      if (onUpdateTable && unsentTotal > 0) {
        onUpdateTable(mesa.id, unsentTotal);
      }
    });
  };

  const handleOpenCheckout = () => {
    if (cart.length === 0 && (!mesa.total || mesa.total === 0)) return;
    setCheckoutTarget({ type: 'full', cuentaName: null, amount: (mesa.total || 0) + unsentTotal });
    setShowCheckout(true); 
  };

  const handleOpenPayCuenta = (cuentaName) => {
    const subtotal = getSubtotalByCuenta(cuentaName);
    if (subtotal > 0) {
      setCheckoutTarget({ type: 'partial', cuentaName, amount: subtotal });
      setShowCheckout(true);
    }
  };

  const handleFinalizePayment = (paymentDetails) => {
    const { amountPaid, targetType, cuentaName } = paymentDetails;
    setShowCheckout(false);

    if (targetType === 'partial' && cuentaName) {
       payCuenta(cuentaName, () => {
           if (onPagoParcial) onPagoParcial(mesa.id, amountPaid);
       });
       return;
    }

    const deudaTotal = (mesa.total || 0) + unsentTotal; 
    
    if (unsentTotal > 0 && onUpdateTable) onUpdateTable(mesa.id, unsentTotal);
    if (onPagoParcial) onPagoParcial(mesa.id, amountPaid);

    handleCheckout(() => {
        const saldoRestante = deudaTotal - amountPaid;
        if (saldoRestante <= 0.01) {
            if (onTableRelease) onTableRelease(mesa.id);
            onClose();
        } 
    });
  };

  if (!isOpen || !mesa) return null;

  const sidebarProps = {
    cart, total, hasUnsentItems, unsentTotal, mesaTotal: mesa.total || 0,
    onAdd: addToCart, onRemove: removeFromCart, onDelete: deleteLine,
    onSendToKitchen: handleSendToKitchen, onCheckout: handleOpenCheckout,
    cuentaActiva, setCuentaActiva, cuentasDisponibles, addNewCuenta, getSubtotalByCuenta,
    onPayCuenta: handleOpenPayCuenta,
    onMoveItem: moveItemToCuenta
  };

  const isLlevar = mesa.zona === 'llevar';
  const partesNumero = mesa.numero.toString().split(' - ');
  const numeroReal = partesNumero[0]; 
  const nombreCliente = partesNumero[1] || 'MOSTRADOR'; 

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
        
        <motion.div variants={backdropVariants} initial="hidden" animate="visible" exit="hidden" onClick={onClose} className="absolute inset-0 bg-black/60 lya:bg-black/50 backdrop-blur-sm" />

        <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="relative w-full h-[100dvh] md:h-[90vh] md:max-w-7xl bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row transition-colors duration-300 lya:border lya:border-lya-border/40">
          
          <div className="flex-1 flex flex-col h-full relative z-0">
            <div className="bg-white dark:bg-gray-800 lya:bg-lya-surface p-4 pb-2 border-b border-gray-100 dark:border-gray-700 lya:border-lya-border/30 sticky top-0 z-20 shadow-sm transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 text-gray-400 lya:text-lya-text/40" size={18} />
                  {/* BÚSQUEDA RESTAURADA A ORIGINAL + LYA */}
                  <input 
                    type="text" placeholder="Buscar producto..." value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} 
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 lya:bg-lya-bg lya:border lya:border-lya-border/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 lya:focus:ring-lya-primary/40 transition-all text-gray-800 dark:text-white lya:text-lya-text placeholder-gray-400 dark:placeholder-gray-500 lya:placeholder-lya-text/40" 
                  />
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 lya:hover:bg-lya-bg rounded-full text-gray-500 dark:text-gray-400 lya:text-lya-text/60 lya:hover:text-lya-text transition-colors"><X size={24} /></button>
              </div>
              <CategoryBar categories={dbCategories} active={categoriaActiva} onSelect={setCategoriaActiva} />
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 lya:bg-transparent pb-32 md:pb-4 transition-colors custom-scrollbar">
              
              {/* BANNER DE INFORMACIÓN RESTAURADO A AZUL + LYA TURQUESA/ROSA */}
              <div className="mb-5 bg-blue-50 dark:bg-blue-900/20 lya:bg-lya-secondary/10 border border-blue-100 dark:border-blue-800/50 lya:border-lya-secondary/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 shadow-sm">
                <div className="bg-blue-100 dark:bg-blue-800/50 lya:bg-lya-secondary/20 p-2.5 rounded-xl shrink-0 text-blue-600 dark:text-blue-400 lya:text-lya-secondary">
                  <Info size={20} />
                </div>
                <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 lya:text-lya-text font-medium leading-relaxed text-center sm:text-justify">
                  <strong className="font-black">Tip de venta:</strong> Toca la imagen de los productos con la etiqueta 
                  <span className="inline-flex items-center text-[9px] uppercase font-black tracking-wider text-orange-600 dark:text-orange-400 lya:text-lya-primary bg-orange-500/10 dark:bg-orange-500/10 lya:bg-lya-primary/10 px-1.5 py-0.5 rounded-full mx-1 border border-orange-500/20 dark:border-orange-500/20 lya:border-lya-primary/20">✨ Personalizable</span> 
                  para elegir tamaños, leches o extras. O usa el botón 
                  <span className="inline-flex items-center justify-center bg-orange-500 dark:bg-orange-500 lya:bg-lya-primary text-white lya:text-lya-surface rounded p-0.5 mx-1 shadow-sm"><Plus size={12} strokeWidth={3} /></span> 
                  para agregarlos rápido con las opciones predeterminadas.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onClick={setSelectedProduct} 
                    onQuickAdd={(p) => {
                      let ops = p.opciones;
                      if (typeof ops === 'string') {
                        try { ops = JSON.parse(ops); } catch (e) { ops = null; }
                      }
                      if (typeof ops === 'string') {
                        try { ops = JSON.parse(ops); } catch (e) { ops = null; }
                      }

                      let precioAdicional = 0;
                      let detalles = {};

                      if (ops && typeof ops === 'object') {
                         const defs = ops.defaults || {};
                         
                         if (defs.tamano) {
                            detalles.tamano = defs.tamano;
                            const tOpt = ops.tamanos?.find(t => (t.nombre || t) === defs.tamano);
                            if (tOpt && tOpt.precioAdicional) precioAdicional += Number(tOpt.precioAdicional);
                         } else {
                            detalles.tamano = 'Estándar';
                         }

                         if (defs.leche) {
                            detalles.leche = defs.leche;
                            const lOpt = ops.leches?.find(l => (l.nombre || l) === defs.leche);
                            if (lOpt && lOpt.precioAdicional) precioAdicional += Number(lOpt.precioAdicional);
                         }
                      } else {
                         detalles.tamano = 'Estándar';
                      }

                      addToCart({ 
                        ...p, 
                        precioFinal: Number(p.precioBase || p.precio || 0) + precioAdicional, 
                        detalles 
                      });
                    }} 
                  />
                ))}
              </div>
            </div>

            <div className="md:hidden">
              <AnimatePresence>
                {showMobileTicket && (
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="absolute inset-0 z-50 bg-white dark:bg-gray-800 lya:bg-lya-surface shadow-xl flex flex-col">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg border-b border-gray-100 dark:border-gray-700 lya:border-lya-border/40 shadow-sm cursor-pointer" onClick={() => setShowMobileTicket(false)}>
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 lya:text-lya-text/60">
                        <button className="p-2 bg-white dark:bg-gray-700 lya:bg-lya-surface rounded-full border border-gray-200 dark:border-gray-600 lya:border-lya-border/30 shadow-sm active:scale-90 transition-transform"><ChevronDown size={20} /></button>
                        <div>
                          <span className="font-bold text-gray-700 dark:text-white lya:text-lya-text block leading-tight flex items-center gap-2">
                            <span>{isLlevar ? 'Ticket' : 'Mesa'} #{numeroReal}</span>
                            {isLlevar && (
                               <span className="px-2 py-0.5 bg-orange-500 lya:bg-lya-secondary text-white lya:text-lya-surface text-[10px] font-black rounded-full uppercase tracking-wider">
                                  {nombreCliente}
                               </span>
                            )}
                          </span>
                          <span className="text-[10px] text-gray-400 lya:text-lya-text/50 block">
                            {isLlevar ? 'Pedido en curso' : (mesa.estado === 'ocupada' ? 'Cuenta abierta' : 'Nueva orden')}
                          </span>
                        </div>
                      </div>
                      {mesa.estado === 'ocupada' && !isLlevar && (
                        <button onClick={(e) => { e.stopPropagation(); setShowOpcionesMesa(true); }} className="text-orange-500 lya:text-lya-primary font-bold text-xs bg-orange-500/10 lya:bg-lya-primary/10 px-3 py-1.5 rounded-lg active:scale-95 transition-transform lya:border lya:border-lya-primary/20">OPCIONES</button>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden relative bg-white dark:bg-gray-800 lya:bg-lya-surface">
                      <TicketSidebar {...sidebarProps} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 lya:bg-lya-surface border-t border-gray-200 dark:border-gray-700 lya:border-lya-border/40 p-4 flex items-center justify-between gap-4 z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] transition-colors">
                <div onClick={() => setShowMobileTicket(true)} className="flex flex-col cursor-pointer">
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 lya:text-lya-text/60 uppercase tracking-wider font-bold"><span>Gran Total</span><ChevronUp size={14}/></div>
                  <span className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text transition-colors">${((mesa.total || 0) + unsentTotal).toFixed(2)}</span>
                </div>
                <button onClick={() => setShowMobileTicket(true)} className="bg-gray-900 dark:bg-orange-500 lya:bg-lya-primary text-white lya:text-lya-surface font-bold py-3 px-6 rounded-xl shadow-lg active:scale-95 transition-transform lya:shadow-lya-primary/30">Ver Orden</button>
              </div>
            </div>
          </div>

          <div className="hidden md:flex w-96 border-l border-gray-200 dark:border-gray-700 lya:border-lya-border/40 bg-white dark:bg-gray-800 lya:bg-lya-surface h-full shadow-xl z-20 flex-col transition-colors">
            <div className="p-4 bg-orange-500/5 dark:bg-orange-500/10 lya:bg-lya-bg border-b border-orange-500/10 dark:border-orange-500/20 lya:border-lya-border/40 flex justify-between items-center">
               <div>
                  <h3 className="font-bold text-gray-900 dark:text-orange-500 lya:text-lya-text text-lg flex items-center gap-2">
                     <span>{isLlevar ? 'Ticket' : 'Mesa'} #{numeroReal}</span>
                     {mesa.estado === 'ocupada' && (
                       <span className={`px-2 py-0.5 text-white lya:text-lya-surface text-[10px] font-black rounded-full uppercase tracking-wider ${isLlevar ? 'bg-orange-500 lya:bg-lya-secondary' : 'bg-gray-900 dark:bg-orange-500 lya:bg-lya-primary'}`}>
                          {isLlevar ? nombreCliente : 'OCUPADA'}
                       </span>
                     )}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-0.5 font-medium">
                    {isLlevar ? 'Venta de mostrador' : (mesa.estado === 'ocupada' ? 'Cuenta abierta' : 'Nueva orden')}
                  </p>
               </div>
               {mesa.estado === 'ocupada' && !isLlevar && (
                  <button onClick={() => setShowOpcionesMesa(true)} className="p-2 bg-white dark:bg-gray-800 lya:bg-lya-surface shadow-sm border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 rounded-xl text-gray-500 dark:text-gray-400 lya:text-lya-text/60 hover:text-orange-500 dark:hover:text-orange-500 lya:hover:text-lya-primary transition-colors active:scale-95" title="Opciones Avanzadas">
                     <MoreVertical size={20} />
                  </button>
               )}
            </div>
            <div className="flex-1 overflow-hidden h-full">
              <TicketSidebar {...sidebarProps} />
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {isSuccess && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[100]"><SuccessScreen /></motion.div>)}
          
          {selectedProduct && (<ProductOptionsModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onConfirm={handleConfirmOption} />)}
          
          {showCheckout && (
            <CheckoutModal 
              isOpen={showCheckout} 
              onClose={() => setShowCheckout(false)} 
              total={(mesa.total || 0) + unsentTotal} 
              initialTarget={checkoutTarget} 
              cuentasResumen={cuentasDisponibles.map(nombre => ({
                nombre,
                subtotal: getSubtotalByCuenta(nombre)
              })).filter(c => c.subtotal > 0)}
              onConfirmPayment={handleFinalizePayment} 
            />
          )}
          
          {showOpcionesMesa && (
            <OpcionesMesaModal
               isOpen={showOpcionesMesa}
               onClose={() => setShowOpcionesMesa(false)}
               mesa={mesa}
               todasLasMesas={todasLasMesas}
               onLiberarMesa={(id) => {
                 onTableRelease(id);
                 setShowOpcionesMesa(false);
                 onClose();
               }}
               onUnirMesas={(origen, destino) => {
                 setShowOpcionesMesa(false);
                 onUnirMesas(origen, destino);
               }}
            />
          )}
        </AnimatePresence>

      </div>
    </AnimatePresence>
  );
};