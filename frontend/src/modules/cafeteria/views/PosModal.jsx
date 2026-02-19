import React, { useState } from 'react';
import { X, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { usePosController } from '../controllers/usePosController';
import { ProductCard } from './ProductCard';
import { TicketSidebar } from './TicketSidebar'; 
import { CategoryBar } from './CategoryBar';
import { SuccessScreen } from './SuccessScreen';
import { ProductOptionsModal } from './ProductOptionsModal';

// --- ANIMACIONES ---
const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalVariants = { 
  hidden: { y: "100%", opacity: 0 }, 
  visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 25, stiffness: 300 } },
  exit: { y: "100%", opacity: 0 } 
};

export const PosModal = ({ isOpen, onClose, mesa }) => {
  const [showMobileTicket, setShowMobileTicket] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { 
    cart, total, addToCart, removeFromCart, deleteLine, 
    filtroTexto, setFiltroTexto, 
    categoriaActiva, setCategoriaActiva,
    filteredProducts,
    getProductQty,
    handleCheckout, 
    isSuccess
  } = usePosController();

  const handleConfirmOption = (productWithOptions) => {
    addToCart(productWithOptions);
    setSelectedProduct(null);
  };

  const onConfirmOrder = () => {
    handleCheckout(() => {
      onClose();
    });
  };

  if (!isOpen || !mesa) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
        
        {/* Fondo Oscuro */}
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Principal */}
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          // CAMBIO: dark:bg-gray-900
          className="relative w-full h-[100dvh] md:h-[90vh] md:max-w-7xl bg-gray-50 dark:bg-gray-900 md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row transition-colors duration-300"
        >
          
          {/* OVERLAYS */}
          <AnimatePresence>
            {isSuccess && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-[100]"
              >
                <SuccessScreen />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {selectedProduct && (
              <ProductOptionsModal 
                product={selectedProduct}
                onClose={() => setSelectedProduct(null)}
                onConfirm={handleConfirmOption}
              />
            )}
          </AnimatePresence>


          {/* --- COLUMNA IZQUIERDA (Menú) --- */}
          <div className="flex-1 flex flex-col h-full relative z-0">
            
            {/* Header: Buscador + Categorías */}
            {/* CAMBIO: dark:bg-gray-800 dark:border-gray-700 */}
            <div className="bg-white dark:bg-gray-800 p-4 pb-2 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-20 shadow-sm transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  {/* CAMBIO: Input oscuro */}
                  <input 
                    type="text" 
                    placeholder="Buscar producto..." 
                    value={filtroTexto}
                    onChange={(e) => setFiltroTexto(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <CategoryBar active={categoriaActiva} onSelect={setCategoriaActiva} />
            </div>

            {/* Grid de Productos */}
            {/* CAMBIO: Fondo oscuro en el grid */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 pb-32 md:pb-4 transition-colors">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map(product => (
                  <ProductCard 
                    key={product.id} 
                    producto={product} 
                    onAdd={setSelectedProduct} 
                    qty={getProductQty(product.id)}
                  />
                ))}
              </div>
            </div>

            {/* --- MÓVIL (Ticket Drawer) --- */}
            <div className="md:hidden">
              <AnimatePresence>
                {showMobileTicket && (
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="absolute inset-0 z-50 bg-white dark:bg-gray-800 shadow-xl flex flex-col"
                  >
                    <div 
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 shadow-sm cursor-pointer"
                      onClick={() => setShowMobileTicket(false)}
                    >
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <button className="p-2 bg-white dark:bg-gray-700 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm active:scale-90 transition-transform">
                          <ChevronDown size={20} />
                        </button>
                        <span className="font-bold text-gray-700 dark:text-white">Tu Pedido</span>
                      </div>
                      <span className="text-xs text-gray-400">Toca para cerrar</span>
                    </div>

                    <div className="flex-1 overflow-hidden relative bg-white dark:bg-gray-800">
                      <TicketSidebar 
                        cart={cart} 
                        total={total} 
                        onAdd={addToCart} 
                        onRemove={removeFromCart}
                        onDelete={deleteLine}
                        onConfirm={onConfirmOrder}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Barra Inferior Móvil */}
              <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between gap-4 z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] transition-colors">
                <div onClick={() => setShowMobileTicket(true)} className="flex flex-col cursor-pointer">
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <span>Total</span>
                    <ChevronUp size={14}/>
                  </div>
                  <span className="text-2xl font-black text-brand-dark dark:text-white transition-colors">${total.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => setShowMobileTicket(true)}
                  className="bg-brand-dark text-white font-bold py-3 px-6 rounded-xl shadow-lg active:scale-95 transition-transform"
                >
                  Ver Orden ({cart.reduce((acc, item) => acc + (item.qty || item.cantidad || 0), 0)})
                </button>
              </div>
            </div>

          </div>

          {/* --- PC SIDEBAR --- */}
          {/* CAMBIO: Colores de sidebar */}
          <div className="hidden md:flex w-96 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-full shadow-xl z-20 flex-col transition-colors">
            <div className="p-4 bg-brand-primary/5 dark:bg-brand-primary/10 border-b border-brand-primary/10 dark:border-brand-primary/20">
              <h3 className="font-bold text-brand-dark dark:text-brand-primary text-lg">Mesa #{mesa.numero}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">#{mesa.id} • Nueva Orden</p>
            </div>
            
            <div className="flex-1 overflow-hidden h-full">
              <TicketSidebar 
                cart={cart} 
                total={total} 
                onAdd={addToCart} 
                onRemove={removeFromCart} 
                onDelete={deleteLine}
                onConfirm={onConfirmOrder}
              />
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};