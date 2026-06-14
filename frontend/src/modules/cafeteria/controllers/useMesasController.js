// src/modules/cafeteria/controllers/useMesasController.js
import { useState, useMemo, useEffect, useCallback } from 'react';
import { fetchActiveOrders } from '../models/mesasModel.js';
import client from '../../../api/client.js';
import { socket } from '../../../api/socket.js'; 

export const useMesasController = () => {
  const [mesas, setMesas] = useState([]);
  const [zonaActiva, setZonaActiva] = useState('salon');
  const [isLoading, setIsLoading] = useState(true);

  const zonas = [ 
    { id: 'salon', label: 'Salón' }, 
    { id: 'llevar', label: 'Para Llevar' },
    { id: 'vitrina', label: 'Mostrador' }
  ];

  const loadMesas = useCallback(async () => {
    try {
      const [tablesRes, activeOrders] = await Promise.all([
        client.get('/pos/tables'), 
        fetchActiveOrders()
      ]);
      
      const catalog = tablesRes.data || [];
      const orders = (activeOrders || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      const mergedMesas = catalog.map(table => {
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

      let indexLlevar = 1;
      const paraLlevarOrders = orders.filter(o => o.orderType === 'LLEVAR').map(o => {
          const cuentasSet = new Set(['General']);
          if (o.items) o.items.forEach(item => cuentasSet.add(item.cuenta || 'General'));
          if (o.paidAccounts) o.paidAccounts.forEach(acc => cuentasSet.add(acc));
          
          const rawTicketId = o.ticketId || 'Sin Nombre';
          const isVitrina = rawTicketId === 'VITRINA-EXPRESS';
          
          let numeroFinal = rawTicketId;
          if (!isVitrina) {
            numeroFinal = rawTicketId.toLowerCase().includes('llevar') 
                 ? rawTicketId 
                 : `Llevar #${indexLlevar} - ${rawTicketId}`;
            indexLlevar++;
          }
          
          return {
            id: o.id, 
            identificadorLlevar: isVitrina ? null : indexLlevar - 1,
            cliente: numeroFinal, 
            numero: numeroFinal, 
            zona: isVitrina ? 'vitrina' : 'llevar', 
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

  useEffect(() => { 
    loadMesas(); 
    socket.on('pos:update', () => loadMesas());
    return () => { socket.off('pos:update'); };
  }, [loadMesas]);

  // 🔥 NUEVO: Filtramos directamente para entregarlo a las secciones del Dashboard
  const mesasSalon = useMemo(() => mesas.filter(m => m.zona === 'salon'), [mesas]);
  const mesasLlevar = useMemo(() => mesas.filter(m => m.zona === 'llevar'), [mesas]);
  const mesasFiltradas = useMemo(() => mesas.filter(m => m.zona === zonaActiva), [mesas, zonaActiva]);
  
  const stats = useMemo(() => { 
    const salon = mesas.filter(m => m.zona === 'salon'); 
    return { 
      ocupadas: salon.filter(m => m.estado === 'ocupada').length, 
      libres: salon.filter(m => m.estado === 'libre').length 
    }; 
  }, [mesas]);

  const nuevoPedidoVitrina = async () => {
    try {
      const ordenActiva = mesas.find(m => m.zona === 'vitrina' && m.estado === 'ocupada');
      if (ordenActiva) return ordenActiva;

      const res = await client.post('/pos/orders', { 
          orderType: 'LLEVAR', 
          ticketId: 'VITRINA-EXPRESS', 
          tableId: null 
      });

      return { 
        id: res.data.order.id, 
        numero: 'VITRINA-EXPRESS', 
        zona: 'vitrina', 
        estado: 'ocupada', 
        total: 0, 
        orderId: res.data.order.id, 
        items: [], 
        cuentasActivas: 1, 
        orderStatus: 'OPEN', 
        paidAccounts: [] 
      };
    } catch (error) { 
        return null; 
    }
  };

  const nuevoPedidoLlevar = async (nombreCliente, telefono) => {
    try {
      const currentOrders = await fetchActiveOrders();
      const llevarOrdersCount = (currentOrders || []).filter(o => o.orderType === 'LLEVAR' && o.ticketId !== 'VITRINA-EXPRESS').length;
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
        return null; 
    }
  };

  return { 
    mesasFiltradas, stats, zonas, zonaActiva, setZonaActiva, 
    refresh: loadMesas, liberarMesa: loadMesas, 
    actualizarEstadoMesa: loadMesas, pagoParcialMesa: loadMesas, unirMesas: loadMesas, 
    nuevoPedidoLlevar, nuevoPedidoVitrina, isLoading,

    // 🔥 LAS PROPIEDADES QUE FALTABAN PARA EL NUEVO DASHBOARD
    mesasSalon,
    mesasLlevar,
    handleLiberarMesa: loadMesas,
    handleUpdateTotal: loadMesas,
    handleUnirMesas: loadMesas,
    handlePagoParcial: loadMesas
  };
};