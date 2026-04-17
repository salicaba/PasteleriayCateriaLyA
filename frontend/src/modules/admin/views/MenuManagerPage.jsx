import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Power, LayoutGrid, Image as ImageIcon } from 'lucide-react';
import { useMenuManagerController } from '../controllers/useMenuManagerController';
import { ProductFormModal } from './ProductFormModal';

export const MenuManagerPage = () => {
  const {
    products,
    categories,
    isModalOpen,
    editingProduct,
    toggleAvailability,
    deleteProduct,
    openModal,
    closeModal,
    saveProduct
  } = useMenuManagerController();

  return (
    // ANIMACIÓN SUAVIZADA DE ENTRADA
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 p-4 md:p-8 transition-colors duration-300"
    >
      
      {/* HEADER FIJO */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 shrink-0 z-10 relative">
        <div className="flex items-center space-x-4">
          <div className="bg-orange-500 text-white p-3 rounded-2xl shadow-md shadow-orange-500/20">
            <LayoutGrid size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white">Gestor de Menú</h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
              Control total del POS de la Cafetería
            </p>
          </div>
        </div>
        
        <button
          onClick={() => openModal()}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-orange-500/30 transform hover:-translate-y-0.5 transition-all flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Nuevo Producto</span>
        </button>
      </header>

      {/* CUERPO CON SCROLL INDEPENDIENTE */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
        <div className="space-y-10">
          {categories.map(category => {
            const categoryProducts = products.filter(p => p.categoria === category);
            
            if (categoryProducts.length === 0) return null;

            return (
              <div key={category} className="space-y-4">
                <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200 flex items-center space-x-2 border-b border-gray-200 dark:border-gray-800 pb-2">
                  <span className="capitalize">{category}</span>
                  <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-2 py-1 rounded-full">
                    {categoryProducts.length}
                  </span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <AnimatePresence>
                    {categoryProducts.map(product => (
                      <motion.div
                        key={product.id}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`relative flex flex-col bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border ${
                          product.disponible 
                            ? 'border-gray-100 dark:border-gray-800' 
                            : 'border-red-200 dark:border-red-900/50 opacity-75'
                        }`}
                      >
                        {/* --- ENCABEZADO DE LA TARJETA (FOTO, NOMBRE, PRECIO, STOCK) --- */}
                        <div className="flex items-center space-x-4 mb-4">
                          
                          {/* Contenedor de la Imagen Real o Emoji */}
                          <div className="h-16 w-16 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-inner flex items-center justify-center">
                            {product.image ? (
                              <img src={product.image} alt={product.nombre} className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-3xl">
                                {product.imagen || <ImageIcon size={24} className="text-gray-300 dark:text-gray-600" />}
                              </div>
                            )}
                          </div>
                          
                          {/* Detalles Principales */}
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-bold text-lg leading-tight truncate ${!product.disponible ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
                              {product.nombre}
                            </h3>
                            
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <p className="text-orange-500 dark:text-orange-400 font-black">
                                ${product.precioBase?.toFixed(2) || '0.00'}
                              </p>
                              
                              {/* INDICADOR DE STOCK (Con colores semánticos) */}
                              {product.controlarStock ? (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                  product.stock > 10 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 
                                  product.stock > 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400' : 
                                  'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                                }`}>
                                  Stock: {product.stock}
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                  Ilimitado
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* --- OPCIONES (TAMAÑOS Y LECHES) --- */}
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex-1 mb-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl overflow-hidden">
                          <p className="truncate"><strong>Tamaños:</strong> {product.opciones?.tamanos?.join(', ') || 'N/A'}</p>
                          <p className="truncate mt-1"><strong>Leches:</strong> {product.opciones?.leches?.join(', ') || 'N/A'}</p>
                        </div>

                        {/* --- CONTROLES DE ADMINISTRACIÓN --- */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                          <button
                            onClick={() => toggleAvailability(product.id)}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                              product.disponible
                                ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100'
                                : 'text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100'
                            }`}
                          >
                            <Power size={16} />
                            <span>{product.disponible ? 'Activo' : 'Apagado'}</span>
                          </button>
                          
                          <div className="flex space-x-2">
                            <button onClick={() => openModal(product)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors">
                              <Edit2 size={18} />
                            </button>
                            <button onClick={() => deleteProduct(product.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL DE FORMULARIO (Donde se sube la imagen y edita el stock) */}
      <AnimatePresence>
        {isModalOpen && (
          <ProductFormModal
            isOpen={isModalOpen}
            onClose={closeModal}
            onSave={saveProduct}
            initialData={editingProduct}
            categories={categories}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};