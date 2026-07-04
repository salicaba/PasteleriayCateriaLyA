// src/modules/cafeteria/controllers/useQrController.js
import { useState, useEffect } from 'react';
import client from '../../../api/client.js'; 

export const useQrController = () => {
  const [mesas, setMesas] = useState([]);
  const [zonaActiva, setZonaActiva] = useState('salon');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  
  // 🔥 NUEVO: Estados para el Kill-Switch del QR
  const [isQrActive, setIsQrActive] = useState(true);
  const [isTogglingQr, setIsTogglingQr] = useState(false);

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
    }, 3500);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      await Promise.all([fetchTables(false), fetchQrStatus()]);
      setIsLoading(false);
    };
    fetchInitialData();
  }, []);

  const fetchQrStatus = async () => {
    try {
      const res = await client.get('/settings/qr-status');
      setIsQrActive(res.data.active);
    } catch (error) {
      console.error("Error al obtener estado QR:", error);
    }
  };

  const toggleQrService = async (newStatus) => {
    setIsTogglingQr(true);
    try {
      await client.post('/settings/qr-status', { active: newStatus });
      setIsQrActive(newStatus);
      showToast(newStatus ? 'Servicio QR Encendido' : 'Servicio QR Apagado', newStatus ? 'success' : 'warning');
      return true;
    } catch (error) {
      showToast('Error al cambiar el estado', 'error');
      return false;
    } finally {
      setIsTogglingQr(false);
    }
  };

  const fetchTables = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const response = await client.get('/pos/tables');
      setMesas(response.data);
    } catch (error) {
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
      await fetchTables(false);
      showToast('Mesa agregada exitosamente');
    } catch (error) {
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
      return true; 
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al eliminar la mesa';
      showToast(errorMsg, 'error');
      return false; 
    } finally {
      setRemovingId(null);
    }
  };

  return { 
    mesas, 
    isLoading, 
    isAdding,
    removingId,
    toast,
    zonas,
    zonaActiva,
    setZonaActiva,
    qrParaLlevar,
    addMesa,
    removeMesa,
    isQrActive,
    isTogglingQr,
    toggleQrService
  };
};