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
        ? { 
            ...m, 
            estado: 'ocupada', 
            total: (m.total || 0) + montoVenta,
            horaInicio: m.horaInicio || new Date().toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'}) 
          }
        : m
    ));
  }, []);

  // Liberar mesa (Resetear)
  const liberarMesa = useCallback((mesaId) => {
    setMesas(prev => prev.map(m => 
      m.id === mesaId
        ? { ...m, estado: 'libre', total: 0, horaInicio: null } 
        : m
    ));
  }, []);

  // NUEVO: Cambiar de Mesa o Unir Cuentas
  const unirMesas = useCallback((origenId, destinoId) => {
    setMesas(prev => {
      const origen = prev.find(m => m.id === origenId);
      if(!origen) return prev;
      
      return prev.map(m => {
        if (m.id === destinoId) {
          // Si el destino estaba libre, hereda la hora de inicio de la mesa origen
          return { 
             ...m, 
             estado: 'ocupada', 
             total: (m.total || 0) + (origen.total || 0),
             horaInicio: m.estado === 'libre' ? origen.horaInicio : m.horaInicio
          };
        }
        if (m.id === origenId) {
          // La mesa original se resetea
          return { ...m, estado: 'libre', total: 0, horaInicio: null, personas: 0 };
        }
        return m;
      });
    });
  }, []);

  // NUEVO: Pago Parcial (Separar cuenta)
  const pagoParcialMesa = useCallback((mesaId, montoPagado) => {
    setMesas(prev => prev.map(m => {
      if (m.id === mesaId) {
        const nuevoTotal = Math.max((m.total || 0) - montoPagado, 0);
        return {
          ...m,
          total: nuevoTotal,
          estado: nuevoTotal === 0 ? 'libre' : 'ocupada',
          horaInicio: nuevoTotal === 0 ? null : m.horaInicio
        };
      }
      return m;
    }));
  }, []);

  return {
    zonas: ZONAS,
    zonaActiva,
    setZonaActiva,
    mesasFiltradas,
    stats,
    actualizarEstadoMesa,
    liberarMesa,
    unirMesas,        // Exportamos la función
    pagoParcialMesa   // Exportamos la función
  };
};