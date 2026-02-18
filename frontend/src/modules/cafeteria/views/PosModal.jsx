import React, { useState } from 'react';
import { X, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { usePosController } from '../controllers/usePosController';
import { ProductCard } from './ProductCard';
import { TicketSidebar } from './TicketSidebar'; 
import { CategoryBar } from './CategoryBar';
import { SuccessScreen } from './SuccessScreen';
import { ProductOptionsModal } from './ProductOptionsModal'; // Importante

// --- ANIMACIONES ---
const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalVariants = { 
  hidden: { y: "100%", opacity: 0 }, 
  visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 25, stiffness: 300 } },
  exit: { y: "100%", opacity: 0 } 
};

export const PosModal = ({ isOpen, onClose, mesa }) => {
  const [showMobileTicket, setShowMobileTicket] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null); // Producto que se está editando

  // Traemos todo del controlador
  const { 
    cart, total, addToCart, removeFromCart, deleteLine, 
    filtroTexto, setFiltroTexto, 
    categoriaActiva, setCategoriaActiva,
    filteredProducts,
    getProductQty,
    handleCheckout, 
    isSuccess
  } = usePosController();

  // Función puente: Del modal de opciones -> Al carrito real
  const handleConfirmOption = (productWithOptions) => {
    addToCart(productWithOptions);
    setSelectedProduct(null); // Cerrar modal de opciones
  };

  // Función para confirmar la orden completa (Botón Verde)
  const onConfirmOrder = () => {
    handleCheckout(() => {
      onClose(); // Se cierra al terminar la animación
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
          className="relative w-full h-[100dvh] md:h-[90vh] md:max-w-7xl bg-gray-50 md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
        >
          
          {/* --- 1. PANTALLA DE ÉXITO (Overlay Global) --- */}
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

          {/* --- 2. MODAL DE OPCIONES (Overlay de Producto) --- */}
          {/* FALTABA ESTO: Renderizar el modal cuando hay un producto seleccionado */}
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
            <div className="bg-white p-4 pb-2 border-b border-gray-100 sticky top-0 z-20 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar producto..." 
                    value={filtroTexto}
                    onChange={(e) => setFiltroTexto(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all"
                  />
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                  <X size={24} />
                </button>
              </div>

              {/* Barra de Categorías */}
              <CategoryBar active={categoriaActiva} onSelect={setCategoriaActiva} />
            </div>

            {/* Grid de Productos */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 pb-32 md:pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map(product => (
                  <ProductCard 
                    key={product.id} 
                    producto={product} 
                    // CAMBIO IMPORTANTE: Abrimos el modal de opciones en vez de agregar directo
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
                    className="absolute inset-0 z-50 bg-white shadow-xl flex flex-col"
                  >
                    <div 
                      className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100 shadow-sm cursor-pointer"
                      onClick={() => setShowMobileTicket(false)}
                    >
                      <div className="flex items-center gap-2 text-gray-500">
                        <button className="p-2 bg-white rounded-full border border-gray-200 shadow-sm active:scale-90 transition-transform">
                          <ChevronDown size={20} />
                        </button>
                        <span className="font-bold text-gray-700">Tu Pedido</span>
                      </div>
                      <span className="text-xs text-gray-400">Toca para cerrar</span>
                    </div>

                    <div className="flex-1 overflow-hidden relative bg-white">
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
              <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex items-center justify-between gap-4 z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
                <div onClick={() => setShowMobileTicket(true)} className="flex flex-col cursor-pointer">
                  <div className="flex items-center gap-1 text-xs text-gray-500 uppercase tracking-wider">
                    <span>Total</span>
                    <ChevronUp size={14}/>
                  </div>
                  <span className="text-2xl font-black text-brand-dark">${total.toFixed(2)}</span>
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
          <div className="hidden md:flex w-96 border-l border-gray-200 bg-white h-full shadow-xl z-20 flex-col">
            <div className="p-4 bg-brand-primary/5 border-b border-brand-primary/10">
              <h3 className="font-bold text-brand-dark text-lg">Mesa #{mesa.numero}</h3>
              <p className="text-xs text-gray-500">#{mesa.id} • Nueva Orden</p>
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