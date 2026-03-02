import React, { useState } from 'react';
import { X, Search, ChevronDown, ChevronUp, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { usePosController } from '../controllers/usePosController';
import { ProductCard } from './ProductCard';
import { TicketSidebar } from './TicketSidebar'; 
import { CategoryBar } from './CategoryBar';
import { SuccessScreen } from './SuccessScreen';
import { ProductOptionsModal } from './ProductOptionsModal';
import { CheckoutModal } from './CheckoutModal'; 
import { OpcionesMesaModal } from './OpcionesMesaModal';

export const PosModal = ({ isOpen, onClose, mesa, todasLasMesas, onTableRelease, onUpdateTable, onUnirMesas, onPagoParcial }) => {
  const [showMobileTicket, setShowMobileTicket] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOpcionesMesa, setShowOpcionesMesa] = useState(false);

  const { 
    cart, total, addToCart, removeFromCart, filtroTexto, setFiltroTexto, 
    categoriaActiva, setCategoriaActiva, filteredProducts, getProductQty, 
    isSuccess, unsentTotal, hasUnsentItems, simulateKitchenSend,
    cuentas, agregarCuenta, eliminarCuenta, moverItemACuenta
  } = usePosController();

  const handleSendToKitchen = () => {
    if (!hasUnsentItems) return; 
    simulateKitchenSend(() => {
      if (onUpdateTable && unsentTotal > 0) onUpdateTable(mesa.id, unsentTotal);
    });
  };

  const handleFinalizePayment = (paymentDetails) => {
    const { amountPaid } = paymentDetails;
    setShowCheckout(false);

    if (onPagoParcial) onPagoParcial(mesa.id, amountPaid);

    // Si la mesa se queda en $0, la liberamos
    const deudaTotal = (mesa.total || 0) + unsentTotal;
    if (deudaTotal - amountPaid <= 0.01) {
      if (onTableRelease) onTableRelease(mesa.id);
      onClose();
    }
  };

  if (!isOpen || !mesa) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full h-[100dvh] md:h-[90vh] md:max-w-7xl bg-gray-50 dark:bg-gray-900 md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row transition-colors">
          
          <div className="flex-1 flex flex-col h-full relative z-0">
            {/* Header del Buscador */}
            <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-20">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input type="text" placeholder="Buscar producto..." value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm outline-none text-gray-800 dark:text-white" />
                </div>
                <button onClick={onClose} className="p-2 text-gray-500"><X size={24} /></button>
              </div>
              <CategoryBar active={categoriaActiva} onSelect={setCategoriaActiva} />
            </div>

            {/* Grid de Productos */}
            <div className="flex-1 overflow-y-auto p-4 pb-32 md:pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} producto={product} onAdd={setSelectedProduct} qty={getProductQty(product.id)} />
                ))}
              </div>
            </div>
          </div>

          {/* Barra Lateral (Ticket) - Desktop */}
          <div className="hidden md:flex w-96 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-full flex-col shadow-xl">
            <TicketSidebar 
              cart={cart} total={total} 
              cuentas={cuentas} agregarCuenta={agregarCuenta} 
              moverItemACuenta={moverItemACuenta} eliminarCuenta={eliminarCuenta}
              onRemove={removeFromCart} onSendToKitchen={handleSendToKitchen} 
              onCheckout={() => setShowCheckout(true)} 
              unsentTotal={unsentTotal} hasUnsentItems={hasUnsentItems} 
            />
          </div>
        </motion.div>

        <AnimatePresence>
          {isSuccess && <SuccessScreen />}
          {selectedProduct && <ProductOptionsModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onConfirm={addToCart} />}
          {showCheckout && <CheckoutModal isOpen={showCheckout} onClose={() => setShowCheckout(false)} cart={cart} cuentas={cuentas} onConfirmPayment={handleFinalizePayment} />}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
};