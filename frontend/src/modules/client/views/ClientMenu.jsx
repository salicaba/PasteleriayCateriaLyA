// frontend/src/modules/client/views/ClientMenu.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReceiptText, Loader2, CheckCircle2, AlertTriangle, Clock, Gift } from 'lucide-react';
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
import ClientProductCard from './components/ClientProductCard';

import { useClientMenuController } from '../controllers/useClientMenuController';

export default function ClientMenu(props) {
  const ctrl = useClientMenuController(props);
  const [claimingRewardId, setClaimingRewardId] = useState(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
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
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] p-8 sm:p-10 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] max-w-[400px] w-full flex flex-col items-center border border-gray-100 dark:border-gray-700/50 lya:border-[#EADCC9]">
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
        activeCategory={ctrl.activeCategory}
        setActiveCategory={ctrl.setActiveCategory}
        setShowSettings={ctrl.setShowSettings}
      />

      <motion.div key={ctrl.activeCategory} variants={containerVariants} initial="hidden" animate="show" className="flex-1 overflow-y-auto px-6 py-4 pb-32 space-y-4 custom-scrollbar">
        {ctrl.visibleProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 lya:text-[#7A6353] font-medium text-sm">No se encontraron productos en esta categoría.</div>
        ) : (
          ctrl.visibleProducts.map(product => (
            <ClientProductCard 
              key={product.id}
              product={product}
              cart={ctrl.cartUtils.cart}
              getCategoryName={ctrl.getCategoryName}
              addingToCartId={ctrl.addingToCartId}
              triggerNotification={ctrl.triggerNotification}
              setSelectedProduct={ctrl.setSelectedProduct}
              handleAddDirectly={ctrl.handleAddDirectly}
              getPromoBadge={ctrl.cartUtils.getPromoBadge}
              itemVariants={itemVariants}
            />
          ))
        )}
      </motion.div>

      <AnimatePresence>
        {ctrl.confirmedSnapshot.items.length > 0 && !ctrl.showCheckout && !ctrl.selectedProduct && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className={clsx("fixed right-6 z-30 max-w-md mx-auto flex justify-end pointer-events-none", ctrl.cartUtils.cart.length > 0 ? "bottom-28" : "bottom-6")} style={{ width: 'calc(100% - 3rem)' }}>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => ctrl.setIsConfirmed(true)} className="pointer-events-auto flex items-center gap-2 px-5 py-3.5 rounded-full bg-white dark:bg-gray-800 lya:bg-[#F3EBE0] shadow-md border border-gray-200 dark:border-gray-700 lya:border-[#EADCC9] text-gray-800 dark:text-white lya:text-[#3E2723] font-black text-sm md:hover:scale-105 outline-none select-none touch-manipulation"><ReceiptText size={20} className="text-orange-500 dark:text-orange-400 lya:text-[#78350F]" /><span>Mi Nota</span></motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ctrl.cartUtils.cart.length > 0 && !ctrl.showCheckout && !ctrl.selectedProduct && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-6 left-0 right-0 px-6 z-40 max-w-md mx-auto">
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
              transition={{ type: "spring", damping: 25, stiffness: 260 }}
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