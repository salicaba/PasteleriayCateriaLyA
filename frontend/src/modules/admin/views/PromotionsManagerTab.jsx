import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag, Plus, Edit2, Trash2, Power, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import api from '../../../api/client';
import PromotionManagerModal from './PromotionManagerModal';

export const PromotionsManagerTab = ({ isOpen, onClose, products, showToast }) => {
  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);

  // 🔥 ESTADOS PARA EL MODAL DE ELIMINACIÓN (Adiós window.confirm)
  const [promoToDelete, setPromoToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPromotions = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/promotions');
      setPromotions(res.data.data || res.data || []);
    } catch (error) {
      showToast("Error al cargar promociones", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchPromotions();
  }, [isOpen]);

  const handleToggleStatus = async (id) => {
    try {
      await api.patch(`/promotions/${id}/toggle`);
      fetchPromotions();
    } catch (error) {
      if (error.response?.status === 409) {
        showToast(error.response.data.message, "warning");
      } else {
        showToast("Error al cambiar estado", "error");
      }
    }
  };

  // 🔥 PILAR 3: Funciones asíncronas con bloqueos
  const requestDelete = (id) => setPromoToDelete(id);
  const cancelDelete = () => setPromoToDelete(null);

  const confirmDelete = async () => {
    if (!promoToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/promotions/${promoToDelete}`);
      showToast("Promoción eliminada", "success");
      fetchPromotions();
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
      'TICKET_DISCOUNT': 'Regalo/Descuento por Monto'
    };
    return types[type] || type;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      {/* 🔥 PILAR 1: Contenedor con h-full y flex-col, overflow hidden */}
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        
        {/* HEADER */}
        <div className="p-6 md:p-8 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-rose-100 text-rose-600 p-3 rounded-2xl"><Tag size={28} /></div>
            <div>
              <h2 className="text-2xl font-black text-gray-800 dark:text-white">Motor de Promociones</h2>
              <p className="text-sm font-medium text-gray-500">Combos, descuentos por volumen y rebajas directas.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => { setEditingPromo(null); setIsWizardOpen(true); }} 
              className="bg-rose-500 md:hover:bg-rose-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-rose-500/30 outline-none"
            >
              <Plus size={20} /> Nueva Promoción
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={onClose} className="p-3 bg-gray-100 md:hover:bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl transition-colors outline-none"><X size={24} /></motion.button>
          </div>
        </div>

        {/* LISTA (Único lugar donde hay scroll) */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-rose-500" size={40} /></div>
          ) : promotions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Tag size={64} className="text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-700">Sin Promociones</h3>
              <p className="text-gray-500">Crea tu primer combo o descuento para incentivar tus ventas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {promotions.map(promo => (
                <div key={promo.id} className={`bg-white dark:bg-gray-900 rounded-[1.5rem] p-5 border shadow-sm flex flex-col ${promo.isActive ? 'border-rose-200 shadow-rose-500/10' : 'border-gray-200 opacity-70 grayscale-[40%]'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 px-2 py-1 rounded-md">{getTypeName(promo.type)}</span>
                      {/* 🔥 PILAR 4: truncate o line-clamp-2 */}
                      <h4 className="text-lg font-black text-gray-800 dark:text-gray-100 mt-2 truncate max-w-[200px]">{promo.name || 'Promoción sin título'}</h4>
                    </div>
                    {/* 🔥 PILAR 2: md:hover */}
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleToggleStatus(promo.id)} className={`p-2 rounded-xl transition-all outline-none ${promo.isActive ? 'bg-emerald-50 text-emerald-600 md:hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 md:hover:bg-gray-200'}`} title={promo.isActive ? 'Apagar' : 'Encender'}>
                      <Power size={20} />
                    </motion.button>
                  </div>

                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 flex-1">
                    {promo.type === 'NxM' && `Lleva ${promo.buyQty} y paga ${promo.payQty}.`}
                    {promo.type === 'FIXED' && `Precio rebajado a $${Number(promo.discountValue).toFixed(2)}.`}
                    {promo.type === 'NTH_FIXED' && `Lleva ${promo.buyQty} y el último a $${Number(promo.discountValue).toFixed(2)}.`}
                    {promo.type === 'COMBO' && `Combo a $${Number(promo.discountValue).toFixed(2)}.`}
                    {promo.type === 'TICKET_DISCOUNT' && `Recompensa por tickets arriba de $${Number(promo.minTicketAmount).toFixed(2)}.`}
                  </p>

                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex gap-1">
                      {['D','L','M','X','J','V','S'].map((day, i) => (
                        <span key={i} className={`text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold ${promo.validDays.includes(i) ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-400'}`}>{day}</span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setEditingPromo(promo); setIsWizardOpen(true); }} className="p-2 text-blue-600 bg-blue-50 rounded-xl md:hover:bg-blue-100 outline-none"><Edit2 size={16} /></motion.button>
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => requestDelete(promo.id)} className="p-2 text-red-600 bg-red-50 rounded-xl md:hover:bg-red-100 outline-none"><Trash2 size={16} /></motion.button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* 🔥 MODAL DE CONFIRMACIÓN DE ELIMINACIÓN NEO-BENTO (Reemplaza al alert nativo) */}
      <AnimatePresence>
        {promoToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={cancelDelete} className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center relative z-10"
            >
              <div className="bg-red-100 dark:bg-red-500/20 p-4 rounded-full mb-4 text-red-500">
                <AlertTriangle size={36} />
              </div>
              {/* 🔥 PILAR 4: Textos centrados en modales de advertencia */}
              <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-2 text-center">¿Eliminar Promoción?</h3>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-8 px-2 text-center leading-relaxed">
                Esta acción no se puede deshacer. La promoción dejará de aplicarse inmediatamente.
              </p>
              
              <div className="flex w-full gap-3">
                <button 
                  disabled={isDeleting}
                  onClick={cancelDelete} 
                  className="flex-1 py-3.5 text-gray-600 dark:text-gray-300 bg-gray-100 md:hover:bg-gray-200 dark:bg-gray-800 dark:md:hover:bg-gray-700 rounded-xl font-bold transition-colors outline-none disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  disabled={isDeleting}
                  onClick={confirmDelete} 
                  className={`flex-1 py-3.5 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/30 transition-all flex items-center justify-center outline-none ${
                    isDeleting ? 'opacity-70 cursor-not-allowed shadow-none' : 'active:scale-95 md:hover:bg-red-600 md:hover:-translate-y-0.5'
                  }`}
                >
                  {/* 🔥 PILAR 3: Loader en botón bloqueado */}
                  {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'Eliminar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WIZARD DE CREACIÓN/EDICIÓN */}
      <PromotionManagerModal 
        isOpen={isWizardOpen} 
        onClose={() => setIsWizardOpen(false)} 
        editData={editingPromo} 
        products={products}
        onPromotionSaved={() => {
          setIsWizardOpen(false);
          fetchPromotions();
          showToast("Promoción guardada exitosamente", "success");
        }}
      />
    </motion.div>
  );
};