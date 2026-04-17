import { useState, useMemo, useCallback } from 'react';
import { MOCK_MESAS, ZONAS } from '../models/mesasModel';

export const useMesasController = () => {
  const [mesas, setMesas] = useState(MOCK_MESAS);
  const [zonaActiva, setZonaActiva] = useState('salon');

  const mesasFiltradas = useMemo(() => {
    return mesas.filter(mesa => mesa.zona === zonaActiva);
  }, [zonaActiva, mesas]);

  // CORRECCIÓN: Filtrar estadísticas solo para las mesas físicas del salón
  const stats = useMemo(() => {
    const mesasSalon = mesas.filter(m => m.zona === 'salon');
    const ocupadas = mesasSalon.filter(m => m.estado === 'ocupada').length;
    const libres = mesasSalon.length - ocupadas;
    return { ocupadas, libres };
  }, [mesas]);

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

  const liberarMesa = useCallback((mesaId) => {
    setMesas(prev => prev.map(m => 
      m.id === mesaId
        ? { ...m, estado: 'libre', total: 0, horaInicio: null } 
        : m
    ));
  }, []);

  const unirMesas = useCallback((origenId, destinoId) => {
    setMesas(prev => {
      const origen = prev.find(m => m.id === origenId);
      if(!origen) return prev;
      
      return prev.map(m => {
        if (m.id === destinoId) {
          return { 
             ...m, 
             estado: 'ocupada', 
             total: (m.total || 0) + (origen.total || 0),
             horaInicio: m.estado === 'libre' ? origen.horaInicio : m.horaInicio
          };
        }
        if (m.id === origenId) {
          return { ...m, estado: 'libre', total: 0, horaInicio: null, personas: 0 };
        }
        return m;
      });
    });
  }, []);

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

  const nuevoPedidoLlevar = useCallback((nombreCliente) => {
    const pedidosLlevar = mesas.filter(m => m.zona === 'llevar');
    const nuevoId = Math.max(...mesas.map(m => m.id), 100) + 1;
    
    const secuencial = String(pedidosLlevar.length + 1).padStart(2, '0');
    
    const nuevoNumero = nombreCliente && nombreCliente.trim() !== '' 
          ? `L-${secuencial} - ${nombreCliente.trim()}` 
          : `L-${secuencial}`;
    
    const nuevoPedido = {
      id: nuevoId,
      numero: nuevoNumero,
      zona: 'llevar',
      estado: 'ocupada', 
      total: 0,
      horaInicio: new Date().toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'}),
      personas: 1
    };

    setMesas(prev => [...prev, nuevoPedido]);
    
    return nuevoPedido;
  }, [mesas]);

  return {
    zonas: ZONAS,
    zonaActiva,
    setZonaActiva,
    mesasFiltradas,
    stats,
    actualizarEstadoMesa,
    liberarMesa,
    unirMesas,
    pagoParcialMesa,
    nuevoPedidoLlevar 
  };
};