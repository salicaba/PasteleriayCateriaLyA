import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Banknote, Smartphone, CheckCircle, Calculator } from 'lucide-react';

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

  // Reiniciar estados al abrir
  useEffect(() => {
    if (isOpen) {
      setMethod('efectivo');
      setAmountReceived('');
      setChange(0);
    }
  }, [isOpen]);

  // Calcular cambio en tiempo real
  useEffect(() => {
    if (method === 'efectivo') {
      const received = parseFloat(amountReceived) || 0;
      setChange(received - total);
    } else {
      setChange(0);
    }
  }, [amountReceived, total, method]);

  const handlePayment = () => {
    // Validación básica para efectivo
    if (method === 'efectivo' && (parseFloat(amountReceived) || 0) < total) {
      alert("El monto recibido es insuficiente"); // En un proyecto real, usar un Toast
      return;
    }
    onConfirmPayment({ method, amountReceived, change });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />

      {/* Modal Content */}
      <motion.div 
        variants={modalVariants}
        initial="hidden" animate="visible" exit="exit"
        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
      >
        {/* Header */}
        <div className="p-6 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-gray-800 dark:text-white">Finalizar Venta</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Selecciona método de pago</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X size={20} className="text-gray-500 dark:text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Total Display */}
          <div className="text-center py-4">
            <span className="text-sm text-gray-400 uppercase tracking-widest font-semibold">Total a Pagar</span>
            <div className="text-5xl font-black text-brand-dark dark:text-white mt-2">
              ${total.toFixed(2)}
            </div>
          </div>

          {/* Payment Methods Grid */}
          <div className="grid grid-cols-3 gap-3">
            {paymentMethods.map((pm) => (
              <button
                key={pm.id}
                onClick={() => setMethod(pm.id)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                  method === pm.id 
                    ? 'border-brand-primary bg-brand-primary/10 dark:bg-brand-primary/20' 
                    : 'border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <pm.icon size={28} className={`mb-2 ${method === pm.id ? 'text-brand-primary' : 'text-gray-400'}`} />
                <span className={`text-xs font-bold ${method === pm.id ? 'text-brand-dark dark:text-white' : 'text-gray-400'}`}>
                  {pm.label}
                </span>
              </button>
            ))}
          </div>

          {/* Cash Input Section */}
          <AnimatePresence mode='wait'>
            {method === 'efectivo' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-4"
              >
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Monto Recibido</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                    <input 
                      type="number" 
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 bg-white dark:bg-gray-900 rounded-lg text-xl font-bold text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-brand-primary focus:outline-none"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Change Display */}
                <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-900/50">
                  <div className="flex items-center gap-2">
                    <Calculator size={20} className="text-green-600 dark:text-green-400"/>
                    <span className="font-bold text-green-800 dark:text-green-300">Cambio:</span>
                  </div>
                  <span className="text-2xl font-black text-green-700 dark:text-green-400">
                    ${change >= 0 ? change.toFixed(2) : '0.00'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          <button 
            onClick={handlePayment}
            className="w-full py-4 bg-brand-dark dark:bg-brand-primary rounded-xl text-white font-bold text-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <span>Confirmar Cobro</span>
            <CheckCircle size={20} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};