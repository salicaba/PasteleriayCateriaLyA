import { useState, useMemo, useEffect } from 'react';
import { fetchActiveOrders } from '../models/mesasModel.js';

export const useMesasController = () => {
  const [mesas, setMesas] = useState([]);
  const [zonaActiva, setZonaActiva] = useState('salon');
  const [isLoading, setIsLoading] = useState(true);

  // Lista de zonas (para que tu barra superior funcione)
  const zonas = [
    { id: 'salon', label: 'Salón' },
    { id: 'llevar', label: 'Para Llevar' }
  ];

  // 1. Cargar datos desde MySQL
  const loadMesas = async () => {
    setIsLoading(true);
    try {
      const activeOrders = await fetchActiveOrders() || [];
      setMesas(activeOrders);
    } catch (error) {
      console.error("Error al cargar las mesas:", error);
      setMesas([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMesas();
  }, []);

  // 2. Filtrar mesas según la pestaña seleccionada (Salón o Llevar)
  const mesasFiltradas = useMemo(() => {
    return mesas.filter(mesa => mesa.zona === zonaActiva);
  }, [mesas, zonaActiva]);

  // 3. Calcular estadísticas para los "badges" naranjas y verdes
  const stats = useMemo(() => {
    const ocupadas = mesas.filter(m => m.zona === 'salon' && m.estado !== 'libre').length;
    const libres = 15 - ocupadas; // Asumiendo que tienes 15 mesas físicas
    return { ocupadas, libres: libres > 0 ? libres : 0 };
  }, [mesas]);

  // 4. Funciones "fantasma" temporales
  // Tu pantalla necesita estas funciones para no lanzar error al hacer clic en los botones.
  // Más adelante las conectaremos a tu API real para cobrar y liberar mesas.
  const liberarMesa = (id) => console.log("Pendiente: Liberar mesa en BD", id);
  const actualizarEstadoMesa = (id, monto) => console.log("Pendiente: Actualizar", id, monto);
  const unirMesas = (origen, destino) => console.log("Pendiente: Unir", origen, destino);
  const pagoParcialMesa = (id, monto) => console.log("Pendiente: Pago parcial", id, monto);
  const nuevoPedidoLlevar = (cliente) => {
     console.log("Pendiente: Crear orden para", cliente);
     return null; 
  };

  // 5. Devolver EXACTAMENTE lo que MesasPage.jsx está pidiendo en su línea 10
  return {
    mesasFiltradas,
    stats,
    liberarMesa,
    actualizarEstadoMesa,
    unirMesas,
    pagoParcialMesa,
    zonas,
    zonaActiva,
    setZonaActiva,
    nuevoPedidoLlevar
  };
};