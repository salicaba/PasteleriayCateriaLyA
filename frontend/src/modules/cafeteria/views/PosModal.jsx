import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Phone, User, CheckCircle2, AlertCircle, AlertTriangle, ShoppingBag, ChevronDown } from 'lucide-react';
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
import MenuLoader from '../../../components/animations/MenuLoader';

const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalVariants = { 
  hidden: { y: "100%", opacity: 0 }, 
  visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 26, stiffness: 260 } }, 
  exit: { y: "100%", opacity: 0 } 
};

export const PosModal = ({ 
  isOpen, onClose, mesa, todasLasMesas, onTableRelease, onUpdateTable, 
  onUnirMesas, onPagoParcial, inline = false, showToast: externalShowToast 
}) => {
  
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

  const [isRendering, setIsRendering] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOpcionesMesa, setShowOpcionesMesa] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);
  const [previewTicketData, setPreviewTicketData] = useState(null);
  const [checkoutTarget, setCheckoutTarget] = useState({ type: 'full', cuentaName: null, amount: 0 });

  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [localToast, setLocalToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    if (externalShowToast) {
      externalShowToast(msg, type);
    } else {
      setLocalToast({ msg, type });
      setTimeout(() => setLocalToast(null), 3500);
    }
  };

  const { 
    cart, total, addToCart, removeFromCart, deleteLine, filtroTexto, setFiltroTexto, 
    categoriaActiva, setCategoriaActiva, filteredProducts, 
    handleCheckout, handleCloseTable, handlePrintTicket, isSuccess,
    unsentTotal, hasUnsentItems, simulateKitchenSend, toggleDeliveredStatus,
    cuentaActiva, setCuentaActiva, cuentasDisponibles, addNewCuenta, getSubtotalByCuenta, payCuenta,
    moveItemToCuenta, dbCategories, orderStatus, paidAccounts, validateAllDelivered,
    toggleItemTakeaway, cuentasTelefonos, deliverAllActiveItems, cancelItem, cancelFullOrder, cancelAccountItems
  } = usePosController(mesa, isOpen, todasLasMesas); 

  const cuentasPagadasReales = Array.from(new Set([...(paidAccounts || [])]));
  const isAccountLocked = cuentasPagadasReales.includes(cuentaActiva || 'General');

  useEffect(() => {
    if (isOpen) {
      setIsRendering(true);
      const timer = setTimeout(() => setIsRendering(false), 400); 
      return () => clearTimeout(timer);
    }
  }, [isOpen, categoriaActiva]); 

  const rawNumeroStr = String(mesa?.numero || mesa?.id || '').trim();
  const esMesaFisica = /^(M|T)?-?\d+$/i.test(rawNumeroStr);

  const isLlevar = (mesa?.zona === 'llevar' || mesa?.orderType === 'LLEVAR') && !esMesaFisica;
  const isVitrina = mesa?.zona === 'vitrina' || mesa?.id === 'VITRINA-EXPRESS';

  const handleConfirmOption = (productWithOptions) => { 
    addToCart(productWithOptions); 
    setSelectedProduct(null); 
    // 🔥 ELIMINADO: showToast('Producto añadido', 'success'); -> usePosCart ya lo gestiona
  };

  const handleSendToKitchen = async () => {
    if (!hasUnsentItems || isProcessingAction) return; 
    setIsProcessingAction(true);
    try {
      await new Promise((resolve, reject) => {
        simulateKitchenSend(() => {
          if (onUpdateTable && unsentTotal > 0) onUpdateTable(mesa.id, unsentTotal);
          showToast('Comanda enviada a cocina', 'success');
          resolve();
        }).catch(reject);
      });
    } catch (error) {
      console.error(error);
      showToast('Error al enviar comanda', 'error');
      throw error;
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleOpenCheckout = () => {
    if (!isVitrina && !validateAllDelivered()) { 
      showToast("Todos los productos deben estar marcados como ENTREGADOS antes de cobrar.", "warning");
      return; 
    }
    if (cart.length === 0 && (!mesa.total || mesa.total === 0)) return;
    setCheckoutTarget({ type: 'full', cuentaName: null, amount: total });
    setShowCheckout(true); 
  };

  const handleOpenPayCuenta = (cuentaName) => {
    if (!isVitrina && !validateAllDelivered(cuentaName)) { 
      showToast(`Los productos de la cuenta "${cuentaName}" deben estar ENTREGADOS antes de cobrar.`, "warning");
      return; 
    }
    const subtotal = getSubtotalByCuenta(cuentaName);
    if (subtotal > 0) { 
      setCheckoutTarget({ type: 'partial', cuentaName, amount: subtotal }); 
      setShowCheckout(true); 
    }
  };

  const handleFinalizePayment = async (paymentDetails) => {
    const { amountPaid, targetType, cuentaName } = paymentDetails;
    
    if (targetType === 'partial' && cuentaName) { 
      await payCuenta(cuentaName, paymentDetails, () => { 
        if (onPagoParcial) onPagoParcial(mesa.id, amountPaid); 
        setPaymentSuccessData({ title: '¡Cuenta Cobrada!', message: `La cuenta "${cuentaName}" ha sido pagada exitosamente.` });
        setTimeout(() => setPaymentSuccessData(null), 2000);
        setShowCheckout(false); 
      }); 
      return; 
    }
    
    if (unsentTotal > 0 && onUpdateTable) onUpdateTable(mesa.id, unsentTotal);
    
    await handleCheckout(paymentDetails, () => {
       setPaymentSuccessData({ title: '¡Cobro Exitoso!', message: `El total ha sido pagado exitosamente.` });
       setTimeout(() => setPaymentSuccessData(null), 2000);
       setShowCheckout(false); 
    });
  };

  const finalizeTable = async () => { 
    if (onPagoParcial && total > 0) onPagoParcial(mesa.id, total);
    try {
      await handleCloseTable(); 
      if (onTableRelease) await Promise.resolve(onTableRelease(mesa.id)); 
      if (!inline) onClose(); 
    } catch (error) {
      console.error("Error liberando mesa:", error);
      throw error; 
    }
  };

  const executeRealPrint = async () => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    
    const targetCuenta = previewTicketData.cuentaName;
    setPreviewTicketData(null); 
    showToast('Enviando ticket a la impresora...', 'success');
    
    try { 
      await handlePrintTicket(targetCuenta); 
    } catch (error) { 
      console.error("Fallo al imprimir:", error); 
      showToast('Error al intentar imprimir el ticket', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  if (!isOpen || !mesa) return null;

  let numeroReal = 'Pedido';
  let nombreParaSidebar = '';

  if (rawNumeroStr.includes(' - ')) {
     const partes = rawNumeroStr.split(' - ');
     numeroReal = partes[0].trim();
     nombreParaSidebar = partes.slice(1).join(' - ').trim();
  } else {
     numeroReal = rawNumeroStr.trim();
  }

  if (!isLlevar && !isVitrina) {
    numeroReal = numeroReal.replace(/#/g, '').trim();
  }

  const HeaderTitle = () => {
    if (isVitrina) return <h3 className="font-black text-gray-900 dark:text-white lya:text-lya-text text-xl flex items-center gap-2">Mostrador ⚡</h3>;
    if (isLlevar) return <h3 className="font-black text-gray-900 dark:text-white lya:text-lya-text text-xl flex items-center gap-2">{numeroReal}</h3>;
    return <h3 className="font-black text-gray-900 dark:text-white lya:text-lya-text text-xl flex items-center gap-2">Mesa #{numeroReal}</h3>;
  };

  const handleSendWhatsAppTicket = (phone, itemsToPrint, totalToPrint, cuentaName) => {
    const orderId = mesa?.orderId || mesa?.id;

    let baseApiUrl = client.defaults.baseURL || 'https://lya-backend-2gay.onrender.com/api';
    if (baseApiUrl.includes('localhost') || baseApiUrl.includes('127.0.0.1')) {
      baseApiUrl = 'https://lya-backend-2gay.onrender.com/api';
    }
    
    const shortId = orderId.split('-')[0];
    let shareLink = `${baseApiUrl}/pos/ticket/${shortId}`;
    
    if (cuentaName && cuentaName !== 'Todas') {
      shareLink += `?cuenta=${encodeURIComponent(cuentaName)}`;
    }

    const direccionTexto = `📍 *UBICACIÓN:* Segunda Calle Ote. Nte., Nuevo Mexico, 30540 Pijijiapan, Chis.\n🗺️ *VER MAPA:* https://maps.app.goo.gl/hTiGxsjqGc5VEr5A8?g_st=a`;
    const textoCuenta = (cuentaName && cuentaName !== 'Todas') ? ` de la cuenta de *${cuentaName}*` : '';
    const mensajeWhatsApp = `🧁 *𝓛𝔂𝓪 Pastelería & Cafetería* ☕\n\n¡Hola! Agradecemos mucho tu preferencia. Aquí tienes tu ticket digital${textoCuenta}:\n\n🔗 ${shareLink}\n\n*Total de la cuenta:* $${totalToPrint.toFixed(2)}\n\n${direccionTexto}\n\n¡Esperamos verte pronto de nuevo! ✨`;

    const urlApiWhatsApp = `https://api.whatsapp.com/send?phone=52${phone}&text=${encodeURIComponent(mensajeWhatsApp)}`;
    window.open(urlApiWhatsApp, '_blank');
    showToast('Redirigiendo a WhatsApp...', 'success');
  };

  const sidebarProps = {
    cart, total, hasUnsentItems, unsentTotal, mesaTotal: total - unsentTotal,
    onAdd: addToCart, onRemove: removeFromCart, onDelete: deleteLine,
    onSendToKitchen: handleSendToKitchen, onCheckout: handleOpenCheckout,
    cuentaActiva, setCuentaActiva, cuentasDisponibles, addNewCuenta, getSubtotalByCuenta,
    onPayCuenta: handleOpenPayCuenta, onMoveItem: moveItemToCuenta,
    orderStatus, paidAccounts, 
    onPrintTicket: (c) => {
      let telefonoPredeterminado = '';
      if (c) {
        telefonoPredeterminado = cuentasTelefonos[c] || '';
      } else {
        const telefonosGuardados = Object.values(cuentasTelefonos).filter(t => t && t.trim() !== '');
        if (telefonosGuardados.length === 1) telefonoPredeterminado = telefonosGuardados[0];
      }
      setPreviewTicketData({ cuentaName: c, telefono: telefonoPredeterminado });
    }, 
    onCloseTable: finalizeTable, toggleDeliveredStatus, 
    isLlevar: (isLlevar || isVitrina), 
    isVitrina, 
    toggleItemTakeaway, cuentasTelefonos,
    onDeliverAll: deliverAllActiveItems,        
    onCancelItem: cancelItem,                    
    onCancelFullOrder: cancelFullOrder,
    onCancelAccount: cancelAccountItems,
    nombreCliente: isLlevar ? nombreParaSidebar : null,
    showToast 
  };

  const totalItemsInCart = cart.filter(item => item.status !== 'CANCELLED').reduce((acc, curr) => acc + curr.qty, 0);

  const posContent = (
    <div className={`relative h-full w-full flex-1 flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg transition-colors duration-300 ${!inline ? 'md:rounded-[2.5rem] shadow-2xl overflow-hidden lya:border lya:border-lya-border/40' : 'rounded-[2rem] border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 overflow-hidden'}`}>
      
      {/* SECCIÓN IZQUIERDA: MENÚ Y BÚSQUEDA */}
      <div className="flex-1 flex flex-col h-full relative z-0 overflow-hidden">
        <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-5 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 sticky top-0 z-20 shadow-sm transition-colors shrink-0">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 lya:text-lya-text/40" size={18} />
              <input 
                type="text" 
                placeholder="Buscar producto..." 
                value={filtroTexto} 
                onChange={(e) => setFiltroTexto(e.target.value)} 
                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg rounded-[1.5rem] text-sm font-bold outline-none focus:ring-4 focus:ring-orange-500/10 lya:focus:ring-lya-secondary/20 border-2 border-transparent focus:border-orange-500 dark:focus:border-orange-500 lya:focus:border-lya-secondary transition-all text-gray-800 dark:text-white lya:text-lya-text placeholder-gray-400 dark:placeholder-gray-500 lya:placeholder-lya-text/40" 
              />
            </div>
            {!inline && (
              <button 
                onClick={onClose} 
                className="p-3 bg-white dark:bg-gray-800 lya:bg-lya-bg border border-gray-100 dark:border-gray-700 lya:border-lya-border/30 md:hover:bg-gray-50 dark:md:hover:bg-gray-700 lya:md:hover:bg-lya-border/50 rounded-[1.25rem] text-gray-500 dark:text-gray-400 transition-colors active:scale-95 shadow-sm shrink-0"
              >
                <X size={20} />
              </button>
            )}
          </div>
          <CategoryBar categories={dbCategories} active={categoriaActiva} onSelect={setCategoriaActiva} />
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar pb-32 md:pb-5 relative">
          <AnimatePresence mode="wait">
            {isRendering ? (
              <MenuLoader key="menu-loader" />
            ) : (
              <motion.div
                key="product-grid"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
              >
                {filteredProducts.map(product => {
                  
                  // 🔥 CÁLCULO DE STOCK EN TIEMPO REAL PARA ESTA TARJETA
                  const currentCartQty = cart
                    .filter(item => item.id === product.id && item.status !== 'CANCELLED')
                    .reduce((acc, item) => acc + item.qty, 0);

                  return (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      isLocked={isAccountLocked}
                      cartQty={currentCartQty} // 🚀 Pasamos la cantidad actual en carrito
                      onLimitReached={(stock) => showToast(`Límite en carrito: Solo quedan ${stock} en stock.`, 'warning')} // 🔒 Alerta del candado
                      onClick={setSelectedProduct} 
                      onQuickAdd={(p) => {
                        let ops = p.opciones;
                        if (typeof ops === 'string') try { ops = JSON.parse(ops); } catch (e) { ops = null; }
                        let precioAdicional = 0, detalles = { tamano: 'Estándar' };
                        if (ops && typeof ops === 'object') {
                           if (ops.defaults?.tamano) { detalles.tamano = ops.defaults.tamano; const t = ops.tamanos?.find(x => x.nombre === ops.defaults.tamano); if (t?.precioAdicional) precioAdicional += Number(t.precioAdicional); }
                           if (ops.defaults?.leche) { detalles.leche = ops.defaults.leche; const l = ops.leches?.find(x => x.nombre === ops.defaults.leche); if (l?.precioAdicional) precioAdicional += Number(l.precioAdicional); }
                        }
                        addToCart({ ...p, precioFinal: Number(p.precioBase || p.precio || 0) + precioAdicional, detalles });
                        // 🔥 ELIMINADO: showToast('Producto añadido', 'success'); -> usePosCart ya lo gestiona
                      }} 
                    />
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* SECCIÓN DERECHA */}
      <div className="hidden md:flex w-96 border-l border-gray-100 dark:border-gray-800 lya:border-lya-border/40 bg-white dark:bg-gray-900 lya:bg-lya-surface h-full shadow-2xl z-20 flex-col transition-colors shrink-0 overflow-hidden">
        <div className="p-5 bg-orange-50/50 dark:bg-orange-900/10 lya:bg-lya-primary/5 border-b border-orange-100 dark:border-orange-900/30 lya:border-lya-primary/20 flex justify-between items-start transition-colors shrink-0">
           <div>
              <HeaderTitle />
              <p className="text-xs text-orange-600 dark:text-orange-400 lya:text-lya-primary mt-1 font-bold tracking-wide uppercase">
                {isVitrina ? 'Cobro Inmediato' : (isLlevar ? 'Venta para Llevar' : 'Consumo en Salón')}
              </p>
           </div>
        </div>
        <div className="flex-1 overflow-hidden h-full">
          <TicketSidebar {...sidebarProps} />
        </div>
      </div>

      {/* FAB MÓVIL */}
      <div className="md:hidden absolute bottom-6 inset-x-0 flex justify-center z-30 pointer-events-none px-4">
        <button
          onClick={() => setIsMobileCartOpen(true)}
          className="pointer-events-auto w-full max-w-[320px] bg-gray-900 active:bg-black dark:bg-white dark:active:bg-gray-100 lya:bg-lya-primary lya:active:bg-lya-primary/90 text-white dark:text-gray-900 lya:text-white px-6 py-4 rounded-[2rem] shadow-[0_15px_35px_-5px_rgba(0,0,0,0.3)] flex items-center justify-between font-black active:scale-95 transition-all border border-gray-800 dark:border-gray-200 lya:border-lya-primary"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingBag size={22} />
              {totalItemsInCart > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-500 lya:bg-lya-secondary text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-gray-900 dark:border-white lya:border-lya-primary shadow-sm">
                  {totalItemsInCart}
                </span>
              )}
            </div>
            <span className="text-sm uppercase tracking-wider">Comanda</span>
          </div>
          <span className="text-lg bg-white/10 dark:bg-black/10 px-3 py-1 rounded-xl">${(total).toFixed(2)}</span>
        </button>
      </div>

      {/* CAJÓN DESLIZABLE */}
      <AnimatePresence>
        {isMobileCartOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="md:hidden absolute inset-0 z-[100] bg-white dark:bg-gray-900 lya:bg-lya-surface flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="p-4 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg flex items-center justify-between border-b border-gray-200 dark:border-gray-700 lya:border-lya-border/40 shadow-sm z-10 shrink-0">
              <div>
                <HeaderTitle />
                <p className="text-[10px] text-orange-600 dark:text-orange-400 lya:text-lya-primary mt-0.5 font-bold tracking-wider uppercase">
                  {isVitrina ? 'Cobro Inmediato' : (isLlevar ? 'Venta para Llevar' : 'Consumo en Salón')}
                </p>
              </div>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="p-2.5 bg-white dark:bg-gray-700 lya:bg-lya-surface rounded-full shadow-sm border border-gray-200 dark:border-gray-600 lya:border-lya-border/40 text-gray-500 active:scale-95 transition-transform shrink-0"
              >
                <ChevronDown size={20} className="text-gray-900 dark:text-white lya:text-lya-text" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden h-full">
              <TicketSidebar {...sidebarProps} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );

  return (
    <>
      {inline ? (
        <div className="w-full h-full animate-fade-in">{posContent}</div>
      ) : (
        typeof document !== 'undefined' ? createPortal(
          <>
            <div className="fixed inset-0 z-[9980] flex items-end md:items-center justify-center p-0 md:p-4 overflow-hidden">
              <motion.div variants={backdropVariants} initial="hidden" animate="visible" exit="hidden" onClick={onClose} className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 lya:bg-lya-dark/50 backdrop-blur-sm z-0 transition-colors" />
              <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="relative z-10 w-full h-[100dvh] md:h-[92vh] md:max-w-7xl shadow-2xl md:rounded-[2.5rem] flex flex-col overflow-hidden">
                {posContent}
              </motion.div>
            </div>

            <div className="relative z-[9999]">
                <TicketPreviewModal 
                  isOpen={!!previewTicketData} 
                  onClose={() => setPreviewTicketData(null)} 
                  cart={cart} 
                  mesa={mesa} 
                  cuentaName={previewTicketData?.cuentaName} 
                  telefonoPredeterminado={previewTicketData?.telefono}
                  onConfirmPrint={executeRealPrint} 
                  onSendWhatsApp={handleSendWhatsAppTicket} 
                  userName={nombreCajero}
                  cuentasPagadasReales={cuentasPagadasReales}
                  cuentasTelefonos={cuentasTelefonos} 
                />

                <AnimatePresence>
                  {localToast && (
                    <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
                      <motion.div 
                        initial={{ opacity: 0, y: -50, scale: 0.9 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.9, y: -20 }}
                        className={`bg-white/90 dark:bg-gray-900/90 lya:bg-lya-surface/90 backdrop-blur-xl text-gray-800 dark:text-white lya:text-lya-text px-6 py-4 rounded-full shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] flex items-center justify-center gap-3 font-bold border pointer-events-auto transition-colors max-w-md w-full sm:w-auto text-center ${
                          localToast.type === 'success' ? 'border-emerald-200/50 dark:border-emerald-900/30 lya:border-lya-primary/30' :
                          localToast.type === 'warning' ? 'border-amber-200/50 dark:border-amber-900/30 lya:border-amber-500/30' :
                          'border-red-200/50 dark:border-red-900/30 lya:border-red-500/30'
                        }`}
                      >
                        <div className={`p-1.5 rounded-full shrink-0 ${
                          localToast.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/20 lya:bg-lya-primary/20 text-emerald-500 lya:text-lya-primary' :
                          localToast.type === 'warning' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-500 lya:text-amber-400' :
                          'bg-red-100 dark:bg-red-500/20 text-red-500 lya:text-red-400'
                        }`}>
                          {localToast.type === 'success' ? <CheckCircle2 size={20} strokeWidth={2.5} /> : localToast.type === 'warning' ? <AlertTriangle size={20} strokeWidth={2.5} /> : <AlertCircle size={20} strokeWidth={2.5} />}
                        </div>
                        <div className="flex flex-col items-center justify-center w-full">
                          <span className="text-[15px] leading-tight text-center">{localToast.msg}</span>
                        </div>
                      </motion.div>
                    </div>
                  )}

                  {(isSuccess && !isVitrina) && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9990]"><SuccessScreen /></motion.div>}
                  {paymentSuccessData && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9990]"><SuccessScreen title={paymentSuccessData.title} message={paymentSuccessData.message} /></motion.div>}
                  {selectedProduct && <ProductOptionsModal product={selectedProduct} isVitrina={isVitrina} isLlevar={isLlevar} onClose={() => setSelectedProduct(null)} onConfirm={handleConfirmOption} />}
                  
                  {showCheckout && (
                    <CheckoutModal 
                      isOpen={showCheckout} 
                      onClose={() => setShowCheckout(false)} 
                      total={total} 
                      initialTarget={checkoutTarget} 
                      cuentasResumen={cuentasDisponibles.map(n => ({nombre: n, subtotal: getSubtotalByCuenta(n)})).filter(c => c.subtotal > 0)} 
                      onConfirmPayment={handleFinalizePayment} 
                      orderType={isVitrina ? 'mostrador' : isLlevar ? 'llevar' : 'salon'}
                    />
                  )}

                  {showOpcionesMesa && (
                    <OpcionesMesaModal 
                      isOpen={showOpcionesMesa} 
                      onClose={() => setShowOpcionesMesa(false)} 
                      mesa={mesa} 
                      todasLasMesas={todasLasMesas} 
                      onUnir={(origen, destino) => { setShowOpcionesMesa(false); onUnirMesas(origen, destino); }} 
                    />
                  )}
                </AnimatePresence>
            </div>
          </>,
          document.body
        ) : null
      )}
    </>
  );
};