// src/modules/admin/controllers/useMenuManagerController.js
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { adminMenuModel } from '../models/adminMenuModel';

export const useMenuManagerController = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [categoryToEdit, setCategoryToEdit] = useState(null); 
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [fetchedCategories, fetchedProducts] = await Promise.all([
        adminMenuModel.getCategories(),
        adminMenuModel.getProducts()
      ]);
      setCategories(fetchedCategories);
      setProducts(fetchedProducts);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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

  const requestRemoveCategory = (id) => {
    setCategoryToDelete(id);
  };

  const cancelRemoveCategory = () => {
    setCategoryToDelete(null);
  };

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

  const openModal = (product = null) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  // 🚀 LÓGICA DE CLOUDINARY INTEGRADA AQUÍ
  const saveProduct = async (data) => {
    const toastId = toast.loading('Procesando producto...');
    
    try {
      let finalImageUrl = data.imageUrl;

      // 1. Detectar si la imagen es un recorte nuevo (empieza con 'data:image')
      if (finalImageUrl && finalImageUrl.startsWith('data:image')) {
        toast.loading('Subiendo imagen a la nube...', { id: toastId });
        
        // 2. Preparar el paquete para Cloudinary
        const formData = new FormData();
        formData.append('file', finalImageUrl);
        // Usamos variables de entorno de Vite para mayor seguridad
        formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET); 
        
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        
        // 3. Disparar a la API de Cloudinary
        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData
        });

        const cloudData = await cloudRes.json();
        
        if (!cloudRes.ok) throw new Error(cloudData.error?.message || 'Error al subir imagen a Cloudinary');
        
        // 4. Capturar la URL segura devuelta por la nube
        finalImageUrl = cloudData.secure_url;
      }

      // 5. Armar el payload para tu modelo Hexagonal
      const payload = { ...data, imageUrl: finalImageUrl };

      toast.loading('Guardando en base de datos...', { id: toastId });

      // 6. Ejecutar la llamada a tu Node/MySQL
      if (editingProduct) {
        await adminMenuModel.updateProduct(editingProduct.id, payload);
      } else {
        await adminMenuModel.createProduct(payload);
      }
      
      setIsModalOpen(false);
      loadData();
      toast.success('Producto guardado con éxito', { id: toastId });
    } catch (error) {
      console.error("Error en flujo de guardado:", error);
      toast.error('Ocurrió un error al guardar', { id: toastId });
    }
  };

  return {
    products, categories, setCategories,
    isModalOpen, isCategoryManagerOpen, setIsCategoryManagerOpen,
    categoryToEdit, setCategoryToEdit,
    categoryToDelete, requestRemoveCategory, confirmRemoveCategory, cancelRemoveCategory,
    editingProduct, openModal, closeModal: () => setIsModalOpen(false),
    saveProduct, saveCategory, handleDragEndAPI,
    deleteProduct: async (id) => { /* tu logica de delete de productos */ },
    toggleAvailability: (id) => { /* tu logica de toggle de productos */ }
  };
};