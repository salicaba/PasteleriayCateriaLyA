// src/modules/cafeteria/views/CheckoutModal.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Banknote, Smartphone, CheckCircle, Calculator, Users, Minus, Plus, LayoutList, User, PieChart } from 'lucide-react';
import client from '../../../api/client'; 

// ORDEN CAMBIADO A: Efectivo, Transferencia, Tarjeta
const paymentMethods = [
  { id: 'efectivo', label: 'Efectivo', icon: Banknote, color: 'text-green-500' },
  { id: 'transferencia', label: 'Transferencia', icon: Smartphone, color: 'text-purple-500' },
  { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard, color: 'text-blue-500' },
];

const modalVariants = {
  hidden: { scale: 0.9, opacity: 0, y: 20 },
  visible: { scale: 1, opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } },
  exit: { scale: 0.9, opacity: 0, y: 20 }
};

export const CheckoutModal = ({ isOpen, onClose, total, initialTarget, cuentasResumen = [], onConfirmPayment }) => {
  const [method, setMethod] = useState('efectivo');
  const [amountReceived, setAmountReceived] = useState('');
  const [change, setChange] = useState(0);
  const [transferInfo, setTransferInfo] = useState(null); 
  
  const [cobroMode, setCobroMode] = useState('full');
  const [splitCount, setSplitCount] = useState(1);
  const [selectedCuenta, setSelectedCuenta] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMethod('efectivo');
      setAmountReceived('');
      setChange(0);
      setSplitCount(1);
      setTransferInfo(null);

      if (initialTarget?.type === 'partial') {
        setCobroMode('nominal');
        setSelectedCuenta(initialTarget.cuentaName);
      } else {
        setCobroMode('full');
        if (cuentasResumen.length > 0) {
           setSelectedCuenta(cuentasResumen[0].nombre);
        }
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && method === 'transferencia') {
      client.get('/settings')
        .then(res => { if (res.data) setTransferInfo(res.data); })
        .catch(err => console.error("Error al cargar datos:", err));
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

  const handlePayment = () => {
    if (amountToPay <= 0) return alert("No hay monto a cobrar en la selección actual.");
    if (method === 'efectivo' && (parseFloat(amountReceived) || 0) < amountToPay) return alert("El monto recibido es insuficiente.");
    
    onConfirmPayment({ 
      method, 
      amountReceived: method === 'efectivo' ? amountReceived : amountToPay, 
      change, 
      amountPaid: amountToPay,
      targetType: cobroMode === 'nominal' ? 'partial' : cobroMode === 'equal' ? 'equal' : 'full',
      cuentaName: cobroMode === 'nominal' ? selectedCuenta : null
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="relative w-full max-w-md bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 flex flex-col max-h-[90vh]">
        
        <div className="p-5 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border-b border-gray-100 dark:border-gray-700 lya:border-lya-border/40 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-black text-gray-800 dark:text-white lya:text-lya-text">Caja y Pagos</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/60">Selecciona qué vas a cobrar</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 lya:hover:bg-lya-surface rounded-full transition-colors"><X size={20} className="text-gray-500 dark:text-white lya:text-lya-text/80" /></button>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar space-y-5">
          <div className="flex gap-2 p-1.5 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg rounded-2xl">
            {/* Botones de modo de cobro resumidos visualmente por espacio, mantienen su lógica */}
            <button onClick={() => setCobroMode('full')} className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex flex-col items-center gap-1.5 transition-all ${cobroMode === 'full' ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface shadow-sm text-orange-500 lya:text-lya-primary' : 'text-gray-500 lya:text-lya-text/60'}`}><LayoutList size={18}/> Toda la Mesa</button>
            <button onClick={() => setCobroMode('nominal')} className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex flex-col items-center gap-1.5 transition-all ${cobroMode === 'nominal' ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface shadow-sm text-orange-500 lya:text-lya-primary' : 'text-gray-500 lya:text-lya-text/60'}`}><User size={18}/> Por Persona</button>
            <button onClick={() => setCobroMode('equal')} className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex flex-col items-center gap-1.5 transition-all ${cobroMode === 'equal' ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface shadow-sm text-orange-500 lya:text-lya-primary' : 'text-gray-500 lya:text-lya-text/60'}`}><PieChart size={18}/> Dividir</button>
          </div>

          <div className="min-h-[70px] flex items-center justify-center">
            {cobroMode === 'full' && (
              <div className="text-center px-4 py-2 bg-orange-500/10 dark:bg-orange-500/10 lya:bg-lya-primary/10 rounded-xl border border-orange-500/20 lya:border-lya-primary/20">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-300 lya:text-lya-primary">Cobro en una sola exhibición</p>
              </div>
            )}
            {cobroMode === 'nominal' && (
              <div className="w-full flex flex-wrap gap-2 justify-center">
                {cuentasResumen.length === 0 ? (<span className="text-sm text-gray-400 italic">No hay cuentas pendientes.</span>) : (
                   cuentasResumen.map(cuenta => (
                     <button key={cuenta.nombre} onClick={() => setSelectedCuenta(cuenta.nombre)} disabled={cuenta.subtotal === 0}
                       className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all disabled:opacity-40 disabled:scale-100 ${
                         selectedCuenta === cuenta.nombre ? 'border-orange-500 bg-orange-500/10 text-orange-500 lya:border-lya-primary lya:text-lya-primary lya:bg-lya-primary/10 scale-105' : 'border-gray-200 dark:border-gray-700 lya:border-lya-border/40 text-gray-500 lya:text-lya-text/60'
                       }`}>{cuenta.nombre} <span className="block text-xs font-black">${cuenta.subtotal.toFixed(2)}</span>
                     </button>
                   ))
                )}
              </div>
            )}
            {cobroMode === 'equal' && (
              <div className="w-full flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg p-3 rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 lya:text-lya-text"><Users size={18} /><span className="text-sm font-bold">Dividir entre:</span></div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setSplitCount(Math.max(1, splitCount - 1))} className="p-1.5 bg-white dark:bg-gray-700 lya:bg-lya-surface rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 lya:border-lya-border/50 active:scale-95"><Minus size={16}/></button>
                  <span className="font-black text-xl w-6 text-center">{splitCount}</span>
                  <button onClick={() => setSplitCount(splitCount + 1)} className="p-1.5 bg-white dark:bg-gray-700 lya:bg-lya-surface rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 lya:border-lya-border/50 active:scale-95"><Plus size={16}/></button>
                </div>
              </div>
            )}
          </div>

          <div className="text-center py-2">
            <span className="text-xs text-orange-500 lya:text-lya-primary uppercase tracking-widest font-black">
              {cobroMode === 'full' ? 'Total Mesa' : cobroMode === 'equal' ? `Parte a cobrar (1 de ${splitCount})` : `Cobrando a ${selectedCuenta || '...'}`}
            </span>
            <div className="text-5xl font-black text-gray-900 dark:text-white lya:text-lya-text mt-1">${amountToPay.toFixed(2)}</div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {paymentMethods.map((pm) => (
              <button key={pm.id} onClick={() => setMethod(pm.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${method === pm.id ? 'border-orange-500 bg-orange-500/10 lya:border-lya-primary lya:bg-lya-primary/10 shadow-sm' : 'border-gray-100 dark:border-gray-700 lya:border-lya-border/40 bg-white dark:bg-gray-800 lya:bg-lya-surface hover:border-gray-300 dark:hover:border-gray-600'}`}>
                <pm.icon size={24} className={`mb-1.5 ${method === pm.id ? 'text-orange-500 lya:text-lya-primary' : 'text-gray-400 lya:text-lya-text/50'}`} />
                <span className={`text-[11px] font-bold ${method === pm.id ? 'text-gray-900 dark:text-white lya:text-lya-text' : 'text-gray-400 lya:text-lya-text/50'}`}>{pm.label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode='wait'>
            {method === 'efectivo' && (
              <motion.div key="efectivo-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg p-4 rounded-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 mt-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Monto Recibido</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                    <input type="number" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} placeholder="0.00" autoFocus className="w-full pl-8 pr-4 py-3 bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-lg text-xl font-bold text-gray-800 dark:text-white lya:text-lya-text border border-gray-200 dark:border-gray-600 lya:border-lya-border/40 focus:ring-2 focus:ring-orange-500 lya:focus:ring-lya-primary focus:outline-none" />
                  </div>
                  <div className="flex gap-2 mt-3 overflow-x-auto custom-scrollbar pb-1">
                    <button type="button" onClick={() => setAmountReceived(amountToPay.toString())} className="px-4 py-2 bg-orange-500/10 lya:bg-lya-primary/10 text-orange-500 lya:text-lya-primary border border-orange-500/20 lya:border-lya-primary/20 rounded-lg text-xs font-black whitespace-nowrap active:scale-95 transition-transform">Exacto</button>
                    {[50, 100, 200, 500, 1000].filter(v => v > amountToPay).map(val => (
                       <button type="button" key={val} onClick={() => setAmountReceived(val.toString())} className="px-4 py-2 bg-white dark:bg-gray-800 lya:bg-lya-surface text-gray-700 dark:text-gray-300 lya:text-lya-text border border-gray-200 dark:border-gray-600 lya:border-lya-border/40 rounded-lg text-xs font-bold whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm active:scale-95 transition-transform">${val}</button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-900/50">
                  <div className="flex items-center gap-2"><Calculator size={20} className="text-green-600 dark:text-green-400"/><span className="font-bold text-green-800 dark:text-green-300">Cambio a Devolver:</span></div>
                  <span className="text-2xl font-black text-green-700 dark:text-green-400">${change >= 0 ? change.toFixed(2) : '0.00'}</span>
                </div>
              </motion.div>
            )}

            {/* SECCIÓN DE TRANSFERENCIA MULTICUENTA */}
            {method === 'transferencia' && transferInfo?.bank_accounts && transferInfo.bank_accounts.length > 0 && (
              <motion.div key="transferencia-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-2">
                <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-3 pt-1 px-1">
                  {transferInfo.bank_accounts.map(acc => (
                    <div key={acc.id} className="min-w-[85%] sm:min-w-[280px] p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 rounded-2xl shrink-0 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Smartphone className="text-purple-600 dark:text-purple-400" size={18} />
                        <span className="font-black text-xs text-purple-800 dark:text-purple-300 uppercase">{acc.bank_name}</span>
                      </div>
                      <div className="space-y-2">
                        {acc.account_holder && (
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-purple-400 font-bold uppercase shrink-0 mr-2">Titular:</span>
                            <span className="text-sm font-black text-purple-900 dark:text-white truncate" title={acc.account_holder}>{acc.account_holder}</span>
                          </div>
                        )}
                        {acc.account_number && (
                          <div className="flex justify-between items-center border-t border-purple-200/50 dark:border-purple-700/50 pt-2 mt-2">
                            <span className="text-[10px] text-purple-400 font-bold uppercase shrink-0 mr-2">Cuenta/Tarjeta:</span>
                            <span className="text-sm font-mono font-black text-purple-900 dark:text-white tracking-wider">{acc.account_number}</span>
                          </div>
                        )}
                        {acc.clabe && (
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-purple-400 font-bold uppercase shrink-0 mr-2">CLABE:</span>
                            <span className="text-sm font-mono font-black text-purple-900 dark:text-white tracking-wider">{acc.clabe}</span>
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

        {/* BOTÓN DE CONFIRMACIÓN - ESTILO ARREGLADO Y GENÉRICO */}
        <div className="p-5 bg-white dark:bg-gray-900 lya:bg-lya-surface border-t border-gray-100 dark:border-gray-800 lya:border-lya-border/40 shrink-0">
          <button onClick={handlePayment} disabled={amountToPay <= 0 || (method === 'efectivo' && (parseFloat(amountReceived) || 0) < amountToPay)}
            className="w-full py-4 bg-gray-900 hover:bg-black dark:bg-orange-500 dark:hover:bg-orange-600 lya:bg-lya-primary lya:hover:bg-lya-primary/80 text-white font-bold text-lg rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Confirmar Cobro de ${amountToPay.toFixed(2)}</span><CheckCircle size={20} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};