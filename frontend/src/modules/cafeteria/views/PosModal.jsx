// src/modules/cafeteria/views/PosModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Search, ChevronDown, ChevronUp, MoreVertical, Info, Plus, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import client from '../../../api/client'; 
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

// 🔥 Mini-esqueleto para renderizar productos de forma fluida
const ProductSkeleton = () => (
  <div className="bg-white/60 dark:bg-gray-900/60 lya:bg-lya-surface/60 backdrop-blur-md rounded-3xl p-4 flex flex-col justify-between h-48 border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shadow-sm">
    <div className="flex justify-between items-start mb-2">
      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/30 animate-pulse" />
      <div className="w-16 h-6 rounded-full bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/30 animate-pulse" />
    </div>
    <div className="space-y-2 w-full mt-auto">
      <div className="w-full h-4 bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/30 rounded-md animate-pulse" />
      <div className="w-2/3 h-4 bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/30 rounded-md animate-pulse" />
    </div>
  </div>
);

export const PosModal = ({ isOpen, onClose, mesa, todasLasMesas, onTableRelease, onUpdateTable, onUnirMesas, onPagoParcial, inline = false }) => {
  
  const getLoggedUserName = () => {
    try {
      const sessionStr = localStorage.getItem('lya_pos_session');
      if (sessionStr) {
        const { userData } = JSON.parse(sessionStr);
        if (userData && userData.fullName) return userData.fullName.split(' ')[0]; 
        if (userData && userData.username) return userData.username;
      }
      const lyaUser = JSON.parse(localStorage.getItem('lya_user') || '{}');
      if (lyaUser.fullName) return lyaUser.fullName.split(' ')[0];
      if (lyaUser.username) return lyaUser.username;
    } catch (e) {
      console.error("Error leyendo sesión del cajero:", e);
    }
    return 'Cajero en turno';
  };

  const nombreCajero = getLoggedUserName();

  const [isRendering, setIsRendering] = useState(true); // 🔥 Estado para evitar congelamientos
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
    categoriaActiva, setCategoriaActiva, filteredProducts, 
    handleCheckout, handleCloseTable, handlePrintTicket, isSuccess,
    unsentTotal, hasUnsentItems, simulateKitchenSend, toggleDeliveredStatus,
    cuentaActiva, setCuentaActiva, cuentasDisponibles, addNewCuenta, getSubtotalByCuenta, payCuenta,
    moveItemToCuenta, dbCategories, orderStatus, paidAccounts, validateAllDelivered,
    toggleItemTakeaway 
  } = usePosController(mesa, isOpen, todasLasMesas); 

  // 🔥 Retrasamos un instante la carga pesada del grid
  useEffect(() => {
    if (isOpen) {
      setIsRendering(true);
      const timer = setTimeout(() => setIsRendering(false), 250); 
      return () => clearTimeout(timer);
    }
  }, [isOpen, categoriaActiva]); // Volvemos a mostrar skeleton si cambian de categoría rápido

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
       setPaymentSuccessData({ title: '¡Cobro Exitoso!', message: `El total ha sido pagado exitosamente.` });
       setTimeout(() => setPaymentSuccessData(null), 1800);
    });
  };

  const finalizeTable = () => { 
    if (onPagoParcial && total > 0) onPagoParcial(mesa.id, total);
    handleCloseTable(() => { 
      if (onTableRelease) onTableRelease(mesa.id); 
      if (!inline) onClose(); 
    }); 
  };

  const executeRealPrint = async () => {
    const targetCuenta = previewTicketData.cuentaName;
    setPreviewTicketData(null); 
    setPaymentSuccessData({ title: '¡Enviado a Impresora!', message: 'El ticket se está imprimiendo.' });
    try { await handlePrintTicket(targetCuenta); } catch (error) { console.error("Fallo al imprimir:", error); }
    setTimeout(() => setPaymentSuccessData(null), 1800);
  };

  if (!isOpen || !mesa) return null;

  const isLlevar = mesa.zona === 'llevar';
  const isVitrina = mesa.zona === 'vitrina';

  const partesNumero = (mesa.numero || '').toString().split(' - ');
  let numeroReal = partesNumero[0] || 'Pedido'; 
  
  if (isLlevar) numeroReal = numeroReal.replace(/Llevar/gi, '').replace(/L-/gi, '').replace(/#/g, '').trim();
  else if (isVitrina) numeroReal = 'Express';

  const tableTitle = isVitrina ? `Mostrador ⚡` : (isLlevar ? `Llevar #${numeroReal}` : `Mesa #${numeroReal}`);

  const handleSendWhatsAppTicket = (phone, itemsToPrint, totalToPrint) => {
    const orderId = mesa?.orderId || mesa?.id;

    let baseApiUrl = client.defaults.baseURL || 'https://lya-backend-2gay.onrender.com/api';
    if (baseApiUrl.includes('localhost') || baseApiUrl.includes('127.0.0.1')) {
      baseApiUrl = 'https://lya-backend-2gay.onrender.com/api';
    }
    
    const shortId = orderId.split('-')[0];
    const shareLink = `${baseApiUrl}/pos/ticket/${shortId}`;

    const direccionTexto = `📍 *UBICACIÓN:* Segunda Calle Ote. Nte., Nuevo Mexico, 30540 Pijijiapan, Chis.\n🗺️ *VER MAPA:* https://maps.app.goo.gl/hTiGxsjqGc5VEr5A8?g_st=a`;

    const mensajeWhatsApp = `🧁 *𝓛𝔂𝓪 Pastelería & Cafetería* ☕\n\n¡Hola! Agradecemos mucho tu preferencia. Aquí tienes tu ticket digital:\n\n🔗 ${shareLink}\n\n*Total de la cuenta:* $${totalToPrint.toFixed(2)}\n\n${direccionTexto}\n\n¡Esperamos verte pronto de nuevo! ✨`;

    const urlApiWhatsApp = `https://api.whatsapp.com/send?phone=52${phone}&text=${encodeURIComponent(mensajeWhatsApp)}`;
    window.open(urlApiWhatsApp, '_blank');

    setPaymentSuccessData({
      title: '¡Abriendo WhatsApp!',
      message: 'Redirigiendo al chat con el cliente...'
    });

    setTimeout(() => setPaymentSuccessData(null), 1800);
  };

  const sidebarProps = {
    cart, total, hasUnsentItems, unsentTotal, mesaTotal: total - unsentTotal,
    onAdd: addToCart, onRemove: removeFromCart, onDelete: deleteLine,
    onSendToKitchen: handleSendToKitchen, onCheckout: handleOpenCheckout,
    cuentaActiva, setCuentaActiva, cuentasDisponibles, addNewCuenta, getSubtotalByCuenta,
    onPayCuenta: handleOpenPayCuenta, onMoveItem: moveItemToCuenta,
    orderStatus, paidAccounts, onPrintTicket: (c) => setPreviewTicketData({ cuentaName: c }), 
    onCloseTable: finalizeTable, toggleDeliveredStatus, 
    isLlevar: (isLlevar || isVitrina), 
    isVitrina, 
    toggleItemTakeaway
  };

  const posContent = (
    <div className={`relative w-full h-full bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg flex flex-col md:flex-row transition-colors duration-300 ${!inline ? 'md:rounded-3xl shadow-2xl overflow-hidden lya:border lya:border-lya-border/40' : 'rounded-2xl border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 overflow-hidden'}`}>
      <div className="flex-1 flex flex-col h-full relative z-0">
        <div className="bg-white dark:bg-gray-800 lya:bg-lya-surface p-4 pb-2 border-b border-gray-100 dark:border-gray-700 lya:border-lya-border/30 sticky top-0 z-20 shadow-sm transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-gray-400 lya:text-lya-text/40" size={18} />
              <input type="text" placeholder="Buscar producto..." value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 lya:bg-lya-bg rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-gray-800 dark:text-white" />
            </div>
            {!inline && (
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500"><X size={24} /></button>
            )}
          </div>
          <CategoryBar categories={dbCategories} active={categoriaActiva} onSelect={setCategoriaActiva} />
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-32 md:pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {isRendering ? (
              [...Array(12)].map((_, i) => <ProductSkeleton key={i} />)
            ) : (
              filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} onClick={setSelectedProduct} onQuickAdd={(p) => {
                    let ops = p.opciones;
                    if (typeof ops === 'string') try { ops = JSON.parse(ops); } catch (e) { ops = null; }
                    let precioAdicional = 0, detalles = { tamano: 'Estándar' };
                    if (ops && typeof ops === 'object') {
                       if (ops.defaults?.tamano) { detalles.tamano = ops.defaults.tamano; const t = ops.tamanos?.find(x => x.nombre === ops.defaults.tamano); if (t?.precioAdicional) precioAdicional += Number(t.precioAdicional); }
                       if (ops.defaults?.leche) { detalles.leche = ops.defaults.leche; const l = ops.leches?.find(x => x.nombre === ops.defaults.leche); if (l?.precioAdicional) precioAdicional += Number(l.precioAdicional); }
                    }
                    addToCart({ ...p, precioFinal: Number(p.precioBase || p.precio || 0) + precioAdicional, detalles });
                }} />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="hidden md:flex w-96 border-l border-gray-200 dark:border-gray-700 lya:border-lya-border/40 bg-white dark:bg-gray-800 h-full shadow-xl z-20 flex-col">
        <div className="p-4 bg-orange-500/5 dark:bg-orange-500/10 border-b border-orange-500/10 dark:border-orange-500/20 flex justify-between items-start">
           <div>
              <h3 className="font-bold text-gray-900 dark:text-orange-500 text-lg flex items-center gap-2">{tableTitle}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">{isVitrina ? 'Cobro Inmediato' : 'Venta para Llevar'}</p>
           </div>
        </div>
        <div className="flex-1 overflow-hidden h-full"><TicketSidebar {...sidebarProps} /></div>
      </div>
    </div>
  );

  return (
    <>
      {inline ? (
        <div className="w-full h-full animate-fade-in">{posContent}</div>
      ) : (
        <AnimatePresence>
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div variants={backdropVariants} initial="hidden" animate="visible" exit="hidden" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="relative w-full h-[100dvh] md:h-[90vh] md:max-w-7xl">
              {posContent}
            </motion.div>
          </div>
        </AnimatePresence>
      )}

      <TicketPreviewModal 
        isOpen={!!previewTicketData} 
        onClose={() => setPreviewTicketData(null)} 
        cart={cart} 
        mesa={mesa} 
        cuentaName={previewTicketData?.cuentaName} 
        onConfirmPrint={executeRealPrint} 
        onSendWhatsApp={handleSendWhatsAppTicket} 
        userName={nombreCajero} 
      />

      <AnimatePresence>
        {isSuccess && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100]"><SuccessScreen /></motion.div>}
        {paymentSuccessData && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110]"><SuccessScreen title={paymentSuccessData.title} message={paymentSuccessData.message} /></motion.div>}
        {selectedProduct && <ProductOptionsModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onConfirm={handleConfirmOption} />}
        {showCheckout && <CheckoutModal isOpen={showCheckout} onClose={() => setShowCheckout(false)} total={total} initialTarget={checkoutTarget} cuentasResumen={cuentasDisponibles.map(n => ({nombre: n, subtotal: getSubtotalByCuenta(n)})).filter(c => c.subtotal > 0)} onConfirmPayment={handleFinalizePayment} />}
        {showOpcionesMesa && <OpcionesMesaModal isOpen={showOpcionesMesa} onClose={() => setShowOpcionesMesa(false)} mesa={mesa} todasLasMesas={todasLasMesas} onLiberarMesa={(id) => { onTableRelease(id); setShowOpcionesMesa(false); if(!inline) onClose(); }} onUnirMesas={(origen, destino) => { setShowOpcionesMesa(false); onUnirMesas(origen, destino); }} />}
        {alertMessage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white dark:bg-gray-900 rounded-3xl p-8 w-full max-w-sm shadow-2xl flex flex-col items-center text-center">
                <AlertTriangle size={32} className="text-orange-500 mb-4" />
                <p className="text-sm text-gray-500 mb-6">{alertMessage}</p>
                <button onClick={() => setAlertMessage(null)} className="w-full bg-orange-500 text-white py-3 rounded-2xl font-black uppercase">Entendido</button>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};