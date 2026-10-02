import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag, Plus, Edit2, Trash2, Power, Loader2, AlertTriangle, Globe, ShoppingBag } from 'lucide-react';
import api from '../../../api/client';
import PromotionManagerModal from './PromotionManagerModal';

export const PromotionsManagerTab = ({ isOpen, onClose, products, showToast }) => {
  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);

  const [promoToDelete, setPromoToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(null); 

  const fetchPromotions = async (silentLoad = false) => {
    try {
      if (!silentLoad) setIsLoading(true);
      const res = await api.get('/promotions');
      setPromotions(res.data.data || res.data || []);
    } catch (error) {
      showToast("Error al cargar promociones", "error");
    } finally {
      if (!silentLoad) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchPromotions(); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleToggleStatus = async (id) => {
    if (isToggling) return;

    const promoToToggle = promotions.find(p => p.id === id);
    const isTurningOn = !promoToToggle.isActive;

    // 🛡️ ESCUDO ANTI-COLISIONES PARA EL BOTÓN RÁPIDO DE LA LISTA
    if (isTurningOn) {
      const overlappingPromo = promotions.find(p => {
        if (p.id === id) return false; // No compararse consigo misma
        
        const rawActive = p.isActive ?? p.is_active ?? p.status;
        const isPActive = rawActive === true || rawActive === 1 || rawActive === 'true' || rawActive === '1';
        if (!isPActive) return false; // Solo choca si la otra está encendida

        // Extraer días de la promo iterada
        const pDaysRaw = p.validDays || p.valid_days;
        let pDays = [];
        if (Array.isArray(pDaysRaw)) pDays = pDaysRaw.map(Number);
        else if (typeof pDaysRaw === 'string') {
          try { pDays = JSON.parse(pDaysRaw).map(Number); } 
          catch(e) { pDays = pDaysRaw.replace(/[\[\]]/g, '').split(',').map(n => Number(n.trim())); }
        }

        // Extraer días de la promo que queremos encender
        const toggleDaysRaw = promoToToggle.validDays || promoToToggle.valid_days;
        let toggleDays = [];
        if (Array.isArray(toggleDaysRaw)) toggleDays = toggleDaysRaw.map(Number);
        else if (typeof toggleDaysRaw === 'string') {
          try { toggleDays = JSON.parse(toggleDaysRaw).map(Number); } 
          catch(e) { toggleDays = toggleDaysRaw.replace(/[\[\]]/g, '').split(',').map(n => Number(n.trim())); }
        }
        
        // ¿Chocan en días?
        const hasDayOverlap = toggleDays.some(d => pDays.includes(d));
        if (!hasDayOverlap) return false;

        // Lógica de colisión por productos (IGNORANDO LOS PREMIOS)
        if (promoToToggle.type === 'TICKET_DISCOUNT' && p.type === 'TICKET_DISCOUNT') {
           return true; 
        } else if (promoToToggle.type !== 'TICKET_DISCOUNT' && p.type !== 'TICKET_DISCOUNT') {
           
           // SOLO Productos disparadores de la promo iterada
           let pProducts = [];
           if (Array.isArray(p.applyToProducts)) pProducts.push(...p.applyToProducts.map(String));
           if (p.productId || p.product_id) pProducts.push(String(p.productId || p.product_id));

           // SOLO Productos disparadores de la promo que se intenta encender
           let toggleProducts = [];
           if (Array.isArray(promoToToggle.applyToProducts)) toggleProducts.push(...promoToToggle.applyToProducts.map(String));
           if (promoToToggle.productId || promoToToggle.product_id) toggleProducts.push(String(promoToToggle.productId || promoToToggle.product_id));

           return toggleProducts.some(pid => pProducts.includes(pid));
        }
        return false;
      });

      if (overlappingPromo) {
        showToast(`Colisión: Esta promoción comparte productos con "${overlappingPromo.name}". Apágala primero.`, "error");
        return; // ⛔ BLOQUEA LA PETICIÓN AL SERVIDOR
      }
    }

    // Si pasó el escudo, hace la petición
    setIsToggling(id);
    try {
      await api.patch(`/promotions/${id}/toggle`);
      await fetchPromotions(true); 
    } catch (error) {
      if (error.response?.status === 409) {
        showToast(error.response.data.message, "warning");
      } else {
        showToast("Error al cambiar estado", "error");
      }
    } finally {
      setIsToggling(null);
    }
  };

  const requestDelete = (id) => setPromoToDelete(id);
  const cancelDelete = () => setPromoToDelete(null);

  const confirmDelete = async () => {
    if (!promoToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.delete(`/promotions/${promoToDelete}`);
      showToast("Promoción eliminada", "success");
      await fetchPromotions(true); 
    } catch (error) {
      showToast("Error al eliminar", "error");
    } finally {
      setIsDeleting(false);
      setPromoToDelete(null);
    }
  };

  const getTypeName = (type) => {
    const types = {
      'NxM': 'Volumen (NxM)',
      'FIXED': 'Rebaja Directa',
      'NTH_FIXED': 'Unidad Adicional',
      'COMBO': 'Combo Armado',
      'TICKET_DISCOUNT': 'Monto de Ticket',
      'BOGO': 'Compra X, Llévate Y'
    };
    return types[type] || type;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ duration: 0.4, ease: "easeOut" }} className="bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        
        {/* HEADER RESPONSIVO NEO-BENTO */}
        <div className="p-5 sm:p-6 md:p-8 border-b border-gray-200 dark:border-gray-800 lya:border-lya-border/40 flex flex-col sm:flex-row justify-between sm:items-center gap-4 sm:gap-6 bg-white dark:bg-gray-900 lya:bg-lya-surface shrink-0 z-10 relative">
          
          {/* Lado Izquierdo: Títulos */}
          <div className="flex items-center gap-3 sm:gap-4 pr-10 sm:pr-0">
            <div className="bg-orange-100 dark:bg-orange-900/30 lya:bg-lya-primary/20 text-orange-600 dark:text-orange-400 lya:text-lya-primary p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-orange-200/50 dark:border-orange-800/30 lya:border-lya-primary/30 shrink-0">
              <Tag size={24} className="sm:w-7 sm:h-7" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-black text-gray-800 dark:text-white lya:text-lya-text tracking-tight truncate">Motor de Promociones</h2>
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-0.5 truncate">Combos, descuentos por volumen y rebajas directas.</p>
            </div>
          </div>
          
          {/* Lado Derecho: Botones */}
          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-end">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => { setEditingPromo(null); setIsWizardOpen(true); }} 
              className="w-full sm:w-auto bg-orange-500 md:hover:bg-orange-600 dark:bg-orange-600 dark:md:hover:bg-orange-500 lya:bg-lya-primary lya:md:hover:bg-lya-primary/90 text-white lya:text-lya-surface px-5 py-3.5 sm:py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/30 dark:shadow-orange-900/40 lya:shadow-lya-primary/30 outline-none"
            >
              <Plus size={20} /> <span>Nueva Promoción</span>
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.95 }} 
              onClick={onClose} 
              className="absolute top-5 right-5 sm:relative sm:top-auto sm:right-auto p-2 sm:p-3 bg-gray-100 md:hover:bg-gray-200 dark:bg-gray-800 dark:md:hover:bg-gray-700 lya:bg-lya-border/30 lya:md:hover:bg-lya-border/50 text-gray-600 dark:text-gray-400 lya:text-lya-text/60 rounded-xl transition-colors outline-none"
            >
              <X size={20} className="sm:w-6 sm:h-6" />
            </motion.button>
          </div>
          
        </div>

        {/* LISTA DE PROMOCIONES */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 md:p-8 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-orange-500 lya:text-lya-primary" size={40} /></div>
          ) : promotions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Tag size={64} className="text-gray-300 dark:text-gray-700 lya:text-lya-text/20 mb-4" />
              <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 lya:text-lya-text">Sin Promociones</h3>
              <p className="text-gray-500 dark:text-gray-500 lya:text-lya-text/60 mt-2 max-w-sm">Crea tu primer combo o descuento para incentivar tus ventas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {promotions.map(promo => {
                const productCount = promo.applyToProducts?.length || 0;
                const isGlobal = promo.type === 'TICKET_DISCOUNT' || productCount === 0;

                return (
                  <div key={promo.id} className={`bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[1.5rem] p-5 border shadow-sm flex flex-col transition-all duration-300 ${
                    promo.isActive 
                      ? 'border-orange-200 dark:border-orange-900/50 lya:border-lya-primary/40 shadow-orange-500/10 lya:shadow-lya-primary/10' 
                      : 'border-gray-200 dark:border-gray-800 lya:border-lya-border/30 opacity-60 grayscale-[50%]'
                  }`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0 pr-2">
                        <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md mb-2 ${
                          promo.isActive
                            ? 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20 lya:text-lya-primary lya:bg-lya-primary/10'
                            : 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800 lya:text-lya-text/50 lya:bg-lya-border/20'
                        }`}>
                          {getTypeName(promo.type)}
                        </span>
                        <h4 className={`text-lg font-black line-clamp-2 w-full leading-tight ${
                          promo.isActive
                            ? 'text-gray-800 dark:text-gray-100 lya:text-lya-text'
                            : 'text-gray-500 dark:text-gray-500 lya:text-lya-text/60'
                        }`}>
                          {promo.name || 'Promoción sin título'}
                        </h4>
                      </div>
                      <motion.button 
                        whileTap={!isToggling ? { scale: 0.9 } : {}}
                        onClick={() => handleToggleStatus(promo.id)} 
                        disabled={isToggling === promo.id}
                        className={`p-2.5 rounded-xl transition-all outline-none shrink-0 ${
                          isToggling === promo.id
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 opacity-50 cursor-wait'
                            : promo.isActive 
                              ? 'bg-emerald-50 text-emerald-600 md:hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 lya:bg-emerald-500/10 lya:text-emerald-500 lya:md:hover:bg-emerald-500/20 shadow-sm border border-emerald-200 dark:border-emerald-800/30' 
                              : 'bg-gray-100 text-gray-400 md:hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:md:hover:bg-gray-700 lya:bg-lya-border/20 lya:text-lya-text/40 lya:md:hover:bg-lya-border/40 border border-transparent'
                        }`} 
                        title={promo.isActive ? 'Apagar' : 'Encender'}
                      >
                        {isToggling === promo.id ? <Loader2 size={20} className="animate-spin" /> : <Power size={20} strokeWidth={promo.isActive ? 2.5 : 2} />}
                      </motion.button>
                    </div>

                    <div className="flex-1 flex flex-col justify-center mb-4">
                      <p className={`text-sm font-medium text-justify leading-relaxed ${
                        promo.isActive 
                          ? 'text-gray-600 dark:text-gray-400 lya:text-lya-text/80' 
                          : 'text-gray-400 dark:text-gray-500 lya:text-lya-text/50'
                      }`}>
                        {promo.type === 'NxM' && `Lleva ${promo.buyQty} y paga ${promo.payQty}.`}
                        {promo.type === 'FIXED' && `Precio rebajado a $${Number(promo.discountValue).toFixed(2)}.`}
                        {promo.type === 'NTH_FIXED' && `Lleva ${promo.buyQty} y el último a $${Number(promo.discountValue).toFixed(2)}.`}
                        {promo.type === 'COMBO' && `Combo a $${Number(promo.discountValue).toFixed(2)}.`}
                        {promo.type === 'TICKET_DISCOUNT' && `Recompensa por tickets arriba de $${Number(promo.minTicketAmount).toFixed(2)}.`}
                        {promo.type === 'BOGO' && `Compra ${promo.buyQty} y llévate ${promo.payQty} a $${Number(promo.discountValue).toFixed(2)}.`}
                      </p>
                      
                      <div className={`mt-3 flex items-center gap-1.5 text-xs font-bold ${promo.isActive ? 'text-gray-500 dark:text-gray-400 lya:text-lya-text/60' : 'text-gray-400/70 dark:text-gray-500/70 lya:text-lya-text/40'}`}>
                        {isGlobal ? (
                          <><Globe size={14} /> Todo el ticket</>
                        ) : (
                          <><ShoppingBag size={14} /> Aplica a {productCount} producto{productCount !== 1 ? 's' : ''}</>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800 lya:border-lya-border/30">
                      <div className="flex gap-1">
                        {['D','L','M','X','J','V','S'].map((day, i) => {
                          const isActiveDay = promo.validDays.includes(i);
                          return (
                            <span key={i} className={`text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold ${
                              isActiveDay 
                                ? promo.isActive
                                  ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 lya:bg-lya-text lya:text-lya-bg' 
                                  : 'bg-gray-400 text-white dark:bg-gray-600 dark:text-gray-300 lya:bg-lya-text/50 lya:text-lya-surface'
                                : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 lya:bg-lya-border/20 lya:text-lya-text/30'
                            }`}>
                              {day}
                            </span>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <motion.button 
                          whileTap={{ scale: 0.9 }} 
                          onClick={() => { setEditingPromo(promo); setIsWizardOpen(true); }} 
                          className={`p-2 rounded-xl outline-none transition-colors ${
                            promo.isActive
                              ? 'text-blue-600 bg-blue-50 md:hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 lya:bg-lya-secondary/10 lya:text-lya-secondary lya:md:hover:bg-lya-secondary/20'
                              : 'text-gray-400 bg-gray-100 md:hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500 lya:bg-lya-border/20 lya:text-lya-text/40'
                          }`}
                        >
                          <Edit2 size={16} />
                        </motion.button>
                        <motion.button 
                          whileTap={{ scale: 0.9 }} 
                          onClick={() => requestDelete(promo.id)} 
                          className={`p-2 rounded-xl outline-none transition-colors ${
                            promo.isActive
                              ? 'text-red-600 bg-red-50 md:hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 lya:bg-red-500/10 lya:text-red-500 lya:md:hover:bg-red-500/20'
                              : 'text-gray-400 bg-gray-100 md:hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500 lya:bg-lya-border/20 lya:text-lya-text/40'
                          }`}
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN NEO-BENTO */}
      <AnimatePresence>
        {promoToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={cancelDelete} className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 lya:bg-lya-dark/50 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 flex flex-col items-center text-center relative z-10"
            >
              <div className="bg-red-100 dark:bg-red-500/20 p-4 rounded-full mb-4 text-red-500">
                <AlertTriangle size={36} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-black text-gray-800 dark:text-white lya:text-lya-text mb-2 text-center">¿Eliminar Promoción?</h3>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-8 px-2 text-center leading-relaxed">
                Esta acción no se puede deshacer. La promoción dejará de aplicarse inmediatamente en todos los puntos de venta.
              </p>
              
              <div className="flex w-full gap-3">
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  disabled={isDeleting}
                  onClick={cancelDelete} 
                  className="flex-1 py-3.5 text-gray-600 dark:text-gray-300 lya:text-lya-text/80 bg-gray-100 md:hover:bg-gray-200 dark:bg-gray-800 dark:md:hover:bg-gray-700 lya:bg-lya-border/20 lya:md:hover:bg-lya-border/40 rounded-2xl font-black transition-colors outline-none disabled:opacity-50"
                >
                  Cancelar
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  disabled={isDeleting}
                  onClick={confirmDelete} 
                  className={`flex-1 py-3.5 bg-red-500 text-white rounded-2xl font-black transition-all flex items-center justify-center outline-none ${
                    isDeleting ? 'opacity-70 cursor-wait shadow-none' : 'md:hover:bg-red-600 shadow-lg shadow-red-500/30'
                  }`}
                >
                  {isDeleting ? <Loader2 size={20} className="animate-spin" /> : 'Eliminar'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PromotionManagerModal 
        isOpen={isWizardOpen} 
        onClose={() => setIsWizardOpen(false)} 
        editData={editingPromo} 
        products={products}
        allPromotions={promotions} // <--- Este es el prop vital para que el escudo funcione
        onPromotionSaved={() => {
          setIsWizardOpen(false);
          fetchPromotions(true);
          showToast("Promoción guardada exitosamente", "success");
        }}
      />
    </motion.div>
  );
};