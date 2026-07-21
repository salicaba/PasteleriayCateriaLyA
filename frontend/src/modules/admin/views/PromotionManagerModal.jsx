import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag, Loader2, Save, Calendar, Power, AlertTriangle, CheckCircle2, Info, ArrowRight, DollarSign, Percent, Calculator, CheckSquare, AlertCircle } from 'lucide-react';
import api from '../../../api/client'; 

const DAYS_OF_WEEK = [
  { id: 1, label: 'Lunes' }, { id: 2, label: 'Martes' }, { id: 3, label: 'Miércoles' },
  { id: 4, label: 'Jueves' }, { id: 5, label: 'Viernes' }, { id: 6, label: 'Sábado' }, { id: 0, label: 'Domingo' }
];

export default function PromotionManagerModal({ isOpen, onClose, product, onPromotionSaved }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFetch, setIsLoadingFetch] = useState(true);
  const [errorToast, setErrorToast] = useState(null);
  
  const [formData, setFormData] = useState({
    type: 'NxM',
    buyQty: 2,
    payQty: 1,
    discountValue: 0,
    validDays: [0, 1, 2, 3, 4, 5, 6],
    isActive: true
  });

  const basePrice = product ? parseFloat(product.precioBase || product.basePrice || 0) : 0;

  useEffect(() => {
    let isMounted = true;
    const fetchPromotion = async () => {
      if (!isOpen || !product) return;
      setIsLoadingFetch(true);
      setErrorToast(null);
      try {
        const res = await api.get('/promotions');
        if (res.data.success && isMounted) {
          const existingPromo = res.data.data.find(p => p.productId === product.id);
          if (existingPromo) {
            setFormData({
              type: existingPromo.type,
              buyQty: existingPromo.buyQty,
              payQty: existingPromo.payQty,
              discountValue: parseFloat(existingPromo.discountValue) || 0,
              validDays: existingPromo.validDays,
              isActive: existingPromo.isActive
            });
          } else {
            setFormData({
              type: 'NxM', buyQty: 2, payQty: 1, discountValue: basePrice, validDays: [0, 1, 2, 3, 4, 5, 6], isActive: true
            });
          }
        }
      } catch (error) {
        console.error("Error cargando promoción:", error);
      } finally {
        if (isMounted) setIsLoadingFetch(false);
      }
    };
    fetchPromotion();
    return () => { isMounted = false; };
  }, [isOpen, product, basePrice]);

  const toggleDay = (dayId) => {
    setFormData(prev => ({
      ...prev,
      validDays: prev.validDays.includes(dayId)
        ? prev.validDays.filter(d => d !== dayId)
        : [...prev.validDays, dayId]
    }));
  };

  const showError = (message) => {
    setErrorToast(message);
    setTimeout(() => setErrorToast(null), 4500);
  };

  const handleSave = async () => {
    if (formData.validDays.length === 0) {
      showError("Debes seleccionar al menos un día válido para la promoción."); return;
    }
    if (formData.type === 'NxM' && formData.buyQty <= formData.payQty) {
      showError("Error lógico: La cantidad que el cliente 'lleva' debe ser mayor a la que 'paga'."); return;
    }
    if ((formData.type === 'FIXED' || formData.type === 'NTH_FIXED') && formData.discountValue >= basePrice) {
      showError("El precio promocional debe ser estrictamente menor al precio base original."); return;
    }

    setIsProcessing(true);
    try {
      const res = await api.post(`/promotions/product/${product.id}`, formData);
      if (res.data.success) {
        onPromotionSaved(res.data.data);
        onClose();
      }
    } catch (error) {
      console.error("Error guardando:", error);
      showError("Error interno en el servidor al intentar guardar.");
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateDiscountPercent = () => {
    if (basePrice <= 0 || !formData.discountValue) return 0;
    const discount = basePrice - formData.discountValue;
    const percent = (discount / basePrice) * 100;
    return Math.max(0, Math.round(percent));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
          
          {/* NOTIFICACIÓN FLOTANTE (Pilar 5) */}
          <AnimatePresence>
            {errorToast && (
              <motion.div 
                initial={{ opacity: 0, y: -20, scale: 0.9 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                className="fixed top-8 left-0 right-0 z-[110] flex justify-center px-4 pointer-events-none"
              >
                <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-full shadow-2xl border border-red-100 dark:border-red-900/30 lya:border-red-500/30 px-6 py-4 flex items-center gap-3 max-w-md w-full sm:w-auto">
                  <div className="bg-red-100 dark:bg-red-500/20 text-red-500 p-1.5 rounded-full shrink-0">
                    <AlertTriangle size={20} />
                  </div>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100 lya:text-lya-text text-center tracking-wide">{errorToast}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CONTENEDOR RAÍZ (Pilar 1 & 4) */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-3xl max-h-[95vh] bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 lya:border-lya-border/40"
          >
            
            {/* HEADER FIJO */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 md:p-8 border-b border-gray-200 dark:border-gray-800 lya:border-lya-border/40 shrink-0 bg-white dark:bg-gray-900 lya:bg-lya-surface z-10 relative">
              <div className="flex items-center gap-5 min-w-0 pr-10 sm:pr-0">
                <div className="h-14 w-14 rounded-[1.25rem] bg-orange-100 dark:bg-orange-900/30 lya:bg-lya-primary/20 text-orange-500 dark:text-orange-400 lya:text-lya-primary flex items-center justify-center shrink-0 border border-orange-200/50 dark:border-orange-800/30 lya:border-lya-primary/30">
                  <Tag size={28} strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-2xl font-black text-gray-800 dark:text-white lya:text-lya-text truncate tracking-tight">{product?.nombre || product?.name}</h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60">Precio Original:</span>
                    <span className="text-sm font-black text-gray-800 dark:text-gray-200 lya:text-lya-text line-through opacity-70">${basePrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                disabled={isProcessing}
                className="absolute top-6 right-6 sm:relative sm:top-auto sm:right-auto h-12 w-12 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 lya:bg-lya-border/30 text-gray-500 dark:text-gray-400 lya:text-lya-text/60 flex items-center justify-center md:hover:bg-gray-200 dark:md:hover:bg-gray-700 lya:md:hover:bg-lya-border/50 md:hover:text-gray-800 dark:md:hover:text-gray-100 lya:md:hover:text-lya-text transition-colors outline-none"
              >
                <X size={24} strokeWidth={2.5} />
              </motion.button>
            </div>

            {/* BODY SCROLLEABLE */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-8">
              
              {isLoadingFetch ? (
                <div className="h-full flex flex-col items-center justify-center py-20 text-gray-400">
                  <Loader2 className="animate-spin mb-4 text-orange-500 lya:text-lya-primary" size={40} />
                  <p className="font-bold tracking-wide">Cargando reglas de oferta...</p>
                </div>
              ) : (
                <>
                  {/* BLOQUE 1: ELEGIR TIPO */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-800 dark:bg-white lya:bg-lya-text text-white dark:text-gray-900 lya:text-lya-bg h-8 w-8 rounded-full flex items-center justify-center font-black text-sm">1</div>
                      <h3 className="text-lg font-black text-gray-800 dark:text-gray-100 lya:text-lya-text tracking-tight">¿Qué tipo de oferta deseas crear?</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: 'NxM', title: 'Volumen (NxM)', desc: 'Ej: 2x1, 3x2. Lleva más, paga menos.' },
                        { id: 'FIXED', title: 'Rebaja Directa', desc: 'Reduce el precio de cada unidad.' },
                        { id: 'NTH_FIXED', title: 'Unidad Adicional', desc: 'Ej: El segundo a mitad de precio.' }
                      ].map((t) => (
                        <motion.button
                          key={t.id}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setFormData({ ...formData, type: t.id })}
                          className={`p-4 rounded-[1.5rem] border text-left transition-all outline-none ${
                            formData.type === t.id 
                              ? 'bg-orange-50 dark:bg-orange-900/10 lya:bg-lya-primary/10 border-orange-500 dark:border-orange-500/50 lya:border-lya-primary shadow-md shadow-orange-500/10 lya:shadow-lya-primary/10' 
                              : 'bg-white dark:bg-gray-900 lya:bg-lya-surface border-gray-200 dark:border-gray-800 lya:border-lya-border/40 md:hover:border-orange-300 dark:md:hover:border-orange-800 lya:md:hover:border-lya-primary/50'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className={`font-black ${formData.type === t.id ? 'text-orange-600 dark:text-orange-400 lya:text-lya-primary' : 'text-gray-700 dark:text-gray-200 lya:text-lya-text'}`}>{t.title}</h4>
                            {formData.type === t.id && <CheckCircle2 size={18} className="text-orange-500 lya:text-lya-primary" />}
                          </div>
                          <p className={`text-xs font-medium leading-relaxed ${formData.type === t.id ? 'text-orange-800/70 dark:text-orange-200/60 lya:text-lya-text/80' : 'text-gray-500 dark:text-gray-400 lya:text-lya-text/60'}`}>{t.desc}</p>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* BLOQUE 2: CONFIGURACIÓN EXPLICADA */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-800 dark:bg-white lya:bg-lya-text text-white dark:text-gray-900 lya:text-lya-bg h-8 w-8 rounded-full flex items-center justify-center font-black text-sm">2</div>
                      <h3 className="text-lg font-black text-gray-800 dark:text-gray-100 lya:text-lya-text tracking-tight">Define las reglas matemáticas</h3>
                    </div>
                    
                    <motion.div layout className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2rem] p-6 sm:p-8 border border-gray-200 dark:border-gray-800 lya:border-lya-border/40 shadow-sm">
                      
                      {/* NxM LENGUAJE NATURAL */}
                      {formData.type === 'NxM' && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4">
                          <div className="flex flex-col items-center w-full sm:w-auto">
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-3">El cliente añade al carrito:</span>
                            <div className="flex items-center bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg rounded-2xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 p-2 w-full sm:w-auto">
                              <input 
                                type="number" min="2" value={formData.buyQty}
                                onChange={(e) => setFormData({...formData, buyQty: parseInt(e.target.value) || 2})}
                                className="w-20 bg-transparent text-center text-3xl font-black text-gray-900 dark:text-white lya:text-lya-text focus:outline-none focus:text-orange-500 lya:focus:text-lya-primary transition-colors"
                              />
                              <span className="text-sm font-bold text-gray-400 dark:text-gray-500 lya:text-lya-text/50 pr-4">unidades</span>
                            </div>
                          </div>

                          <div className="hidden sm:flex bg-gray-100 dark:bg-gray-800 lya:bg-lya-border/30 rounded-full p-3 text-gray-400 dark:text-gray-500">
                            <ArrowRight size={24} strokeWidth={3} />
                          </div>

                          <div className="flex flex-col items-center w-full sm:w-auto">
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-3">Pero el sistema solo cobra:</span>
                            <div className="flex items-center bg-orange-50 dark:bg-orange-900/10 lya:bg-lya-primary/10 rounded-2xl border border-orange-200 dark:border-orange-800/30 lya:border-lya-primary/30 p-2 w-full sm:w-auto">
                              <input 
                                type="number" min="1" value={formData.payQty}
                                onChange={(e) => setFormData({...formData, payQty: parseInt(e.target.value) || 1})}
                                className="w-20 bg-transparent text-center text-3xl font-black text-orange-600 dark:text-orange-500 lya:text-lya-primary focus:outline-none transition-colors"
                              />
                              <span className="text-sm font-bold text-orange-400 dark:text-orange-700/50 lya:text-lya-primary/50 pr-4">unidades</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* FIXED LENGUAJE NATURAL */}
                      {formData.type === 'FIXED' && (
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-4 text-center">En lugar de pagar <span className="line-through">${basePrice.toFixed(2)}</span>, cada producto costará:</span>
                          
                          <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg rounded-[2rem] border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 px-6 py-4 w-full sm:w-1/2">
                            <DollarSign size={32} className="text-emerald-500 dark:text-emerald-400 lya:text-emerald-400 mr-2" strokeWidth={3} />
                            <input 
                              type="number" min="0" step="1" value={formData.discountValue}
                              onChange={(e) => setFormData({...formData, discountValue: parseFloat(e.target.value) || 0})}
                              className="w-full bg-transparent text-center text-5xl font-black text-gray-900 dark:text-white lya:text-lya-text focus:outline-none focus:text-emerald-600 dark:focus:text-emerald-400 lya:focus:text-emerald-400 transition-colors"
                            />
                          </div>

                          <div className="mt-6 flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/10 lya:bg-emerald-500/10 px-5 py-2.5 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 lya:border-emerald-500/20">
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-500 lya:text-emerald-400">Descuento aplicado:</span>
                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-500 lya:text-emerald-400">{calculateDiscountPercent()}%</span>
                          </div>
                        </div>
                      )}

                      {/* NTH_FIXED LENGUAJE NATURAL */}
                      {formData.type === 'NTH_FIXED' && (
                        <div className="flex flex-col items-center w-full">
                          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center text-center sm:text-left">
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60">Si el cliente tiene</span>
                            <div className="flex items-center bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 px-3 py-1">
                              <input 
                                type="number" min="2" value={formData.buyQty}
                                onChange={(e) => setFormData({...formData, buyQty: parseInt(e.target.value) || 2})}
                                className="w-14 bg-transparent text-center text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text focus:outline-none focus:text-blue-500 lya:focus:text-lya-secondary transition-colors"
                              />
                            </div>
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60">unidades en la misma cuenta...</span>
                          </div>

                          <div className="w-full h-px bg-gray-100 dark:bg-gray-800 lya:bg-lya-border/30 my-6"></div>

                          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center text-center sm:text-left">
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60">...el sistema ajustará el precio de la <strong className="text-gray-800 dark:text-gray-200 lya:text-lya-text">ÚLTIMA</strong> unidad a:</span>
                            <div className="flex items-center bg-blue-50 dark:bg-blue-900/10 lya:bg-lya-secondary/10 rounded-2xl border border-blue-200 dark:border-blue-800/30 lya:border-lya-secondary/30 px-4 py-2">
                              <DollarSign size={20} className="text-blue-500 dark:text-blue-400 lya:text-lya-secondary mr-1" strokeWidth={3} />
                              <input 
                                type="number" min="0" step="1" value={formData.discountValue}
                                onChange={(e) => setFormData({...formData, discountValue: parseFloat(e.target.value) || 0})}
                                className="w-20 bg-transparent text-center text-3xl font-black text-blue-600 dark:text-blue-400 lya:text-lya-secondary focus:outline-none transition-colors"
                              />
                            </div>
                          </div>

                          <p className="mt-6 text-xs font-bold text-gray-400 dark:text-gray-500 lya:text-lya-text/50 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg px-4 py-2 rounded-xl">
                            Nota: Las primeras {formData.buyQty - 1} unidades se cobrarán al precio normal (${basePrice}).
                          </p>
                        </div>
                      )}
                    </motion.div>
                  </div>

                  {/* BLOQUE 3: DÍAS Y ESTADO */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-800 dark:bg-white lya:bg-lya-text text-white dark:text-gray-900 lya:text-lya-bg h-8 w-8 rounded-full flex items-center justify-center font-black text-sm">3</div>
                      <h3 className="text-lg font-black text-gray-800 dark:text-gray-100 lya:text-lya-text tracking-tight">Condiciones de Activación</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* DÍAS */}
                      <div className="md:col-span-2 bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2rem] p-6 border border-gray-200 dark:border-gray-800 lya:border-lya-border/40 shadow-sm">
                        <label className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 lya:text-lya-text/60 flex items-center gap-2 mb-4">
                          <Calendar size={16} /> ¿Qué días aplica?
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {DAYS_OF_WEEK.map((day) => {
                            const isActiveDay = formData.validDays.includes(day.id);
                            return (
                              <motion.button
                                key={day.id}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => toggleDay(day.id)}
                                className={`flex-1 min-w-[70px] py-3 rounded-2xl text-sm font-black transition-all outline-none border ${
                                  isActiveDay 
                                    ? 'bg-gray-900 dark:bg-white lya:bg-lya-text text-white dark:text-gray-900 lya:text-lya-bg border-transparent shadow-md' 
                                    : 'bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg text-gray-400 dark:text-gray-500 lya:text-lya-text/50 border-gray-200 dark:border-gray-700 lya:border-lya-border/50 md:hover:border-gray-300 dark:md:hover:border-gray-600 lya:md:hover:border-lya-border'
                                }`}
                              >
                                {day.label}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>

                      {/* ESTADO GENERAL */}
                      <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2rem] p-6 border border-gray-200 dark:border-gray-800 lya:border-lya-border/40 shadow-sm flex flex-col">
                        <label className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 lya:text-lya-text/60 flex items-center gap-2 mb-4">
                          <Power size={16} /> Estado del Motor
                        </label>
                        <div className="flex-1 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg rounded-2xl p-1.5 flex flex-col gap-1.5">
                           <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setFormData({...formData, isActive: true})}
                              className={`flex-1 flex items-center justify-center gap-2 rounded-xl font-black text-sm transition-all outline-none ${formData.isActive ? 'bg-white dark:bg-gray-900 lya:bg-lya-surface text-emerald-600 dark:text-emerald-400 lya:text-emerald-400 shadow-sm border border-gray-200 dark:border-gray-700 lya:border-lya-border/40' : 'text-gray-400 dark:text-gray-500 lya:text-lya-text/50 hover:text-gray-600 dark:hover:text-gray-300 lya:hover:text-lya-text border border-transparent'}`}
                           >
                             <CheckSquare size={16} strokeWidth={2.5} /> Encendido
                           </motion.button>
                           <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setFormData({...formData, isActive: false})}
                              className={`flex-1 flex items-center justify-center gap-2 rounded-xl font-black text-sm transition-all outline-none ${!formData.isActive ? 'bg-white dark:bg-gray-900 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text shadow-sm border border-gray-200 dark:border-gray-700 lya:border-lya-border/40' : 'text-gray-400 dark:text-gray-500 lya:text-lya-text/50 hover:text-gray-600 dark:hover:text-gray-300 lya:hover:text-lya-text border border-transparent'}`}
                           >
                             <AlertCircle size={16} strokeWidth={2.5} /> Apagado
                           </motion.button>
                        </div>
                      </div>

                    </div>
                  </div>
                </>
              )}
            </div>

            {/* FOOTER (Pilar 3) */}
            <div className="p-6 md:p-8 border-t border-gray-200 dark:border-gray-800 lya:border-lya-border/40 shrink-0 bg-white dark:bg-gray-900 lya:bg-lya-surface">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={isProcessing || isLoadingFetch}
                className={`w-full py-4 sm:py-5 bg-orange-500 dark:bg-orange-600 lya:bg-lya-primary text-white lya:text-lya-surface font-black text-lg rounded-2xl md:hover:bg-orange-600 dark:md:hover:bg-orange-500 lya:md:hover:bg-lya-primary/90 transition-all flex items-center justify-center gap-3 outline-none shadow-xl shadow-orange-500/20 dark:shadow-orange-900/30 lya:shadow-lya-primary/20 border border-orange-600/50 dark:border-orange-500/50 lya:border-lya-primary/50 ${
                  isProcessing ? 'opacity-70 cursor-wait' : ''
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="animate-spin" size={24} strokeWidth={3} />
                ) : (
                  <>
                    <Save size={24} strokeWidth={2.5} /> Guardar Promoción
                  </>
                )}
              </motion.button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}