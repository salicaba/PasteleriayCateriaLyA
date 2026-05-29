import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const useInventoryController = () => {
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Obtener el catálogo de inventario
  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/inventory`);
      if (!response.ok) throw new Error('Error al cargar el inventario');
      const data = await response.json();
      setInventory(data);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // 2. Crear un nuevo insumo
  const createItem = async (itemData) => {
    try {
      const response = await fetch(`${API_URL}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear el insumo');
      }
      await fetchInventory(); 
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // 3. Obtener historial (Kardex) de un insumo
  const getItemHistory = async (itemId) => {
    try {
      const response = await fetch(`${API_URL}/inventory/${itemId}/history`);
      if (!response.ok) throw new Error('Error al obtener el historial');
      return await response.json();
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  // 4. Registrar una transacción (Entrada o Merma)
  const registerTransaction = async (transactionData) => {
    try {
      // Obtenemos el ID del usuario activo para la auditoría
      const session = localStorage.getItem('lya_pos_session');
      let userId = null;
      if (session) {
        userId = JSON.parse(session).userData?.id;
      }

      const response = await fetch(`${API_URL}/inventory/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...transactionData, userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al registrar el movimiento');
      }
      
      await fetchInventory(); // Refrescar el catálogo general
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // 5. Eliminar insumo (Soft Delete)
  const deleteItem = async (itemId) => {
    try {
      const response = await fetch(`${API_URL}/inventory/${itemId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Error al eliminar el insumo');
      
      await fetchInventory(); // Recargamos la tabla para que desaparezca
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  return { 
    inventory, 
    isLoading, 
    error, 
    fetchInventory, 
    createItem,
    getItemHistory,
    registerTransaction,
    deleteItem 
  };
};