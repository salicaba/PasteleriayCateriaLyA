// src/modules/cafeteria/controllers/useMesasController.js
import { useState, useMemo, useEffect, useCallback } from 'react';
import { fetchActiveOrders } from '../models/mesasModel.js';
import client from '../../../api/client.js';

export const useMesasController = () => {
  const [mesas, setMesas] = useState([]);
  const [zonaActiva, setZonaActiva] = useState('salon');
  const [isLoading, setIsLoading] = useState(true);

  const zonas = [ { id: 'salon', label: 'Salón' }, { id: 'llevar', label: 'Para Llevar' } ];

  const loadMesas = useCallback(async () => {
    try {
      const [tablesRes, activeOrders] = await Promise.all([
        client.get('/pos/tables'), 
        fetchActiveOrders()
      ]);
      
      const catalog = tablesRes.data || [];
      // Ordenamos las órdenes por fecha de creación para que el número sea correlativo
      const orders = (activeOrders || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      const mergedMesas = catalog.map(table => {
        // Enlaza la orden con la mesa usando el tableId nativo
        const order = orders.find(o => o.tableId === table.id);
        
        let cuentasActivas = 0;
        if (order) {
          const cuentasSet = new Set(['General']);
          if (order.items) order.items.forEach(item => cuentasSet.add(item.cuenta || 'General'));
          if (order.paidAccounts) order.paidAccounts.forEach(acc => cuentasSet.add(acc));
          cuentasActivas = cuentasSet.size;
        }

        return {
          id: table.id, 
          numero: table.number, 
          zona: table.zone, 
          estado: order ? 'ocupada' : 'libre',
          total: order ? Number(order.totalAmount) : 0, 
          orderId: order ? order.id : null,
          items: order ? order.items : [], 
          horaInicio: order ? order.createdAt : null,
          cuentasActivas: order ? cuentasActivas : 0, 
          orderStatus: order ? order.status : 'OPEN', 
          paidAccounts: order ? order.paidAccounts : []
        };
      });

      // 🔥 CORRECCIÓN: Garantizamos que TODOS los pedidos digan "Llevar #"
      const paraLlevarOrders = orders.filter(o => o.orderType === 'LLEVAR').map((o, index) => {
          const cuentasSet = new Set(['General']);
          if (o.items) o.items.forEach(item => cuentasSet.add(item.cuenta || 'General'));
          if (o.paidAccounts) o.paidAccounts.forEach(acc => cuentasSet.add(acc));
          
          const rawTicketId = o.ticketId || 'Sin Nombre';
          
          // Red de seguridad: Si el ticket ya trae "Llevar", lo dejamos. Si no, se lo forzamos.
          const numeroFinal = rawTicketId.toLowerCase().includes('llevar') 
               ? rawTicketId 
               : `Llevar #${index + 1} - ${rawTicketId}`;
          
          return {
            id: o.id, 
            identificadorLlevar: index + 1,
            cliente: numeroFinal, 
            numero: numeroFinal, 
            zona: 'llevar', 
            estado: 'ocupada', 
            total: Number(o.totalAmount) || 0,
            orderId: o.id, 
            items: o.items || [], 
            horaInicio: o.createdAt || null,
            cuentasActivas: cuentasSet.size, 
            orderStatus: o.status, 
            paidAccounts: o.paidAccounts || []
          };
        });
      
      setMesas([...mergedMesas, ...paraLlevarOrders]);
    } catch (error) { 
      console.error("Error al sincronizar mesas:", error); 
    } finally { 
      setIsLoading(false); 
    }
  }, []);

  // Recarga silenciosa en segundo plano (Polling)
  useEffect(() => { 
    loadMesas(); 
    const intervalId = setInterval(loadMesas, 3000);
    return () => clearInterval(intervalId);
  }, [loadMesas]);

  const mesasFiltradas = useMemo(() => mesas.filter(m => m.zona === zonaActiva), [mesas, zonaActiva]);
  
  const stats = useMemo(() => { 
    const salon = mesas.filter(m => m.zona === 'salon'); 
    return { 
      ocupadas: salon.filter(m => m.estado === 'ocupada').length, 
      libres: salon.filter(m => m.estado === 'libre').length 
    }; 
  }, [mesas]);

  const nuevoPedidoLlevar = async (nombreCliente, telefono) => {
    try {
      const currentOrders = await fetchActiveOrders();
      const llevarOrdersCount = (currentOrders || []).filter(o => o.orderType === 'LLEVAR').length;
      const nextNumber = llevarOrdersCount + 1;

      let formattedTicketId = `Llevar #${nextNumber} - ${nombreCliente}`;
      if (telefono && telefono.trim() !== '') {
          formattedTicketId += ` - ${telefono}`;
      }

      const res = await client.post('/pos/orders', { 
          orderType: 'LLEVAR', 
          ticketId: formattedTicketId, 
          tableId: null 
      });

      await loadMesas();
      
      return { 
        id: res.data.order.id, 
        numero: res.data.order.ticketId, 
        zona: 'llevar', 
        estado: 'ocupada', 
        total: 0, 
        orderId: res.data.order.id, 
        items: [], 
        cuentasActivas: 1, 
        orderStatus: 'OPEN', 
        paidAccounts: [] 
      };
    } catch (error) { 
        console.error("Error al crear pedido para llevar", error);
        return null; 
    }
  };

  return { 
    mesasFiltradas, stats, zonas, zonaActiva, setZonaActiva, 
    refresh: loadMesas, liberarMesa: loadMesas, 
    actualizarEstadoMesa: loadMesas, pagoParcialMesa: loadMesas, 
    nuevoPedidoLlevar, isLoading 
  };
};