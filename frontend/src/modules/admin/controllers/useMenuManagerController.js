// src/modules/admin/controllers/useMenuManagerController.js
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { adminMenuModel } from '../models/adminMenuModel';

export const useMenuManagerController = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [globalOptions, setGlobalOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [categoryToEdit, setCategoryToEdit] = useState(null); 
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  
  // 🔥 NUEVO: Estado para el modal de eliminar producto
  const [productToDelete, setProductToDelete] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
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
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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
      loadData();
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
      loadData();
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
      loadData();
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
      loadData();
      toast.success('Producto guardado con éxito', { id: toastId });
    } catch (error) {
      toast.error('Ocurrió un error al guardar', { id: toastId });
    }
  };

  // 🔥 FIX: Lógica real para eliminar producto
  const requestRemoveProduct = (id) => setProductToDelete(id);
  const cancelRemoveProduct = () => setProductToDelete(null);
  
  const confirmRemoveProduct = async () => {
    if (!productToDelete) return;
    const toastId = toast.loading('Eliminando producto...');
    try {
      await adminMenuModel.deleteProduct(productToDelete);
      toast.success('Producto eliminado', { id: toastId });
      loadData();
    } catch (error) {
      toast.error('Error al eliminar producto', { id: toastId });
    } finally {
      setProductToDelete(null);
    }
  };

  // 🔥 FIX: Lógica real para Apagar/Encender producto
  const toggleAvailability = async (id) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    const toastId = toast.loading('Actualizando estado...');
    try {
      const currentState = product.isActive !== undefined ? product.isActive : product.disponible;
      await adminMenuModel.updateProduct(id, { isActive: !currentState });
      toast.success('Estado actualizado', { id: toastId });
      loadData();
    } catch (error) {
      toast.error('Error al actualizar estado', { id: toastId });
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

  return {
    products, categories, setCategories,
    isModalOpen, isCategoryManagerOpen, setIsCategoryManagerOpen,
    categoryToEdit, setCategoryToEdit,
    categoryToDelete, requestRemoveCategory, confirmRemoveCategory, cancelRemoveCategory,
    editingProduct, openModal, closeModal: () => setIsModalOpen(false),
    saveProduct, saveCategory, handleDragEndAPI,
    
    // 🔥 Exportamos las nuevas funciones arregladas
    productToDelete, requestRemoveProduct, confirmRemoveProduct, cancelRemoveProduct,
    deleteProduct: requestRemoveProduct, // Enlazamos el botón del basurero aquí
    toggleAvailability,
    
    globalOptions, saveGlobalOption, removeGlobalOption
  };
};