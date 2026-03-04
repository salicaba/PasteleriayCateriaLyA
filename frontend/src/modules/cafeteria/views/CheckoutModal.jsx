import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Banknote, Smartphone, CheckCircle, Calculator, Users, Minus, Plus, LayoutList, User, PieChart } from 'lucide-react';

const paymentMethods = [
  { id: 'efectivo', label: 'Efectivo', icon: Banknote, color: 'text-green-500' },
  { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard, color: 'text-blue-500' },
  { id: 'transferencia', label: 'Transferencia', icon: Smartphone, color: 'text-purple-500' },
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
  
  // MODOS DE COBRO: 'full' (Toda la mesa), 'nominal' (Por Persona), 'equal' (Partes Iguales)
  const [cobroMode, setCobroMode] = useState('full');
  
  // Estados para submétodos
  const [splitCount, setSplitCount] = useState(1);
  const [selectedCuenta, setSelectedCuenta] = useState('');

  // Inicializar el modal según de dónde viene el clic
  // Inicializar el modal según de dónde viene el clic
  useEffect(() => {
    if (isOpen) {
      setMethod('efectivo');
      setAmountReceived('');
      setChange(0);
      setSplitCount(1);

      if (initialTarget?.type === 'partial') {
        setCobroMode('nominal');
        setSelectedCuenta(initialTarget.cuentaName);
      } else {
        setCobroMode('full');
        // Preseleccionar la primera cuenta válida si existen
        if (cuentasResumen.length > 0) {
           setSelectedCuenta(cuentasResumen[0].nombre);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // <--- SOLUCIÓN: Solo dependemos de isOpen

  // CÁLCULO MÁGICO DEL MONTO SEGÚN LA PESTAÑA ACTIVA
  const amountToPay = 
    cobroMode === 'full' ? total :
    cobroMode === 'equal' ? total / splitCount :
    (cuentasResumen.find(c => c.nombre === selectedCuenta)?.subtotal || 0);

  // Calcular cambio
  useEffect(() => {
    if (method === 'efectivo') {
      const received = parseFloat(amountReceived) || 0;
      setChange(received - amountToPay);
    } else {
      setChange(0);
    }
  }, [amountReceived, amountToPay, method]);

  const handlePayment = () => {
    if (amountToPay <= 0) {
       alert("No hay monto a cobrar en la selección actual.");
       return;
    }
    if (method === 'efectivo' && (parseFloat(amountReceived) || 0) < amountToPay) {
      alert("El monto recibido es insuficiente para cubrir esta parte de la cuenta."); 
      return;
    }
    
    // Le decimos a PosModal exactamente QUÉ estamos pagando
    onConfirmPayment({ 
      method, 
      amountReceived, 
      change, 
      amountPaid: amountToPay,
      targetType: cobroMode === 'nominal' ? 'partial' : 'full',
      cuentaName: cobroMode === 'nominal' ? selectedCuenta : null
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]">
        
        <div className="p-5 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-black text-gray-800 dark:text-white">Caja y Pagos</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Selecciona qué vas a cobrar</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X size={20} className="text-gray-500 dark:text-white" /></button>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar space-y-5">
          
          {/* TABS DE MODALIDAD DE COBRO */}
          <div className="flex gap-2 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-2xl">
            <button onClick={() => setCobroMode('full')} className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex flex-col items-center gap-1.5 transition-all ${cobroMode === 'full' ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-primary dark:text-brand-secondary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              <LayoutList size={18}/> Toda la Mesa
            </button>
            <button onClick={() => setCobroMode('nominal')} className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex flex-col items-center gap-1.5 transition-all ${cobroMode === 'nominal' ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-primary dark:text-brand-secondary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              <User size={18}/> Por Persona
            </button>
            <button onClick={() => setCobroMode('equal')} className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex flex-col items-center gap-1.5 transition-all ${cobroMode === 'equal' ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-primary dark:text-brand-secondary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              <PieChart size={18}/> Dividir
            </button>
          </div>

          {/* CONTENIDO DINÁMICO SEGÚN LA PESTAÑA */}
          <div className="min-h-[70px] flex items-center justify-center">
            
            {cobroMode === 'full' && (
              <div className="text-center px-4 py-2 bg-brand-primary/5 dark:bg-brand-primary/10 rounded-xl border border-brand-primary/20">
                <p className="text-sm font-medium text-brand-dark dark:text-brand-secondary">Cobro en una sola exhibición</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Se liquidará todo lo consumido en la mesa.</p>
              </div>
            )}

            {cobroMode === 'nominal' && (
              <div className="w-full flex flex-wrap gap-2 justify-center">
                {cuentasResumen.length === 0 ? (
                   <span className="text-sm text-gray-400 italic">No hay cuentas pendientes.</span>
                ) : (
                   cuentasResumen.map(cuenta => (
                     <button
                       key={cuenta.nombre}
                       onClick={() => setSelectedCuenta(cuenta.nombre)}
                       disabled={cuenta.subtotal === 0}
                       className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                         selectedCuenta === cuenta.nombre 
                           ? 'border-brand-primary bg-brand-primary/10 text-brand-primary shadow-sm scale-105' 
                           : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:border-brand-primary/40'
                       } disabled:opacity-40 disabled:scale-100`}
                     >
                       {cuenta.nombre} <span className="block text-xs font-black">${cuenta.subtotal.toFixed(2)}</span>
                     </button>
                   ))
                )}
              </div>
            )}

            {cobroMode === 'equal' && (
              <div className="w-full flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Users size={18} />
                  <span className="text-sm font-bold">Dividir entre:</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setSplitCount(Math.max(1, splitCount - 1))} className="p-1.5 bg-white dark:bg-gray-700 rounded-lg shadow-sm active:scale-95 text-gray-500 dark:text-white border border-gray-200 dark:border-gray-600"><Minus size={16}/></button>
                  <span className="font-black text-xl w-6 text-center dark:text-white">{splitCount}</span>
                  <button onClick={() => setSplitCount(splitCount + 1)} className="p-1.5 bg-white dark:bg-gray-700 rounded-lg shadow-sm active:scale-95 text-gray-500 dark:text-white border border-gray-200 dark:border-gray-600"><Plus size={16}/></button>
                </div>
              </div>
            )}
          </div>

          <div className="text-center py-2">
            <span className="text-xs text-brand-primary uppercase tracking-widest font-black">
              {cobroMode === 'full' ? 'Total Mesa' : 
               cobroMode === 'equal' ? `Parte a cobrar (1 de ${splitCount})` : 
               `Cobrando a ${selectedCuenta || '...'}`}
            </span>
            <div className="text-5xl font-black text-brand-dark dark:text-white mt-1">
              ${amountToPay.toFixed(2)}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {paymentMethods.map((pm) => (
              <button
                key={pm.id} onClick={() => setMethod(pm.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${method === pm.id ? 'border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10 shadow-sm' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'}`}
              >
                <pm.icon size={24} className={`mb-1.5 ${method === pm.id ? 'text-brand-primary' : 'text-gray-400'}`} />
                <span className={`text-[11px] font-bold ${method === pm.id ? 'text-brand-dark dark:text-white' : 'text-gray-400'}`}>{pm.label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode='wait'>
            {method === 'efectivo' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 mt-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Monto Recibido</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                    <input type="number" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} placeholder="0.00" autoFocus className="w-full pl-8 pr-4 py-3 bg-white dark:bg-gray-900 rounded-lg text-xl font-bold text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-brand-primary focus:outline-none" />
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-900/50">
                  <div className="flex items-center gap-2"><Calculator size={20} className="text-green-600 dark:text-green-400"/><span className="font-bold text-green-800 dark:text-green-300">Cambio:</span></div>
                  <span className="text-2xl font-black text-green-700 dark:text-green-400">${change >= 0 ? change.toFixed(2) : '0.00'}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-5 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button 
            onClick={handlePayment} 
            disabled={amountToPay <= 0}
            className="w-full py-4 bg-brand-dark hover:bg-black dark:bg-brand-primary dark:hover:bg-brand-dark rounded-xl text-white font-bold text-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Confirmar Pago de ${amountToPay.toFixed(2)}</span><CheckCircle size={20} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};