import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Power, CheckCircle2, AlertCircle, AlertTriangle, X, Tag, Edit2, Trash2, Info } from 'lucide-react';
import api from '../../../api/client';

export default function PromotionListModal({ isOpen, onClose, product, onOpenWizard }) {
  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null); 
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (isOpen && product) {
      fetchPromotions();
    }
  }, [isOpen, product]);

  const fetchPromotions = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/promotions');
      if (res.data.success) {
        const productPromos = res.data.data.filter(p => p.productId === product.id);
        setPromotions(productPromos);
      }
    } catch (error) {
      showNotification('error', 'Error al cargar las promociones del servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleToggle = async (promo) => {
    if (processingId) return; 
    setProcessingId(promo.id);
    try {
      const res = await api.patch(`/promotions/${promo.id}/toggle`);
      if (res.data.success) {
         const updatedPromo = res.data.data;
         setPromotions(prev => prev.map(p => p.id === promo.id ? { ...p, isActive: updatedPromo.isActive } : p));
         showNotification('success', res.data.message);
      }
    } catch (error) {
      if (error.response?.status === 409) {
        showNotification('warning', error.response.data.message);
      } else {
        showNotification('error', 'Error de conexión. Intenta de nuevo.');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (promoId) => {
    if (processingId) return;
    setProcessingId(promoId);
    try {
      const res = await api.delete(`/promotions/${promoId}`);
      if (res.data.success) {
        setPromotions(prev => prev.filter(p => p.id !== promoId));
        setConfirmDeleteId(null);
        showNotification('success', res.data.message);
      }
    } catch (error) {
      showNotification('error', 'Error al eliminar la promoción.');
    } finally {
      setProcessingId(null);
    }
  };

  const dayNames = { 1: 'LUN', 2: 'MAR', 3: 'MIE', 4: 'JUE', 5: 'VIE', 6: 'SAB', 0: 'DOM' };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      
      {/* CÁPSULA NEO-BENTO PARA NOTIFICACIONES */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-8 left-0 right-0 z-[110] flex justify-center px-4 pointer-events-none"
          >
            <div className={`bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-full shadow-2xl border px-6 py-4 flex items-center gap-3 max-w-md w-full sm:w-auto ${
              notification.type === 'success' ? 'border-emerald-100 dark:border-emerald-900/30' :
              notification.type === 'warning' ? 'border-amber-100 dark:border-amber-900/30' :
              'border-red-100 dark:border-red-900/30'
            }`}>
              <div className={`p-1.5 rounded-full shrink-0 ${
                notification.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500' :
                notification.type === 'warning' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-500' :
                'bg-red-100 dark:bg-red-500/20 text-red-500'
              }`}>
                {notification.type === 'success' && <CheckCircle2 size={20} />}
                {notification.type === 'warning' && <AlertTriangle size={20} />}
                {notification.type === 'error' && <AlertCircle size={20} />}
              </div>
              <span className="text-sm font-bold text-gray-800 dark:text-gray-100 lya:text-lya-text text-center tracking-wide">
                {notification.message}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.98 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }} 
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-4xl h-[85vh] bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 lya:border-lya-border/40"
      >
        
        {/* Header Fijo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 md:p-8 border-b border-gray-200 dark:border-gray-800 lya:border-lya-border/40 shrink-0 bg-white dark:bg-gray-900 lya:bg-lya-surface z-10 relative">
          <div className="flex items-center gap-5 min-w-0 pr-10 sm:pr-0">
            <div className="h-14 w-14 rounded-[1.25rem] bg-orange-100 dark:bg-orange-900/30 lya:bg-lya-primary/20 text-orange-500 dark:text-orange-400 lya:text-lya-primary flex items-center justify-center shrink-0 border border-orange-200/50 dark:border-orange-800/30 lya:border-lya-primary/30">
              <Tag size={28} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-gray-800 dark:text-white lya:text-lya-text truncate tracking-tight">Promociones Activas</h2>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1 truncate">
                Gestionando reglas para: <span className="text-gray-800 dark:text-gray-200 lya:text-lya-text">{product?.nombre || product?.name}</span>
              </p>
            </div>
          </div>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="absolute top-6 right-6 sm:relative sm:top-auto sm:right-auto h-12 w-12 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 lya:bg-lya-border/30 text-gray-500 dark:text-gray-400 lya:text-lya-text/60 flex items-center justify-center md:hover:bg-gray-200 dark:md:hover:bg-gray-700 lya:md:hover:bg-lya-border/50 md:hover:text-gray-800 transition-colors outline-none"
          >
            <X size={24} strokeWidth={2.5} />
          </motion.button>
        </div>

        {/* Área de Scroll */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="animate-spin mb-4 text-orange-500 lya:text-lya-primary" size={48} />
              <p className="font-bold tracking-wide">Cargando promociones...</p>
            </div>
          ) : promotions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-80">
              <div className="w-24 h-24 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm">
                <Tag size={40} className="text-gray-300 dark:text-gray-600" />
              </div>
              <h3 className="text-xl font-black text-gray-800 dark:text-gray-200 lya:text-lya-text">Sin promociones</h3>
              <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400 max-w-sm text-justify leading-relaxed">
                Este producto no tiene configurada ninguna regla de descuento en su historial. Presiona el botón inferior para crear la primera.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {promotions.map((promo) => (
                <div 
                  key={promo.id} 
                  className={`relative flex flex-col p-6 rounded-[2rem] border transition-all duration-300 md:hover:shadow-lg md:hover:-translate-y-1 overflow-hidden ${
                    promo.isActive 
                      ? 'bg-white dark:bg-gray-900 lya:bg-lya-surface border-orange-200 dark:border-orange-900/50 lya:border-lya-primary/30 shadow-sm' 
                      : 'bg-gray-100/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 opacity-75 grayscale-[0.3]'
                  }`}
                >
                  
                  {/* 🔥 OVERLAY NEO-BENTO PARA ELIMINAR */}
                  <AnimatePresence>
                    {confirmDeleteId === promo.id && (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="absolute inset-0 bg-white/95 dark:bg-gray-950/95 lya:bg-lya-surface/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 border border-red-100 dark:border-red-900/50 rounded-[2rem]"
                      >
                        <AlertTriangle size={36} className="text-red-500 mb-3" />
                        <h4 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text text-center tracking-tight leading-tight">¿Eliminar esta promoción?</h4>
                        <div className="flex gap-3 mt-6 w-full">
                          <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 lya:bg-lya-border/30 rounded-xl font-bold text-gray-600 dark:text-gray-300 transition-colors md:hover:bg-gray-200 outline-none">Cancelar</button>
                          <button disabled={processingId === promo.id} onClick={() => handleDelete(promo.id)} className="flex-1 py-3 bg-red-500 md:hover:bg-red-600 text-white rounded-xl font-bold flex justify-center items-center shadow-lg shadow-red-500/20 transition-colors outline-none">
                            {processingId === promo.id ? <Loader2 className="animate-spin" size={20}/> : 'Eliminar'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* HEADER DE LA TARJETA: BADGES */}
                  <div className="flex justify-between items-center mb-5">
                    <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                      {promo.type === 'NxM' ? '📦 VOLUMEN (NxM)' : promo.type === 'FIXED' ? '🏷️ REBAJA DIRECTA' : '✨ UNIDAD ADICIONAL'}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
                        promo.isActive 
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' 
                          : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-700'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${promo.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-gray-400'}`}></span>
                      {promo.isActive ? 'Activa' : 'Pausada'}
                    </span>
                  </div>

                  {/* CUERPO DE LA TARJETA: TÍTULO Y DESCRIPCIÓN */}
                  <div className="mb-6 flex-1">
                    <h4 className="text-[1.35rem] font-black text-gray-800 dark:text-gray-100 lya:text-lya-text leading-tight mb-2.5 tracking-tight">
                      {promo.type === 'NxM' && `Lleva ${promo.buyQty}, Paga ${promo.payQty}`}
                      {promo.type === 'FIXED' && `Precio Especial $${parseFloat(promo.discountValue).toFixed(2)}`}
                      {promo.type === 'NTH_FIXED' && `Unidad #${promo.buyQty} a $${parseFloat(promo.discountValue).toFixed(2)}`}
                    </h4>
                    
                    {/* TEXTO INFORMATIVO (Rellena el espacio vacío inteligentemente) */}
                    <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 leading-relaxed text-justify">
                      {promo.type === 'NxM' && `El sistema descontará automáticamente el precio de ${promo.buyQty - promo.payQty} unidad(es) por cada múltiplo de ${promo.buyQty} en la misma cuenta.`}
                      {promo.type === 'FIXED' && `Se aplicará un descuento directo para que el precio final de cada unidad añadida sea de $${parseFloat(promo.discountValue).toFixed(2)}.`}
                      {promo.type === 'NTH_FIXED' && `Cuando el cliente acumule ${promo.buyQty} unidades exactas, el sistema aplicará un descuento para que la última cueste $${parseFloat(promo.discountValue).toFixed(2)}.`}
                    </p>
                  </div>

                  {/* FOOTER DE LA TARJETA: DÍAS Y BOTONES HORIZONTALES */}
                  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mt-auto pt-5 border-t border-gray-100 dark:border-gray-800">
                    
                    {/* Días */}
                    <div className="flex flex-wrap gap-1.5 w-full lg:w-auto">
                      {[1, 2, 3, 4, 5, 6, 0].map(dayId => {
                        const isActiveDay = promo.validDays.includes(dayId);
                        return (
                          <span 
                            key={dayId}
                            className={`px-2.5 py-1 text-[9px] font-black rounded-lg tracking-wider ${
                              isActiveDay 
                                ? (promo.isActive ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-gray-500 text-white')
                                : 'bg-transparent text-gray-300 dark:text-gray-700 border border-gray-200 dark:border-gray-800'
                            }`}
                          >
                            {dayNames[dayId]}
                          </span>
                        );
                      })}
                    </div>

                    {/* Botones Horizontales */}
                    <div className="flex items-center gap-2 shrink-0 bg-gray-50 dark:bg-gray-800/50 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800 lya:border-lya-border/40">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        disabled={processingId !== null}
                        onClick={() => handleToggle(promo)}
                        title={promo.isActive ? "Pausar Promoción" : "Reanudar Promoción"}
                        className={`relative p-2.5 rounded-xl flex items-center justify-center transition-all outline-none ${
                          processingId === promo.id 
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-wait'
                            : promo.isActive 
                              ? 'bg-white border border-gray-200 text-orange-500 shadow-sm md:hover:bg-orange-50' 
                              : 'bg-white border border-gray-200 text-gray-400 md:hover:bg-gray-100'
                        }`}
                      >
                        {processingId === promo.id ? <Loader2 className="animate-spin" size={18} /> : <Power size={18} strokeWidth={2.5} />}
                      </motion.button>
                      
                      <motion.button 
                        whileTap={{ scale: 0.9 }} 
                        onClick={() => onOpenWizard(promo)} 
                        title="Editar Reglas"
                        className="p-2.5 rounded-xl bg-white text-blue-500 border border-gray-200 shadow-sm md:hover:bg-blue-50 transition-colors flex items-center justify-center outline-none"
                      >
                        <Edit2 size={18} strokeWidth={2.5} />
                      </motion.button>
                      
                      <motion.button 
                        whileTap={{ scale: 0.9 }} 
                        onClick={() => setConfirmDeleteId(promo.id)} 
                        title="Eliminar Promoción"
                        className="p-2.5 rounded-xl bg-white text-red-500 border border-gray-200 shadow-sm md:hover:bg-red-50 transition-colors flex items-center justify-center outline-none"
                      >
                        <Trash2 size={18} strokeWidth={2.5} />
                      </motion.button>
                    </div>
                    
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Fijo */}
        <div className="p-6 md:p-8 border-t border-gray-200 dark:border-gray-800 lya:border-lya-border/40 shrink-0 bg-white dark:bg-gray-900 lya:bg-lya-surface">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => onOpenWizard(null)} 
            className="w-full py-4 sm:py-5 bg-gray-900 dark:bg-white lya:bg-lya-text text-white dark:text-gray-900 lya:text-lya-bg font-black text-lg rounded-2xl md:hover:bg-gray-800 transition-all flex items-center justify-center gap-3 outline-none shadow-xl shadow-gray-900/10"
          >
            <Plus size={24} strokeWidth={3} />
            Crear Nueva Promoción
          </motion.button>
        </div>
        
      </motion.div>
    </div>
  );
}