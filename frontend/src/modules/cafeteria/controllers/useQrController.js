import { useState, useEffect } from 'react';
import client from '../../../api/client.js'; 

export const useQrController = () => {
  const [mesas, setMesas] = useState([]);
  const [zonaActiva, setZonaActiva] = useState('salon');
  const [isLoading, setIsLoading] = useState(true);

  const zonas = [
    { id: 'salon', label: 'Mesas (Salón)' },
    { id: 'llevar', label: 'Público (Para Llevar)' }
  ];

  const qrParaLlevar = {
    url: 'https://lya.menu/llevar',
    activo: true
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setIsLoading(true);
    try {
      const response = await client.get('/pos/tables');
      setMesas(response.data);
    } catch (error) {
      console.error("Error al cargar mesas:", error);
      setMesas([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Agregar sin pedir número (el backend lo calcula)
  const addMesa = async () => {
    try {
      await client.post('/pos/tables', { zone: 'salon' });
      // Recargamos toda la lista para traer el número recién calculado
      fetchTables(); 
    } catch (error) {
      console.error("Error al crear la mesa:", error);
      alert("Error al crear la mesa");
    }
  };

  // Eliminar y traer lista reordenada
  const removeMesa = async (id) => {
    if(!window.confirm("¿Eliminar mesa? Las demás se reordenarán automáticamente.")) return;
    
    try {
      // Optimizamos quitándola visualmente rápido
      setMesas(prev => prev.filter(m => m.id !== id));
      
      // Hacemos la petición de borrado al backend
      await client.delete(`/pos/tables/${id}`);
      
      // Refrescamos la lista para obtener los nuevos números re-indexados (ej. la 3 pasa a ser la 2)
      fetchTables();
    } catch (error) {
      console.error("Error al eliminar:", error);
      alert("Error al eliminar la mesa");
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