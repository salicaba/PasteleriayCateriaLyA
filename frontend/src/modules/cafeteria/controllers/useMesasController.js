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

  // Cambiar de Mesa o Unir Cuentas
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

  // Pago Parcial (Separar cuenta)
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

  // NUEVO: Función para crear un nuevo ticket para llevar con NOMBRE
  const nuevoPedidoLlevar = useCallback((nombreCliente) => {
    const pedidosLlevar = mesas.filter(m => m.zona === 'llevar');
    const nuevoId = Math.max(...mesas.map(m => m.id), 100) + 1;
    
    // Generamos el número secuencial (ej. 01, 02)
    const secuencial = String(pedidosLlevar.length + 1).padStart(2, '0');
    
    // Si pasaron un nombre, lo concatenamos, si no, lo dejamos solo como L-XX
    const nuevoNumero = nombreCliente && nombreCliente.trim() !== '' 
          ? `L-${secuencial} - ${nombreCliente.trim()}` 
          : `L-${secuencial}`;
    
    const nuevoPedido = {
      id: nuevoId,
      numero: nuevoNumero,
      zona: 'llevar',
      // CORRECCIÓN CLAVE: Debe nacer como 'ocupada' para que sea un ticket activo y no desaparezca
      estado: 'ocupada', 
      total: 0,
      horaInicio: new Date().toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'}),
      personas: 1
    };

    setMesas(prev => [...prev, nuevoPedido]);
    
    return nuevoPedido; // Retornamos para abrir el modal
  }, [mesas]);

  // UN SOLO RETURN AL FINAL CON TODAS LAS FUNCIONES EXPORTADAS
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