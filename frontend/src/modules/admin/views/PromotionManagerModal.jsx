import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag, Loader2, Save, Calendar, Power, AlertTriangle, CheckCircle2, ArrowRight, DollarSign, CheckSquare, AlertCircle, Search, ShoppingBag, Gift, PackageMinus } from 'lucide-react';
import api from '../../../api/client'; 

const DAYS_OF_WEEK = [
  { id: 1, label: 'Lunes' }, { id: 2, label: 'Martes' }, { id: 3, label: 'Miércoles' },
  { id: 4, label: 'Jueves' }, { id: 5, label: 'Viernes' }, { id: 6, label: 'Sábado' }, { id: 0, label: 'Domingo' }
];

export default function PromotionManagerModal({ isOpen, onClose, products = [], allPromotions = [], editData, onPromotionSaved }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorToast, setErrorToast] = useState(null);
  
  const [searchProduct, setSearchProduct] = useState('');
  const [searchReward, setSearchReward] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'NxM',
    applyToProducts: [],
    rewardProducts: [],
    buyQty: 2,
    payQty: 1,
    discountValue: '',
    minTicketAmount: '',
    minStockThreshold: 0, // 🌟 NUEVO: Umbral de seguridad de stock
    validDays: [0, 1, 2, 3, 4, 5, 6],
    isActive: true
  });

  useEffect(() => {
    if (isOpen) {
      setSearchProduct('');
      setSearchReward('');
      if (editData) {
        setFormData({
          name: editData.name || '',
          type: editData.type || 'NxM',
          applyToProducts: editData.applyToProducts || [],
          rewardProducts: editData.rewardProducts || [],
          buyQty: editData.buyQty || 2,
          payQty: editData.payQty || 1,
          discountValue: Number(editData.discountValue) === 0 ? '' : editData.discountValue,
          minTicketAmount: Number(editData.minTicketAmount) === 0 ? '' : editData.minTicketAmount,
          minStockThreshold: editData.minStockThreshold || editData.min_stock_threshold || 0,
          validDays: editData.validDays || [0, 1, 2, 3, 4, 5, 6],
          isActive: editData.isActive !== undefined ? editData.isActive : true
        });
      } else {
        setFormData({
          name: '',
          type: 'NxM', 
          applyToProducts: [],
          rewardProducts: [],
          buyQty: 2, 
          payQty: 1, 
          discountValue: '', 
          minTicketAmount: '',
          minStockThreshold: 0,
          validDays: [0, 1, 2, 3, 4, 5, 6], 
          isActive: true
        });
      }
      setErrorToast(null);
    }
  }, [isOpen, editData]);

  const toggleDay = (dayId) => {
    setFormData(prev => ({
      ...prev,
      validDays: prev.validDays.includes(dayId)
        ? prev.validDays.filter(d => d !== dayId)
        : [...prev.validDays, dayId]
    }));
  };

  const toggleProductSelection = (productId) => {
    setFormData(prev => ({
      ...prev,
      applyToProducts: prev.applyToProducts.includes(productId)
        ? prev.applyToProducts.filter(id => id !== productId)
        : [...prev.applyToProducts, productId]
    }));
  };

  const toggleRewardSelection = (productId) => {
    setFormData(prev => ({
      ...prev,
      rewardProducts: prev.rewardProducts.includes(productId)
        ? prev.rewardProducts.filter(id => id !== productId)
        : [...prev.rewardProducts, productId]
    }));
  };

  const showError = (message) => {
    setErrorToast(message);
    setTimeout(() => setErrorToast(null), 5000);
  };

  const handleSave = async () => {
    // 1. Validaciones Básicas
    if (!formData.name.trim()) {
      showError("Por favor, asigna un nombre a la promoción."); return;
    }
    if (formData.validDays.length === 0) {
      showError("Debes seleccionar al menos un día válido."); return;
    }
    if (formData.type === 'BOGO') {
      if (formData.applyToProducts.length === 0) {
        showError("Selecciona al menos un producto que el cliente deba comprar."); return;
      }
      if (formData.rewardProducts.length === 0) {
        showError("Selecciona al menos un producto para dar de premio."); return;
      }
    } else if (formData.type !== 'TICKET_DISCOUNT' && formData.applyToProducts.length === 0) {
      showError("Selecciona al menos un producto para aplicar la promoción."); return;
    }

    // 2. PROTECCIÓN DE GANANCIAS: Precios idénticos en NxM
    if (formData.type === 'NxM' && formData.applyToProducts.length > 1) {
      const selectedIds = formData.applyToProducts.map(String);
      const selectedProds = products.filter(p => selectedIds.includes(String(p.id)));
      
      if (selectedProds.length > 1) {
        const getPrice = (p) => Number(p.precio || p.basePrice || p.precioBase || 0).toFixed(2);
        const firstPrice = getPrice(selectedProds[0]);
        const allSamePrice = selectedProds.every(p => getPrice(p) === firstPrice);
        
        if (!allSamePrice) {
          showError(`ALERTA DE PÉRDIDA: Todos los productos en una promo NxM deben valer lo mismo. Seleccionaste productos con precios distintos.`);
          return; 
        }
      }
    }

    // 3. ESCUDO ANTI-COLISIONES NIVEL PRODUCCIÓN (Ignora los Premios)
    if (formData.isActive) {
      const overlappingPromo = allPromotions.find(p => {
        if (editData && p.id === editData.id) return false;
        
        const rawActive = p.isActive ?? p.is_active ?? p.status;
        const isPActive = rawActive === true || rawActive === 1 || rawActive === 'true' || rawActive === '1';
        if (!isPActive) return false;

        const pDaysRaw = p.validDays || p.valid_days;
        let pDays = [];
        if (Array.isArray(pDaysRaw)) pDays = pDaysRaw.map(Number);
        else if (typeof pDaysRaw === 'string') {
          try { pDays = JSON.parse(pDaysRaw).map(Number); } 
          catch(e) { pDays = pDaysRaw.replace(/[\[\]]/g, '').split(',').map(n => Number(n.trim())); }
        }
        
        const hasDayOverlap = formData.validDays.some(d => pDays.includes(d));
        if (!hasDayOverlap) return false;

        if (formData.type === 'TICKET_DISCOUNT' && p.type === 'TICKET_DISCOUNT') {
           return true; 
        } else if (formData.type !== 'TICKET_DISCOUNT' && p.type !== 'TICKET_DISCOUNT') {
           
           // 🌟 CORRECCIÓN BOGO: SOLO Recopilamos los DISPARADORES de la promo iterada
           let pProducts = [];
           if (Array.isArray(p.applyToProducts)) pProducts.push(...p.applyToProducts.map(String));
           if (p.productId || p.product_id) pProducts.push(String(p.productId || p.product_id));

           // 🌟 CORRECCIÓN BOGO: SOLO Recopilamos los DISPARADORES de la promo que estamos creando
           let formProducts = [...formData.applyToProducts.map(String)];

           const hasProductOverlap = formProducts.some(id => pProducts.includes(id));
           return hasProductOverlap;
        }
        return false;
      });

      if (overlappingPromo) {
        showError(`COLISIÓN DETECTADA: Hay productos que ya forman parte de "${overlappingPromo.name}" en los días elegidos. Apaga esa promoción primero o guarda esta como Inactiva.`);
        return; 
      }
    }
    
    // 4. Saneamiento de Datos
    const cleanBuyQty = parseInt(formData.buyQty) || 1; 
    const cleanPayQty = parseInt(formData.payQty) || 1;
    const cleanDiscountValue = parseFloat(formData.discountValue) || 0;
    const cleanMinTicketAmount = parseFloat(formData.minTicketAmount) || 0;
    const cleanMinStockThreshold = parseInt(formData.minStockThreshold) || 0;

    if (formData.type === 'NxM' && cleanBuyQty <= cleanPayQty) {
      showError("Error lógico: La cantidad que 'lleva' debe ser mayor a la que 'paga'."); return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        ...formData,
        buyQty: cleanBuyQty,
        payQty: cleanPayQty,
        discountValue: cleanDiscountValue,
        minTicketAmount: cleanMinTicketAmount,
        minStockThreshold: cleanMinStockThreshold,
        productId: null 
      };

      let res;
      if (editData) {
        res = await api.put(`/promotions/${editData.id}`, payload);
      } else {
        res = await api.post(`/promotions`, payload);
      }

      if (res.data.success) {
        onPromotionSaved(res.data.data);
      }
    } catch (error) {
      if (error.response && error.response.status === 409) {
        showError(error.response.data.message);
      } else {
        console.error("Error guardando:", error);
        showError("Error interno en el servidor al intentar guardar.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.nombre?.toLowerCase().includes(searchProduct.toLowerCase()) || p.name?.toLowerCase().includes(searchProduct.toLowerCase()));
  }, [products, searchProduct]);

  const filteredRewardProducts = useMemo(() => {
    return products.filter(p => p.nombre?.toLowerCase().includes(searchReward.toLowerCase()) || p.name?.toLowerCase().includes(searchReward.toLowerCase()));
  }, [products, searchReward]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
          
          <AnimatePresence>
            {errorToast && (
              <motion.div 
                initial={{ opacity: 0, y: -20, scale: 0.9 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.9, y: -20 }} 
                className="fixed top-8 left-0 right-0 z-[150] flex justify-center px-4 pointer-events-none"
              >
                <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-full shadow-[0_20px_50px_-12px_rgba(244,63,94,0.35)] border border-red-200 dark:border-red-900/40 lya:border-red-500/40 px-6 py-4 flex items-center gap-3 max-w-lg w-full sm:w-auto">
                  <div className="bg-red-100 dark:bg-red-500/20 text-red-500 p-1.5 rounded-full shrink-0">
                    <AlertTriangle size={24} strokeWidth={2.5} />
                  </div>
                  <span className="text-[13px] sm:text-sm font-bold text-gray-800 dark:text-gray-100 lya:text-lya-text text-center tracking-wide leading-tight">
                    {errorToast}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.3 }} className="w-full max-w-5xl max-h-[95vh] bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 lya:border-lya-border/40">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 md:p-8 border-b border-gray-200 dark:border-gray-800 lya:border-lya-border/40 shrink-0 bg-white dark:bg-gray-900 lya:bg-lya-surface z-10 relative">
              <div className="flex items-center gap-5 min-w-0 pr-10 sm:pr-0">
                <div className="h-14 w-14 rounded-[1.25rem] bg-rose-100 dark:bg-rose-900/30 lya:bg-lya-primary/20 text-rose-500 dark:text-rose-400 lya:text-lya-primary flex items-center justify-center shrink-0 border border-rose-200/50 dark:border-rose-800/30 lya:border-lya-primary/30">
                  <Tag size={28} strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-2xl font-black text-gray-800 dark:text-white lya:text-lya-text truncate tracking-tight">{editData ? 'Editar Promoción' : 'Nueva Promoción General'}</h2>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">Configura reglas matemáticas a prueba de fallos</p>
                </div>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} disabled={isProcessing} className="absolute top-6 right-6 sm:relative sm:top-auto sm:right-auto h-12 w-12 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 lya:bg-lya-border/30 text-gray-500 dark:text-gray-400 lya:text-lya-text/60 flex items-center justify-center md:hover:bg-gray-200 dark:md:hover:bg-gray-700 transition-colors outline-none"><X size={24} strokeWidth={2.5} /></motion.button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-8">
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-800 dark:bg-white lya:bg-lya-text text-white dark:text-gray-900 lya:text-lya-bg h-8 w-8 rounded-full flex items-center justify-center font-black text-sm">1</div>
                  <h3 className="text-lg font-black text-gray-800 dark:text-white lya:text-lya-text tracking-tight">Nombre de la Promoción</h3>
                </div>
                <input 
                  type="text" placeholder="Ej: Jueves de Frappés 2x1 o Combo Americano+Pastel" 
                  value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-4 rounded-2xl bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-200 dark:border-gray-800 lya:border-lya-border/40 font-bold text-gray-800 dark:text-white lya:text-lya-text focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-800 dark:bg-white lya:bg-lya-text text-white dark:text-gray-900 lya:text-lya-bg h-8 w-8 rounded-full flex items-center justify-center font-black text-sm">2</div>
                  <h3 className="text-lg font-black text-gray-800 dark:text-white lya:text-lya-text tracking-tight">Tipo de Oferta</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { id: 'NxM', title: 'Volumen (NxM)', desc: 'Ej: 3x2. Lleva más del mismo grupo, paga menos.' },
                    { id: 'BOGO', title: 'Compra X, Llévate Y', desc: 'Compra de un grupo y llévate gratis/rebajado otro producto distinto.' },
                    { id: 'FIXED', title: 'Rebaja en Pesos', desc: 'Descuenta $X pesos a cada producto seleccionado.' },
                    { id: 'NTH_FIXED', title: 'Unidad Adicional', desc: 'Descuenta $X pesos en la segunda unidad o tercera.' },
                    { id: 'COMBO', title: 'Combo Armado', desc: 'Precio cerrado al llevar ciertos productos juntos.' },
                    { id: 'TICKET_DISCOUNT', title: 'Promo por Monto', desc: 'Descuento si el ticket supera $X pesos.' }
                  ].map((t) => (
                    <motion.button key={t.id} whileTap={{ scale: 0.97 }} onClick={() => setFormData({ ...formData, type: t.id })} className={`p-4 rounded-[1.5rem] border text-left transition-all outline-none ${formData.type === t.id ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-500 shadow-md shadow-rose-500/10' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 md:hover:border-rose-300'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className={`font-black ${formData.type === t.id ? 'text-rose-600 dark:text-rose-400' : 'text-gray-700 dark:text-gray-200'}`}>{t.title}</h4>
                        {formData.type === t.id && <CheckCircle2 size={18} className="text-rose-500" />}
                      </div>
                      <p className={`text-xs font-medium leading-relaxed ${formData.type === t.id ? 'text-rose-800/70 dark:text-rose-200/60' : 'text-gray-500 dark:text-gray-400'}`}>{t.desc}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {formData.type !== 'TICKET_DISCOUNT' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-800 dark:bg-white lya:bg-lya-text text-white dark:text-gray-900 lya:text-lya-bg h-8 w-8 rounded-full flex items-center justify-center font-black text-sm">3</div>
                    <h3 className="text-lg font-black text-gray-800 dark:text-white lya:text-lya-text tracking-tight">Selección de Productos</h3>
                  </div>
                  
                  {formData.type === 'BOGO' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-4 border border-gray-200 dark:border-gray-800">
                        <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"><ShoppingBag size={16}/> Lo que debe comprar:</h4>
                        <div className="flex items-center bg-gray-50 dark:bg-gray-800 px-4 py-2.5 rounded-xl mb-4 border border-gray-200 dark:border-gray-700">
                          <Search size={18} className="text-gray-400 mr-2" />
                          <input type="text" placeholder="Buscar..." value={searchProduct} onChange={(e) => setSearchProduct(e.target.value)} className="bg-transparent border-none outline-none w-full text-sm font-medium dark:text-white" />
                        </div>
                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                          {filteredProducts.map(p => {
                            const isSelected = formData.applyToProducts.includes(p.id);
                            return (
                              <label key={`trigger-${p.id}`} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800' : 'bg-gray-50 border-transparent dark:bg-gray-800 md:hover:bg-gray-100 dark:md:hover:bg-gray-700'}`}>
                                <input type="checkbox" className="w-4 h-4 text-rose-500 rounded focus:ring-rose-500 accent-rose-500" checked={isSelected} onChange={() => toggleProductSelection(p.id)} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-bold truncate ${isSelected ? 'text-rose-900 dark:text-rose-100' : 'text-gray-700 dark:text-gray-300'}`}>{p.nombre || p.name}</p>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-4 border border-emerald-200 dark:border-emerald-800 shadow-sm shadow-emerald-500/10">
                        <h4 className="font-bold text-sm text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2"><Gift size={16}/> Lo que se lleva de premio:</h4>
                        <div className="flex items-center bg-gray-50 dark:bg-gray-800 px-4 py-2.5 rounded-xl mb-4 border border-gray-200 dark:border-gray-700">
                          <Search size={18} className="text-gray-400 mr-2" />
                          <input type="text" placeholder="Buscar..." value={searchReward} onChange={(e) => setSearchReward(e.target.value)} className="bg-transparent border-none outline-none w-full text-sm font-medium dark:text-white" />
                        </div>
                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                          {filteredRewardProducts.map(p => {
                            const isSelected = formData.rewardProducts.includes(p.id);
                            return (
                              <label key={`reward-${p.id}`} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-gray-50 border-transparent dark:bg-gray-800 md:hover:bg-gray-100 dark:md:hover:bg-gray-700'}`}>
                                <input type="checkbox" className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500 accent-emerald-500" checked={isSelected} onChange={() => toggleRewardSelection(p.id)} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-bold truncate ${isSelected ? 'text-emerald-900 dark:text-emerald-100' : 'text-gray-700 dark:text-gray-300'}`}>{p.nombre || p.name}</p>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-4 border border-gray-200 dark:border-gray-800">
                      <div className="flex items-center bg-gray-50 dark:bg-gray-800 px-4 py-2.5 rounded-xl mb-4 border border-gray-200 dark:border-gray-700">
                        <Search size={18} className="text-gray-400 mr-2" />
                        <input type="text" placeholder="Buscar producto..." value={searchProduct} onChange={(e) => setSearchProduct(e.target.value)} className="bg-transparent border-none outline-none w-full text-sm font-medium dark:text-white" />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                        {filteredProducts.map(p => {
                          const isSelected = formData.applyToProducts.includes(p.id);
                          return (
                            <label key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800' : 'bg-gray-50 border-transparent dark:bg-gray-800 md:hover:bg-gray-100 dark:md:hover:bg-gray-700'}`}>
                              <input type="checkbox" className="w-4 h-4 text-rose-500 rounded focus:ring-rose-500 accent-rose-500" checked={isSelected} onChange={() => toggleProductSelection(p.id)} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold truncate ${isSelected ? 'text-rose-900 dark:text-rose-100' : 'text-gray-700 dark:text-gray-300'}`}>{p.nombre || p.name}</p>
                                <p className="text-xs text-gray-500">${Number(p.precio || p.basePrice || p.precioBase || 0).toFixed(2)}</p>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-800 dark:bg-white lya:bg-lya-text text-white dark:text-gray-900 lya:text-lya-bg h-8 w-8 rounded-full flex items-center justify-center font-black text-sm">
                    {formData.type !== 'TICKET_DISCOUNT' ? '4' : '3'}
                  </div>
                  <h3 className="text-lg font-black text-gray-800 dark:text-white tracking-tight">Reglas Matemáticas en Pesos ($)</h3>
                </div>
                
                <motion.div layout className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 sm:p-8 border border-gray-200 dark:border-gray-800 shadow-sm">
                  
                  {formData.type === 'NxM' && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4">
                      <div className="flex flex-col items-center w-full sm:w-auto">
                        <span className="text-sm font-bold text-gray-500 mb-3 text-center">El cliente añade al carrito:</span>
                        <div className="flex items-center bg-gray-50 dark:bg-gray-800 rounded-2xl border p-2 w-full sm:w-auto">
                          <input 
                            type="number" min="2" placeholder="2"
                            value={formData.buyQty === 0 ? '' : formData.buyQty} 
                            onChange={(e) => setFormData({...formData, buyQty: e.target.value === '' ? 0 : Number(e.target.value)})} 
                            className="w-20 bg-transparent text-center text-3xl font-black focus:outline-none focus:text-rose-500 dark:text-white" 
                          />
                          <span className="text-sm font-bold text-gray-400 pr-4">unidades</span>
                        </div>
                      </div>
                      <div className="hidden sm:flex bg-gray-100 dark:bg-gray-800 rounded-full p-3 text-gray-400"><ArrowRight size={24} strokeWidth={3} /></div>
                      <div className="flex flex-col items-center w-full sm:w-auto">
                        <span className="text-sm font-bold text-gray-500 mb-3 text-center">Pero el sistema solo cobra:</span>
                        <div className="flex items-center bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-200 dark:border-rose-800 p-2 w-full sm:w-auto">
                          <input 
                            type="number" min="1" placeholder="1"
                            value={formData.payQty === 0 ? '' : formData.payQty} 
                            onChange={(e) => setFormData({...formData, payQty: e.target.value === '' ? 0 : Number(e.target.value)})} 
                            className="w-20 bg-transparent text-center text-3xl font-black text-rose-600 dark:text-rose-500 focus:outline-none" 
                          />
                          <span className="text-sm font-bold text-rose-400 pr-4">unidades</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.type === 'BOGO' && (
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-4">
                      <div className="flex flex-col items-center w-full lg:w-auto">
                        <span className="text-sm font-bold text-gray-500 mb-3 text-center">Debe comprar:</span>
                        <div className="flex items-center bg-gray-50 dark:bg-gray-800 rounded-2xl border p-2 w-full lg:w-auto">
                          <input 
                            type="number" min="1" placeholder="1"
                            value={formData.buyQty === 0 ? '' : formData.buyQty} 
                            onChange={(e) => setFormData({...formData, buyQty: e.target.value === '' ? 0 : Number(e.target.value)})} 
                            className="w-16 bg-transparent text-center text-2xl font-black focus:outline-none focus:text-rose-500 dark:text-white" 
                          />
                          <span className="text-sm font-bold text-gray-400 pr-3">unid.</span>
                        </div>
                      </div>
                      <div className="hidden lg:flex bg-gray-100 dark:bg-gray-800 rounded-full p-2 text-gray-400"><ArrowRight size={20} strokeWidth={3} /></div>
                      <div className="flex flex-col items-center w-full lg:w-auto">
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-500 mb-3 text-center">Se lleva de premio:</span>
                        <div className="flex items-center bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-2 w-full lg:w-auto">
                          <input 
                            type="number" min="1" placeholder="1"
                            value={formData.payQty === 0 ? '' : formData.payQty} 
                            onChange={(e) => setFormData({...formData, payQty: e.target.value === '' ? 0 : Number(e.target.value)})} 
                            className="w-16 bg-transparent text-center text-2xl font-black text-emerald-600 dark:text-emerald-500 focus:outline-none" 
                          />
                          <span className="text-sm font-bold text-emerald-400 pr-3">unid.</span>
                        </div>
                      </div>
                      <div className="hidden lg:flex bg-gray-100 dark:bg-gray-800 rounded-full p-2 text-gray-400"><ArrowRight size={20} strokeWidth={3} /></div>
                      <div className="flex flex-col items-center w-full lg:w-auto">
                        <span className="text-sm font-bold text-gray-500 mb-3 text-center">Precio de CADA premio:</span>
                        <div className="flex items-center bg-gray-50 dark:bg-gray-800 rounded-2xl border p-2 w-full lg:w-auto">
                          <DollarSign size={18} className="text-gray-400 ml-1" strokeWidth={3} />
                          <input 
                            type="number" min="0" step="any" placeholder="0.00"
                            value={formData.discountValue === 0 ? '' : formData.discountValue} 
                            onChange={(e) => setFormData({...formData, discountValue: e.target.value === '' ? 0 : Number(e.target.value)})} 
                            className="w-20 bg-transparent text-center text-2xl font-black focus:outline-none dark:text-white" 
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1">($0 = Gratis)</span>
                      </div>
                    </div>
                  )}

                  {formData.type === 'FIXED' && (
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-gray-500 mb-4 text-center">
                        ¿Cuántos pesos se le restarán al precio de CADA producto seleccionado?
                      </span>
                      <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-[2rem] border px-6 py-4 w-full sm:w-1/2">
                        <DollarSign size={32} className="text-emerald-500 mr-2" strokeWidth={3} />
                        <input 
                          type="number" min="0" step="any" placeholder="0.00" 
                          value={formData.discountValue === 0 ? '' : formData.discountValue} 
                          onChange={(e) => setFormData({...formData, discountValue: e.target.value === '' ? 0 : Number(e.target.value)})} 
                          className="w-full bg-transparent text-center text-5xl font-black dark:text-white focus:outline-none focus:text-emerald-600" 
                        />
                      </div>
                    </div>
                  )}

                  {formData.type === 'COMBO' && (
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-gray-500 mb-4 text-center">El precio TOTAL CERRADO por todo el combo será de:</span>
                      <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-[2rem] border px-6 py-4 w-full sm:w-1/2">
                        <DollarSign size={32} className="text-emerald-500 mr-2" strokeWidth={3} />
                        <input 
                          type="number" min="0" step="any" placeholder="0.00" 
                          value={formData.discountValue === 0 ? '' : formData.discountValue} 
                          onChange={(e) => setFormData({...formData, discountValue: e.target.value === '' ? 0 : Number(e.target.value)})} 
                          className="w-full bg-transparent text-center text-5xl font-black dark:text-white focus:outline-none focus:text-emerald-600" 
                        />
                      </div>
                    </div>
                  )}

                  {formData.type === 'NTH_FIXED' && (
                    <div className="flex flex-col items-center w-full">
                      <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
                        <span className="text-sm font-bold text-gray-500">Al llevar</span>
                        <div className="flex items-center bg-gray-50 dark:bg-gray-800 rounded-xl border px-3 py-1">
                          <input 
                            type="number" min="2" placeholder="2" 
                            value={formData.buyQty === 0 ? '' : formData.buyQty} 
                            onChange={(e) => setFormData({...formData, buyQty: e.target.value === '' ? 0 : Number(e.target.value)})} 
                            className="w-14 bg-transparent text-center text-2xl font-black dark:text-white focus:outline-none focus:text-blue-500" 
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-500">unidades...</span>
                      </div>
                      <div className="w-full h-px bg-gray-100 dark:bg-gray-800 my-6"></div>
                      <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center text-center">
                        <span className="text-sm font-bold text-gray-500">...a la <strong className="dark:text-white">ÚLTIMA</strong> unidad se le descontarán:</span>
                        <div className="flex items-center bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-200 dark:border-blue-800 px-4 py-2">
                          <DollarSign size={20} className="text-blue-500 mr-1" strokeWidth={3} />
                          <input type="number" min="0" step="any" placeholder="0.00" value={formData.discountValue === 0 ? '' : formData.discountValue} onChange={(e) => setFormData({...formData, discountValue: e.target.value})} className="w-20 bg-transparent text-center text-3xl font-black text-blue-600 focus:outline-none" />
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.type === 'TICKET_DISCOUNT' && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4">
                      <div className="flex flex-col items-center w-full sm:w-auto">
                        <span className="text-sm font-bold text-gray-500 mb-3 text-center">Si el ticket supera los:</span>
                        <div className="flex items-center bg-gray-50 dark:bg-gray-800 rounded-2xl border p-2 w-full sm:w-auto">
                          <DollarSign size={20} className="text-gray-400 ml-2" strokeWidth={3} />
                          <input type="number" min="1" value={formData.minTicketAmount === 0 ? '' : formData.minTicketAmount} onChange={(e) => setFormData({...formData, minTicketAmount: e.target.value})} className="w-24 bg-transparent text-center text-3xl font-black focus:outline-none focus:text-emerald-500 dark:text-white" placeholder="300" />
                        </div>
                      </div>
                      <div className="hidden sm:flex bg-gray-100 dark:bg-gray-800 rounded-full p-3 text-gray-400"><ArrowRight size={24} strokeWidth={3} /></div>
                      <div className="flex flex-col items-center w-full sm:w-auto">
                        <span className="text-sm font-bold text-gray-500 mb-3 text-center">Descontar del total:</span>
                        <div className="flex items-center bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-2 w-full sm:w-auto">
                          <DollarSign size={20} className="text-emerald-500 ml-2" strokeWidth={3} />
                          <input type="number" min="1" value={formData.discountValue === 0 ? '' : formData.discountValue} onChange={(e) => setFormData({...formData, discountValue: e.target.value})} className="w-24 bg-transparent text-center text-3xl font-black text-emerald-600 focus:outline-none" placeholder="50" />
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* 🌟 SECCIÓN 5: SEGURIDAD Y ACTIVACIÓN (CON LÍMITE DE STOCK) */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-800 dark:bg-white lya:bg-lya-text text-white dark:text-gray-900 lya:text-lya-bg h-8 w-8 rounded-full flex items-center justify-center font-black text-sm">
                    {formData.type !== 'TICKET_DISCOUNT' ? '5' : '4'}
                  </div>
                  <h3 className="text-lg font-black text-gray-800 dark:text-white tracking-tight">Seguridad y Activación</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Umbral de Stock */}
                  <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2rem] p-6 border border-gray-200 dark:border-gray-800 lya:border-lya-border/40 shadow-sm flex flex-col justify-between">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-amber-500 flex items-center gap-2 mb-2">
                        <PackageMinus size={16} /> Límite de Stock
                      </label>
                      <p className="text-[10px] text-gray-400 lya:text-lya-text/50 mb-4 leading-tight">
                        La promo se ocultará si el stock de un producto cae a este número. (0 = Agotado).
                      </p>
                    </div>
                    <div className="flex items-center bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg rounded-2xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 p-2 w-full">
                        <input 
                          type="number" 
                          min="0" 
                          placeholder="0"
                          value={formData.minStockThreshold === 0 ? '' : formData.minStockThreshold} 
                          onChange={(e) => setFormData({...formData, minStockThreshold: e.target.value === '' ? 0 : Number(e.target.value)})}
                          className="w-full bg-transparent text-center text-4xl font-black dark:text-white focus:outline-none" 
                        />
                      <span className="text-xs font-bold text-gray-400 pr-3">unid.</span>
                    </div>
                  </div>

                  {/* Días Válidos */}
                  <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2rem] p-6 border border-gray-200 dark:border-gray-800 lya:border-lya-border/40 shadow-sm">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2 mb-4"><Calendar size={16} /> ¿Qué días aplica?</label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => {
                        const isActiveDay = formData.validDays.includes(day.id);
                        return (
                          <motion.button key={day.id} whileTap={{ scale: 0.9 }} onClick={() => toggleDay(day.id)} className={`flex-1 min-w-[30%] py-2.5 rounded-2xl text-xs font-black transition-all border outline-none ${isActiveDay ? 'bg-gray-900 dark:bg-white lya:bg-lya-text text-white dark:text-gray-900 lya:text-lya-bg border-transparent shadow-md' : 'bg-gray-50 dark:bg-gray-800 lya:bg-lya-border/20 text-gray-400 border-gray-200 dark:border-gray-700 lya:border-transparent'}`}>
                            {day.label.substring(0, 3)}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Estado */}
                  <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2rem] p-6 border border-gray-200 dark:border-gray-800 lya:border-lya-border/40 shadow-sm flex flex-col">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2 mb-4"><Power size={16} /> Estado</label>
                    <div className="flex-1 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg rounded-2xl p-1.5 flex flex-col gap-1.5 border border-gray-200 dark:border-gray-700 lya:border-lya-border/30">
                       <motion.button whileTap={{ scale: 0.95 }} onClick={() => setFormData({...formData, isActive: true})} className={`flex-1 flex items-center justify-center gap-2 rounded-xl font-black text-sm transition-all outline-none ${formData.isActive ? 'bg-white dark:bg-gray-900 lya:bg-lya-surface text-emerald-600 shadow-sm border border-gray-200 dark:border-gray-700 lya:border-lya-border/40' : 'text-gray-400 border border-transparent'}`}><CheckSquare size={16} /> Encendido</motion.button>
                       <motion.button whileTap={{ scale: 0.95 }} onClick={() => setFormData({...formData, isActive: false})} className={`flex-1 flex items-center justify-center gap-2 rounded-xl font-black text-sm transition-all outline-none ${!formData.isActive ? 'bg-white dark:bg-gray-900 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text shadow-sm border border-gray-200 dark:border-gray-700 lya:border-lya-border/40' : 'text-gray-400 border border-transparent'}`}><AlertCircle size={16} /> Apagado</motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 border-t border-gray-200 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
              <motion.button whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={isProcessing} className={`w-full py-4 sm:py-5 bg-rose-500 text-white font-black text-lg rounded-2xl md:hover:bg-rose-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-rose-500/20 outline-none ${isProcessing ? 'opacity-70 cursor-wait shadow-none' : ''}`}>
                {isProcessing ? <Loader2 className="animate-spin" size={24} strokeWidth={3} /> : <><Save size={24} strokeWidth={2.5} /> {editData ? 'Guardar Cambios' : 'Guardar Promoción'}</>}
              </motion.button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}