// frontend/src/modules/cafeteria/controllers/useMesasController.js
import { useState, useMemo, useEffect, useCallback } from 'react';
import { fetchActiveOrders } from '../models/mesasModel.js';
import client from '../../../api/client.js';

export const useMesasController = () => {
  const [mesas, setMesas] = useState([]);
  const [zonaActiva, setZonaActiva] = useState('salon');
  const [isLoading, setIsLoading] = useState(true);

  const zonas = [ { id: 'salon', label: 'Salón' }, { id: 'llevar', label: 'Para Llevar' } ];

  const loadMesas = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tablesRes, orders] = await Promise.all([client.get('/pos/tables'), fetchActiveOrders()]);
      const catalog = tablesRes.data;
      const activeOrders = orders || [];

      const mergedMesas = catalog.map(table => {
        const order = activeOrders.find(o => o.tableId === table.id);
        
        let cuentasActivas = 0;
        if (order && order.items?.length > 0) {
          const cuentasSet = new Set();
          order.items.forEach(item => cuentasSet.add(item.cuenta || 'General'));
          if (order.paidAccounts) order.paidAccounts.forEach(acc => cuentasSet.add(acc));
          cuentasActivas = cuentasSet.size || 1;
        }

        return {
          id: table.id, numero: table.number, zona: table.zone, estado: order ? 'ocupada' : 'libre',
          total: order ? Number(order.totalAmount) : 0, orderId: order ? order.id : null,
          items: order ? order.items : [], horaInicio: order ? order.createdAt : null,
          cuentasActivas: order ? cuentasActivas : 0, orderStatus: order ? order.status : 'OPEN', paidAccounts: order ? order.paidAccounts : []
        };
      });

      const paraLlevarOrders = activeOrders.filter(o => o.orderType === 'LLEVAR').map(o => {
          const cuentasSet = new Set(['General']);
          o.items?.forEach(item => cuentasSet.add(item.cuenta || 'General'));
          if (o.paidAccounts) o.paidAccounts.forEach(acc => cuentasSet.add(acc));
          
          return {
            id: o.id, numero: o.ticketId || 'Sin Nombre', zona: 'llevar', estado: 'ocupada', total: Number(o.totalAmount) || 0,
            orderId: o.id, items: o.items || [], horaInicio: o.createdAt || null,
            cuentasActivas: cuentasSet.size, orderStatus: o.status, paidAccounts: o.paidAccounts || []
          };
        });
      
      setMesas([...mergedMesas, ...paraLlevarOrders]);
    } catch (error) { console.error("Error al sincronizar:", error); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadMesas(); }, [loadMesas]);

  const mesasFiltradas = useMemo(() => mesas.filter(m => m.zona === zonaActiva), [mesas, zonaActiva]);
  const stats = useMemo(() => { const salon = mesas.filter(m => m.zona === 'salon'); return { ocupadas: salon.filter(m => m.estado === 'ocupada').length, libres: salon.filter(m => m.estado === 'libre').length }; }, [mesas]);

  const nuevoPedidoLlevar = async (nombreCliente) => {
    try {
      const res = await client.post('/pos/orders', { orderType: 'LLEVAR', ticketId: nombreCliente, tableId: null });
      await loadMesas();
      return { id: res.data.order.id, numero: res.data.order.ticketId, zona: 'llevar', estado: 'ocupada', total: 0, orderId: res.data.order.id, items: [], cuentasActivas: 1, orderStatus: 'OPEN', paidAccounts: [] };
    } catch (error) { return null; }
  };

  return { mesasFiltradas, stats, zonas, zonaActiva, setZonaActiva, refresh: loadMesas, liberarMesa: loadMesas, actualizarEstadoMesa: loadMesas, pagoParcialMesa: loadMesas, nuevoPedidoLlevar };
};