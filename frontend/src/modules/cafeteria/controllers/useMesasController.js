import { useState, useMemo, useCallback } from 'react';
import { MOCK_MESAS, ZONAS } from '../models/mesasModel';

export const useMesasController = () => {
  const [mesas, setMesas] = useState(MOCK_MESAS);
  const [zonaActiva, setZonaActiva] = useState('salon');

  const mesasFiltradas = useMemo(() => {
    return mesas.filter(mesa => mesa.zona === zonaActiva);
  }, [zonaActiva, mesas]);

  const stats = useMemo(() => {
    const ocupadas = mesas.filter(m => m.estado === 'ocupada').length;
    const libres = mesas.length - ocupadas;
    return { ocupadas, libres };
  }, [mesas]);

  // Actualizar estado (Ocupar / Agregar venta)
  const actualizarEstadoMesa = useCallback((mesaId, montoVenta) => {
    setMesas(prev => prev.map(m => 
      m.id === mesaId 
        ? { ...m, estado: 'ocupada', total: (m.total || 0) + montoVenta }
        : m
    ));
  }, []);

  // NUEVO: Liberar mesa (Resetear)
  const liberarMesa = useCallback((mesaId) => {
    setMesas(prev => prev.map(m => 
      m.id === mesaId
        ? { ...m, estado: 'libre', total: 0 } // Reseteamos estado y total
        : m
    ));
  }, []);

  return {
    zonas: ZONAS,
    zonaActiva,
    setZonaActiva,
    mesasFiltradas,
    stats,
    actualizarEstadoMesa,
    liberarMesa // Exportamos la nueva función
  };
};