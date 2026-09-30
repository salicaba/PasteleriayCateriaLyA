import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag, Plus, Edit2, Trash2, Power, AlertCircle, CheckCircle2, Loader2, Calendar } from 'lucide-react';
import api from '../../../api/client';
import PromotionManagerModal from './PromotionManagerModal';

export const PromotionsManagerTab = ({ isOpen, onClose, products, showToast }) => {
  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);

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

  const handleDelete = async (id) => {
    if(!window.confirm("¿Seguro que deseas eliminar esta promoción?")) return;
    try {
      await api.delete(`/promotions/${id}`);
      showToast("Promoción eliminada", "success");
      fetchPromotions();
    } catch (error) {
      showToast("Error al eliminar", "error");
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
            <button onClick={() => { setEditingPromo(null); setIsWizardOpen(true); }} className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-rose-500/30 outline-none">
              <Plus size={20} /> Nueva Promoción
            </button>
            <button onClick={onClose} className="p-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl transition-colors outline-none"><X size={24} /></button>
          </div>
        </div>

        {/* LISTA */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {isLoading ? (
            <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-rose-500" size={40} /></div>
          ) : promotions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Tag size={64} className="text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-700">Sin Promociones</h3>
              <p className="text-gray-500">Crea tu primer combo o descuento para incentivar tus ventas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {promotions.map(promo => (
                <div key={promo.id} className={`bg-white dark:bg-gray-900 rounded-2xl p-5 border shadow-sm flex flex-col ${promo.isActive ? 'border-rose-200 shadow-rose-500/10' : 'border-gray-200 opacity-70 grayscale-[40%]'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 px-2 py-1 rounded-md">{getTypeName(promo.type)}</span>
                      <h4 className="text-lg font-black text-gray-800 dark:text-gray-100 mt-2">{promo.name || 'Promoción sin título'}</h4>
                    </div>
                    <button onClick={() => handleToggleStatus(promo.id)} className={`p-2 rounded-xl transition-all ${promo.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`} title={promo.isActive ? 'Apagar' : 'Encender'}>
                      <Power size={20} />
                    </button>
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
                      <button onClick={() => { setEditingPromo(promo); setIsWizardOpen(true); }} className="p-2 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(promo.id)} className="p-2 text-red-600 bg-red-50 rounded-xl hover:bg-red-100"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

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