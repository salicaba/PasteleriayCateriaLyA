import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Power, LayoutGrid } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8 transition-colors duration-300">
      
      {/* Header Admin */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
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

      {/* Grid de Productos Agrupados por Categoría */}
      <div className="space-y-10 pb-20">
        {categories.map(category => {
          const categoryProducts = products.filter(p => p.categoria === category);
          
          if (categoryProducts.length === 0) return null;

          return (
            <div key={category} className="space-y-4">
              <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200 flex items-center space-x-2 border-b border-gray-200 dark:border-gray-800 pb-2">
                <span>{category}</span>
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
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={`relative flex flex-col bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border ${
                        product.disponible 
                          ? 'border-gray-100 dark:border-gray-800' 
                          : 'border-red-200 dark:border-red-900/50 opacity-75'
                      }`}
                    >
                      {/* Badge Sold Out */}
                      {!product.disponible && (
                        <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide animate-pulse">
                          Agotado
                        </div>
                      )}

                      <div className="flex items-center space-x-4 mb-4">
                        <div className="text-4xl bg-gray-50 dark:bg-gray-800 h-16 w-16 flex items-center justify-center rounded-2xl shadow-inner">
                          {product.imagen}
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-bold text-lg leading-tight ${!product.disponible ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
                            {product.nombre}
                          </h3>
                          <p className="text-orange-500 dark:text-orange-400 font-black mt-1">
                            ${product.precioBase.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Resumen de Variantes */}
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex-1 mb-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
                        <p><strong>Tamaños:</strong> {product.opciones.tamanos.join(', ') || 'N/A'}</p>
                        <p className="truncate"><strong>Leches:</strong> {product.opciones.leches.join(', ') || 'N/A'}</p>
                      </div>

                      {/* Controles Admin */}
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
    </div>
  );
};