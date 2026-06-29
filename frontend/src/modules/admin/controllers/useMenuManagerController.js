// frontend/src/modules/admin/controllers/useMenuManagerController.js
import { useState, useEffect, useCallback } from 'react';
import { adminMenuModel } from '../models/adminMenuModel';

// 🔥 AHORA RECIBE LA FUNCIÓN DE NOTIFICACIONES NEO-BENTO
export const useMenuManagerController = ({ showToast }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [globalOptions, setGlobalOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [processingProducts, setProcessingProducts] = useState(new Set());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [categoryToEdit, setCategoryToEdit] = useState(null); 
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);

  const loadData = useCallback(async (showLoadingScreen = true) => {
    try {
      if (showLoadingScreen) setIsLoading(true);
      const [fetchedCategories, fetchedProducts, fetchedOptions] = await Promise.all([
        adminMenuModel.getCategories(),
        adminMenuModel.getProducts(),
        adminMenuModel.getGlobalOptions()
      ]);
      setCategories(fetchedCategories);
      setProducts(fetchedProducts);
      setGlobalOptions(fetchedOptions);
    } catch (error) {
      showToast('Error al cargar catálogo desde el servidor', 'error');
    } finally {
      if (showLoadingScreen) setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadData(true); }, [loadData]);

  // ==========================================
  // GESTIÓN DE CATEGORÍAS
  // ==========================================
  const saveCategory = async (name) => {
    try {
      if (categoryToEdit) {
        await adminMenuModel.updateCategory(categoryToEdit.id, name);
        showToast('Categoría actualizada correctamente', 'success');
      } else {
        await adminMenuModel.createCategory(name);
        showToast('Categoría creada exitosamente', 'success');
      }
      setCategoryToEdit(null);
      await loadData(false);
    } catch (error) {
      showToast('Error al guardar la categoría', 'error');
    }
  };

  const requestRemoveCategory = (id) => setCategoryToDelete(id);
  const cancelRemoveCategory = () => setCategoryToDelete(null);

  const confirmRemoveCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await adminMenuModel.deleteCategory(categoryToDelete);
      showToast('Categoría eliminada por completo', 'success');
      await loadData(false);
    } catch (error) {
      showToast(error.response?.data?.message || 'Error al eliminar categoría', 'error');
    } finally {
      setCategoryToDelete(null);
    }
  };

  const handleDragEndAPI = async (newList) => {
    try {
      const payload = newList.map((cat, index) => ({ id: cat.id, order: index }));
      await adminMenuModel.reorderCategories(payload);
      showToast('Orden del menú guardado', 'success');
    } catch (error) {
      showToast('Error al guardar el nuevo orden', 'error');
      await loadData(false);
    }
  };

  // ==========================================
  // GESTIÓN DE PRODUCTOS Y CLOUDINARY
  // ==========================================
  const openModal = (product = null) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const saveProduct = async (data) => {
    showToast('Procesando producto y subiendo imagen...', 'warning');
    try {
      let finalImageUrl = data.imageUrl;
      if (finalImageUrl && finalImageUrl.startsWith('data:image')) {
        const formData = new FormData();
        formData.append('file', finalImageUrl);
        formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET); 
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        
        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST', body: formData
        });

        const cloudData = await cloudRes.json();
        if (!cloudRes.ok) throw new Error(cloudData.error?.message || 'Error al subir imagen');
        finalImageUrl = cloudData.secure_url;
      }

      const payload = { ...data, imageUrl: finalImageUrl };

      if (editingProduct) {
        await adminMenuModel.updateProduct(editingProduct.id, payload);
      } else {
        await adminMenuModel.createProduct(payload);
      }
      
      setIsModalOpen(false);
      await loadData(false); 
      showToast('Producto guardado con éxito', 'success');
    } catch (error) {
      showToast('Ocurrió un error al guardar el producto', 'error');
    }
  };

  const requestRemoveProduct = (id) => setProductToDelete(id);
  const cancelRemoveProduct = () => setProductToDelete(null);
  
  const confirmRemoveProduct = async () => {
    if (!productToDelete) return;
    showToast('Eliminando producto del menú...', 'warning');
    try {
      await adminMenuModel.deleteProduct(productToDelete);
      showToast('Producto eliminado exitosamente', 'success');
      await loadData(false); 
    } catch (error) {
      showToast('Error al eliminar producto', 'error');
    } finally {
      setProductToDelete(null);
    }
  };

  // 🔥 INTERRUPTOR: ACTIVO / INACTIVO
  const toggleAvailability = async (id) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    setProcessingProducts(prev => new Set(prev).add(id));
    const currentState = product.isActive !== undefined ? product.isActive : product.disponible;
    const newState = !currentState;

    try {
      setProducts(prevProducts => prevProducts.map(p => p.id === id ? { ...p, isActive: newState, disponible: newState } : p));
      await adminMenuModel.updateProduct(id, { ...product, isActive: newState, disponible: newState });
      showToast(`Producto marcado como ${newState ? 'Activo' : 'Inactivo'}`, 'success');
      loadData(false); 
    } catch (error) {
      setProducts(prevProducts => prevProducts.map(p => p.id === id ? { ...p, isActive: currentState, disponible: currentState } : p));
      showToast('Error al actualizar disponibilidad', 'error');
    } finally {
      setProcessingProducts(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  // 🔥 NUEVO INTERRUPTOR: DISPONIBLE / AGOTADO (PAUSA)
  const toggleAgotado = async (id) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    setProcessingProducts(prev => new Set(prev).add(id));
    const currentState = product.isAgotado || false;
    const newState = !currentState;

    try {
      setProducts(prevProducts => prevProducts.map(p => p.id === id ? { ...p, isAgotado: newState } : p));
      await adminMenuModel.updateProduct(id, { ...product, isAgotado: newState });
      showToast(newState ? '¡Producto marcado como AGOTADO!' : '¡Producto nuevamente en venta!', 'success');
      loadData(false); 
    } catch (error) {
      setProducts(prevProducts => prevProducts.map(p => p.id === id ? { ...p, isAgotado: currentState } : p));
      showToast('Error al cambiar el estado de inventario', 'error');
    } finally {
      setProcessingProducts(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  // ==========================================
  // GESTIÓN DE OPCIONES GLOBALES
  // ==========================================
  const saveGlobalOption = async (tipo, nombre, precio) => {
    try {
      const res = await adminMenuModel.createGlobalOption({ tipo, nombre, precioAdicional: Number(precio) });
      setGlobalOptions(prev => [...prev, res]); 
      showToast('Opción global añadida correctamente', 'success');
    } catch (error) {
      showToast('Error al guardar la opción global', 'error');
    }
  };

  const removeGlobalOption = async (id) => {
    try {
      await adminMenuModel.deleteGlobalOption(id);
      setGlobalOptions(prev => prev.filter(o => o.id !== id));
      showToast('Opción global eliminada', 'success');
    } catch (error) {
      showToast('Error al eliminar opción global', 'error');
    }
  };

  const handleDragEndOptionsAPI = async (newList) => {
    try {
      const payload = newList.map((opt, index) => ({ id: opt.id, order: index }));
      await adminMenuModel.reorderGlobalOptions(payload);
    } catch (error) {
      showToast('Error al reordenar la lista', 'error');
      await loadData(false); 
    }
  };

  return {
    products, categories, setCategories,
    isModalOpen, isCategoryManagerOpen, setIsCategoryManagerOpen,
    categoryToEdit, setCategoryToEdit,
    categoryToDelete, requestRemoveCategory, confirmRemoveCategory, cancelRemoveCategory,
    editingProduct, openModal, closeModal: () => setIsModalOpen(false),
    saveProduct, saveCategory, handleDragEndAPI,
    
    productToDelete, requestRemoveProduct, confirmRemoveProduct, cancelRemoveProduct,
    deleteProduct: requestRemoveProduct,
    toggleAvailability,
    toggleAgotado, // 🔥 Exportamos la función
    processingProducts, 
    
    globalOptions, setGlobalOptions, saveGlobalOption, removeGlobalOption, handleDragEndOptionsAPI,
    isLoading
  };
};