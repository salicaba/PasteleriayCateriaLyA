// src/modules/admin/views/MenuManagerPage.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Edit2, Trash2, Power, LayoutGrid, Image as ImageIcon, Settings, X, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useMenuManagerController } from '../controllers/useMenuManagerController';
import { SortableCategoryItem } from './SortableCategoryItem';
import { ProductFormModal } from './ProductFormModal';

export const MenuManagerPage = () => {
  const {
    products, categories, setCategories, handleDragEndAPI,
    isModalOpen, isCategoryManagerOpen, setIsCategoryManagerOpen,
    editingProduct, toggleAvailability, deleteProduct, openModal, closeModal, saveProduct, saveCategory,
    categoryToEdit, setCategoryToEdit,
    categoryToDelete, requestRemoveCategory, confirmRemoveCategory, cancelRemoveCategory,
    // 🔥 NUEVAS VARIABLES: Eliminar producto
    productToDelete, confirmRemoveProduct, cancelRemoveProduct,
    // Opciones globales
    globalOptions, saveGlobalOption, removeGlobalOption
  } = useMenuManagerController();

  const [newCategoryName, setNewCategoryName] = useState('');
  const [isOptionsManagerOpen, setIsOptionsManagerOpen] = useState(false);
  const [newOpt, setNewOpt] = useState({ tipo: 'tamanos', nombre: '', precio: 0 });

  useEffect(() => {
    if (categoryToEdit) setNewCategoryName(categoryToEdit.name);
    else setNewCategoryName('');
  }, [categoryToEdit, isCategoryManagerOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((cat) => cat.id === active.id);
      const newIndex = categories.findIndex((cat) => cat.id === over.id);
      const newCategoriesList = arrayMove(categories, oldIndex, newIndex);
      setCategories(newCategoriesList);
      if (handleDragEndAPI) handleDragEndAPI(newCategoriesList);
    }
  };

  const handleCreateOrUpdateCategory = () => {
    if (newCategoryName.trim()) {
      saveCategory(newCategoryName);
      setNewCategoryName('');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 p-4 md:p-8 transition-colors duration-300 relative"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 shrink-0 z-10 relative">
        <div className="flex items-center space-x-4">
          <div className="bg-orange-500 text-white p-3 rounded-2xl shadow-md shadow-orange-500/20">
            <LayoutGrid size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white">Gestor de Menú</h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Catálogo completo de la Cafetería</p>
          </div>
        </div>
        
        <div className="flex flex-wrap space-x-0 space-y-3 md:space-y-0 md:space-x-3 w-full md:w-auto">
          <button onClick={() => setIsOptionsManagerOpen(true)} className="w-full md:w-auto flex-1 md:flex-none bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-5 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 border border-blue-100 dark:border-blue-800/50">
            <Settings size={20} /> <span className="hidden sm:inline">Opciones Globales</span>
          </button>
          
          <button onClick={() => setIsCategoryManagerOpen(true)} className="flex-1 md:flex-none bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-5 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center space-x-2">
            <LayoutGrid size={20} /> <span className="hidden sm:inline">Categorías</span>
          </button>
          
          <button onClick={() => openModal()} className="flex-1 md:flex-none bg-orange-500 hover:bg-orange-600 text-white px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-orange-500/30 transform hover:-translate-y-0.5 transition-all flex items-center justify-center space-x-2">
            <Plus size={20} /> <span>Nuevo Producto</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
        <div className="space-y-10">
          {categories.map((category) => {
            const categoryProducts = products.filter(p => p.categoryId === category.id || p.categoria === category.name);
            return (
              <div key={category.id} className="space-y-4">
                <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200 flex items-center space-x-2 border-b border-gray-200 dark:border-gray-800 pb-2">
                  <span className="capitalize">{category.name}</span>
                  <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-2 py-1 rounded-full">{categoryProducts.length}</span>
                </h2>

                {categoryProducts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <AnimatePresence>
                      {categoryProducts.map((product) => (
                        <motion.div key={product.id} layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={`relative flex flex-col bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border ${product.disponible || product.isActive ? 'border-gray-100 dark:border-gray-800' : 'border-red-200 dark:border-red-900/50 opacity-75'}`}>
                          <div className="flex items-center space-x-4 mb-4">
                            <div className="h-16 w-16 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-inner flex items-center justify-center">
                              {product.image || product.imageUrl ? (
                                <img src={product.image || product.imageUrl} alt={product.nombre || product.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="text-3xl">{product.imagen || <ImageIcon size={24} className="text-gray-300 dark:text-gray-600" />}</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-bold text-lg leading-tight truncate ${!(product.disponible || product.isActive) ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>{product.nombre || product.name}</h3>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <p className="text-orange-500 dark:text-orange-400 font-black">${Number(product.precioBase || product.basePrice || 0).toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 mt-auto">
                            <button onClick={() => toggleAvailability(product.id)} className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${product.disponible || product.isActive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100' : 'text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100'}`}>
                              <Power size={16} /> <span>{product.disponible || product.isActive ? 'Activo' : 'Apagado'}</span>
                            </button>
                            <div className="flex space-x-2">
                              <button onClick={() => openModal(product)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"><Edit2 size={18} /></button>
                              <button onClick={() => deleteProduct(product.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={18} /></button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="p-6 text-center bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Categoría vacía. Añade un producto aquí.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* FORMULARIO DE CREAR/EDITAR PRODUCTO */}
      <AnimatePresence>
        {isModalOpen && <ProductFormModal isOpen={isModalOpen} onClose={closeModal} onSave={saveProduct} initialData={editingProduct} categories={categories} globalOptions={globalOptions} />}
      </AnimatePresence>

      {/* MODAL DE GESTIÓN DE CATEGORÍAS */}
      <AnimatePresence>
        {isCategoryManagerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-800 flex flex-col max-h-[80vh]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-extrabold text-gray-800 dark:text-white">Administrar Categorías</h3>
                <button onClick={() => { setIsCategoryManagerOpen(false); setCategoryToEdit(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex space-x-2 mb-6">
                <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder={categoryToEdit ? "Nuevo nombre..." : "Ej: Bebidas Calientes"} className={`flex-1 p-3 rounded-xl border bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 font-medium transition-all ${categoryToEdit ? 'border-blue-200 dark:border-blue-900 focus:ring-blue-500' : 'border-gray-200 dark:border-gray-700 focus:ring-orange-500'}`} onKeyDown={(e) => e.key === 'Enter' && handleCreateOrUpdateCategory()} />
                {categoryToEdit && <button onClick={() => setCategoryToEdit(null)} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-gray-600 dark:text-gray-300 px-3 py-3 rounded-xl font-bold"><X size={20} /></button>}
                <button onClick={handleCreateOrUpdateCategory} className={`${categoryToEdit ? 'bg-blue-500 hover:bg-blue-600' : 'bg-orange-500 hover:bg-orange-600'} transition-colors text-white px-4 py-3 rounded-xl font-bold`}>
                  {categoryToEdit ? <Save size={20} /> : <Plus size={20} />}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-semibold uppercase tracking-wider text-center">Orden del Menú (Arrastra para reordenar)</p>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    {categories.map((cat) => (
                      <SortableCategoryItem 
                        key={cat.id} id={cat.id} category={cat} isActive={categoryToEdit?.id === cat.id} onClick={() => {}}
                        onEdit={(c) => setCategoryToEdit(c)}
                        onDelete={(id) => requestRemoveCategory(id)} 
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL PARA ELIMINAR CATEGORÍA */}
      <AnimatePresence>
        {categoryToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-gray-800 text-center flex flex-col items-center">
              <div className="bg-red-100 dark:bg-red-500/20 p-4 rounded-full mb-4 text-red-500">
                <AlertTriangle size={36} />
              </div>
              <h3 className="text-2xl font-extrabold text-gray-800 dark:text-white mb-2">¿Eliminar Categoría?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed px-2">
                Esta acción no se puede deshacer. Recuerda que <strong className="text-gray-700 dark:text-gray-300">no puedes eliminar una categoría si aún tiene productos</strong> dentro.
              </p>
              <div className="flex w-full gap-3">
                <button onClick={cancelRemoveCategory} className="flex-1 py-3.5 text-gray-600 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl font-bold transition-colors">
                  Cancelar
                </button>
                <button onClick={confirmRemoveCategory} className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/30 transition-all transform hover:-translate-y-0.5">
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 🔥 NUEVO: MODAL PARA ELIMINAR PRODUCTO 🔥 */}
      <AnimatePresence>
        {productToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-gray-800 text-center flex flex-col items-center">
              <div className="bg-red-100 dark:bg-red-500/20 p-4 rounded-full mb-4 text-red-500">
                <AlertTriangle size={36} />
              </div>
              <h3 className="text-2xl font-extrabold text-gray-800 dark:text-white mb-2">¿Eliminar Producto?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed px-2">
                ¿Estás seguro de que deseas eliminar este producto del menú? Esta acción no se puede deshacer.
              </p>
              <div className="flex w-full gap-3">
                <button onClick={cancelRemoveProduct} className="flex-1 py-3.5 text-gray-600 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl font-bold transition-colors">
                  Cancelar
                </button>
                <button onClick={confirmRemoveProduct} className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/30 transition-all transform hover:-translate-y-0.5">
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE OPCIONES GLOBALES */}
      <AnimatePresence>
        {isOptionsManagerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                <div>
                  <h3 className="text-xl font-black dark:text-gray-100 flex items-center gap-2">
                    <Settings size={20} className="text-blue-500" />
                    Catálogo de Opciones
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Crea modificadores globales (Ej: Tamaños, Leches, Extras)</p>
                </div>
                <button onClick={() => setIsOptionsManagerOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="p-6 bg-white dark:bg-gray-900 grid grid-cols-1 md:grid-cols-4 gap-3 border-b border-gray-100 dark:border-gray-800 shadow-sm z-10">
                <select 
                  value={newOpt.tipo} 
                  onChange={e => setNewOpt({...newOpt, tipo: e.target.value})}
                  className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="tamanos">Tamaño</option>
                  <option value="leches">Leche</option>
                  <option value="extras">Extra</option>
                </select>
                <input 
                  type="text" placeholder="Nombre (Ej: Deslactosada)" 
                  value={newOpt.nombre} onChange={e => setNewOpt({...newOpt, nombre: e.target.value})}
                  className="md:col-span-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 outline-none text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  onKeyDown={e => {
                    if(e.key === 'Enter' && newOpt.nombre.trim()){
                      saveGlobalOption(newOpt.tipo, newOpt.nombre, newOpt.precio); 
                      setNewOpt({...newOpt, nombre: ''});
                    }
                  }}
                />
                <button 
                  onClick={() => { 
                    if(newOpt.nombre.trim()){
                      saveGlobalOption(newOpt.tipo, newOpt.nombre, newOpt.precio); 
                      setNewOpt({...newOpt, nombre: ''}); 
                    }
                  }}
                  className="bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Añadir
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-gray-50/50 dark:bg-gray-950/20">
                {['tamanos', 'leches', 'extras'].map(tipo => {
                  const opcionesDelTipo = globalOptions.filter(o => o.tipo === tipo);
                  return (
                    <div key={tipo}>
                      <h4 className="text-xs font-black uppercase text-gray-400 dark:text-gray-500 mb-3 tracking-widest px-2 border-b border-gray-200 dark:border-gray-800 pb-2">{tipo}</h4>
                      {opcionesDelTipo.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-600 italic px-2 bg-white/50 dark:bg-gray-900/50 p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                          Aún no has registrado {tipo}.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {opcionesDelTipo.map(opt => (
                            <div key={opt.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm group hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors">
                              <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate pr-2">{opt.nombre}</span>
                              <button onClick={() => removeGlobalOption(opt.id)} className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 md:opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all">
                                <Trash2 size={16}/>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};