import { useState, useCallback } from 'react';
import { MOCK_ADMIN_PRODUCTS, MOCK_CATEGORIES } from '../models/adminMenuModel';

export const useMenuManagerController = () => {
  const [products, setProducts] = useState(MOCK_ADMIN_PRODUCTS);
  const [categories] = useState(MOCK_CATEGORIES);
  
  // Estado para el Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Apagar/Encender producto (Sold Out)
  const toggleAvailability = useCallback((productId) => {
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, disponible: !p.disponible } : p
    ));
  }, []);

  // Eliminar producto
  const deleteProduct = useCallback((productId) => {
    if(window.confirm('¿Estás seguro de eliminar este producto del menú?')) {
      setProducts(prev => prev.filter(p => p.id !== productId));
    }
  }, []);

  // Abrir modal para crear o editar
  const openModal = useCallback((product = null) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setEditingProduct(null);
    setIsModalOpen(false);
  }, []);

  // Guardar producto (Crear o Actualizar)
  const saveProduct = useCallback((productData) => {
    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...productData } : p));
    } else {
      const newProduct = {
        ...productData,
        id: `prod-${Date.now()}`,
        disponible: true
      };
      setProducts(prev => [newProduct, ...prev]);
    }
    closeModal();
  }, [editingProduct, closeModal]);

  return {
    products,
    categories,
    isModalOpen,
    editingProduct,
    toggleAvailability,
    deleteProduct,
    openModal,
    closeModal,
    saveProduct
  };
};