// frontend/src/modules/client/views/ClientMenu.jsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReceiptText, Loader2, CheckCircle2, AlertTriangle, Clock, Gift, Sparkles, Layers, Tag, X, Filter } from 'lucide-react';
import clsx from 'clsx';
import logoLyA from '../../../assets/logo.jpeg'; 

import ClientProductModal from './components/ClientProductModal';
import ClientCheckoutModal from './components/ClientCheckoutModal';
import ClientSettingsModal from './components/ClientSettingsModal';
import ClientLogoutModal from './components/ClientLogoutModal';
import ClientFinalizedOverlay from './components/ClientFinalizedOverlay';
import { ClientServiceShield } from './components/ClientServiceShield';
import ClientOrderSuccess from './ClientOrderSuccess';

import ClientHeader from './components/ClientHeader';
import ClientProductCard, { getPromoColor } from './components/ClientProductCard';

import { useClientMenuController } from '../controllers/useClientMenuController';

const getPromoRuleDescription = (promo) => {
  if (!promo) return '';
  const type = promo.type;
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
    return `Lleva todos los productos del paquete por un precio especial de $${price.toFixed(2)}.`;
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
  if (type === 'NxM') return `${promo.buyQty || promo.buy_qty || 3}x${promo.payQty || promo.pay_qty || 2}`;
  if (type === 'FIXED') return `-$${Number(promo.discountValue || promo.discount_value || 0).toFixed(0)}`;
  if (type === 'NTH_FIXED') return `${promo.buyQty || promo.buy_qty || 2}ª con Desc.`;
  if (type === 'COMBO') return `Combo $${Number(promo.discountValue || promo.discount_value || 0).toFixed(0)}`;
  if (type === 'BOGO') return `Compra ${promo.buyQty || 1} y Llévate ${promo.payQty || 1}`;
  return promo.name || 'Promo';
};

export default function ClientMenu(props) {
  const ctrl = useClientMenuController(props);
  const [claimingRewardId, setClaimingRewardId] = useState(null);
  const [showPromoGuide, setShowPromoGuide] = useState(false);

  const allPromotions = useMemo(() => ctrl.cartUtils.promotions || [], [ctrl.cartUtils.promotions]);

  // ✨ Calculamos las promociones válidas hoy con su color y lista de productos
  const validTodayPromos = useMemo(() => {
    const today = new Date().getDay();

    return allPromotions.filter(p => {
      if (p.type === 'TICKET_DISCOUNT') return false;
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
      const triggerIds = (Array.isArray(p.applyToProducts) && p.applyToProducts.length > 0)
        ? p.applyToProducts.map(id => String(id).toLowerCase())
        : [String(p.productId || p.product_id || '').toLowerCase()];

      const matchingProducts = (ctrl.products || []).filter(prod =>
        triggerIds.includes(String(prod.id).toLowerCase())
      );

      return {
        promo: p,
        colorScheme: getPromoColor(p.id),
        products: matchingProducts,
        isCombinable: matchingProducts.length > 1
      };
    }).filter(item => item.products.length > 0);
  }, [allPromotions, ctrl.products]);

  const handleTogglePromoFilter = (promoOrId) => {
    if (!promoOrId) {
      ctrl.setPromoFiltro(null);
      return;
    }
    const targetPromo = typeof promoOrId === 'object'
      ? promoOrId
      : allPromotions.find(p => String(p.id) === String(promoOrId));

    if (!targetPromo) return;

    if (ctrl.promoFiltro && String(ctrl.promoFiltro.id) === String(targetPromo.id)) {
      ctrl.setPromoFiltro(null);
    } else {
      ctrl.setPromoFiltro(targetPromo);
    }
  };

  const handleClaimRewardClick = async (product, rewardData) => {
    if (claimingRewardId !== null) return;
    setClaimingRewardId(product.id);
    try {
      await new Promise(resolve => setTimeout(resolve, 250));
      ctrl.cartUtils.claimPromoReward(product, rewardData.promo, rewardData.earnedGhosts);
    } finally {
      setClaimingRewardId(null);
    }
  };

  // 1. Pantalla de Carga
  if (ctrl.isLoading) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 lya:bg-[#FAF6F0] backdrop-blur-md transition-opacity duration-300">
        <div className="relative w-28 h-28 mb-6">
          <div className="absolute inset-0 rounded-full border-[6px] border-gray-200 dark:border-gray-800 lya:border-[#EADCC9]" />
          <div className="absolute inset-0 rounded-full border-[6px] border-orange-500 dark:border-orange-600 lya:border-[#78350F] border-t-transparent animate-spin" />
          <div className="absolute inset-0 m-2 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-inner">
            <img src={logoLyA} alt="Logo 𝓛𝔂α" className="w-full h-full object-cover animate-pulse" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-[#3E2723] tracking-tight mb-2 animate-pulse text-center">
          {ctrl.isLoggingOut ? "Cerrando sesión..." : (props.type === 'llevar' ? "Preparando menú para llevar..." : "Preparando tu mesa...")}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 lya:text-[#7A6353] font-medium text-sm flex items-center gap-2 justify-center">
          {ctrl.isLoggingOut ? <Loader2 size={16} className="text-orange-500 dark:text-orange-400 lya:text-[#78350F] animate-spin" /> : <CheckCircle2 size={16} className="text-emerald-500 dark:text-emerald-400" />}
          {ctrl.isLoggingOut ? (props.type === 'llevar' ? "Cerrando orden..." : "Liberando la mesa...") : "Cargando el menú más fresco"}
        </p>
      </div>
    );
  }

  // 2. Pantalla de Pedido Finalizado (Pagado/Cerrado)
  if (ctrl.finalizedStatus && ctrl.showFinalizedOverlay) {
    return (
      <ClientFinalizedOverlay 
        finalizedStatus={ctrl.finalizedStatus}
        type={props.type}
        handleDownloadTicket={ctrl.handleDownloadTicket}
        handleLogout={ctrl.handleLogout}
      />
    );
  }

  // 3. Pantalla de Sesión Expirada
  if (ctrl.sessionExpired) {
    return (
      <div className="h-full w-full flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 lya:bg-[#FAF6F0] p-6 overflow-hidden">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }} 
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] p-8 sm:p-10 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] max-w-[400px] w-full flex flex-col items-center border border-gray-100 dark:border-gray-700/50 lya:border-[#EADCC9]"
        >
          <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/20 lya:bg-[#EADCC9]/50 rounded-full flex items-center justify-center mb-6 shadow-inner text-orange-500 dark:text-orange-400 lya:text-[#78350F]">
            <Clock size={40} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-[#3E2723] mb-4 tracking-tight text-center">Sesión Expirada</h2>
          <p className="text-gray-500 dark:text-gray-400 lya:text-[#7A6353] font-medium text-sm mb-8 leading-relaxed text-justify px-2">
            {props.type === 'llevar' ? "Hemos cerrado tu sesión por inactividad temporal ya que no detectamos ninguna orden confirmada o tu cuenta ya fue pagada." : "Hemos cerrado tu sesión por inactividad para liberar la mesa digitalmente."}
          </p>
          <motion.button whileTap={{ scale: 0.95 }} onClick={ctrl.handleLogout} className="w-full py-4 bg-orange-500 dark:bg-orange-600 lya:bg-[#78350F] text-white rounded-2xl font-black shadow-lg">Entendido</motion.button>
        </motion.div>
      </div>
    );
  }

  // 4. Pantalla de Servicio Inactivo
  if (!ctrl.isServiceActive && !ctrl.isConfirmed && !ctrl.isReadOnly && !ctrl.sessionExpired) {
    return <ClientServiceShield />;
  }

  // 5. Pantalla de Pedido Confirmado / Mi Nota
  if (ctrl.isConfirmed && !ctrl.isReadOnly) {
    return (
      <>
        <ClientOrderSuccess 
          cart={ctrl.confirmedSnapshot.items} 
          totalCart={ctrl.confirmedSnapshot.total} 
          clientData={props.clientData} 
          type={props.type} 
          tableId={props.tableNumber || props.tableId} 
          products={ctrl.products} 
          categories={ctrl.categories} 
          getCategoryName={ctrl.getCategoryName} 
          isOrderPaid={ctrl.isOrderPaid} 
          onReset={() => { if (!ctrl.isOrderPaid) ctrl.setIsConfirmed(false); }} 
          onOpenSettings={() => ctrl.setShowSettings(true)}
          isQrActive={ctrl.isServiceActive} 
          onLogoutClick={() => ctrl.setShowLogoutConfirm(true)}
        />

        <AnimatePresence>
          {ctrl.showSettings && (
            <ClientSettingsModal 
              themeIndex={ctrl.themeIndex} 
              sizeIndex={ctrl.sizeIndex} 
              cycleTheme={ctrl.cycleTheme} 
              cycleSize={ctrl.cycleSize} 
              onClose={() => ctrl.setShowSettings(false)} 
              showLogout={ctrl.confirmedSnapshot.items.length === 0 || ctrl.isOrderPaid} 
              onLogout={() => { ctrl.setShowSettings(false); ctrl.setShowLogoutConfirm(true); }} 
              onLogoutClick={() => { ctrl.setShowSettings(false); ctrl.setShowLogoutConfirm(true); }} 
            />
          )}
        </AnimatePresence>
        <AnimatePresence>{ctrl.showLogoutConfirm && <ClientLogoutModal isOpen={ctrl.showLogoutConfirm} show={ctrl.showLogoutConfirm} onClose={() => ctrl.setShowLogoutConfirm(false)} onLogout={ctrl.handleLogout} onConfirm={ctrl.handleLogout} />}</AnimatePresence>
      </>
    );
  }

  const rewardModalData = ctrl.cartUtils.pendingPromoReward;
  const hasNoteToView = ctrl.confirmedSnapshot.items.length > 0 || (ctrl.transferredItems && ctrl.transferredItems.length > 0);
  const activeFilterColorScheme = ctrl.promoFiltro ? getPromoColor(ctrl.promoFiltro.id) : null;
  const isFilteredPromoCombinable = ctrl.promoFiltro && Array.isArray(ctrl.promoFiltro.applyToProducts) && ctrl.promoFiltro.applyToProducts.length > 1;

  // 6. Vista Principal del Menú
  return (
    <div className="h-full w-full flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 lya:bg-[#FAF6F0] relative">
      <AnimatePresence>
        {ctrl.notification && (
          <div className="fixed top-8 left-0 right-0 z-[10050] flex justify-center pointer-events-none px-4">
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={clsx(
                "bg-white/95 dark:bg-gray-900/95 lya:bg-[#F3EBE0]/95 backdrop-blur-xl px-6 py-4 rounded-full shadow-[0_20px_40px_-15px_rgba(0,0,0,0.25)] flex items-center justify-center gap-3 font-bold border pointer-events-auto max-w-md w-full sm:w-auto text-center text-gray-800 dark:text-white lya:text-[#3E2723]",
                ctrl.notification.type === 'success'
                  ? "border-emerald-200/50 dark:border-emerald-900/30 lya:border-emerald-300/50"
                  : ctrl.notification.type === 'info'
                    ? "border-orange-200/60 dark:border-orange-900/40 lya:border-[#D9C4A9]"
                    : "border-amber-200/50 dark:border-amber-900/30 lya:border-amber-400/50"
              )}
            >
              <div className={clsx(
                "p-1.5 rounded-full shrink-0",
                ctrl.notification.type === 'success'
                  ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600"
                  : ctrl.notification.type === 'info'
                    ? "bg-orange-100 dark:bg-orange-500/20 text-orange-600 lya:text-[#78350F]"
                    : "bg-amber-100 dark:bg-amber-500/20 text-amber-600"
              )}>
                {ctrl.notification.type === 'success' ? (
                  <CheckCircle2 size={16} />
                ) : ctrl.notification.type === 'info' ? (
                  <Gift size={16} />
                ) : (
                  <AlertTriangle size={16} />
                )}
              </div>
              <span className="text-sm tracking-wide text-center leading-snug">{ctrl.notification.msg}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ClientHeader 
        displayName={ctrl.displayName}
        displayPhone={ctrl.displayPhone}
        type={props.type}
        tableId={props.tableNumber || props.tableId}
        categories={ctrl.categories}
        activeCategory={ctrl.promoFiltro ? 'todas' : ctrl.activeCategory}
        setActiveCategory={ctrl.setActiveCategory}
        setShowSettings={ctrl.setShowSettings}
      />

      <div className="flex-1 overflow-y-auto px-6 py-4 pb-32 custom-scrollbar">
        
        {/* ✨ BARRA INTERACTIVA: ¿CÓMO FUNCIONAN LAS PROMOS? */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowPromoGuide(true)}
            className="w-full py-2.5 px-4 rounded-2xl bg-orange-50/90 dark:bg-orange-950/30 lya:bg-[#F3EBE0] border border-orange-200/80 dark:border-orange-800/40 lya:border-[#D9C4A9] flex items-center justify-between gap-3 shadow-sm transition-colors outline-none touch-manipulation"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-orange-500 dark:bg-orange-600 lya:bg-[#78350F] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles size={16} strokeWidth={2.5} />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-black text-gray-900 dark:text-white lya:text-[#3E2723] truncate">
                  ¿Cómo funcionan las promos?
                </p>
                <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 lya:text-[#7A6353] truncate">
                  Mismo color de etiqueta = combinables entre sí
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {validTodayPromos.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-orange-500 dark:bg-orange-600 lya:bg-[#78350F] text-white text-[10px] font-black">
                  {validTodayPromos.length} {validTodayPromos.length === 1 ? 'activa' : 'activas'}
                </span>
              )}
              <span className="text-[11px] font-black text-orange-600 dark:text-orange-400 lya:text-[#78350F] underline decoration-2 underline-offset-2">
                Ver guía
              </span>
            </div>
          </motion.button>
        </div>

        {/* ✨ CINTILLO DE FILTRO DE PROMOCIÓN ACTIVO (Sin animación de height para evitar tirones) */}
        {ctrl.promoFiltro && activeFilterColorScheme && (
          <motion.div
            key={`client-banner-${ctrl.promoFiltro.id}`}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mb-4"
          >
            <div className={`p-3.5 rounded-[1.5rem] border-2 flex flex-col gap-2.5 shadow-sm ${activeFilterColorScheme.bannerBg}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0 shadow-sm ${activeFilterColorScheme.badge}`}>
                    {isFilteredPromoCombinable ? <Layers size={12} strokeWidth={2.5} /> : <Tag size={12} strokeWidth={2.5} />}
                    {getShortPromoLabel(ctrl.promoFiltro)}
                  </span>
                  <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white lya:text-[#3E2723]">
                    {ctrl.promoFiltro.name || 'Promoción Activa'}
                  </h4>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-white/80 dark:bg-gray-900/60 text-gray-700 dark:text-gray-200 border border-black/5">
                    {isFilteredPromoCombinable ? '🔗 Combinable' : '🎯 Individual'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => ctrl.setPromoFiltro(null)}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-gray-800 lya:bg-[#FAF6F0] text-gray-700 dark:text-gray-200 lya:text-[#3E2723] text-[11px] font-black border border-gray-200 dark:border-gray-700 lya:border-[#D9C4A9] active:scale-95 flex items-center gap-1 shrink-0 shadow-sm transition-all touch-manipulation"
                >
                  <X size={13} strokeWidth={2.5} />
                  Ver todo
                </button>
              </div>

              <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300 lya:text-[#5D4037] leading-snug text-left">
                {isFilteredPromoCombinable
                  ? 'Todos estos productos tienen el mismo color de etiqueta: puedes mezclarlos como gustes para armar tu promoción.'
                  : getPromoRuleDescription(ctrl.promoFiltro)}
              </p>
            </div>
          </motion.div>
        )}

        {/* ✨ LISTADO DE PRODUCTOS CON KEY DINÁMICA Y ANIMACIÓN FLUIDA */}
        {ctrl.visibleProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 lya:text-[#7A6353] font-medium text-sm">
            No se encontraron productos en esta categoría.
          </div>
        ) : (
          <div
            key={`client-grid-${ctrl.activeCategory}-${ctrl.promoFiltro?.id || 'all'}`}
            className="space-y-4"
          >
            {ctrl.visibleProducts.map((product, idx) => (
              <ClientProductCard 
                key={product.id}
                index={idx}
                product={product}
                cart={ctrl.cartUtils.cart}
                getCategoryName={ctrl.getCategoryName}
                addingToCartId={ctrl.addingToCartId}
                triggerNotification={ctrl.triggerNotification}
                setSelectedProduct={ctrl.setSelectedProduct}
                handleAddDirectly={ctrl.handleAddDirectly}
                getPromoBadge={ctrl.cartUtils.getPromoBadge}
                activePromotions={allPromotions}
                onPromoClick={handleTogglePromoFilter}
                isPromoFiltered={!!ctrl.promoFiltro}
              />
            ))}
          </div>
        )}
      </div>

      {/* 🔥 Botón "Mi Nota" visible si tiene productos propios o productos trasladados a otra cuenta */}
      <AnimatePresence>
        {hasNoteToView && !ctrl.showCheckout && !ctrl.selectedProduct && (
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            exit={{ scale: 0 }} 
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={clsx("fixed right-6 z-30 max-w-md mx-auto flex justify-end pointer-events-none", ctrl.cartUtils.cart.length > 0 ? "bottom-28" : "bottom-6")} 
            style={{ width: 'calc(100% - 3rem)' }}
          >
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => ctrl.setIsConfirmed(true)} className="pointer-events-auto flex items-center gap-2 px-5 py-3.5 rounded-full bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] shadow-md border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] text-gray-800 dark:text-white lya:text-[#3E2723] font-black text-sm md:hover:scale-105 outline-none select-none touch-manipulation"><ReceiptText size={20} className="text-orange-500 dark:text-orange-400 lya:text-[#78350F]" /><span>Mi Nota</span></motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ctrl.cartUtils.cart.length > 0 && !ctrl.showCheckout && !ctrl.selectedProduct && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 50, opacity: 0 }} 
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-6 left-0 right-0 px-6 z-40 max-w-md mx-auto"
          >
            <motion.button 
              whileTap={{ scale: 0.98 }} 
              disabled={ctrl.isSubmitting}
              onClick={() => ctrl.setShowCheckout(true)} 
              className={`w-full bg-gray-900 dark:bg-white lya:bg-[#78350F] text-white dark:text-gray-900 py-4 px-5 rounded-[2rem] flex items-center justify-between shadow-xl font-bold md:hover:bg-gray-800 dark:md:hover:bg-gray-100 lya:md:hover:bg-[#5C240A] transition-colors outline-none select-none touch-manipulation ${ctrl.isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 dark:bg-black/10 flex items-center justify-center font-black text-sm">{ctrl.cartUtils.totalItems}</div>
                <span className="text-base font-black">Revisar Pedido</span>
              </div>
              {ctrl.addingToCartId !== null || ctrl.isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <span className="font-black text-xl">${Math.max(0, ctrl.cartUtils.totalCart).toFixed(2)}</span>}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✨ MODAL GUÍA DE PROMOCIONES PARA CLIENTES */}
      <AnimatePresence>
        {showPromoGuide && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white dark:bg-gray-900 lya:bg-[#FAF6F0] max-w-md w-full max-h-[85vh] rounded-[2.5rem] shadow-2xl p-6 flex flex-col border border-gray-100 dark:border-gray-800 lya:border-[#EADCC9] overflow-hidden"
            >
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-800 lya:border-[#EADCC9] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-orange-100 dark:bg-orange-900/30 lya:bg-[#EADCC9] text-orange-500 lya:text-[#78350F] flex items-center justify-center shrink-0">
                    <Sparkles size={22} strokeWidth={2.5} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white lya:text-[#3E2723] tracking-tight leading-snug">
                      ¿Cómo funcionan las Promos?
                    </h3>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 lya:text-[#7A6353]">
                      Combina tus productos favoritos del mismo color
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPromoGuide(false)}
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 lya:bg-[#F3EBE0] text-gray-500 dark:text-gray-400 lya:text-[#7A6353] outline-none"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 my-4 space-y-4 text-left">
                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/70 lya:bg-[#F3EBE0] border border-gray-100 dark:border-gray-800 lya:border-[#EADCC9]">
                    <div className="flex items-center gap-2 font-black text-xs text-gray-900 dark:text-white lya:text-[#3E2723] mb-1">
                      <span className="w-5 h-5 rounded-md bg-rose-500 text-white flex items-center justify-center text-[10px]">1</span>
                      Mismo Color = Combinables
                    </div>
                    <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300 lya:text-[#5D4037] leading-relaxed">
                      Si varios productos tienen una etiqueta del <strong>mismo color</strong> y la misma promo, puedes <strong>combinarlos entre sí</strong> aunque sean productos distintos.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/70 lya:bg-[#F3EBE0] border border-gray-100 dark:border-gray-800 lya:border-[#EADCC9]">
                    <div className="flex items-center gap-2 font-black text-xs text-gray-900 dark:text-white lya:text-[#3E2723] mb-1">
                      <span className="w-5 h-5 rounded-md bg-blue-500 text-white flex items-center justify-center text-[10px]">2</span>
                      Toca la Etiqueta para Filtrar
                    </div>
                    <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300 lya:text-[#5D4037] leading-relaxed">
                      Toca directamente la <strong>insignia de color</strong> de cualquier producto para ver en pantalla todos los productos con los que puedes armar esa promo.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/70 lya:bg-[#F3EBE0] border border-gray-100 dark:border-gray-800 lya:border-[#EADCC9]">
                    <div className="flex items-center gap-2 font-black text-xs text-gray-900 dark:text-white lya:text-[#3E2723] mb-1">
                      <span className="w-5 h-5 rounded-md bg-emerald-500 text-white flex items-center justify-center text-[10px]">3</span>
                      Descuento Automático
                    </div>
                    <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300 lya:text-[#5D4037] leading-relaxed">
                      Solo agrégalos a tu pedido. Al completar la cantidad de la promoción, el descuento o producto de regalo se activará automáticamente.
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 lya:text-[#7A6353] mb-2.5 flex items-center gap-1.5">
                    <Tag size={13} />
                    Promociones de Hoy ({validTodayPromos.length})
                  </h4>

                  {validTodayPromos.length === 0 ? (
                    <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 lya:bg-[#F3EBE0]/60 text-center border border-dashed border-gray-200 dark:border-gray-700 lya:border-[#D9C4A9]">
                      <p className="text-xs font-black text-gray-600 dark:text-gray-300 lya:text-[#3E2723]">
                        No hay promociones activas por ahora
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {validTodayPromos.map(({ promo, colorScheme, products, isCombinable }) => (
                        <div
                          key={promo.id}
                          className={`p-3.5 rounded-2xl border-2 transition-all ${colorScheme.bannerBg}`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm ${colorScheme.badge}`}>
                                {isCombinable ? <Layers size={10} strokeWidth={3} /> : <Tag size={10} strokeWidth={3} />}
                                {getShortPromoLabel(promo)}
                              </span>
                              <span className="font-black text-xs text-gray-900 dark:text-white lya:text-[#3E2723]">
                                {promo.name}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                ctrl.setPromoFiltro(promo);
                                setShowPromoGuide(false);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 shadow-sm active:scale-95 shrink-0 ${colorScheme.btn}`}
                            >
                              <Filter size={11} strokeWidth={2.5} />
                              Ver productos
                            </button>
                          </div>

                          <p className="text-[11px] font-bold text-gray-700 dark:text-gray-200 lya:text-[#5D4037] mb-2">
                            {getPromoRuleDescription(promo)}
                          </p>

                          <div className="flex flex-wrap gap-1">
                            {products.map(prod => (
                              <span
                                key={prod.id}
                                className="px-2 py-0.5 rounded-lg bg-white/80 dark:bg-gray-900/70 text-gray-800 dark:text-gray-200 text-[10px] font-bold border border-black/5 dark:border-white/10"
                              >
                                {prod.nombre || prod.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPromoGuide(false)}
                className="w-full py-3.5 bg-gray-900 dark:bg-white lya:bg-[#78350F] text-white dark:text-gray-900 font-black rounded-2xl transition-colors outline-none shrink-0 touch-manipulation"
              >
                ¡Entendido!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ctrl.selectedProduct && (
          <ClientProductModal 
            product={ctrl.selectedProduct} 
            cart={ctrl.cartUtils.cart} 
            getPromoBadge={ctrl.cartUtils.getPromoBadge}
            onClose={() => ctrl.setSelectedProduct(null)} 
            onConfirm={async (customizations) => await ctrl.handleAddDirectly(ctrl.selectedProduct, customizations)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ctrl.showCheckout && (
          <ClientCheckoutModal 
            cart={ctrl.cartUtils.cart} 
            totalCart={ctrl.cartUtils.totalCart} 
            isSubmitting={ctrl.isSubmitting} 
            onClose={() => ctrl.setShowCheckout(false)} 
            onConfirmOrder={ctrl.handleConfirmOrder} 
            removeFromCart={ctrl.cartUtils.removeFromCart} 
            incrementInCart={ctrl.cartUtils.incrementInCart} 
            deleteLine={ctrl.cartUtils.deleteLine} 
            promoWarning={ctrl.cartUtils.promoWarning}
            confirmPromoRupture={ctrl.cartUtils.confirmPromoRupture} 
            cancelPromoRupture={ctrl.cartUtils.cancelPromoRupture} 
          />
        )}
      </AnimatePresence>

      {/* MODAL NEO-BENTO: SELECCIÓN DE RECOMPENSA (BOGO y NxM de Piscina) */}
      <AnimatePresence>
        {rewardModalData && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white dark:bg-gray-900 lya:bg-[#FAF6F0] max-w-md w-full rounded-[2.5rem] shadow-2xl p-6 flex flex-col border border-gray-100 dark:border-gray-800 lya:border-[#EADCC9] relative overflow-hidden"
            >
              <div className="flex items-center gap-4 mb-5">
                <div className="h-14 w-14 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-inner">
                  <Gift size={28} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white lya:text-[#3E2723] tracking-tight">
                    ¡Promoción Desbloqueada!
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 lya:text-[#7A6353]">
                    {rewardModalData.discountValue === 0 || rewardModalData.discountValue === undefined
                      ? 'Elige tu producto GRATIS (Base)'
                      : `Elige tu recompensa por $${Number(rewardModalData.discountValue).toFixed(2)}`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-[45vh] overflow-y-auto custom-scrollbar pr-1 mb-5">
                {ctrl.products
                  .filter(p => {
                    const isMatch = rewardModalData.poolProductIds?.some(
                      promoId => String(promoId).toLowerCase() === String(p.id).toLowerCase()
                    );
                    const hasStock = !p.controlarStock || p.stock > 0;
                    return isMatch && hasStock && !p.isAgotado;
                  })
                  .map(p => {
                    const pName = p.nombre || p.name || 'Producto';
                    const pImage = p.imagen || p.imageUrl || p.image || null;
                    const isFree = rewardModalData.discountValue === 0 || rewardModalData.discountValue === undefined;
                    const isClaimingThis = claimingRewardId === p.id;

                    return (
                      <motion.button
                        key={p.id}
                        whileTap={claimingRewardId === null ? { scale: 0.95 } : {}}
                        disabled={claimingRewardId !== null}
                        onClick={() => handleClaimRewardClick(p, rewardModalData)}
                        className="flex flex-col items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800 lya:bg-[#F3EBE0] rounded-[1.5rem] border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] md:hover:border-emerald-400 dark:md:hover:border-emerald-500 transition-all outline-none group relative overflow-hidden touch-manipulation"
                      >
                        {pImage ? (
                          <img
                            src={pImage}
                            alt={pName}
                            className="w-16 h-16 rounded-full object-cover mb-2.5 border border-gray-200 dark:border-gray-700 shadow-sm"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 lya:bg-[#EADCC9] mb-2.5 flex items-center justify-center shadow-sm">
                            <Gift size={24} className="text-gray-400 dark:text-gray-500 lya:text-[#7A6353]" />
                          </div>
                        )}

                        <span className="text-xs font-black text-gray-800 dark:text-white lya:text-[#3E2723] text-center line-clamp-2 w-full leading-tight">
                          {pName}
                        </span>

                        <span className="mt-2 inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                          {isClaimingThis ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              <span>Añadiendo...</span>
                            </>
                          ) : (
                            <span>{isFree ? 'Elegir GRATIS' : `Por $${Number(rewardModalData.discountValue).toFixed(2)}`}</span>
                          )}
                        </span>
                      </motion.button>
                    );
                  })}
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={claimingRewardId !== null}
                onClick={() => ctrl.cartUtils.setPendingPromoReward(null)}
                className="w-full py-3.5 bg-gray-100 dark:bg-gray-800 lya:bg-[#EADCC9] text-gray-600 dark:text-gray-300 lya:text-[#7A6353] font-black rounded-2xl md:hover:bg-gray-200 dark:md:hover:bg-gray-700 transition-colors outline-none touch-manipulation"
              >
                No, gracias
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ctrl.showSettings && (
          <ClientSettingsModal 
            themeIndex={ctrl.themeIndex} 
            sizeIndex={ctrl.sizeIndex} 
            cycleTheme={ctrl.cycleTheme} 
            cycleSize={ctrl.cycleSize} 
            onClose={() => ctrl.setShowSettings(false)} 
            showLogout={ctrl.confirmedSnapshot.items.length === 0 || ctrl.isOrderPaid} 
            onLogout={() => { ctrl.setShowSettings(false); ctrl.setShowLogoutConfirm(true); }} 
            onLogoutClick={() => { ctrl.setShowSettings(false); ctrl.setShowLogoutConfirm(true); }} 
          />
        )}
      </AnimatePresence>
      <AnimatePresence>{ctrl.showLogoutConfirm && <ClientLogoutModal isOpen={ctrl.showLogoutConfirm} show={ctrl.showLogoutConfirm} onClose={() => ctrl.setShowLogoutConfirm(false)} onLogout={ctrl.handleLogout} onConfirm={ctrl.handleLogout} />}</AnimatePresence>
    </div>
  );
}