// src/modules/admin/controllers/useMenuManagerController.js
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { adminMenuModel } from '../models/adminMenuModel';

export const useMenuManagerController = () => {
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
      toast.error('Error al cargar datos');
    } finally {
      if (showLoadingScreen) setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(true); }, [loadData]);

  // ==========================================
  // GESTIÓN DE CATEGORÍAS
  // ==========================================
  const saveCategory = async (name) => {
    try {
      if (categoryToEdit) {
        await adminMenuModel.updateCategory(categoryToEdit.id, name);
        toast.success('Categoría actualizada');
      } else {
        await adminMenuModel.createCategory(name);
        toast.success('Categoría creada');
      }
      setCategoryToEdit(null);
      await loadData(false);
    } catch (error) {
      toast.error('Error al guardar categoría');
    }
  };

  const requestRemoveCategory = (id) => setCategoryToDelete(id);
  const cancelRemoveCategory = () => setCategoryToDelete(null);

  const confirmRemoveCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await adminMenuModel.deleteCategory(categoryToDelete);
      toast.success('Categoría eliminada');
      await loadData(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar categoría');
    } finally {
      setCategoryToDelete(null);
    }
  };

  const handleDragEndAPI = async (newList) => {
    try {
      const payload = newList.map((cat, index) => ({ id: cat.id, order: index }));
      await adminMenuModel.reorderCategories(payload);
      toast.success('Orden guardado');
    } catch (error) {
      toast.error('Error al guardar orden');
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
    const toastId = toast.loading('Procesando producto...');
    try {
      let finalImageUrl = data.imageUrl;
      if (finalImageUrl && finalImageUrl.startsWith('data:image')) {
        toast.loading('Subiendo imagen a la nube...', { id: toastId });
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
      toast.loading('Guardando en base de datos...', { id: toastId });

      if (editingProduct) {
        await adminMenuModel.updateProduct(editingProduct.id, payload);
      } else {
        await adminMenuModel.createProduct(payload);
      }
      
      setIsModalOpen(false);
      await loadData(false); 
      toast.success('Producto guardado con éxito', { id: toastId });
    } catch (error) {
      toast.error('Ocurrió un error al guardar', { id: toastId });
    }
  };

  const requestRemoveProduct = (id) => setProductToDelete(id);
  const cancelRemoveProduct = () => setProductToDelete(null);
  
  const confirmRemoveProduct = async () => {
    if (!productToDelete) return;
    const toastId = toast.loading('Eliminando producto...');
    try {
      await adminMenuModel.deleteProduct(productToDelete);
      toast.success('Producto eliminado', { id: toastId });
      await loadData(false); 
    } catch (error) {
      toast.error('Error al eliminar producto', { id: toastId });
    } finally {
      setProductToDelete(null);
    }
  };

  // 🔥 SOLUCIÓN A LA CONDICIÓN DE CARRERA (OPTIMISTIC UI)
  const toggleAvailability = async (id) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    setProcessingProducts(prev => new Set(prev).add(id));
    const toastId = toast.loading('Actualizando estado...');
    
    // Evaluamos el estado en el que está y cuál es su futuro
    const currentState = product.isActive !== undefined ? product.isActive : product.disponible;
    const newState = !currentState;

    try {
      // 1. ACTUALIZACIÓN OPTIMISTA: Cambiamos localmente la UI sin esperar a la BD
      setProducts(prevProducts => prevProducts.map(p => 
        p.id === id ? { ...p, isActive: newState, disponible: newState } : p
      ));

      // 2. BACKEND: Mandamos todo el producto íntegro por si el servidor exige otros campos
      await adminMenuModel.updateProduct(id, { 
        ...product,
        isActive: newState,
        disponible: newState 
      });
      
      toast.success('Estado actualizado', { id: toastId });
      
      // 3. Traemos datos reales de forma silenciosa por las dudas
      loadData(false); 
    } catch (error) {
      // Si el backend tiró error, lo regresamos a como estaba antes
      setProducts(prevProducts => prevProducts.map(p => 
        p.id === id ? { ...p, isActive: currentState, disponible: currentState } : p
      ));
      toast.error('Error al actualizar estado', { id: toastId });
    } finally {
      setProcessingProducts(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // ==========================================
  // GESTIÓN DE OPCIONES GLOBALES
  // ==========================================
  const saveGlobalOption = async (tipo, nombre, precio) => {
    const toastId = toast.loading('Guardando opción...');
    try {
      const res = await adminMenuModel.createGlobalOption({ tipo, nombre, precioAdicional: Number(precio) });
      setGlobalOptions(prev => [...prev, res]); 
      toast.success('Opción añadida correctamente', { id: toastId });
    } catch (error) {
      toast.error('Error al guardar la opción', { id: toastId });
    }
  };

  const removeGlobalOption = async (id) => {
    const toastId = toast.loading('Eliminando opción...');
    try {
      await adminMenuModel.deleteGlobalOption(id);
      setGlobalOptions(prev => prev.filter(o => o.id !== id));
      toast.success('Opción eliminada', { id: toastId });
    } catch (error) {
      toast.error('Error al eliminar opción', { id: toastId });
    }
  };

  const handleDragEndOptionsAPI = async (newList) => {
    try {
      const payload = newList.map((opt, index) => ({ id: opt.id, order: index }));
      await adminMenuModel.reorderGlobalOptions(payload);
    } catch (error) {
      toast.error('Error al guardar orden de opciones');
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
    processingProducts, 
    
    globalOptions, 
    setGlobalOptions, 
    saveGlobalOption, 
    removeGlobalOption,
    handleDragEndOptionsAPI,

    isLoading
  };
};