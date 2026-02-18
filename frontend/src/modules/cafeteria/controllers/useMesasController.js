import { useState, useMemo } from 'react';
import { MOCK_MESAS, ZONAS } from '../models/mesasModel';

export const useMesasController = () => {
  const [zonaActiva, setZonaActiva] = useState('salon');
  const [mesas] = useState(MOCK_MESAS);

  // Filtramos las mesas según la pestaña activa
  const mesasFiltradas = useMemo(() => {
    return mesas.filter(mesa => mesa.zona === zonaActiva);
  }, [zonaActiva, mesas]);

  // Contamos cuántas hay libres y ocupadas para mostrar el resumen
  const stats = useMemo(() => {
    const ocupadas = mesas.filter(m => m.estado === 'ocupada').length;
    const libres = mesas.length - ocupadas;
    return { ocupadas, libres };
  }, [mesas]);

  return {
    zonas: ZONAS,
    zonaActiva,
    setZonaActiva,
    mesasFiltradas,
    stats
  };
};