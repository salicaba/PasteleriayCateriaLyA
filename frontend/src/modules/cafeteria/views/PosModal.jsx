// src/modules/cafeteria/views/PosModal.jsx
import React, { useState } from 'react';
import { X, Search, ChevronDown, ChevronUp, MoreVertical, Info, Plus, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { usePosController } from '../controllers/usePosController';
import { ProductCard } from './ProductCard';
import { TicketSidebar } from './TicketSidebar'; 
import { CategoryBar } from './CategoryBar';
import { SuccessScreen } from './SuccessScreen';
import { ProductOptionsModal } from './ProductOptionsModal';
import { CheckoutModal } from './CheckoutModal'; 
import { OpcionesMesaModal } from './OpcionesMesaModal';
import { TicketPreviewModal } from './TicketPreviewModal';

const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalVariants = { hidden: { y: "100%", opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 25, stiffness: 300 } }, exit: { y: "100%", opacity: 0 } };

export const PosModal = ({ isOpen, onClose, mesa, todasLasMesas, onTableRelease, onUpdateTable, onUnirMesas, onPagoParcial }) => {
  const [showMobileTicket, setShowMobileTicket] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOpcionesMesa, setShowOpcionesMesa] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);
  
  const [previewTicketData, setPreviewTicketData] = useState(null);
  const [checkoutTarget, setCheckoutTarget] = useState({ type: 'full', cuentaName: null, amount: 0 });

  const { 
    cart, total, addToCart, removeFromCart, deleteLine, filtroTexto, setFiltroTexto, 
    categoriaActiva, setCategoriaActiva, filteredProducts, getProductQty, 
    handleCheckout, handleCloseTable, handlePrintTicket, isSuccess,
    unsentTotal, hasUnsentItems, simulateKitchenSend, toggleDeliveredStatus,
    cuentaActiva, setCuentaActiva, cuentasDisponibles, addNewCuenta, getSubtotalByCuenta, payCuenta,
    moveItemToCuenta, dbCategories, orderStatus, paidAccounts, validateAllDelivered,
    toggleItemTakeaway 
  } = usePosController(mesa, isOpen, todasLasMesas); 

  const handleConfirmOption = (productWithOptions) => { addToCart(productWithOptions); setSelectedProduct(null); };

  const handleSendToKitchen = () => {
    if (!hasUnsentItems) return; 
    simulateKitchenSend(() => {
      if (onUpdateTable && unsentTotal > 0) onUpdateTable(mesa.id, unsentTotal);
    });
  };

  const handleOpenCheckout = () => {
    if (!validateAllDelivered()) { 
      setAlertMessage("Todos los productos de la mesa deben estar marcados como ENTREGADOS en cocina antes de poder cobrar la cuenta completa."); 
      return; 
    }
    if (cart.length === 0 && (!mesa.total || mesa.total === 0)) return;
    setCheckoutTarget({ type: 'full', cuentaName: null, amount: total });
    setShowCheckout(true); 
  };

  const handleOpenPayCuenta = (cuentaName) => {
    if (!validateAllDelivered(cuentaName)) { 
      setAlertMessage(`Todos los productos de la cuenta "${cuentaName}" deben estar ENTREGADOS antes de poder cobrarla individualmente.`); 
      return; 
    }
    const subtotal = getSubtotalByCuenta(cuentaName);
    if (subtotal > 0) { setCheckoutTarget({ type: 'partial', cuentaName, amount: subtotal }); setShowCheckout(true); }
  };

  const handleFinalizePayment = (paymentDetails) => {
    const { amountPaid, targetType, cuentaName } = paymentDetails;
    setShowCheckout(false);

    if (targetType === 'partial' && cuentaName) { 
      payCuenta(cuentaName, paymentDetails, () => { 
        if (onPagoParcial) onPagoParcial(mesa.id, amountPaid); 
        setPaymentSuccessData({ title: '¡Cuenta Cobrada!', message: `La cuenta "${cuentaName}" ha sido pagada exitosamente.` });
        setTimeout(() => setPaymentSuccessData(null), 1800);
      }); 
      return; 
    }
    
    if (unsentTotal > 0 && onUpdateTable) onUpdateTable(mesa.id, unsentTotal);
    
    handleCheckout(paymentDetails, () => {
       setPaymentSuccessData({ title: '¡Mesa Cobrada!', message: `El total de la mesa ha sido pagado exitosamente.` });
       setTimeout(() => setPaymentSuccessData(null), 1800);
    });
  };

  const finalizeTable = () => { 
    if (onPagoParcial && total > 0) onPagoParcial(mesa.id, total);
    handleCloseTable(() => { 
      if (onTableRelease) onTableRelease(mesa.id); 
      onClose(); 
    }); 
  };

  const openTicketPreview = (cuentaName = null) => {
    setPreviewTicketData({ cuentaName });
  };

  const executeRealPrint = async () => {
    const targetCuenta = previewTicketData.cuentaName;
    setPreviewTicketData(null); 
    
    setPaymentSuccessData({
      title: '¡Enviado a Impresora!',
      message: 'El ticket se está imprimiendo.'
    });

    try {
      await handlePrintTicket(targetCuenta);
    } catch (error) {
      console.error("Fallo al imprimir:", error);
    }

    setTimeout(() => setPaymentSuccessData(null), 1800);
  };

  if (!isOpen || !mesa) return null;

  const isLlevar = mesa.zona === 'llevar';

  const sidebarProps = {
    cart, total, hasUnsentItems, unsentTotal, mesaTotal: total - unsentTotal,
    onAdd: addToCart, onRemove: removeFromCart, onDelete: deleteLine,
    onSendToKitchen: handleSendToKitchen, onCheckout: handleOpenCheckout,
    cuentaActiva, setCuentaActiva, cuentasDisponibles, addNewCuenta, getSubtotalByCuenta,
    onPayCuenta: handleOpenPayCuenta, onMoveItem: moveItemToCuenta,
    orderStatus, paidAccounts, 
    onPrintTicket: openTicketPreview, 
    onCloseTable: finalizeTable,
    toggleDeliveredStatus,
    isLlevar,
    toggleItemTakeaway
  };

  // 🔥 LÓGICA DE EXTRACCIÓN Y LIMPIEZA CORREGIDA
  const partesNumero = (mesa.numero || '').toString().split(' - ');
  let numeroReal = partesNumero[0] || 'Pedido'; 
  
  // Limpiamos la redundancia si es para llevar
  if (isLlevar) {
    numeroReal = numeroReal.replace(/Llevar/gi, '').replace(/L-/gi, '').replace(/#/g, '').trim();
  }

  let nombreCliente = 'MOSTRADOR';
  let telefonoCliente = '';

  if (isLlevar && partesNumero.length >= 2) {
    const rawTel = partesNumero[partesNumero.length - 1];
    const telLimpio = rawTel.replace(/\D/g, '');

    if (partesNumero.length >= 3 && telLimpio.length >= 10) {
       nombreCliente = partesNumero.slice(1, -1).join(' - ');
       telefonoCliente = rawTel;
    } else {
       nombreCliente = partesNumero.slice(1).join(' - ');
    }
  }

  // Ahora tableTitle se arma siempre limpio
  const tableTitle = isLlevar ? `Llevar #${numeroReal}` : `Mesa #${numeroReal}`;

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
                          <span className="font-bold text-gray-700 dark:text-white lya:text-lya-text block leading-tight flex items-center gap-2 flex-wrap">
                            <span>{tableTitle}</span>
                            {isLlevar && nombreCliente !== 'MOSTRADOR' && (
                               <span className="px-2 py-0.5 bg-orange-500 lya:bg-lya-secondary text-white lya:text-lya-surface text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                                  👤 {nombreCliente}
                               </span>
                            )}
                            {isLlevar && telefonoCliente && (
                               <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                                  📞 {telefonoCliente}
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
                  <span className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text transition-colors">${total.toFixed(2)}</span>
                </div>
                <button onClick={() => setShowMobileTicket(true)} className="bg-gray-900 dark:bg-orange-500 lya:bg-lya-primary text-white lya:text-lya-surface font-bold py-3 px-6 rounded-xl shadow-lg active:scale-95 transition-transform lya:shadow-lya-primary/30">Ver Orden</button>
              </div>
            </div>
          </div>

          <div className="hidden md:flex w-96 border-l border-gray-200 dark:border-gray-700 lya:border-lya-border/40 bg-white dark:bg-gray-800 lya:bg-lya-surface h-full shadow-xl z-20 flex-col transition-colors">
            <div className="p-4 bg-orange-500/5 dark:bg-orange-500/10 lya:bg-lya-bg border-b border-orange-500/10 dark:border-orange-500/20 lya:border-lya-border/40 flex justify-between items-start">
               <div>
                  <h3 className="font-bold text-gray-900 dark:text-orange-500 lya:text-lya-text text-lg flex items-center gap-2">
                     <span>{tableTitle}</span>
                     {mesa.estado === 'ocupada' && !isLlevar && (
                       <span className="px-2 py-0.5 text-white lya:text-lya-surface text-[10px] font-black rounded-full uppercase tracking-wider bg-gray-900 dark:bg-orange-500 lya:bg-lya-primary">
                          OCUPADA
                       </span>
                     )}
                  </h3>
                  
                  {isLlevar && nombreCliente !== 'MOSTRADOR' && (
                     <div className="flex gap-2 mt-1.5 flex-wrap">
                       <span className="px-2 py-0.5 bg-orange-500 lya:bg-lya-secondary text-white lya:text-lya-surface text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                          👤 {nombreCliente}
                       </span>
                       {telefonoCliente && (
                          <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                             📞 {telefonoCliente}
                          </span>
                       )}
                     </div>
                  )}
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1 font-medium">
                    {isLlevar ? 'Venta para Llevar' : (mesa.estado === 'ocupada' ? 'Cuenta abierta' : 'Nueva orden')}
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

        <TicketPreviewModal 
          isOpen={!!previewTicketData}
          onClose={() => setPreviewTicketData(null)}
          cart={cart}
          mesa={mesa}
          cuentaName={previewTicketData?.cuentaName}
          onConfirmPrint={executeRealPrint}
          onSendWhatsApp={(number, items, totalToPrint) => {
             setPreviewTicketData(null); 
             const ticketUrl = `http://localhost:4000/api/pos/orders/${mesa.orderId}/share${previewTicketData?.cuentaName ? `?cuenta=${encodeURIComponent(previewTicketData.cuentaName)}` : ''}`;
             const mensajeWhatsApp = `🧁 *𝓛𝔂𝓐 Pastelería & Cafetería* ☕\n\n¡Hola! Agradecemos mucho tu preferencia. Aquí tienes el enlace directo para visualizar y descargar tu ticket de consumo en formato PDF:\n\n🔗 ${ticketUrl}\n\n*Total de la cuenta:* $${totalToPrint.toFixed(2)}\n\n¡Esperamos verte pronto de nuevo! ✨`;
             const urlApiWhatsApp = `https://api.whatsapp.com/send?phone=52${number}&text=${encodeURIComponent(mensajeWhatsApp)}`;
             window.open(urlApiWhatsApp, '_blank');
             setPaymentSuccessData({
                title: '¡Enlace Creado!',
                message: 'El ticket digital ha sido preparado para WhatsApp.'
             });
             setTimeout(() => setPaymentSuccessData(null), 1800);
          }}
        />

        <AnimatePresence>
          {isSuccess && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[100]">
              <SuccessScreen />
            </motion.div>
          )}

          {paymentSuccessData && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[110]">
              <SuccessScreen title={paymentSuccessData.title} message={paymentSuccessData.message} />
            </motion.div>
          )}
          
          {selectedProduct && (<ProductOptionsModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onConfirm={handleConfirmOption} />)}
          
          {showCheckout && (
            <CheckoutModal 
              isOpen={showCheckout} 
              onClose={() => setShowCheckout(false)} 
              total={total} 
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

          {alertMessage && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} 
                className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl flex flex-col items-center border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 text-center"
              >
                 <div className="w-16 h-16 bg-orange-50 dark:bg-orange-500/10 lya:bg-lya-primary/10 text-orange-500 lya:text-lya-primary rounded-full flex items-center justify-center mb-4 shadow-inner">
                    <AlertTriangle size={32} strokeWidth={2.5} />
                 </div>
                 <h3 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-2">¡Atención!</h3>
                 <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/70 mb-6 leading-relaxed">
                    {alertMessage}
                 </p>
                 <button 
                   onClick={() => setAlertMessage(null)} 
                   className="w-full bg-orange-500 hover:bg-orange-600 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white lya:text-lya-surface py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-orange-500/20 lya:shadow-lya-primary/20"
                 >
                    Entendido
                 </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </AnimatePresence>
  );
};