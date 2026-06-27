// src/modules/cafeteria/views/CheckoutModal.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Banknote, Smartphone, CheckCircle, Calculator, Users, Minus, Plus, LayoutList, User, PieChart, MessageCircle, Loader2, AlertCircle } from 'lucide-react';
import client from '../../../api/client'; 

const modalVariants = {
  hidden: { scale: 0.9, opacity: 0, y: 20 },
  visible: { scale: 1, opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } },
  exit: { scale: 0.9, opacity: 0, y: 20 }
};

export const CheckoutModal = ({ 
  isOpen, 
  onClose, 
  total, 
  initialTarget, 
  cuentasResumen = [], 
  onConfirmPayment,
  orderType = 'salon' // Puede ser: 'salon', 'mostrador', 'llevar'
}) => {
  const [method, setMethod] = useState('efectivo');
  const [amountReceived, setAmountReceived] = useState('');
  const [change, setChange] = useState(0);
  const [transferInfo, setTransferInfo] = useState(null); 
  
  const [cobroMode, setCobroMode] = useState('full');
  const [splitCount, setSplitCount] = useState(1);
  const [selectedCuenta, setSelectedCuenta] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);

  // 🔥 ESTADO PARA LA NOTIFICACIÓN DE CÁPSULA
  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

  const showToast = (message, type = 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  useEffect(() => {
    if (isOpen) {
      setMethod('efectivo');
      setAmountReceived('');
      setChange(0);
      setSplitCount(1);
      setTransferInfo(null);
      setIsProcessing(false); 
      setToast({ show: false, message: '', type: 'error' }); 

      // Solo permite iniciar en 'nominal' (Por Persona) si es un pedido de Salón
      if (initialTarget?.type === 'partial' && orderType === 'salon') {
        setCobroMode('nominal');
        setSelectedCuenta(initialTarget.cuentaName);
      } else {
        setCobroMode('full');
        if (cuentasResumen.length > 0) setSelectedCuenta(cuentasResumen[0].nombre);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, orderType]);

  useEffect(() => {
    if (isOpen && method === 'transferencia') {
      client.get('/settings')
        .then(res => { if (res.data) setTransferInfo(res.data); })
        .catch(err => {
          console.error("Error al cargar datos bancarios:", err);
          showToast("No se pudieron cargar los datos de transferencia.", "error");
        });
    }
  }, [isOpen, method]);

  const amountToPay = 
    cobroMode === 'full' ? total :
    cobroMode === 'equal' ? total / splitCount :
    (cuentasResumen.find(c => c.nombre === selectedCuenta)?.subtotal || 0);

  useEffect(() => {
    if (method === 'efectivo') {
      const received = parseFloat(amountReceived) || 0;
      setChange(received - amountToPay);
    } else {
      setChange(0);
    }
  }, [amountReceived, amountToPay, method]);

  const handlePayment = async () => {
    if (amountToPay <= 0) return showToast("No hay monto a cobrar en la selección actual.", "error");
    if (method === 'efectivo' && (parseFloat(amountReceived) || 0) < amountToPay) return showToast("El monto recibido es insuficiente.", "error");
    
    setIsProcessing(true); 
    setToast({ show: false, message: '', type: 'error' }); // Limpiar errores previos
    
    try {
      await onConfirmPayment({ 
        method, 
        amountReceived: method === 'efectivo' ? parseFloat(amountReceived) : amountToPay, 
        change, 
        amountPaid: amountToPay,
        targetType: cobroMode === 'nominal' ? 'partial' : cobroMode === 'equal' ? 'equal' : 'full',
        cuentaName: cobroMode === 'nominal' ? selectedCuenta : null
      });
      // El onConfirmPayment se encarga de cerrar el modal y mostrar la pantalla de éxito
    } catch(e) {
      console.error(e);
      showToast(e?.response?.data?.message || e.message || "Ocurrió un error al procesar el pago.", "error");
      setIsProcessing(false); // Solo desbloqueamos si hubo error, si hubo éxito el modal se desmonta
    }
  };

  // Textos Dinámicos
  const getFullModeTextBtn = () => {
    if (orderType === 'mostrador') return 'Todo el Pedido';
    if (orderType === 'llevar') return 'Toda la Cuenta';
    return 'Toda la Mesa';
  };

  const getFullModeTextTotal = () => {
    if (orderType === 'mostrador') return 'Total del Pedido';
    if (orderType === 'llevar') return 'Total de la Cuenta';
    return 'Total Mesa';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* NOTIFICACIÓN FLOTANTE (ESTILO CÁPSULA) */}
      <AnimatePresence>
        {toast.show && (
          <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
            <motion.div 
              initial={{ opacity: 0, y: -50, scale: 0.9 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 font-bold border border-red-100 dark:border-red-900/30 lya:border-red-500/30 pointer-events-auto"
            >
              <div className="bg-red-100 dark:bg-red-500/20 lya:bg-red-500/20 p-1.5 rounded-full shrink-0">
                <AlertCircle size={20} className="text-red-500 lya:text-red-400" />
              </div>
              <div className="flex flex-col">
                  <span className="text-sm">{toast.message}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-gray-900/40 dark:bg-black/70 lya:bg-lya-dark/50 backdrop-blur-sm transition-colors" />

      <motion.div 
        variants={modalVariants} 
        initial="hidden" 
        animate="visible" 
        exit="exit" 
        className="relative w-full max-w-md bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 flex flex-col max-h-[90vh] transition-colors"
      >
        
        <div className="p-6 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border-b border-gray-100 dark:border-gray-700 lya:border-lya-border/30 flex justify-between items-center shrink-0 transition-colors">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">Caja y Pagos</h2>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-0.5">Selecciona qué vas a cobrar</p>
          </div>
          <button 
            onClick={onClose} 
            disabled={isProcessing}
            className="p-2.5 bg-white dark:bg-gray-700 lya:bg-lya-surface hover:bg-gray-100 dark:hover:bg-gray-600 lya:hover:bg-lya-border/50 border border-gray-200 dark:border-gray-600 lya:border-lya-border/40 rounded-full transition-colors disabled:opacity-50 shadow-sm"
          >
            <X size={20} className="text-gray-500 dark:text-gray-300 lya:text-lya-text/80" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          
          {/* Selector de Modo de Cobro */}
          <div className="flex gap-2 p-1.5 bg-gray-100 dark:bg-gray-800/80 lya:bg-lya-bg rounded-2xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 shadow-inner">
            <button 
              onClick={() => setCobroMode('full')} 
              disabled={isProcessing}
              className={`flex-1 py-3 text-[11px] uppercase tracking-wider font-black rounded-xl flex flex-col items-center gap-2 transition-all ${
                cobroMode === 'full' ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface shadow-md text-orange-600 dark:text-orange-400 lya:text-lya-primary scale-[1.02]' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 lya:text-lya-text/60 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
              }`}
            >
              <LayoutList size={20}/> {getFullModeTextBtn()}
            </button>
            
            {orderType === 'salon' && (
              <button 
                onClick={() => setCobroMode('nominal')} 
                disabled={isProcessing}
                className={`flex-1 py-3 text-[11px] uppercase tracking-wider font-black rounded-xl flex flex-col items-center gap-2 transition-all ${
                  cobroMode === 'nominal' ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface shadow-md text-orange-600 dark:text-orange-400 lya:text-lya-primary scale-[1.02]' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 lya:text-lya-text/60 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <User size={20}/> Por Persona
              </button>
            )}
            
            <button 
              onClick={() => setCobroMode('equal')} 
              disabled={isProcessing}
              className={`flex-1 py-3 text-[11px] uppercase tracking-wider font-black rounded-xl flex flex-col items-center gap-2 transition-all ${
                cobroMode === 'equal' ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface shadow-md text-orange-600 dark:text-orange-400 lya:text-lya-primary scale-[1.02]' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 lya:text-lya-text/60 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
              }`}
            >
              <PieChart size={20}/> Dividir
            </button>
          </div>

          {/* Opciones Específicas del Modo */}
          <div className="min-h-[75px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              {cobroMode === 'full' && (
                <motion.div key="full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center w-full px-4 py-3 bg-orange-50/80 dark:bg-orange-900/10 lya:bg-lya-primary/10 rounded-2xl border border-orange-100 dark:border-orange-900/30 lya:border-lya-primary/20">
                  <p className="text-sm font-black text-orange-700 dark:text-orange-400 lya:text-lya-primary uppercase tracking-widest">Cobro en una sola exhibición</p>
                </motion.div>
              )}
              
              {cobroMode === 'nominal' && orderType === 'salon' && (
                <motion.div key="nominal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full flex flex-wrap gap-2 justify-center">
                  {cuentasResumen.length === 0 ? (
                    <span className="text-sm font-medium text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 px-4 py-2 rounded-xl">No hay cuentas pendientes.</span>
                  ) : (
                     cuentasResumen.map(cuenta => (
                       <button 
                          key={cuenta.nombre} 
                          onClick={() => setSelectedCuenta(cuenta.nombre)} 
                          disabled={cuenta.subtotal === 0 || isProcessing}
                          className={`px-4 py-3 rounded-2xl text-sm font-black border-2 transition-all disabled:opacity-40 disabled:scale-100 ${
                            selectedCuenta === cuenta.nombre 
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 lya:border-lya-primary lya:text-lya-primary lya:bg-lya-primary/10 scale-105 shadow-md' 
                              : 'border-gray-200 dark:border-gray-700 lya:border-lya-border/40 text-gray-500 dark:text-gray-400 lya:text-lya-text/60 hover:border-orange-300 dark:hover:border-orange-700'
                          }`}
                        >
                          {cuenta.nombre} <span className="block text-xs font-black mt-0.5 opacity-80">${cuenta.subtotal.toFixed(2)}</span>
                       </button>
                     ))
                  )}
                </motion.div>
              )}
              
              {cobroMode === 'equal' && (
                <motion.div key="equal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full flex justify-between items-center bg-gray-50 dark:bg-gray-800/80 lya:bg-lya-bg p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-700 lya:border-lya-border/40 shadow-inner">
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 lya:text-lya-text">
                    <div className="p-2 bg-white dark:bg-gray-700 lya:bg-lya-surface rounded-xl shadow-sm"><Users size={20} className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60" /></div>
                    <span className="text-sm font-black uppercase tracking-wider">Dividir entre:</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSplitCount(Math.max(1, splitCount - 1))} disabled={isProcessing} className="p-2.5 bg-white dark:bg-gray-700 lya:bg-lya-surface rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 lya:border-lya-border/50 active:scale-95 disabled:opacity-50"><Minus size={18}/></button>
                    <span className="font-black text-2xl w-8 text-center text-gray-900 dark:text-white lya:text-lya-text">{splitCount}</span>
                    <button onClick={() => setSplitCount(splitCount + 1)} disabled={isProcessing} className="p-2.5 bg-white dark:bg-gray-700 lya:bg-lya-surface rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 lya:border-lya-border/50 active:scale-95 disabled:opacity-50"><Plus size={18}/></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Gran Total Central */}
          <div className="text-center py-4 bg-gray-50 dark:bg-gray-800/30 lya:bg-lya-bg/50 rounded-[2rem] border border-gray-100 dark:border-gray-800 lya:border-lya-border/20">
            <span className="text-xs text-orange-600 dark:text-orange-400 lya:text-lya-primary uppercase tracking-widest font-black block mb-1">
              {cobroMode === 'full' ? getFullModeTextTotal() : cobroMode === 'equal' ? `Parte a cobrar (1 de ${splitCount})` : `Cobrando a ${selectedCuenta || '...'}`}
            </span>
            <div className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tighter drop-shadow-sm">
              ${amountToPay.toFixed(2)}
            </div>
          </div>

          {/* Método de Pago */}
          <div className="grid grid-cols-2 gap-3">
            <motion.button whileTap={!isProcessing ? { scale: 0.95 } : {}} onClick={() => !isProcessing && setMethod('efectivo')}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                method === 'efectivo' 
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 lya:border-lya-primary lya:bg-lya-primary/10 shadow-md scale-[1.02]' 
                  : 'border-gray-200 dark:border-gray-700 lya:border-lya-border/40 bg-white dark:bg-gray-800 lya:bg-lya-surface hover:border-emerald-300 dark:hover:border-emerald-700'
              }`}>
              <Banknote size={28} strokeWidth={1.5} className={`mb-2 ${method === 'efectivo' ? 'text-emerald-500 lya:text-lya-primary' : 'text-gray-400 lya:text-lya-text/50'}`} />
              <span className={`text-[11px] uppercase tracking-widest font-black ${method === 'efectivo' ? 'text-emerald-700 dark:text-emerald-400 lya:text-lya-text' : 'text-gray-400 lya:text-lya-text/50'}`}>Efectivo</span>
            </motion.button>

            <motion.button whileTap={!isProcessing ? { scale: 0.95 } : {}} onClick={() => !isProcessing && setMethod('transferencia')}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                method === 'transferencia' 
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md scale-[1.02]' 
                  : 'border-gray-200 dark:border-gray-700 lya:border-lya-border/40 bg-white dark:bg-gray-800 lya:bg-lya-surface hover:border-purple-300 dark:hover:border-purple-700'
              }`}>
              <Smartphone size={28} strokeWidth={1.5} className={`mb-2 ${method === 'transferencia' ? 'text-purple-500' : 'text-gray-400 lya:text-lya-text/50'}`} />
              <span className={`text-[11px] uppercase tracking-widest font-black ${method === 'transferencia' ? 'text-purple-700 dark:text-purple-400 lya:text-lya-text' : 'text-gray-400 lya:text-lya-text/50'}`}>Transferencia</span>
            </motion.button>
          </div>

          {/* Detalles del Método */}
          <AnimatePresence mode='wait'>
            {method === 'efectivo' && (
              <motion.div key="panel-efectivo" initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="overflow-hidden mt-4 space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800/80 lya:bg-lya-bg p-5 rounded-[2rem] border-2 border-gray-100 dark:border-gray-700 lya:border-lya-border/40 shadow-inner">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 lya:text-lya-text/60 uppercase tracking-widest mb-2.5 block ml-1">Monto Recibido</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-black text-xl">$</span>
                    <input 
                      type="number" 
                      value={amountReceived} 
                      onChange={(e) => setAmountReceived(e.target.value)} 
                      placeholder="0.00" 
                      autoFocus 
                      disabled={isProcessing}
                      className="w-full pl-10 pr-5 py-4 bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-2xl text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text border-2 border-gray-200 dark:border-gray-700 lya:border-lya-border/50 focus:border-emerald-500 dark:focus:border-emerald-500 lya:focus:border-lya-primary focus:ring-4 focus:ring-emerald-500/10 lya:focus:ring-lya-primary/20 outline-none transition-all shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50" 
                    />
                  </div>
                  <div className="flex gap-2 mt-4 overflow-x-auto custom-scrollbar pb-1">
                    <button type="button" disabled={isProcessing} onClick={() => setAmountReceived(amountToPay.toString())} className="px-5 py-2.5 bg-emerald-100 dark:bg-emerald-900/40 lya:bg-lya-primary/20 text-emerald-700 dark:text-emerald-400 lya:text-lya-primary border border-emerald-200 dark:border-emerald-700/50 lya:border-lya-primary/30 rounded-xl text-xs font-black whitespace-nowrap active:scale-95 transition-all shadow-sm disabled:opacity-50">Exacto</button>
                    {[50, 100, 200, 500, 1000].filter(v => v > amountToPay).map(val => (
                       <button type="button" disabled={isProcessing} key={val} onClick={() => setAmountReceived(val.toString())} className="px-5 py-2.5 bg-white dark:bg-gray-800 lya:bg-lya-surface text-gray-700 dark:text-gray-200 lya:text-lya-text border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 rounded-xl text-xs font-black whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm active:scale-95 transition-all disabled:opacity-50">${val}</button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center p-5 bg-emerald-50 dark:bg-emerald-900/20 lya:bg-lya-primary/10 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 lya:border-lya-primary/30">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 dark:bg-emerald-900/50 lya:bg-lya-primary/20 p-2 rounded-xl">
                      <Calculator size={24} className="text-emerald-600 dark:text-emerald-400 lya:text-lya-primary"/>
                    </div>
                    <span className="font-black text-sm uppercase tracking-widest text-emerald-800 dark:text-emerald-300 lya:text-lya-text">Cambio:</span>
                  </div>
                  <span className="text-3xl font-black text-emerald-700 dark:text-emerald-400 lya:text-lya-primary">${change >= 0 ? change.toFixed(2) : '0.00'}</span>
                </div>
              </motion.div>
            )}

            {method === 'transferencia' && transferInfo?.bank_accounts && transferInfo.bank_accounts.length > 0 && (
              <motion.div key="panel-transferencia" initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="overflow-hidden mt-4">
                
                {transferInfo?.whatsapp_number && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 bg-purple-50 dark:bg-purple-900/10 border-2 border-purple-200 dark:border-purple-900/30 rounded-2xl p-5 flex gap-4 shadow-sm items-center">
                    <div className="bg-purple-100 dark:bg-purple-900/40 p-3 rounded-2xl shrink-0">
                      <MessageCircle size={28} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-purple-800 dark:text-purple-300 uppercase tracking-widest mb-1">Aviso para el Cajero</h4>
                      <p className="text-xs text-purple-700 dark:text-purple-400 font-medium leading-relaxed">Pide al cliente que envíe el comprobante al <b className="text-purple-900 dark:text-purple-200 font-black">{transferInfo.whatsapp_number}</b> o que te lo muestre en pantalla.</p>
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4 pt-1 px-1">
                  {transferInfo.bank_accounts.map(acc => (
                    <div key={acc.id} className="min-w-[90%] sm:min-w-[280px] p-5 bg-white dark:bg-gray-800 lya:bg-lya-surface border-2 border-purple-100 dark:border-purple-900/40 lya:border-purple-500/20 rounded-3xl shrink-0 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 dark:bg-purple-900/10 rounded-bl-full -z-10" />
                      
                      <div className="flex items-center gap-2 mb-4 relative z-10">
                        <Smartphone className="text-purple-600 dark:text-purple-400" size={20} />
                        <span className="font-black text-sm text-purple-800 dark:text-purple-300 uppercase tracking-widest">{acc.bank_name}</span>
                      </div>
                      <div className="space-y-3 relative z-10">
                        {acc.account_holder && (
                          <div className="flex flex-col">
                            <span className="text-[9px] text-purple-400 dark:text-purple-500 font-black uppercase tracking-widest mb-0.5">Titular</span>
                            <span className="text-sm font-black text-gray-900 dark:text-white lya:text-lya-text truncate">{acc.account_holder}</span>
                          </div>
                        )}
                        {acc.account_number && (
                          <div className="flex flex-col bg-gray-50 dark:bg-gray-900/50 lya:bg-lya-bg p-2 rounded-xl border border-gray-100 dark:border-gray-800 lya:border-lya-border/40">
                            <span className="text-[9px] text-purple-500 dark:text-purple-400 font-black uppercase tracking-widest mb-0.5">Cuenta / Tarjeta</span>
                            <span className="text-base font-mono font-black text-gray-900 dark:text-white lya:text-lya-text tracking-wider">{acc.account_number}</span>
                          </div>
                        )}
                        {acc.clabe && (
                          <div className="flex flex-col">
                            <span className="text-[9px] text-purple-400 dark:text-purple-500 font-black uppercase tracking-widest mb-0.5">CLABE Interbancaria</span>
                            <span className="text-sm font-mono font-black text-gray-600 dark:text-gray-400 lya:text-lya-text/80 tracking-wider">{acc.clabe}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 bg-white dark:bg-gray-900 lya:bg-lya-surface border-t border-gray-100 dark:border-gray-800 lya:border-lya-border/40 shrink-0 transition-colors">
          <button 
            onClick={handlePayment} 
            disabled={isProcessing || amountToPay <= 0 || (method === 'efectivo' && (parseFloat(amountReceived) || 0) < amountToPay)}
            className="w-full py-4.5 bg-gray-900 hover:bg-black dark:bg-emerald-600 dark:hover:bg-emerald-500 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white font-black text-lg rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isProcessing ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                <span>Procesando Pago...</span>
              </>
            ) : (
              <>
                <span>Confirmar Cobro de ${amountToPay.toFixed(2)}</span>
                <CheckCircle size={22} strokeWidth={2.5} />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};