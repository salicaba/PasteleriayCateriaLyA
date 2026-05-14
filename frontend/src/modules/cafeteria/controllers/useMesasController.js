// frontend/src/modules/cafeteria/controllers/useMesasController.js
import { useState, useMemo, useEffect } from 'react';
import { fetchActiveOrders } from '../models/mesasModel.js';
import client from '../../../api/client.js';

export const useMesasController = () => {
  const [mesas, setMesas] = useState([]); // Aquí guardaremos el cruce de Catálogo + Órdenes
  const [zonaActiva, setZonaActiva] = useState('salon');
  const [isLoading, setIsLoading] = useState(true);

  const zonas = [
    { id: 'salon', label: 'Salón' },
    { id: 'llevar', label: 'Para Llevar' }
  ];

  // 1. Cargar Catálogo de Mesas y Órdenes Activas desde MySQL
  const loadMesas = async () => {
    setIsLoading(true);
    try {
      // Ejecutamos ambas peticiones en paralelo para mayor velocidad
      const [tablesRes, orders] = await Promise.all([
        client.get('/pos/tables'),
        fetchActiveOrders()
      ]);

      const catalog = tablesRes.data;
      const activeOrders = orders || [];

      // Cruzamos los datos de las mesas del salón
      const mergedMesas = catalog.map(table => {
        const order = activeOrders.find(o => o.tableId === table.id);
        return {
          id: table.id,
          numero: table.number, // Número de mesa (String)
          zona: table.zone,
          estado: order ? 'ocupada' : 'libre',
          total: order ? order.totalAmount : 0, // Usamos totalAmount del modelo
          orderId: order ? order.id : null,
          items: order ? order.items : [],
          horaInicio: order ? order.createdAt : null
        };
      });

      // CORRECCIÓN: Filtramos por orderType y construimos la estructura que pide PosModal
      const paraLlevarOrders = activeOrders
        .filter(o => o.orderType === 'LLEVAR')
        .map(o => ({
          id: o.id, 
          numero: o.ticketId || 'Sin Nombre', // Para que split(' - ') no falle
          zona: 'llevar',
          estado: 'ocupada',
          total: o.totalAmount || 0,
          orderId: o.id,
          items: o.items || [],
          horaInicio: o.createdAt || null
        }));
      
      setMesas([...mergedMesas, ...paraLlevarOrders]);
    } catch (error) {
      console.error("Error al sincronizar mesas y órdenes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMesas();
  }, []);

  // 2. Filtrar por zona (Salón o Llevar)
  const mesasFiltradas = useMemo(() => {
    return mesas.filter(mesa => mesa.zona === zonaActiva);
  }, [mesas, zonaActiva]);

  // 3. Estadísticas dinámicas reales
  const stats = useMemo(() => {
    const salonMesas = mesas.filter(m => m.zona === 'salon');
    const ocupadas = salonMesas.filter(m => m.estado === 'ocupada').length;
    const libres = salonMesas.filter(m => m.estado === 'libre').length;
    return { ocupadas, libres };
  }, [mesas]);

  // 4. Acciones del POS
  const liberarMesa = async (id) => {
    console.log("Cerrando cuenta y liberando mesa:", id);
    await loadMesas(); // Recargamos para ver los cambios
  };

  const nuevoPedidoLlevar = async (nombreCliente) => {
    try {
      const res = await client.post('/pos/orders', {
        orderType: 'LLEVAR',
        ticketId: nombreCliente,
        tableId: null
      });
      
      await loadMesas();
      
      // CORRECCIÓN: Devolvemos el formato exacto de objeto para que PosModal lo lea bien inmediatamente
      const orderDb = res.data.order;
      return {
        id: orderDb.id,
        numero: orderDb.ticketId, // El identificador que acabamos de crear
        zona: 'llevar',
        estado: 'ocupada',
        total: 0,
        orderId: orderDb.id,
        items: []
      };
    } catch (error) {
      console.error("Error al crear pedido para llevar:", error);
      return null;
    }
  };

  const actualizarEstadoMesa = (id, monto) => console.log("Actualizando monto mesa:", id, monto);
  const unirMesas = (origen, destino) => console.log("Uniendo mesas:", origen, destino);
  const pagoParcialMesa = (id, monto) => console.log("Procesando pago parcial:", id, monto);

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
    nuevoPedidoLlevar,
    refresh: loadMesas
  };
};