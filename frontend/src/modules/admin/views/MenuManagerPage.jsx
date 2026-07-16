import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, rectSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Edit2, LayoutGrid, Image as ImageIcon, Settings, X, Save, AlertTriangle, CheckCircle2, Loader2, AlertCircle, PauseCircle, PlayCircle, EyeOff, ArchiveRestore, Package } from 'lucide-react';
import { useMenuManagerController } from '../controllers/useMenuManagerController';
import { SortableCategoryItem } from './SortableCategoryItem';
import { ProductFormModal } from './ProductFormModal';
import { SortableOptionItem } from './SortableOptionItem';

// 🔥 IMPORTAMOS TU COMPONENTE STATCARD DE MESAS (Adaptado para el Menú)
const StatCard = ({ title, value, icon: Icon, borderClass, iconColors, onClick, isActive }) => (
  <div 
    onClick={onClick}
    className={`bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-2xl p-4 sm:p-5 shadow-sm border-l-4 flex justify-between items-center transition-all ${onClick ? 'cursor-pointer active:scale-95 hover:shadow-md md:hover:-translate-y-0.5' : ''} ${borderClass} ${isActive ? 'ring-1 ring-gray-200 dark:ring-gray-700 lya:ring-lya-border/50 shadow-md opacity-100 scale-[1.02]' : 'opacity-80 md:hover:opacity-100'}`}
  >
    <div>
      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 lya:text-lya-text/60 uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text">{value}</h3>
    </div>
    <div className={`p-2 sm:p-3 rounded-xl bg-opacity-10 dark:bg-opacity-20 lya:bg-opacity-20 ${iconColors.bg}`}>
      <Icon size={24} className={iconColors.text} />
    </div>
  </div>
);

export const MenuManagerPage = () => {
  const [toast, setToast] = useState(null);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const {
    products, categories, setCategories, handleDragEndAPI,
    isModalOpen, isCategoryManagerOpen, setIsCategoryManagerOpen,
    editingProduct, toggleAvailability, toggleAgotado, openModal, closeModal, saveProduct, saveCategory,
    categoryToEdit, setCategoryToEdit,
    categoryToDelete, requestRemoveCategory, confirmRemoveCategory, cancelRemoveCategory,
    globalOptions, setGlobalOptions, saveGlobalOption, removeGlobalOption, handleDragEndOptionsAPI,
    isLoading,
    processingActions 
  } = useMenuManagerController({ showToast }); 

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

  if (isLoading) {
    return (
      <div className="h-full w-full flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg overflow-hidden transition-colors duration-300">
        <motion.div
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-24 h-24 bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-800 lya:border-lya-border/40"
        >
          <LayoutGrid size={40} className="text-orange-500 lya:text-lya-primary" />
        </motion.div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">
          Cargando Gestor de Menú
        </h2>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-orange-500 lya:text-lya-primary" /> Sincronizando catálogo...
        </p>
      </div>
    );
  }

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

  const handleDragEndOptions = (event, tipo) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const tipoOptions = globalOptions.filter(o => o.tipo === tipo);
      const oldIndex = tipoOptions.findIndex(o => o.id === active.id);
      const newIndex = tipoOptions.findIndex(o => o.id === over.id);
      const newTipoOptions = arrayMove(tipoOptions, oldIndex, newIndex);
      const otherOptions = globalOptions.filter(o => o.tipo !== tipo);
      setGlobalOptions([...otherOptions, ...newTipoOptions]);
      if (handleDragEndOptionsAPI) handleDragEndOptionsAPI(newTipoOptions);
    }
  };

  const handleCreateOrUpdateCategory = () => {
    if (newCategoryName.trim()) {
      saveCategory(newCategoryName);
      setNewCategoryName('');
    }
  };

  const visibleProducts = products.filter(p => p.isActive !== false && p.disponible !== false);
  const hiddenProducts = products.filter(p => p.isActive === false || p.disponible === false);

  // Calcula descontando los que están explícita o matemáticamente agotados
  const productosRealmenteActivos = visibleProducts.filter(p => {
    const isAgotado = p.isAgotado === true || (p.controlarStock === true && p.stock <= 0);
    return !isAgotado;
  }).length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full w-full flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300 relative overflow-hidden"
    >
      {/* 💊 NOTIFICACIÓN NATIVA NEO-BENTO */}
      <AnimatePresence>
        {toast && (
          <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
            <motion.div 
              initial={{ opacity: 0, y: -50, scale: 0.9 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className={`bg-white dark:bg-gray-900 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text px-6 py-4 rounded-full shadow-2xl flex items-center justify-center gap-3 font-bold border pointer-events-auto transition-colors max-w-md w-full sm:w-auto text-center ${
                toast.type === 'success' ? 'border-emerald-100 dark:border-emerald-900/30 lya:border-lya-primary/30' :
                toast.type === 'warning' ? 'border-amber-100 dark:border-amber-900/30 lya:border-amber-500/30' :
                'border-red-100 dark:border-red-900/30 lya:border-red-500/30'
              }`}
            >
              <div className={`p-1.5 rounded-full shrink-0 ${
                toast.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/20 lya:bg-lya-primary/20 text-emerald-500 lya:text-lya-primary' :
                toast.type === 'warning' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-500 lya:text-amber-400' :
                'bg-red-100 dark:bg-red-500/20 text-red-500 lya:text-red-400'
              }`}>
                {toast.type === 'success' ? <CheckCircle2 size={20} /> : toast.type === 'warning' ? <AlertTriangle size={20} /> : <AlertCircle size={20} />}
              </div>
              <span className="text-sm tracking-wide">{toast.message}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HEADER PRINCIPAL */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 z-10 relative">
        <div className="flex items-center space-x-4">
          <div className="bg-orange-500 dark:bg-orange-600 lya:bg-lya-primary text-white lya:text-lya-surface p-3 rounded-2xl shadow-md shadow-orange-500/20 lya:shadow-lya-primary/20">
            <LayoutGrid size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text tracking-tight">Gestor de Menú</h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">Catálogo completo del sistema</p>
          </div>
        </div>
        
        <div className="flex flex-wrap space-x-0 space-y-3 md:space-y-0 md:space-x-3 w-full md:w-auto">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsOptionsManagerOpen(true)} className="w-full md:w-auto flex-1 md:flex-none bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 lya:bg-lya-secondary/10 lya:hover:bg-lya-secondary/20 text-blue-600 dark:text-blue-400 lya:text-lya-secondary px-5 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 border border-blue-100 dark:border-blue-800/50 lya:border-lya-secondary/20">
            <Settings size={20} /> <span className="hidden sm:inline">Opciones Globales</span>
          </motion.button>
          
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsCategoryManagerOpen(true)} className="flex-1 md:flex-none bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 lya:bg-lya-border/20 lya:hover:bg-lya-border/40 text-gray-700 dark:text-gray-200 lya:text-lya-text px-5 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center space-x-2">
            <LayoutGrid size={20} /> <span className="hidden sm:inline">Categorías</span>
          </motion.button>
          
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => openModal()} className="flex-1 md:flex-none bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white lya:text-lya-surface px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-orange-500/30 dark:shadow-orange-900/40 lya:shadow-lya-primary/30 transition-all flex items-center justify-center space-x-2">
            <Plus size={20} /> <span>Nuevo Producto</span>
          </motion.button>
        </div>
      </header>

      {/* 🔥 FILA DE TARJETAS DE ESTADÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-8 shrink-0 z-10 relative">
        <StatCard 
          title="Total en Catálogo" 
          value={products.length} 
          icon={LayoutGrid} 
          borderClass="border-blue-500 lya:border-lya-secondary" 
          iconColors={{ bg: "bg-blue-500 lya:bg-lya-secondary", text: "text-blue-500 lya:text-lya-secondary" }} 
        />
        <StatCard 
          title="Productos Activos" 
          value={productosRealmenteActivos} 
          icon={CheckCircle2} 
          borderClass="border-emerald-500 lya:border-emerald-400" 
          iconColors={{ bg: "bg-emerald-500 lya:bg-emerald-500", text: "text-emerald-500 lya:text-emerald-500" }} 
        />
        <StatCard 
          title="Papelera (Ocultos)" 
          value={hiddenProducts.length} 
          icon={ArchiveRestore} 
          borderClass="border-red-500 lya:border-red-400" 
          iconColors={{ bg: "bg-red-500 lya:bg-red-500", text: "text-red-500 lya:text-red-500" }} 
          onClick={() => setIsTrashModalOpen(true)}
          isActive={isTrashModalOpen}
        />
      </div>

      {/* CUERPO: LISTA DE CATEGORÍAS Y PRODUCTOS VISIBLES */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
        <div className="space-y-10">
          {categories.map((category) => {
            const categoryVisibleProducts = visibleProducts.filter(p => p.categoryId === category.id || p.categoria === category.name);
            
            return (
              <div key={category.id} className="space-y-4">
                <h2 className="text-xl font-black text-gray-700 dark:text-gray-200 lya:text-lya-text flex items-center space-x-3 border-b border-gray-200 dark:border-gray-800 lya:border-lya-border/40 pb-3">
                  <span className="capitalize tracking-tight">{category.name}</span>
                  <span className="bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/20 text-gray-600 dark:text-gray-400 lya:text-lya-text/70 text-xs px-2.5 py-1 rounded-md">{categoryVisibleProducts.length}</span>
                </h2>

                {categoryVisibleProducts.length > 0 ? (
                  <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <AnimatePresence mode="popLayout">
                      {categoryVisibleProducts.map((product, index) => {
                        
                        // Lógica Unificada
                        const isAgotado = product.isAgotado === true || (product.controlarStock === true && product.stock <= 0);
                        const hasStockControl = product.controlarStock === true;
                        
                        const currentAction = processingActions?.[product.id];
                        const isProcessingAvailability = currentAction === 'availability';
                        const isProcessingAgotado = currentAction === 'agotado';
                        const isProcessingAny = !!currentAction;

                        return (
                        <motion.div 
                          key={product.id} 
                          layout 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
                          whileHover={{ y: -4, transition: { duration: 0.2 } }}
                          transition={{ type: "spring", stiffness: 300, damping: 25, delay: index * 0.03 }}
                          className={`relative flex flex-col bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-3xl p-5 shadow-sm border transition-colors ${
                            isAgotado ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-900/10'
                            : 'border-gray-100 dark:border-gray-800 lya:border-lya-border/30 md:hover:border-gray-300 lya:md:hover:border-lya-secondary/40'
                          }`}
                        >
                          {/* 🔥 INDICADOR ADMINISTRATIVO DE STOCK EXACTO */}
                          {hasStockControl && (
                            <div className={`absolute top-4 right-4 z-10 text-[10px] font-black px-2 py-1 rounded-lg border flex items-center gap-1 shadow-sm ${
                               product.stock <= 0 ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-800/50' :
                               product.stock <= 10 ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50' :
                               'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50'
                            }`}>
                               <Package size={12} /> Stock: {product.stock}
                            </div>
                          )}

                          <div className="flex items-center space-x-4 mb-4">
                            <div className="h-16 w-16 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 shadow-inner flex items-center justify-center relative">
                              {product.image || product.imageUrl ? (
                                <img src={product.image || product.imageUrl} alt={product.nombre || product.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="text-3xl opacity-80">{product.imagen || <ImageIcon size={24} className="text-gray-300 dark:text-gray-600 lya:text-lya-text/30" />}</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pr-16">
                              <h3 className={`font-black text-base leading-tight truncate tracking-tight ${isAgotado ? 'text-amber-800 dark:text-amber-400' : 'text-gray-800 dark:text-gray-100 lya:text-lya-text'}`}>{product.nombre || product.name}</h3>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <p className="text-orange-500 dark:text-orange-400 lya:text-lya-primary font-black">${Number(product.precioBase || product.basePrice || 0).toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 lya:border-lya-border/20 mt-auto">
                            
                            <div className="flex flex-col gap-1.5 w-full mr-2">
                              <button 
                                onClick={() => !isProcessingAny && toggleAgotado(product.id)} 
                                disabled={isProcessingAny}
                                className={`flex flex-1 items-center justify-center space-x-1.5 px-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border outline-none ${
                                  isProcessingAgotado
                                    ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 opacity-70 cursor-wait'
                                    : isAgotado 
                                      ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700/50 md:hover:bg-amber-100 shadow-sm active:scale-95' 
                                      : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700/50 md:hover:bg-emerald-100 active:scale-95'
                                }`}
                              >
                                {isProcessingAgotado ? <Loader2 size={12} className="animate-spin" /> : (isAgotado ? <PauseCircle size={12} /> : <PlayCircle size={12} />)} 
                                <span>{isProcessingAgotado ? 'Espere...' : (isAgotado ? 'Agotado (Pausado)' : 'En Stock (Activo)')}</span>
                              </button>
                            </div>
                            
                            <div className="flex items-center space-x-1.5 shrink-0">
                              <button onClick={() => openModal(product)} className="p-2.5 text-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 lya:text-lya-secondary lya:bg-lya-secondary/10 md:hover:bg-blue-100 dark:md:hover:bg-blue-900/40 rounded-xl transition-colors active:scale-90 outline-none" title="Editar">
                                <Edit2 size={16} />
                              </button>
                              
                              <button 
                                onClick={() => !isProcessingAny && toggleAvailability(product.id)} 
                                disabled={isProcessingAny}
                                className={`p-2.5 rounded-xl transition-colors active:scale-90 outline-none ${
                                  isProcessingAvailability 
                                    ? 'text-gray-400 bg-gray-100 dark:bg-gray-800 opacity-70 cursor-wait' 
                                    : 'text-gray-500 bg-gray-100 md:hover:bg-red-100 md:hover:text-red-500 dark:bg-gray-800 dark:md:hover:bg-red-900/40 dark:md:hover:text-red-400 lya:bg-lya-border/20 lya:md:hover:bg-red-500/20'
                                }`} 
                                title="Inactivar (Ocultar del sistema y enviar a Papelera)"
                              >
                                {isProcessingAvailability ? <Loader2 size={16} className="animate-spin" /> : <EyeOff size={16} />}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )})}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <div className="p-8 text-center bg-gray-50 dark:bg-gray-900/50 lya:bg-lya-bg/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 lya:border-lya-border/40">
                    <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-bold">Categoría vacía. Añade un producto aquí.</p>
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

      {/* MODAL DE LA PAPELERA */}
      <AnimatePresence>
        {isTrashModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 lya:bg-black/70 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-gray-100 dark:border-gray-800 lya:border-lya-border/40"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-500">
                    <ArchiveRestore size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 lya:text-lya-text">Papelera de Productos</h3>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-0.5">Productos inactivos ocultos del menú principal</p>
                  </div>
                </div>
                <button onClick={() => setIsTrashModalOpen(false)} className="p-2 md:hover:bg-gray-200 dark:md:hover:bg-gray-700 lya:md:hover:bg-lya-border/30 text-gray-500 dark:text-gray-400 lya:text-lya-text/50 lya:md:hover:text-lya-text rounded-full transition-colors outline-none"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gray-50/30 dark:bg-gray-950/20 lya:bg-lya-bg/30">
                {hiddenProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-10 text-center">
                    <ArchiveRestore size={48} className="text-gray-300 dark:text-gray-700 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 font-bold">La papelera está vacía.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hiddenProducts.map((product) => {
                      const isProcessingAvailability = processingActions?.[product.id] === 'availability';
                      
                      return (
                        <div key={product.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 lya:border-lya-border/30 opacity-80 md:hover:opacity-100 transition-opacity">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                              {product.image || product.imageUrl ? (
                                <img src={product.image || product.imageUrl} className="h-full w-full object-cover rounded-xl" />
                              ) : (
                                <ImageIcon size={20} className="text-gray-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate">{product.nombre || product.name}</h4>
                              <p className="text-xs text-gray-500 mt-0.5 truncate">{product.categoria || 'Sin categoría'}</p>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => !isProcessingAvailability && toggleAvailability(product.id)}
                            disabled={isProcessingAvailability}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ml-2 shrink-0 outline-none ${
                              isProcessingAvailability 
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-wait'
                                : 'bg-emerald-50 text-emerald-600 md:hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:md:hover:bg-emerald-900/40 active:scale-95'
                            }`}
                          >
                            {isProcessingAvailability ? <Loader2 size={14} className="animate-spin" /> : <ArchiveRestore size={14} />}
                            <span className="hidden sm:inline">Restaurar</span>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE GESTIÓN DE CATEGORÍAS */}
      <AnimatePresence>
        {isCategoryManagerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 lya:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 flex flex-col max-h-[80vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text">Administrar Categorías</h3>
                <button onClick={() => { setIsCategoryManagerOpen(false); setCategoryToEdit(null); }} className="text-gray-400 md:hover:text-gray-600 dark:md:hover:text-gray-300 lya:text-lya-text/50 lya:md:hover:text-lya-text bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg md:hover:bg-gray-200 dark:md:hover:bg-gray-700 lya:md:hover:bg-lya-border/40 p-2 rounded-full transition-colors outline-none">
                  <X size={20} />
                </button>
              </div>

              <div className="flex space-x-2 mb-6">
                <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder={categoryToEdit ? "Nuevo nombre..." : "Ej: Bebidas Calientes"} className={`flex-1 p-3 rounded-xl border bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg dark:text-white lya:text-lya-text outline-none focus:ring-2 font-medium transition-all ${categoryToEdit ? 'border-blue-200 dark:border-blue-900 lya:border-lya-secondary focus:ring-blue-500 lya:focus:ring-lya-secondary' : 'border-gray-200 dark:border-gray-700 lya:border-lya-border/50 focus:ring-orange-500 lya:focus:ring-lya-primary'}`} onKeyDown={(e) => e.key === 'Enter' && handleCreateOrUpdateCategory()} />
                {categoryToEdit && <button onClick={() => setCategoryToEdit(null)} className="bg-gray-200 md:hover:bg-gray-300 dark:bg-gray-700 dark:md:hover:bg-gray-600 lya:bg-lya-border/40 lya:md:hover:bg-lya-border/60 transition-colors text-gray-600 dark:text-gray-300 lya:text-lya-text px-3 py-3 rounded-xl font-bold outline-none"><X size={20} /></button>}
                <button onClick={handleCreateOrUpdateCategory} className={`${categoryToEdit ? 'bg-blue-500 md:hover:bg-blue-600 lya:bg-lya-secondary lya:md:hover:bg-lya-secondary/90' : 'bg-orange-500 md:hover:bg-orange-600 lya:bg-lya-primary lya:md:hover:bg-lya-primary/90'} transition-colors text-white lya:text-lya-surface px-4 py-3 rounded-xl font-bold outline-none`}>
                  {categoryToEdit ? <Save size={20} /> : <Plus size={20} />}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-3 font-semibold uppercase tracking-wider text-center">Orden del Menú (Arrastra para reordenar)</p>
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
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 text-center flex flex-col items-center"
            >
              <div className="bg-red-100 dark:bg-red-500/20 p-4 rounded-full mb-4 text-red-500">
                <AlertTriangle size={36} />
              </div>
              <h3 className="text-2xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text mb-2 text-center">¿Eliminar Categoría?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/70 mb-8 leading-relaxed px-2 text-center text-justify">
                Esta acción no se puede deshacer. Recuerda que <strong className="text-gray-700 dark:text-gray-300 lya:text-lya-text">no puedes eliminar una categoría si aún tiene productos</strong> dentro.
              </p>
              <div className="flex w-full gap-3">
                <button onClick={cancelRemoveCategory} className="flex-1 py-3.5 text-gray-600 dark:text-gray-300 lya:text-lya-text/80 bg-gray-100 md:hover:bg-gray-200 dark:bg-gray-800 dark:md:hover:bg-gray-700 lya:bg-lya-border/20 lya:md:hover:bg-lya-border/40 rounded-xl font-bold transition-colors outline-none">
                  Cancelar
                </button>
                <button onClick={confirmRemoveCategory} className="flex-1 py-3.5 bg-red-500 md:hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/30 transition-all transform md:hover:-translate-y-0.5 outline-none">
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
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg/50">
                <div>
                  <h3 className="text-xl font-black dark:text-gray-100 lya:text-lya-text flex items-center gap-2">
                    <Settings size={20} className="text-blue-500 lya:text-lya-secondary" />
                    Catálogo de Opciones
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">Crea y ordena modificadores globales (Ej: Tamaños, Leches, Extras)</p>
                </div>
                <button onClick={() => setIsOptionsManagerOpen(false)} className="p-2 md:hover:bg-gray-200 dark:md:hover:bg-gray-700 lya:md:hover:bg-lya-border/30 text-gray-500 dark:text-gray-400 lya:text-lya-text/50 lya:md:hover:text-lya-text rounded-full transition-colors outline-none"><X size={20} /></button>
              </div>

              <div className="p-6 bg-white dark:bg-gray-900 lya:bg-lya-surface grid grid-cols-1 md:grid-cols-4 gap-3 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shadow-sm z-10">
                <select 
                  value={newOpt.tipo} 
                  onChange={e => setNewOpt({...newOpt, tipo: e.target.value})}
                  className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg dark:text-white lya:text-lya-text border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500 lya:focus:ring-lya-secondary focus:border-transparent transition-all"
                >
                  <option value="tamanos">Tamaño</option>
                  <option value="leches">Leche</option>
                  <option value="extras">Extra</option>
                </select>
                <input 
                  type="text" placeholder="Nombre (Ej: Deslactosada)" 
                  value={newOpt.nombre} onChange={e => setNewOpt({...newOpt, nombre: e.target.value})}
                  className="md:col-span-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg dark:text-white lya:text-lya-text border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 outline-none text-sm focus:ring-2 focus:ring-blue-500 lya:focus:ring-lya-secondary focus:border-transparent transition-all"
                  onKeyDown={e => {
                    if(e.key === 'Enter' && newOpt.nombre.trim()){
                      saveGlobalOption(newOpt.tipo, newOpt.nombre, newOpt.precio); 
                      setNewOpt({...newOpt, nombre: '', precio: 0});
                    }
                  }}
                />
                <button 
                  onClick={() => { 
                    if(newOpt.nombre.trim()){
                      saveGlobalOption(newOpt.tipo, newOpt.nombre, newOpt.precio); 
                      setNewOpt({...newOpt, nombre: '', precio: 0}); 
                    }
                  }}
                  className="bg-blue-500 md:hover:bg-blue-600 lya:bg-lya-secondary text-white lya:text-lya-surface font-bold rounded-xl lya:md:hover:opacity-90 transition-all shadow-lg shadow-blue-500/30 lya:shadow-lya-secondary/30 flex items-center justify-center gap-2 outline-none"
                >
                  <Plus size={18} /> Añadir
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-gray-50/50 dark:bg-gray-950/20 lya:bg-lya-bg/50">
                {['tamanos', 'leches', 'extras'].map(tipo => {
                  const opcionesDelTipo = globalOptions.filter(o => o.tipo === tipo);
                  return (
                    <div key={tipo}>
                      <h4 className="text-xs font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/60 mb-3 tracking-widest px-2 border-b border-gray-200 dark:border-gray-800 lya:border-lya-border/30 pb-2 text-center">
                        {tipo === 'tamanos' ? 'TAMAÑOS' : tipo}
                      </h4>
                      {opcionesDelTipo.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-600 lya:text-lya-text/60 italic px-2 bg-white/50 dark:bg-gray-900/50 lya:bg-lya-surface p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 lya:border-lya-border/40 text-center">
                          Aún no has registrado {tipo}.
                        </p>
                      ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEndOptions(e, tipo)}>
                          <SortableContext items={opcionesDelTipo.map(o => o.id)} strategy={rectSortingStrategy}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {opcionesDelTipo.map(opt => (
                                <SortableOptionItem 
                                  key={opt.id} 
                                  id={opt.id} 
                                  option={opt} 
                                  onRemove={removeGlobalOption} 
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
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