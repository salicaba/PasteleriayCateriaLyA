// src/modules/cafeteria/controllers/useQrController.js
import { useState, useEffect } from 'react';
import client from '../../../api/client.js'; 

export const useQrController = () => {
  const [mesas, setMesas] = useState([]);
  const [zonaActiva, setZonaActiva] = useState('salon');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const zonas = [
    { id: 'salon', label: 'Mesas (Salón)' },
    { id: 'llevar', label: 'Público (Para Llevar)' }
  ];

  const qrParaLlevar = {
    url: 'https://lya.menu/llevar',
    activo: true
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  useEffect(() => {
    fetchTables(true);
  }, []);

  const fetchTables = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const response = await client.get('/pos/tables');
      setMesas(response.data);
    } catch (error) {
      console.error("Error al cargar mesas:", error);
      showToast('Error al sincronizar las mesas', 'error');
      setMesas([]);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  const addMesa = async () => {
    setIsAdding(true);
    try {
      await client.post('/pos/tables', { zone: 'salon' });
      await fetchTables(false); // Esperamos a que el servidor cree y devuelva los números
      showToast('Mesa agregada exitosamente');
    } catch (error) {
      console.error("Error al crear la mesa:", error);
      showToast('No se pudo crear la mesa', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const removeMesa = async (id) => {
    setRemovingId(id);
    try {
      await client.delete(`/pos/tables/${id}`);
      
      await fetchTables(false); 
      showToast('Mesa eliminada correctamente');
      return true; // Éxito: avisamos a la vista para que cierre el modal
    } catch (error) {
      console.error("Error al eliminar:", error);
      
      // 🔥 AQUÍ ESTÁ LA MAGIA: Extraemos el mensaje de protección del backend 
      // Si el backend mandó mensaje lo usamos, sino usamos uno genérico
      const errorMsg = error.response?.data?.message || 'Error al eliminar la mesa';
      
      // Mandamos llamar a la cápsula de error
      showToast(errorMsg, 'error');
      
      return false; // Fallo: la vista no cerrará el modal
    } finally {
      setRemovingId(null);
    }
  };

  const generarQR = async (mesaId) => {
    console.log(`Generando QR para mesa ${mesaId}`);
  };

  const revocarQR = async (mesaId) => {
    console.log(`Revocando QR para mesa ${mesaId}`);
  };

  return { 
    mesas, 
    isLoading, 
    isAdding,
    removingId,
    toast,
    generarQR, 
    revocarQR,
    zonas,
    zonaActiva,
    setZonaActiva,
    qrParaLlevar,
    addMesa,
    removeMesa
  };
};