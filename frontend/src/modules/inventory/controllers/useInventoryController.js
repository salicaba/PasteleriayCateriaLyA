import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const useInventoryController = () => {
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para el Kardex Global
  const [globalKardex, setGlobalKardex] = useState([]);
  const [globalKpiSpent, setGlobalKpiSpent] = useState(0);
  const [globalKpiOut, setGlobalKpiOut] = useState(0); // 🔥 NUEVO ESTADO
  const [isKardexLoading, setIsKardexLoading] = useState(false);

  // 🔥 SOLUCIÓN: Función maestra para garantizar que TODAS las peticiones lleven el Token de 24h
  const getAuthHeaders = () => {
    let token = localStorage.getItem('lya_token');
    const sessionStr = localStorage.getItem('lya_pos_session');
    
    if (sessionStr && !token) {
      const sessionData = JSON.parse(sessionStr);
      token = sessionData.userData?.token;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  };

  const getUserIdFromSession = () => {
    const sessionStr = localStorage.getItem('lya_pos_session');
    if (sessionStr) {
      return JSON.parse(sessionStr).userData?.id || null;
    }
    return null;
  };

  // 1. Obtener el catálogo de inventario
  const fetchInventory = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true); 
    try {
      const response = await fetch(`${API_URL}/inventory`, {
        headers: getAuthHeaders() // Inyectamos Header
      });
      if (!response.ok) throw new Error('Error al cargar el inventario');
      const data = await response.json();
      setInventory(data);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      if (!silent) setIsLoading(false);
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
        headers: getAuthHeaders(), // Inyectamos Header
        body: JSON.stringify(itemData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear el insumo');
      }
      await fetchInventory(true); 
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // 3. Obtener historial (Kardex) de un insumo específico
  const getItemHistory = async (itemId) => {
    try {
      const response = await fetch(`${API_URL}/inventory/${itemId}/history`, {
        headers: getAuthHeaders() // Inyectamos Header
      });
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
      const userId = getUserIdFromSession();

      const response = await fetch(`${API_URL}/inventory/transaction`, {
        method: 'POST',
        headers: getAuthHeaders(), // Inyectamos Header
        body: JSON.stringify({ ...transactionData, userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al registrar el movimiento');
      }
      
      await fetchInventory(true); 
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
        headers: getAuthHeaders() // Inyectamos Header
      });
      if (!response.ok) throw new Error('Error al eliminar el insumo');
      
      await fetchInventory(true); 
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  // 6. PROCESAR ARQUEO
  const processReconciliation = async (itemsCounted, notes = '', customDate = null) => {
    try {
      const sessionStr = localStorage.getItem('lya_pos_session');
      let token = localStorage.getItem('lya_token'); 
      let userId = null;
      
      if (sessionStr) {
        const sessionData = JSON.parse(sessionStr);
        userId = sessionData.userData?.id;
        if (!token && sessionData.userData?.token) {
          token = sessionData.userData.token;
        }
      }

      if (!token) {
        throw new Error('Token de seguridad ausente. Por favor, cierra sesión y vuelve a iniciarla.');
      }

      const response = await fetch(`${API_URL}/inventory/reconciliation`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          items: itemsCounted, 
          notes, 
          userId, 
          date: customDate // Inyectamos la fecha elegida
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al procesar el arqueo');
      }
      
      const data = await response.json();
      await fetchInventory(true); 
      return data;
    } catch (err) {
      console.error('Error procesando arqueo:', err);
      setError(err.message);
      throw err; 
    }
  };

  // 7. OBTENER KARDEX GLOBAL POR FECHAS
  const fetchGlobalKardex = useCallback(async (startDate, endDate) => {
    setIsKardexLoading(true);
    const minLoadTime = new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      let queryParams = '';
      if (startDate && endDate) {
        queryParams = `?startDate=${startDate}&endDate=${endDate}`;
      }
      
      const response = await fetch(`${API_URL}/inventory/history/global${queryParams}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Error al cargar el Kardex global');
      
      const data = await response.json();
      setGlobalKardex(data.transactions || []);
      setGlobalKpiSpent(data.totalSpent || 0);
      setGlobalKpiOut(data.totalOut || 0); // 🔥 ATRAPAMOS EL NUEVO DATO
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      await minLoadTime;
      setIsKardexLoading(false);
    }
  }, []);

  return { 
    inventory, 
    isLoading, 
    error, 
    fetchInventory, 
    createItem,
    getItemHistory,
    registerTransaction,
    deleteItem,
    processReconciliation,
    globalKardex,
    globalKpiSpent,
    globalKpiOut, // 🔥 LO EXPORTAMOS
    isKardexLoading,
    fetchGlobalKardex
  };
};