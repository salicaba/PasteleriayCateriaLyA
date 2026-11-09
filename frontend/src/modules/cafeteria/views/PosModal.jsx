// frontend/src/modules/cafeteria/views/PosModal.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, Search, CheckCircle2, AlertCircle, AlertTriangle, ShoppingBag, ChevronDown, Gift, Sparkles, Layers, Tag, Filter, Receipt, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import client from '../../../api/client'; 
import { usePosController } from '../controllers/usePosController';
import { usePosMenu } from '../controllers/usePosMenu'; 
import { ProductCard, getPromoColor } from './ProductCard';
import { TicketSidebar } from './TicketSidebar'; 
import { CategoryBar } from './CategoryBar';
import { SuccessScreen } from './SuccessScreen';
import { ProductOptionsModal } from './ProductOptionsModal';
import { CheckoutModal } from './CheckoutModal'; 
import { OpcionesMesaModal } from './OpcionesMesaModal';
import { TicketPreviewModal } from './TicketPreviewModal';
import MenuLoader from '../../../components/animations/MenuLoader';

const parseAccountName = (str) => {
  if (!str) return 'General';
  const s = String(str);
  if (s.includes(' | ')) return s.split(' | ')[0].trim();
  if (s.includes(' - ')) {
    const parts = s.split(' - ');
    const possiblePhone = parts[parts.length - 1].replace(/\D/g, '');
    if (possiblePhone.length >= 10) return parts.slice(0, -1).join(' - ').trim();
  }
  return s;
};

const getPromoRuleDescription = (promo) => {
  if (!promo) return '';
  const type = promo.type;
  if (type === 'TICKET_DISCOUNT') {
    const minAmount = Number(promo.minTicketAmount || promo.min_ticket_amount || 0);
    const disc = Number(promo.discountValue || promo.discount_value || 0);
    const isPct = (promo.discountType || promo.discount_type) === 'PERCENTAGE';
    const benefit = isPct ? `un ${disc}% de descuento` : `$${disc.toFixed(2)} de descuento`;
    return minAmount > 0
      ? `Al acumular $${minAmount.toFixed(2)} o más de cualquier producto en una misma cuenta, se aplica automáticamente ${benefit} sobre el total.`
      : `Se aplica automáticamente ${benefit} sobre el total de la cuenta.`;
  }
  if (type === 'NxM') {
    const buy = promo.buyQty || promo.buy_qty || 3;
    const pay = promo.payQty || promo.pay_qty || 2;
    return `Lleva ${buy} productos participantes y paga solo ${pay}.`;
  }
  if (type === 'FIXED') {
    const disc = Number(promo.discountValue || promo.discount_value || 0);
    return `Descuento directo de $${disc.toFixed(2)} en cada unidad.`;
  }
  if (type === 'NTH_FIXED') {
    const nth = promo.buyQty || promo.buy_qty || 2;
    const disc = Number(promo.discountValue || promo.discount_value || 0);
    return `Al llevar ${nth} productos del grupo, el ${nth}º recibe $${disc.toFixed(2)} de descuento.`;
  }
  if (type === 'COMBO') {
    const price = Number(promo.discountValue || promo.discount_value || 0);
    return `Lleva todos los productos del paquete por un precio fijo de $${price.toFixed(2)}.`;
  }
  if (type === 'BOGO') {
    const buy = promo.buyQty || promo.buy_qty || 1;
    const pay = promo.payQty || promo.pay_qty || 1;
    const discVal = promo.discountValue ?? promo.discount_value;
    const rewardText = (discVal === 0 || discVal === undefined || discVal === null)
      ? 'GRATIS'
      : `por $${Number(discVal).toFixed(2)}`;
    return `Compra ${buy} producto(s) participante(s) y llévate ${pay} de recompensa ${rewardText}.`;
  }
  return 'Promoción especial activa.';
};

const getShortPromoLabel = (promo) => {
  if (!promo) return 'Promo';
  const type = promo.type;
  if (type === 'TICKET_DISCOUNT') {
    const disc = Number(promo.discountValue || promo.discount_value || 0);
    const isPct = (promo.discountType || promo.discount_type) === 'PERCENTAGE';
    return isPct ? `-${disc}% en Ticket` : `-$${disc.toFixed(0)} en Ticket`;
  }
  if (type === 'NxM') return `${promo.buyQty || promo.buy_qty || 3}x${promo.payQty || promo.pay_qty || 2}`;
  if (type === 'FIXED') return `-$${Number(promo.discountValue || promo.discount_value || 0).toFixed(0)}`;
  if (type === 'NTH_FIXED') return `${promo.buyQty || promo.buy_qty || 2}ª con Desc.`;
  if (type === 'COMBO') return `Combo $${Number(promo.discountValue || promo.discount_value || 0).toFixed(0)}`;
  if (type === 'BOGO') return `Compra ${promo.buyQty || 1} y Llévate ${promo.payQty || 1}`;
  return promo.name || 'Promo';
};

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
  const [isMenuLoaded, setIsMenuLoaded] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOpcionesMesa, setShowOpcionesMesa] = useState(false);
  const [showPromoGuide, setShowPromoGuide] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);
  const [previewTicketData, setPreviewTicketData] = useState(null);
  const [checkoutTarget, setCheckoutTarget] = useState({ type: 'full', cuentaName: null, amount: 0 });
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const lockWhatsAppRef = useRef(false);
  const [localToast, setLocalToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    if (externalShowToast) {
      externalShowToast(msg, type);
    } else {
      setLocalToast({ msg, type });
      setTimeout(() => setLocalToast(null), 3500);
    }
  };

  const rawNumeroStr = String(mesa?.numero || mesa?.id || '').trim();
  const esMesaFisica = /^(M|T)?-?\d+$/i.test(rawNumeroStr);
  const isLlevar = (mesa?.zona === 'llevar' || mesa?.orderType === 'LLEVAR') && !esMesaFisica;
  const isVitrina = mesa?.zona === 'vitrina' || mesa?.id === 'VITRINA-EXPRESS';

  const { 
    dbProducts, dbCategories, activePromotions, filtroTexto, setFiltroTexto, 
    categoriaActiva, setCategoriaActiva, promoFiltro, setPromoFiltro, filteredProducts 
  } = usePosMenu(isVitrina);

  const allGlobalProducts = useMemo(() => dbProducts || [], [dbProducts]);

  const validTodayPromos = useMemo(() => {
    const promosArray = Array.isArray(activePromotions) 
      ? activePromotions 
      : (activePromotions?.data || activePromotions?.promotions || []);

    const nowInChiapasStr = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
    const today = new Date(nowInChiapasStr).getDay();

    return promosArray.filter(p => {
      const rawActive = p.isActive ?? p.is_active ?? p.status;
      if (rawActive !== true && rawActive !== 1 && rawActive !== 'true' && rawActive !== '1') return false;

      const daysRaw = p.validDays || p.valid_days;
      let validDaysAsNumbers = [];
      if (Array.isArray(daysRaw)) {
        validDaysAsNumbers = daysRaw.map(Number);
      } else if (typeof daysRaw === 'string') {
        try { validDaysAsNumbers = JSON.parse(daysRaw).map(Number); } 
        catch (e) { validDaysAsNumbers = daysRaw.replace(/[\[\]]/g, '').split(',').map(n => Number(n.trim())); }
      }
      if (validDaysAsNumbers.length > 0 && !validDaysAsNumbers.includes(today)) return false;
      return true;
    }).map(p => {
      const isTicketDiscount = p.type === 'TICKET_DISCOUNT';

      if (isTicketDiscount) {
        return {
          promo: p,
          colorScheme: {
            badge: 'bg-emerald-600 text-white',
            btn: 'bg-emerald-600 text-white shadow-emerald-500/30 md:hover:bg-emerald-700',
            bannerBg: 'bg-emerald-50/90 dark:bg-emerald-950/40 lya:bg-emerald-50/90 border-emerald-300 dark:border-emerald-800/60 lya:border-emerald-300'
          },
          products: [],
          isCombinable: true,
          isTicketDiscount: true
        };
      }

      const triggerIds = (Array.isArray(p.applyToProducts) && p.applyToProducts.length > 0)
        ? p.applyToProducts.map(id => String(id).toLowerCase())
        : [String(p.productId || p.product_id || '').toLowerCase()];

      const matchingProducts = allGlobalProducts.filter(prod => {
        if (isVitrina && prod.requiereCocina !== false) return false;
        return triggerIds.includes(String(prod.id).toLowerCase());
      });

      return {
        promo: p,
        colorScheme: getPromoColor(p.id),
        products: matchingProducts,
        isCombinable: matchingProducts.length > 1,
        isTicketDiscount: false
      };
    }).filter(item => item.isTicketDiscount || item.products.length > 0);
  }, [activePromotions, allGlobalProducts, isVitrina]);

  const activeTicketPromos = useMemo(() => {
    return validTodayPromos
      .filter(item => item.isTicketDiscount)
      .map(item => item.promo)
      .sort((a, b) => Number(a.minTicketAmount || a.min_ticket_amount || 0) - Number(b.minTicketAmount || b.min_ticket_amount || 0));
  }, [validTodayPromos]);

  const handleTogglePromoFilter = (promo) => {
    if (!promo || promo.type === 'TICKET_DISCOUNT') {
      setPromoFiltro(null);
      return;
    }
    if (promoFiltro && String(promoFiltro.id) === String(promo.id)) {
      setPromoFiltro(null);
    } else {
      setPromoFiltro(promo);
    }
  };

  const { 
    cart, total, addToCart, removeFromCart, deleteLine, 
    handleCheckout, handleCloseTable, handlePrintTicket, isSuccess,
    unsentTotal, hasUnsentItems, simulateKitchenSend, toggleDeliveredStatus,
    cuentaActiva, setCuentaActiva, cuentasDisponibles, addNewCuenta, getSubtotalByCuenta, payCuenta,
    moveItemToCuenta, mergeAccountToCuenta, orderStatus, paidAccounts, validateAllDelivered,
    toggleItemTakeaway, cuentasTelefonos, deliverAllActiveItems, cancelItem, cancelFullOrder, cancelAccountItems,
    releaseAccount, promoWarning, confirmPromoRupture, cancelPromoRupture,
    pendingPromoReward, setPendingPromoReward, claimPromoReward,
    suspendedPromos
  } = usePosController(mesa, isOpen, todasLasMesas, showToast, onTableRelease, onClose, inline);

  const cuentasPagadasReales = Array.from(new Set([...(paidAccounts || [])]));
  const isAccountLocked = cuentasPagadasReales.includes(cuentaActiva || 'General');
  const activeCart = cart.filter(item => item.status !== 'CANCELLED');

  const activeAccountPhysicalSubtotal = useMemo(() => {
    const targetAcc = cuentaActiva || 'General';
    return activeCart
      .filter(i => (i.cuenta || 'General') === targetAcc && !i.isVirtualDiscount)
      .reduce((sum, i) => sum + ((Number(i.precio) || 0) * (i.qty || 1)), 0);
  }, [activeCart, cuentaActiva]);

  const cleanCuentasDisponibles = cuentasDisponibles.filter(cuenta => {
    const itemsDeCuenta = cart.filter(i => (i.cuenta || 'General') === cuenta);
    if (itemsDeCuenta.length === 0) return true; 
    return !itemsDeCuenta.every(i => i.status === 'CANCELLED'); 
  }).sort((a, b) => {
    const isAPaid = cuentasPagadasReales.includes(a);
    const isBPaid = cuentasPagadasReales.includes(b);
    if (isAPaid && !isBPaid) return 1;
    if (!isAPaid && isBPaid) return -1;
    return cuentasDisponibles.indexOf(a) - cuentasDisponibles.indexOf(b);
  });

  useEffect(() => {
    if (isOpen) {
      if (dbCategories && dbCategories.length > 0) {
        const timer = setTimeout(() => setIsMenuLoaded(true), 800);
        return () => clearTimeout(timer);
      } else {
        const fallback = setTimeout(() => setIsMenuLoaded(true), 2500);
        return () => clearTimeout(fallback);
      }
    }
  }, [isOpen, dbCategories]);

  let numeroReal = 'Pedido';
  let nombreParaSidebar = '';

  if (rawNumeroStr.includes(' - ')) {
     const partes = rawNumeroStr.split(' - ');
     numeroReal = partes[0].trim();
     nombreParaSidebar = partes.slice(1).join(' - ').trim();
  } else {
     numeroReal = rawNumeroStr.trim();
  }
  if (!isLlevar && !isVitrina) numeroReal = numeroReal.replace(/#/g, '').trim();

  const loaderTitle = isVitrina ? "Preparando el mostrador..." : isLlevar ? "Preparando pedido para llevar..." : "Preparando tu mesa...";

  const HeaderTitle = () => {
    if (isVitrina) return <h3 className="font-black text-gray-900 dark:text-white lya:text-lya-text text-xl flex items-center gap-2">Mostrador ⚡</h3>;
    if (isLlevar) return <h3 className="font-black text-gray-900 dark:text-white lya:text-lya-text text-xl flex items-center gap-2">{numeroReal}</h3>;
    return <h3 className="font-black text-gray-900 dark:text-white lya:text-lya-text text-xl flex items-center gap-2">Mesa #{numeroReal}</h3>;
  };

  const handleSendWhatsAppTicket = (phone, itemsToPrint, totalToPrint, cuentaName) => {
    if (lockWhatsAppRef.current) return;
    lockWhatsAppRef.current = true;
    setIsProcessingAction(true);

    const orderId = mesa?.orderId || mesa?.id;
    let baseApiUrl = client.defaults.baseURL || 'https://lya-backend-2gay.onrender.com/api';
    const shortId = orderId.split('-')[0];
    let shareLink = `https://pascaf-lya.vercel.app/api/pos/ticket/${shortId}`;
    
    if (cuentaName && cuentaName !== 'Todas') shareLink += `?cuenta=${encodeURIComponent(cuentaName)}`;

    const direccionTexto = `📍 *UBICACIÓN:* Segunda Calle Ote. Nte., Nuevo Mexico, 30540 Pijijiapan, Chis.\n🗺 *VER MAPA:* https://maps.app.goo.gl/hTiGxsjqGc5VEr5A8?g_st=a`;
    
    let textoCuenta = '';
    if (isVitrina) {
      textoCuenta = ' de *Mostrador*';
    } else if (isLlevar) {
      const nombreCliente = parseAccountName(nombreParaSidebar || numeroReal);
      textoCuenta = ` a nombre de *${nombreCliente}*`;
    } else {
      const cleanName = parseAccountName(cuentaName);
      if (cuentaName && cuentaName !== 'Todas' && cuentaName !== 'General') {
        textoCuenta = ` de la cuenta de *${cleanName}*`;
      } else {
        textoCuenta = ` de la *Mesa #${numeroReal}*`;
      }
    }

    const mensajeWhatsApp = `🧁 *𝓛𝔂𝓪 Pastelería & Cafetería* ☕\n\n¡Hola! Agradecemos mucho tu preferencia. Aquí tienes tu ticket digital${textoCuenta}:\n\n🔗 ${shareLink}\n\n*Total a pagar:* $${totalToPrint.toFixed(2)}\n\n${direccionTexto}\n\n¡Esperamos verte pronto de nuevo! ✨`;

    const appUrl = `whatsapp://send?phone=52${phone}&text=${encodeURIComponent(mensajeWhatsApp)}`;
    const webUrl = `https://web.whatsapp.com/send?phone=52${phone}&text=${encodeURIComponent(mensajeWhatsApp)}`;

    window.location.href = appUrl;

    setTimeout(() => {
      if (!document.hidden) {
        window.open(webUrl, 'whatsapp_window');
        showToast('Abriendo WhatsApp Web...', 'success');
      }
      setTimeout(() => {
        lockWhatsAppRef.current = false;
        setIsProcessingAction(false);
      }, 500);
    }, 600);
  };

  const handleConfirmOption = (productWithOptions) => { 
    addToCart(productWithOptions); 
    setSelectedProduct(null); 
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
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleOpenCheckout = () => {
    const cuentasActivas = Array.from(new Set(activeCart.filter(i => !cuentasPagadasReales.includes(i.cuenta || 'General')).map(i => i.cuenta || 'General')));
    const isMesaCompletaLista = validateAllDelivered();
    const isAlgunaCuentaLista = cuentasActivas.some(cuenta => validateAllDelivered(cuenta));

    if (!isVitrina && !isMesaCompletaLista && !isAlgunaCuentaLista) { 
      showToast("Debes tener al menos una cuenta con todos sus productos ENTREGADOS para poder cobrar.", "warning");
      return; 
    }
    
    if (activeCart.length === 0 && (!mesa.total || mesa.total === 0)) return;
    setCheckoutTarget({ type: 'full', cuentaName: null, amount: total });
    setShowCheckout(true); 
  };

  const handleOpenPayCuenta = (cuentaName) => {
    if (!isVitrina && !validateAllDelivered(cuentaName)) { 
      showToast(`Los productos de la cuenta "${parseAccountName(cuentaName)}" deben estar ENTREGADOS antes de cobrar.`, "warning");
      return; 
    }
    const subtotal = getSubtotalByCuenta(cuentaName);
    if (subtotal > 0) { 
      setCheckoutTarget({ type: 'partial', cuentaName, amount: subtotal }); 
      setShowCheckout(true); 
    }
  };

  const handleFinalizePayment = async (paymentDetails) => {
    const { amountPaid, targetType, cuentaName, isLastInBatch } = paymentDetails;
    
    if (targetType === 'partial' || targetType === 'silent_partial') { 
      await payCuenta(cuentaName, paymentDetails, () => { 
        if (onPagoParcial) onPagoParcial(mesa.id, amountPaid); 
        if (targetType === 'partial') {
          setPaymentSuccessData({ title: '¡Cuenta Cobrada!', message: `La cuenta "${parseAccountName(cuentaName)}" ha sido pagada exitosamente.` });
          setTimeout(() => setPaymentSuccessData(null), 2000);
        }
        if (isLastInBatch) setShowCheckout(false); 
      }); 
      return; 
    }
    
    if (unsentTotal > 0 && onUpdateTable) onUpdateTable(mesa.id, unsentTotal);
    
    if (isLlevar || isVitrina) {
      await handleCheckout(paymentDetails, () => {
         setPaymentSuccessData({ title: '¡Cobro Exitoso!', message: `El total ha sido pagado exitosamente.` });
         setTimeout(() => setPaymentSuccessData(null), 2000);
         setShowCheckout(false); 
      });
      return;
    }

    const cuentasActivas = Array.from(new Set(activeCart.filter(i => !cuentasPagadasReales.includes(i.cuenta || 'General')).map(i => i.cuenta || 'General')));

    setIsProcessingAction(true);
    try {
      for (let i = 0; i < cuentasActivas.length; i++) {
        const cName = cuentasActivas[i];
        const subtotalCuenta = getSubtotalByCuenta(cName);
        
        const partialPaymentDetails = {
          ...paymentDetails,
          amountPaid: subtotalCuenta, 
          targetType: 'silent_partial',
          cuentaName: cName,
          isLastInBatch: i === cuentasActivas.length - 1
        };
        
        await new Promise((resolve, reject) => {
          payCuenta(cName, partialPaymentDetails, () => {
             if (onPagoParcial) onPagoParcial(mesa.id, subtotalCuenta);
             resolve();
          }).catch(reject);
        });
      }
      
      setPaymentSuccessData({ title: '¡Cobro Exitoso!', message: `Todas las cuentas han sido pagadas exitosamente.` });
      setTimeout(() => setPaymentSuccessData(null), 2000);
      setShowCheckout(false); 
    } catch (error) {
      showToast("Error al cobrar algunas cuentas", "error");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const finalizeTable = async () => { 
    if (onPagoParcial && total > 0) onPagoParcial(mesa.id, total);
    try {
      await handleCloseTable(); 
      if (isVitrina) return; 
      if (onTableRelease) await Promise.resolve(onTableRelease(mesa.id)); 
      if (!inline) onClose(); 
    } catch (error) {
      console.error("Error liberando mesa:", error);
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
      showToast('Error al intentar imprimir el ticket', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  if (!isOpen || !mesa) return null;

  const sidebarProps = {
    cart: activeCart, total, hasUnsentItems, unsentTotal, mesaTotal: total - unsentTotal,
    onAdd: addToCart, onRemove: removeFromCart, onDelete: deleteLine,
    onSendToKitchen: handleSendToKitchen, onCheckout: handleOpenCheckout,
    cuentaActiva, setCuentaActiva, cuentasDisponibles: cleanCuentasDisponibles, addNewCuenta, getSubtotalByCuenta,
    onPayCuenta: handleOpenPayCuenta, onMoveItem: moveItemToCuenta,
    onMergeAccount: mergeAccountToCuenta,
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
    onReleaseAccount: releaseAccount,
    showToast,
    isProcessing: isProcessingAction
  };

  const totalItemsInCart = activeCart.reduce((acc, curr) => acc + curr.qty, 0);
  const activeFilterColorScheme = promoFiltro ? getPromoColor(promoFiltro.id) : null;
  const isFilteredPromoCombinable = promoFiltro && Array.isArray(promoFiltro.applyToProducts) && promoFiltro.applyToProducts.length > 1;

  const ticketPromoStatus = useMemo(() => {
    if (activeTicketPromos.length === 0) return null;
    const qualifying = [...activeTicketPromos]
      .reverse()
      .find(p => activeAccountPhysicalSubtotal >= Number(p.minTicketAmount || p.min_ticket_amount || 0));
    const nextTarget = activeTicketPromos.find(p => activeAccountPhysicalSubtotal < Number(p.minTicketAmount || p.min_ticket_amount || 0));
    return { qualifying, nextTarget, primary: nextTarget || qualifying || activeTicketPromos[0] };
  }, [activeTicketPromos, activeAccountPhysicalSubtotal]);

  const posContent = (
    <div className={`relative h-full w-full flex-1 flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg transition-colors duration-300 overflow-hidden ${!inline ? 'md:rounded-[2.5rem] shadow-2xl lya:border lya:border-lya-border/40' : 'rounded-[2rem] border border-gray-100 dark:border-gray-800 lya:border-lya-border/30'}`}>
      
      <AnimatePresence>
        {!isMenuLoaded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-[150] rounded-[inherit] overflow-hidden"
          >
            <MenuLoader title={loaderTitle} subtitle="Cargando el menú más fresco" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col h-full relative z-0 overflow-hidden">
        <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-5 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 sticky top-0 z-20 shadow-sm transition-colors shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 lya:text-lya-text/40" size={18} />
              <input 
                type="text" 
                placeholder="Buscar producto..." 
                value={filtroTexto} 
                onChange={(e) => setFiltroTexto(e.target.value)} 
                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg rounded-[1.5rem] text-sm font-bold outline-none focus:ring-4 focus:ring-orange-500/10 lya:focus:ring-lya-secondary/20 border-2 border-transparent focus:border-orange-500 dark:focus:border-orange-500 lya:focus:border-lya-secondary transition-all text-gray-800 dark:text-white lya:text-lya-text placeholder-gray-400 dark:placeholder-gray-500 lya:placeholder-lya-text/40" 
              />
            </div>

            {/* ✨ BOTÓN PÍLDORA HOMOLOGADO: ¿CÓMO FUNCIONAN LAS PROMOS? */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowPromoGuide(true)}
              className="px-3.5 sm:px-4 py-3 bg-orange-50 dark:bg-orange-950/30 lya:bg-lya-primary/10 text-orange-600 dark:text-orange-400 lya:text-lya-primary border border-orange-200/80 dark:border-orange-800/40 lya:border-lya-primary/30 rounded-[1.25rem] flex items-center gap-2 font-black text-xs leading-normal md:hover:bg-orange-100 dark:md:hover:bg-orange-900/40 lya:md:hover:bg-lya-primary/20 transition-all shadow-sm shrink-0 outline-none select-none"
              title="Guía de promociones, reglas por cuenta y productos combinables"
            >
              <Sparkles size={17} className="shrink-0" />
              <span className="hidden sm:inline">¿Cómo funcionan las promos?</span>
              <span className="sm:hidden">Promos</span>
              {validTodayPromos.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-orange-500 dark:bg-orange-500 lya:bg-lya-primary text-white font-black leading-none flex items-center justify-center shrink-0">
                  {validTodayPromos.length}
                </span>
              )}
            </motion.button>
            
            <AnimatePresence>
              {suspendedPromos?.length > 0 && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      showToast(`⚠️ Promos suspendidas por falta de stock: ${suspendedPromos.map(p => p.name).join(', ')}`, 'warning');
                    }}
                    className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-[1.25rem] border border-red-200 dark:border-red-800/30 flex items-center justify-center relative shadow-sm outline-none md:hover:bg-red-100 dark:md:hover:bg-red-900/40 transition-colors shrink-0"
                    title="Promociones Suspendidas"
                  >
                    <span className="absolute top-0 right-0 flex h-3 w-3 -mt-1 -mr-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <AlertTriangle size={20} />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {!inline && (
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={onClose} 
                className="p-3 bg-white dark:bg-gray-800 lya:bg-lya-bg border border-gray-100 dark:border-gray-700 lya:border-lya-border/30 md:hover:bg-gray-50 dark:md:hover:bg-gray-700 lya:md:hover:bg-lya-border/50 rounded-[1.25rem] text-gray-500 dark:text-gray-400 transition-colors shadow-sm shrink-0 outline-none"
              >
                <X size={20} />
              </motion.button>
            )}
          </div>
          <CategoryBar categories={dbCategories} active={promoFiltro ? 'todas' : categoriaActiva} onSelect={setCategoriaActiva} />
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar pb-32 md:pb-5 relative flex flex-col">
            
            {/* ✨ AVISO INTELIGENTE DE PROMO DE DESCUENTO POR TICKET ACTIVA HOY */}
            {ticketPromoStatus && !promoFiltro && (
              <div className="mb-4 shrink-0">
                <div className="p-3 sm:px-4 sm:py-3 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/30 lya:bg-emerald-50/90 border border-emerald-200 dark:border-emerald-800/50 lya:border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm">
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0 shadow-sm">
                      <Receipt size={12} strokeWidth={2.5} />
                      {getShortPromoLabel(ticketPromoStatus.primary)}
                    </span>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text leading-relaxed text-justify">
                      <span className="font-black text-emerald-700 dark:text-emerald-400 mr-1.5">
                        {ticketPromoStatus.primary.name || 'Promo en Ticket'}:
                      </span>
                      {getPromoRuleDescription(ticketPromoStatus.primary)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {ticketPromoStatus.qualifying ? (
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-600/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-black border border-emerald-500/30">
                        ✅ Aplicado en {parseAccountName(cuentaActiva)}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl bg-white/90 dark:bg-gray-900/70 lya:bg-lya-surface text-gray-700 dark:text-gray-300 lya:text-lya-text text-[11px] font-black border border-emerald-200 dark:border-emerald-800/50">
                        Faltan ${Math.max(0, Number(ticketPromoStatus.primary.minTicketAmount || ticketPromoStatus.primary.min_ticket_amount || 0) - activeAccountPhysicalSubtotal).toFixed(2)} en {parseAccountName(cuentaActiva)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPromoGuide(true)}
                      className="px-2.5 py-1 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/15 text-[11px] font-black text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 md:hover:bg-emerald-600/20 transition-colors leading-normal"
                    >
                      Ver reglas
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ✨ CINTILLO DE FILTRO DE PROMOCIÓN ACTIVO */}
            {promoFiltro && activeFilterColorScheme && (
              <motion.div
                key={`banner-${promoFiltro.id}`}
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="mb-4 shrink-0"
              >
                <div className={`p-3.5 sm:p-4 rounded-[1.5rem] border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${activeFilterColorScheme.bannerBg}`}>
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-sm ${activeFilterColorScheme.badge}`}>
                      {isFilteredPromoCombinable ? <Layers size={13} strokeWidth={2.5} /> : <Tag size={13} strokeWidth={2.5} />}
                      {getShortPromoLabel(promoFiltro)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white lya:text-lya-text">
                          {promoFiltro.name || 'Promoción Activa'}
                        </h4>
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-white/80 dark:bg-gray-900/60 lya:bg-lya-surface text-gray-700 dark:text-gray-200 lya:text-lya-text border border-black/5">
                          {isFilteredPromoCombinable ? '🔗 Combinable en la misma cuenta' : '🎯 Producto único'}
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs font-bold text-gray-600 dark:text-gray-300 lya:text-lya-text/80 mt-0.5 leading-relaxed text-justify">
                        {isFilteredPromoCombinable
                          ? 'Todos estos productos tienen el mismo color de etiqueta: puedes mezclarlos dentro de la misma cuenta para completar la promo.'
                          : getPromoRuleDescription(promoFiltro)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPromoFiltro(null)}
                    className="self-end sm:self-center px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800 lya:bg-lya-surface text-gray-700 dark:text-gray-200 lya:text-lya-text text-xs font-black border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 md:hover:bg-gray-100 dark:md:hover:bg-gray-700 active:scale-95 flex items-center gap-1.5 shrink-0 shadow-sm transition-all"
                  >
                    <X size={14} strokeWidth={2.5} />
                    Ver todo el menú
                  </button>
                </div>
              </motion.div>
            )}

            {/* ✨ CUADRÍCULA CON KEY DINÁMICA */}
            <div
              key={`grid-${categoriaActiva}-${promoFiltro?.id || 'all'}`}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {filteredProducts.map((product, idx) => {
                const currentCartQty = activeCart
                  .filter(item => item.id === product.id && !item.enviadoCocina && !item.isAutoPromo)
                  .reduce((acc, item) => acc + item.qty, 0);

                return (
                  <ProductCard 
                    key={product.id} 
                    index={idx}
                    product={product} 
                    activePromotions={activePromotions}
                    isLocked={isAccountLocked}
                    cartQty={currentCartQty} 
                    onLimitReached={(stock) => showToast(`Límite en carrito: Solo quedan ${stock} en stock.`, 'warning')} 
                    onClick={setSelectedProduct} 
                    onPromoClick={handleTogglePromoFilter}
                    isPromoFiltered={!!promoFiltro}
                    onQuickAdd={(p, customizations) => {
                      if (customizations) {
                        addToCart({ 
                          ...p, 
                          precioFinal: customizations.precioFinal, 
                          detalles: customizations.detalles,
                          isTakeaway: customizations.isTakeaway || p.isTakeaway 
                        });
                      } else {
                        addToCart(p);
                      }
                    }} 
                  />
                );
              })}
            </div>
        </div>
      </div>

      <div className="hidden md:flex w-96 border-l border-gray-100 dark:border-gray-800 lya:border-lya-border/40 bg-white dark:bg-gray-900 lya:bg-lya-surface h-full shadow-2xl z-20 flex-col transition-colors shrink-0 overflow-hidden">
        <div className="p-5 bg-orange-50/50 dark:bg-orange-900/10 lya:bg-lya-primary/5 border-b border-orange-100 dark:border-orange-900/30 lya:border-lya-primary/20 flex justify-between items-start transition-colors shrink-0">
           <div>
              <HeaderTitle />
              <p className="text-xs text-orange-600 dark:text-orange-400 lya:text-lya-primary mt-1 font-bold tracking-wide uppercase">
                {isVitrina ? 'Cobro Inmediato' : (isLlevar ? 'Venta para Llevar' : 'Consumo en Salón')}
              </p>
           </div>
        </div>
        <div className="flex-1 overflow-hidden h-full flex flex-col">
          <TicketSidebar {...sidebarProps} />
        </div>
      </div>

      <div className="md:hidden absolute bottom-6 inset-x-0 flex justify-center z-30 pointer-events-none px-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsMobileCartOpen(true)}
          className="pointer-events-auto w-full max-w-[320px] bg-gray-900 dark:bg-white lya:bg-lya-primary text-white dark:text-gray-900 lya:text-white px-6 py-4 rounded-[2rem] shadow-[0_15px_35px_-5px_rgba(0,0,0,0.3)] flex items-center justify-between font-black transition-all border border-gray-800 dark:border-gray-200 lya:border-lya-primary outline-none touch-manipulation"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingBag size={22} />
              {totalItemsInCart > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-500 dark:bg-orange-600 lya:bg-lya-secondary text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-gray-900 dark:border-white lya:border-lya-primary shadow-sm">
                  {totalItemsInCart}
                </span>
              )}
            </div>
            <span className="text-sm uppercase tracking-wider">Comanda</span>
          </div>
          <span className="text-lg bg-white/10 dark:bg-black/10 px-3 py-1 rounded-xl">${(total).toFixed(2)}</span>
        </motion.button>
      </div>

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
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMobileCartOpen(false)}
                className="p-2.5 bg-white dark:bg-gray-700 lya:bg-lya-surface rounded-full shadow-sm border border-gray-200 dark:border-gray-600 lya:border-lya-border/40 text-gray-500 transition-transform shrink-0 outline-none md:hover:bg-gray-50 dark:md:hover:bg-gray-600"
              >
                <ChevronDown size={20} className="text-gray-900 dark:text-white lya:text-lya-text" />
              </motion.button>
            </div>
            <div className="flex-1 overflow-hidden h-full flex flex-col">
              <TicketSidebar {...sidebarProps} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );

  const floatingOverlays = typeof document !== 'undefined' ? createPortal(
    <div className="relative z-[9999]">

      {/* ✨ MODAL GUÍA DE PROMOCIONES, REGLAS POR CUENTA Y RUPTURA DE PROMOS */}
      <AnimatePresence>
        {showPromoGuide && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/60 dark:bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface max-w-2xl w-full max-h-[90dvh] rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl p-5 sm:p-7 flex flex-col border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 overflow-hidden"
            >
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 lya:bg-lya-primary/15 text-orange-500 lya:text-lya-primary flex items-center justify-center shrink-0">
                    <Sparkles size={22} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight leading-snug">
                      ¿Cómo funcionan las Promociones?
                    </h3>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 leading-snug">
                      Guía de colores, reglas por cuenta y cuándo se rompe una promoción
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPromoGuide(false)}
                  className="p-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-gray-500 dark:text-gray-400 lya:text-lya-text/70 md:hover:bg-gray-200 dark:md:hover:bg-gray-700 lya:md:hover:bg-lya-border/40 transition-colors outline-none shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1.5 my-4 pb-2 space-y-5">
                {/* 1. Los 4 pilares básicos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 lya:bg-lya-bg border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex flex-col">
                    <div className="flex items-center gap-2 font-black text-xs text-gray-900 dark:text-white lya:text-lya-text mb-1.5">
                      <span className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center text-[11px] shrink-0">1</span>
                      <span>Mismo Color = Combinables</span>
                    </div>
                    <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300 lya:text-lya-text/80 leading-relaxed text-justify">
                      Si varios productos tienen una etiqueta del <strong>mismo color</strong> y la misma promo, puedes <strong>mezclarlos entre sí</strong> (incluso si son diferentes productos) para completar la promoción.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 lya:bg-lya-bg border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex flex-col">
                    <div className="flex items-center gap-2 font-black text-xs text-gray-900 dark:text-white lya:text-lya-text mb-1.5">
                      <span className="w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center text-[11px] shrink-0">2</span>
                      <span>Toca la Etiqueta para Filtrar</span>
                    </div>
                    <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300 lya:text-lya-text/80 leading-relaxed text-justify">
                      Al tocar directamente la <strong>insignia de color</strong> arriba de cualquier producto en el menú, se filtrarán automáticamente todos los productos con los que puedes combinarlo.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 lya:bg-lya-bg border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex flex-col">
                    <div className="flex items-center gap-2 font-black text-xs text-gray-900 dark:text-white lya:text-lya-text mb-1.5">
                      <span className="w-6 h-6 rounded-lg bg-violet-500 text-white flex items-center justify-center text-[11px] shrink-0">3</span>
                      <span>Estrictamente por Cuenta y Ronda</span>
                    </div>
                    <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300 lya:text-lya-text/80 leading-relaxed text-justify">
                      Las promos de productos (2x1, 3x2, Combos o Regalos) se calculan <strong>únicamente dentro de la misma cuenta</strong> y antes de enviar la ronda a cocina. Productos en cuentas separadas no se suman entre sí.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 lya:bg-lya-bg border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex flex-col">
                    <div className="flex items-center gap-2 font-black text-xs text-gray-900 dark:text-white lya:text-lya-text mb-1.5">
                      <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[11px] shrink-0">4</span>
                      <span>Descuento por Ticket / Cuenta</span>
                    </div>
                    <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300 lya:text-lya-text/80 leading-relaxed text-justify">
                      Cuando hay una promo por <strong>monto mínimo de ticket</strong>, suma cualquier producto del menú dentro de una misma cuenta y al llegar a la meta se descuenta automáticamente.
                    </p>
                  </div>
                </div>

                {/* ✨ 2. BLOQUE IMPORTANTE: REGLAS AL UNIR CUENTAS Y CÓMO SE ROMPE UNA PROMOCIÓN */}
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/25 lya:bg-lya-bg border-2 border-amber-200/80 dark:border-amber-800/50 lya:border-lya-border/40 space-y-3">
                  <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-400 lya:text-lya-primary font-black text-xs sm:text-sm">
                    <ShieldAlert size={18} strokeWidth={2.5} className="shrink-0" />
                    <span>Importante: Unión de Cuentas y ¿Cuándo se rompe una Promo?</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text/85 leading-relaxed">
                    <div className="p-3.5 rounded-xl bg-white/90 dark:bg-gray-900/60 lya:bg-lya-surface border border-amber-200/60 dark:border-amber-800/40 lya:border-lya-border/30 flex flex-col">
                      <p className="font-black text-amber-700 dark:text-amber-400 lya:text-lya-primary mb-1">
                        🚫 Unir cuentas NO desbloquea promos de productos
                      </p>
                      <p className="text-justify leading-relaxed">
                        Si dos cuentas separadas pidieron productos por su lado y después deciden <strong>unir sus cuentas</strong>, no se desbloquearán promos como 2x1, 3x2, Combos o Regalos. Además, si la cuenta que se va a unir <strong>ya tenía una promo aplicada, esta se romperá</strong> y sus productos pasarán a precio normal.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/90 dark:bg-gray-900/60 lya:bg-lya-surface border border-emerald-200/70 dark:border-emerald-800/40 lya:border-emerald-300/60 flex flex-col">
                      <p className="font-black text-emerald-700 dark:text-emerald-400 mb-1">
                        ✅ Única excepción al unir: Descuento por Ticket
                      </p>
                      <p className="text-justify leading-relaxed">
                        La <strong>única promoción que sí se activa o actualiza al unir cuentas</strong> (o al pasar productos a una cuenta) es la de <strong>Descuento por Ticket</strong>, ya que evalúa el total acumulado en dinero de la cuenta final (si ambas ya tenían descuento por ticket, se unifican en uno solo).
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/90 dark:bg-gray-900/60 lya:bg-lya-surface border border-amber-200/60 dark:border-amber-800/40 lya:border-lya-border/30 flex flex-col">
                      <p className="font-black text-rose-600 dark:text-rose-400 mb-1">
                        🔄 Mover un producto individual a otra cuenta
                      </p>
                      <p className="text-justify leading-relaxed">
                        Si trasladas un producto con beneficio a otra cuenta, <strong>pierde la promo y se cobra a precio normal</strong>. Y si mueves el producto base que sostenía una promo, el regalo o descuento que se quedó en la cuenta original también perderá el beneficio.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/90 dark:bg-gray-900/60 lya:bg-lya-surface border border-amber-200/60 dark:border-amber-800/40 lya:border-lya-border/30 flex flex-col">
                      <p className="font-black text-rose-600 dark:text-rose-400 mb-1">
                        🗑️ Quitar, cancelar o falta de stock
                      </p>
                      <p className="text-justify leading-relaxed">
                        Si restas o eliminas del carrito (o cancelas en cocina) uno de los artículos base que activaban una promoción, <strong>el descuento o regalo se anula automáticamente</strong>. Igual ocurre si un producto se queda sin stock antes de confirmar.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Lista en vivo de promociones activas hoy */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 lya:text-lya-text/50 mb-3 flex items-center gap-2">
                    <Tag size={14} />
                    Promociones Activas Hoy ({validTodayPromos.length})
                  </h4>

                  {validTodayPromos.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/40 lya:bg-lya-bg text-center border border-dashed border-gray-200 dark:border-gray-700 lya:border-lya-border/40">
                      <p className="text-sm font-black text-gray-600 dark:text-gray-300 lya:text-lya-text">No hay promociones activas en este momento</p>
                      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 lya:text-lya-text/60 mt-1">Cuando se activen promociones para el día de hoy, aparecerán listadas aquí con su color correspondiente.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {validTodayPromos.map(({ promo, colorScheme, products, isCombinable, isTicketDiscount }) => {
                        const minAmount = Number(promo.minTicketAmount || promo.min_ticket_amount || 0);

                        return (
                          <div
                            key={promo.id}
                            className={`p-4 rounded-2xl border-2 transition-all ${colorScheme.bannerBg}`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${colorScheme.badge}`}>
                                  {isTicketDiscount ? <Receipt size={12} strokeWidth={2.5} /> : isCombinable ? <Layers size={12} strokeWidth={3} /> : <Tag size={12} strokeWidth={3} />}
                                  {getShortPromoLabel(promo)}
                                </span>
                                <span className="font-black text-sm text-gray-900 dark:text-white lya:text-lya-text">
                                  {promo.name}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-white/90 dark:bg-gray-900/70 lya:bg-lya-surface text-gray-700 dark:text-gray-200 lya:text-lya-text border border-black/5">
                                  {isTicketDiscount
                                    ? `🧾 Descuento por Ticket (Mín. $${minAmount.toFixed(2)})`
                                    : isCombinable
                                      ? `🔗 Combinable (${products.length} productos)`
                                      : '🎯 Producto individual'}
                                </span>
                              </div>

                              {!isTicketDiscount && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPromoFiltro(promo);
                                    setShowPromoGuide(false);
                                  }}
                                  className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 shrink-0 ${colorScheme.btn}`}
                                >
                                  <Filter size={13} strokeWidth={2.5} />
                                  Ver en el menú
                                </button>
                              )}
                            </div>

                            <p className="text-xs font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text/85 mb-2.5 leading-relaxed text-justify">
                              {getPromoRuleDescription(promo)}
                            </p>

                            {isTicketDiscount ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-3 py-1 rounded-lg bg-white/85 dark:bg-gray-900/75 lya:bg-lya-surface text-emerald-700 dark:text-emerald-300 text-[11px] font-black border border-emerald-500/20">
                                  ✨ Participan todos los productos del menú dentro de la misma cuenta (incluso al unir cuentas)
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {products.map(prod => (
                                  <span
                                    key={prod.id}
                                    className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-gray-900/70 lya:bg-lya-surface text-gray-800 dark:text-gray-200 lya:text-lya-text text-[11px] font-bold border border-black/5 dark:border-white/10"
                                  >
                                    {prod.nombre || prod.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPromoGuide(false)}
                className="w-full py-3.5 bg-gray-900 dark:bg-white lya:bg-lya-primary text-white dark:text-gray-900 lya:text-white font-black rounded-2xl transition-colors outline-none shrink-0"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🌟 MODAL CÁPSULA: SELECCIÓN DE RECOMPENSA (Adaptado a BOGO y NxM) */}
      <AnimatePresence>
        {pendingPromoReward && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface max-w-lg w-full rounded-[2.5rem] shadow-2xl p-6 md:p-8 flex flex-col border border-gray-100 dark:border-gray-800 lya:border-lya-border/40"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-[1.25rem] flex items-center justify-center shrink-0">
                  <Gift size={28} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-800 dark:text-white lya:text-lya-text tracking-tight">¡Promoción Desbloqueada!</h3>
                  <p className="text-sm font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60">
                    {pendingPromoReward.discountValue === 0 || pendingPromoReward.discountValue === undefined 
                      ? 'Elige tu producto GRATIS (Base)' 
                      : `Elige tu recompensa a $${pendingPromoReward.discountValue.toFixed(2)}`
                    }
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2 mb-6">
                {allGlobalProducts
                  .filter(p => {
                    const isMatch = pendingPromoReward.poolProductIds.some(promoId => String(promoId).toLowerCase() === String(p.id).toLowerCase());
                    const hasStock = !p.controlarStock || p.stock > 0;
                    return isMatch && hasStock;
                  })
                  .map(p => {
                    const pName = p.nombre || p.name || 'Producto';
                    const pImage = p.imageUrl || p.imagen || p.image || null;
                    const isFree = pendingPromoReward.discountValue === 0 || pendingPromoReward.discountValue === undefined;

                    return (
                      <motion.button
                        key={p.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => claimPromoReward(p, pendingPromoReward.promo, pendingPromoReward.targetCuenta, pendingPromoReward.earnedGhosts)}
                        className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg rounded-[1.5rem] border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 md:hover:border-emerald-400 dark:md:hover:border-emerald-500 transition-all outline-none group"
                      >
                        {pImage ? (
                          <img 
                            src={pImage} 
                            alt={pName} 
                            className="w-14 h-14 rounded-full object-cover mb-2 border border-gray-200 dark:border-gray-700 shadow-sm"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 mb-2 flex items-center justify-center shadow-sm">
                            <Gift size={24} className="text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                        
                        <span className="text-[11px] sm:text-xs font-black text-gray-800 dark:text-white lya:text-lya-text text-center line-clamp-2 w-full leading-tight">
                          {pName}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-500 mt-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          {isFree ? 'Seleccionar GRATIS' : `Añadir por $${pendingPromoReward.discountValue.toFixed(2)}`}
                        </span>
                      </motion.button>
                    );
                  })}
              </div>

              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => setPendingPromoReward(null)}
                className="w-full py-4 bg-gray-100 dark:bg-gray-800 lya:bg-lya-border/30 text-gray-600 dark:text-gray-300 lya:text-lya-text font-black rounded-2xl md:hover:bg-gray-200 dark:md:hover:bg-gray-700 transition-colors outline-none"
              >
                No, gracias
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🌟 MODAL CÁPSULA: ALERTA DE RUPTURA DE PROMOCIÓN */}
      <AnimatePresence>
        {promoWarning?.isOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface max-w-md w-full rounded-[2.5rem] shadow-2xl p-7 sm:p-8 flex flex-col items-center border border-gray-100 dark:border-gray-800 lya:border-lya-border/40"
            >
              <div className="h-16 w-16 bg-amber-100 dark:bg-amber-900/30 text-amber-500 rounded-full flex items-center justify-center mb-4 shadow-inner">
                <AlertTriangle size={32} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full mb-2">
                Aviso de Promoción
              </span>
              <h3 className="text-xl font-black text-gray-800 dark:text-white lya:text-lya-text text-center mb-3">
                ¿Confirmar cambio en promoción?
              </h3>
              <p className="text-sm font-bold text-gray-600 dark:text-gray-300 lya:text-lya-text/80 text-justify mb-7 leading-relaxed">
                {promoWarning.message}
              </p>
              <div className="flex w-full gap-3">
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={cancelPromoRupture}
                  className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-800 lya:bg-lya-border/30 text-gray-600 dark:text-gray-300 lya:text-lya-text font-black rounded-2xl md:hover:bg-gray-200 dark:md:hover:bg-gray-700 transition-colors outline-none"
                >
                  Cancelar
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={confirmPromoRupture}
                  className="flex-1 py-3.5 bg-orange-500 dark:bg-orange-600 lya:bg-lya-primary text-white lya:text-lya-surface font-black rounded-2xl md:hover:bg-orange-600 dark:md:hover:bg-orange-500 lya:md:hover:bg-lya-primary/90 transition-colors shadow-lg shadow-orange-500/30 dark:shadow-orange-900/40 lya:shadow-lya-primary/30 outline-none"
                >
                  Sí, Continuar
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TicketPreviewModal 
        isOpen={!!previewTicketData} 
        onClose={() => setPreviewTicketData(null)} 
        cart={activeCart} 
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
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`bg-white/95 dark:bg-gray-900/95 lya:bg-lya-surface/95 backdrop-blur-xl text-gray-800 dark:text-white lya:text-lya-text px-5 py-3 rounded-full shadow-2xl flex items-center justify-center gap-3 font-semibold tracking-tight border pointer-events-auto transition-colors max-w-md w-full sm:w-auto text-center ${
                localToast.type === 'success' ? 'border-emerald-200/50 dark:border-emerald-900/30 lya:border-lya-primary/30' :
                localToast.type === 'warning' ? 'border-amber-200/50 dark:border-amber-900/30 lya:border-amber-500/30' :
                'border-red-200/50 dark:border-red-900/30 lya:border-red-500/30'
              }`}
            >
              <div className={`p-1 rounded-full shrink-0 ${
                localToast.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/20 lya:bg-lya-primary/20 text-emerald-500 lya:text-lya-primary' :
                localToast.type === 'warning' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-500 lya:text-amber-400' :
                'bg-red-100 dark:bg-red-500/20 text-red-500 lya:text-red-400'
              }`}>
                {localToast.type === 'success' ? <CheckCircle2 size={20} strokeWidth={2.5} /> : localToast.type === 'warning' ? <AlertTriangle size={20} strokeWidth={2.5} /> : <AlertCircle size={20} strokeWidth={2.5} />}
              </div>
              <span className="text-sm text-center">{localToast.msg}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(isSuccess && !isVitrina) && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9990]"><SuccessScreen /></motion.div>}
        {paymentSuccessData && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9990]"><SuccessScreen title={paymentSuccessData.title} message={paymentSuccessData.message} /></motion.div>}
        {selectedProduct && <ProductOptionsModal product={selectedProduct} isVitrina={isVitrina} isLlevar={isLlevar} onClose={() => setSelectedProduct(null)} onConfirm={handleConfirmOption} />}
        
        {showCheckout && (
          <CheckoutModal 
            isOpen={showCheckout} 
            onClose={() => setShowCheckout(false)} 
            total={total} 
            initialTarget={checkoutTarget} 
            cuentasResumen={cleanCuentasDisponibles.map(n => ({nombre: n, subtotal: getSubtotalByCuenta(n)})).filter(c => c.subtotal > 0)} 
            onConfirmPayment={handleFinalizePayment} 
            orderType={isVitrina ? 'mostrador' : isLlevar ? 'llevar' : 'salon'}
            validateAllDelivered={validateAllDelivered}
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
    </div>,
    document.body
  ) : null;

  return (
    <>
      {inline ? (
        <div className="w-full h-full animate-fade-in">{posContent}</div>
      ) : (
        typeof document !== 'undefined' ? createPortal(
          <div className="fixed inset-0 z-[9980] flex items-end md:items-center justify-center p-0 md:p-4 overflow-hidden">
            <motion.div variants={backdropVariants} initial="hidden" animate="visible" exit="hidden" onClick={onClose} className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 lya:bg-lya-dark/50 backdrop-blur-sm z-0 transition-colors" />
            <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="relative z-10 w-full h-[100dvh] md:h-[92vh] md:max-w-7xl shadow-2xl md:rounded-[2.5rem] flex flex-col overflow-hidden">
              {posContent}
            </motion.div>
          </div>,
          document.body
        ) : null
      )}
      {floatingOverlays}
    </>
  );
};