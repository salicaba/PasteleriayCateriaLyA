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
  
  // NUEVO: Estado para el modal de confirmación de eliminación
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

  // NUEVAS FUNCIONES PARA EL MODAL DE ELIMINAR
  const requestRemoveCategory = (id) => {
    setCategoryToDelete(id); // Abre el modal
  };

  const cancelRemoveCategory = () => {
    setCategoryToDelete(null); // Cierra el modal
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
      setCategoryToDelete(null); // Cierra el modal al terminar
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

  const saveProduct = async (data) => {
    try {
      if (editingProduct) {
        await adminMenuModel.updateProduct(editingProduct.id, data);
      } else {
        await adminMenuModel.createProduct(data);
      }
      setIsModalOpen(false);
      loadData();
      toast.success('Producto guardado');
    } catch (error) {
      toast.error('Error al guardar producto');
    }
  };

  return {
    products, categories, setCategories,
    isModalOpen, isCategoryManagerOpen, setIsCategoryManagerOpen,
    categoryToEdit, setCategoryToEdit,
    categoryToDelete, requestRemoveCategory, confirmRemoveCategory, cancelRemoveCategory, // Exponemos el nuevo modal
    editingProduct, openModal, closeModal: () => setIsModalOpen(false),
    saveProduct, saveCategory, handleDragEndAPI,
    deleteProduct: async (id) => { /* tu logica de delete de productos */ },
    toggleAvailability: (id) => { /* tu logica de toggle de productos */ }
  };
};