import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Banknote, Smartphone, CheckCircle, Calculator, Users, Minus, Plus } from 'lucide-react';

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

export const CheckoutModal = ({ isOpen, onClose, total, onConfirmPayment }) => {
  const [method, setMethod] = useState('efectivo');
  const [amountReceived, setAmountReceived] = useState('');
  const [change, setChange] = useState(0);
  
  // NUEVO: Estado para dividir la cuenta
  const [splitCount, setSplitCount] = useState(1);

  // El monto real que se va a cobrar en esta transacción
  const amountToPay = total / splitCount;

  useEffect(() => {
    if (isOpen) {
      setMethod('efectivo');
      setAmountReceived('');
      setChange(0);
      setSplitCount(1); // Reiniciar al abrir
    }
  }, [isOpen]);

  // Calcular cambio basado en el monto dividido
  useEffect(() => {
    if (method === 'efectivo') {
      const received = parseFloat(amountReceived) || 0;
      setChange(received - amountToPay);
    } else {
      setChange(0);
    }
  }, [amountReceived, amountToPay, method]);

  const handlePayment = () => {
    if (method === 'efectivo' && (parseFloat(amountReceived) || 0) < amountToPay) {
      alert("El monto recibido es insuficiente para cubrir esta parte de la cuenta."); 
      return;
    }
    // Pasamos el monto real que se está pagando (amountToPay) para que el POS lo descuente
    onConfirmPayment({ method, amountReceived, change, amountPaid: amountToPay });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
        
        <div className="p-6 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-gray-800 dark:text-white">Caja y Pagos</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Procesar el cobro de la mesa</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X size={20} className="text-gray-500 dark:text-white" /></button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* NUEVO: Controlador para Dividir Cuenta */}
          <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Users size={18} />
              <span className="text-sm font-bold">Dividir Pago</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSplitCount(Math.max(1, splitCount - 1))} 
                className="p-1.5 bg-white dark:bg-gray-700 rounded-lg shadow-sm active:scale-95 text-gray-500 dark:text-white"
              ><Minus size={16}/></button>
              
              <span className="font-black text-lg w-4 text-center dark:text-white">{splitCount}</span>
              
              <button 
                onClick={() => setSplitCount(splitCount + 1)} 
                className="p-1.5 bg-white dark:bg-gray-700 rounded-lg shadow-sm active:scale-95 text-gray-500 dark:text-white"
              ><Plus size={16}/></button>
            </div>
          </div>

          <div className="text-center py-2">
            {splitCount > 1 && (
              <p className="text-xs text-gray-400 mb-2">Total de la mesa: ${total.toFixed(2)}</p>
            )}
            <span className="text-sm text-brand-primary uppercase tracking-widest font-bold">
              {splitCount > 1 ? `Cobrando (1 de ${splitCount})` : 'Total a Cobrar'}
            </span>
            <div className="text-5xl font-black text-brand-dark dark:text-white mt-1">
              ${amountToPay.toFixed(2)}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {paymentMethods.map((pm) => (
              <button
                key={pm.id} onClick={() => setMethod(pm.id)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${method === pm.id ? 'border-brand-primary bg-brand-primary/10 dark:bg-brand-primary/20' : 'border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
              >
                <pm.icon size={28} className={`mb-2 ${method === pm.id ? 'text-brand-primary' : 'text-gray-400'}`} />
                <span className={`text-xs font-bold ${method === pm.id ? 'text-brand-dark dark:text-white' : 'text-gray-400'}`}>{pm.label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode='wait'>
            {method === 'efectivo' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
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

        <div className="p-6 pt-0">
          <button onClick={handlePayment} className="w-full py-4 bg-brand-dark dark:bg-brand-primary rounded-xl text-white font-bold text-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
            <span>Confirmar Pago Parcial</span><CheckCircle size={20} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};