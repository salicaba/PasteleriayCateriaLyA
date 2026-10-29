// src/modules/cafeteria/controllers/useMesasController.js
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import client from '../../../api/client.js';
import { socket } from '../../../api/socket.js'; 

const parseValidDays = (daysData) => {
  if (!daysData) return [];
  if (Array.isArray(daysData)) return daysData.map(Number);
  if (typeof daysData === 'string') {
    try { 
      return JSON.parse(daysData).map(Number); 
    } catch (e) { 
      return daysData.replace(/[\[\]]/g, '').split(',').map(n => Number(n.trim())); 
    }
  }
  return [];
};

const extractSavedTicketDiscount = (accountItems) => {
  for (const item of accountItems) {
    if (!item.notes) continue;
    try {
      const parsed = typeof item.notes === 'string' ? JSON.parse(item.notes) : item.notes;
      if (Array.isArray(parsed)) {
        const discountMeta = parsed.find(n => n && n._isTicketDiscountMeta);
        if (discountMeta && Number(discountMeta.amount) > 0) {
          return Number(discountMeta.amount);
        }
      }
    } catch (e) {}
  }
  return 0;
};

// 🔥 Calcula el total neto de la orden aplicando TICKET_DISCOUNT por cada cuenta activa
const calculateOrderNetTotal = (order, promotionsList = []) => {
  if (!order) return 0;
  const activeItems = (order.items || []).filter(i => i.status !== 'CANCELLED' && !i._isReleased);
  if (activeItems.length === 0) return Number(order.totalAmount) || 0;

  const today = new Date().getDay();
  const ticketPromos = (promotionsList || []).filter(p => {
    const rawActive = p.isActive ?? p.is_active ?? p.status;
    const isActive = rawActive === true || rawActive === 1 || rawActive === 'true' || rawActive === '1';
    const daysRaw = p.validDays || p.valid_days;
    const validDays = parseValidDays(daysRaw);
    const validToday = validDays.length === 0 || validDays.includes(today);
    return isActive && validToday && p.type === 'TICKET_DISCOUNT';
  });

  const paidAccounts = Array.isArray(order.paidAccounts) ? order.paidAccounts : [];
  const cuentasUnicas = [...new Set(activeItems.map(item => item.cuenta || 'General'))];

  let netTotal = 0;

  cuentasUnicas.forEach(cuenta => {
    const itemsCuenta = activeItems.filter(item => (item.cuenta || 'General') === cuenta);
    const subtotalCuenta = itemsCuenta.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);

    // 1. Si la cuenta ya está pagada, descontar el monto que se guardó al cobrar
    if (paidAccounts.includes(cuenta)) {
      const savedDiscount = extractSavedTicketDiscount(itemsCuenta);
      netTotal += Math.max(0, subtotalCuenta - savedDiscount);
      return;
    }

    // 2. Si la cuenta sigue abierta, evaluar promociones activas de TICKET_DISCOUNT
    if (ticketPromos.length > 0 && subtotalCuenta > 0) {
      const qualifyingPromos = ticketPromos
        .filter(p => subtotalCuenta >= Number(p.minTicketAmount || p.min_ticket_amount || 0))
        .sort((a, b) => Number(b.minTicketAmount || b.min_ticket_amount || 0) - Number(a.minTicketAmount || a.min_ticket_amount || 0));

      const bestTicketPromo = qualifyingPromos[0];
      if (bestTicketPromo) {
        const rawDiscount = Number(bestTicketPromo.discountValue || bestTicketPromo.discount_value || 0);
        const isPercentage = bestTicketPromo.discountType === 'PERCENTAGE';
        const discountAmount = isPercentage ? (subtotalCuenta * (rawDiscount / 100)) : rawDiscount;
        const finalDiscount = Math.min(subtotalCuenta, Math.abs(discountAmount));
        netTotal += Math.max(0, subtotalCuenta - finalDiscount);
        return;
      }
    }

    netTotal += subtotalCuenta;
  });

  return netTotal;
};

export const useMesasController = () => {
  const [mesas, setMesas] = useState([]);
  const [zonaActiva, setZonaActiva] = useState('salon');
  const [isLoading, setIsLoading] = useState(true);

  const [dailySummary, setDailySummary] = useState({
    vendidosCount: 0, papeleraCount: 0, vendidosOrders: [], cancelledOrders: [], cancelledItems: [], transactions: []
  });

  const isProcessingRef = useRef(false);

  const zonas = [ 
    { id: 'salon', label: 'Salón' }, 
    { id: 'llevar', label: 'Para Llevar' },
    { id: 'vitrina', label: 'Mostrador' }
  ];

  const loadMesas = useCallback(async () => {
    try {
      const [tablesRes, activeOrdersRes, summaryRes, promosRes] = await Promise.all([
        client.get('/pos/tables'), 
        client.get('/pos/orders/active'),
        client.get('/pos/orders/daily-summary').catch(() => ({ data: {} })),
        client.get('/promotions').catch(() => ({ data: [] }))
      ]);
      
      const catalog = tablesRes.data || [];
      const orders = (activeOrdersRes.data || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const rawPromos = promosRes?.data;
      const promotionsList = Array.isArray(rawPromos) ? rawPromos : (rawPromos?.data || rawPromos?.promotions || []);
      
      if (summaryRes.data) {
        const rawCancelledItems = summaryRes.data.cancelledItems || [];
        const calculatedUnits = rawCancelledItems.reduce(
          (sum, item) => sum + (Number(item.quantity) || 1),
          0
        );
        setDailySummary({
          ...summaryRes.data,
          papeleraCount: calculatedUnits
        });
      }

      const mergedMesas = catalog.map(table => {
        const order = orders.find(o => o.tableId === table.id);
        
        let cuentasActivas = 0;
        if (order) {
          const cuentasSet = new Set();
          if (order.items) order.items.forEach(item => cuentasSet.add(item.cuenta || 'General'));
          if (order.paidAccounts) order.paidAccounts.forEach(acc => cuentasSet.add(acc));
          cuentasActivas = cuentasSet.size > 0 ? cuentasSet.size : 1;
        }

        return {
          id: table.id, 
          numero: table.number, 
          zona: table.zone, 
          estado: order ? 'ocupada' : 'libre',
          total: order ? calculateOrderNetTotal(order, promotionsList) : 0, 
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
          const cuentasSet = new Set();
          if (o.items) o.items.forEach(item => cuentasSet.add(item.cuenta || 'General'));
          if (o.paidAccounts) o.paidAccounts.forEach(acc => cuentasSet.add(acc));
          const cuentasActivasFinal = cuentasSet.size > 0 ? cuentasSet.size : 1;
          
          const rawTicketId = o.ticketId || 'Sin Nombre';
          const isVitrina = rawTicketId.startsWith('MOSTRADOR') || rawTicketId.startsWith('VITRINA') || rawTicketId.startsWith('MOS-');
          
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
            total: calculateOrderNetTotal(o, promotionsList),
            orderId: o.id, 
            items: o.items || [], 
            horaInicio: o.createdAt || null,
            cuentasActivas: cuentasActivasFinal, 
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
    const onUpdate = () => loadMesas();
    socket.on('pos:update', onUpdate);
    socket.on('menu:promotions_updated', onUpdate);
    socket.on('promotion_created', onUpdate);
    socket.on('promotion_updated', onUpdate);
    socket.on('promotion_deleted', onUpdate);
    return () => { 
      socket.off('pos:update', onUpdate); 
      socket.off('menu:promotions_updated', onUpdate);
      socket.off('promotion_created', onUpdate);
      socket.off('promotion_updated', onUpdate);
      socket.off('promotion_deleted', onUpdate);
    };
  }, [loadMesas]);

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
    if (isProcessingRef.current) return null;
    isProcessingRef.current = true;

    try {
      const ordenActiva = mesas.find(m => m.zona === 'vitrina' && m.estado === 'ocupada');
      if (ordenActiva) return ordenActiva;

      const res = await client.post('/pos/orders', { 
          orderType: 'LLEVAR', 
          ticketId: 'MOSTRADOR', 
          tableId: null 
      });

      return { 
        id: res.data.order.id, 
        numero: res.data.order.ticketId, 
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
        console.error('Error al abrir mostrador:', error);
        return null; 
    } finally {
        isProcessingRef.current = false;
    }
  };

  const nuevoPedidoLlevar = async (nombreCliente, telefono) => {
    if (isProcessingRef.current) return null;
    isProcessingRef.current = true;

    try {
      const resOrders = await client.get('/pos/orders/active');
      const currentOrders = resOrders.data || [];
      const llevarOrdersCount = currentOrders.filter(o => o.orderType === 'LLEVAR' && !o.ticketId.startsWith('MOSTRADOR') && !o.ticketId.startsWith('VITRINA')).length;
      const nextNumber = llevarOrdersCount + 1;

      const nombreFinal = (nombreCliente && nombreCliente.trim() !== '') ? nombreCliente : 'Cliente';

      let formattedTicketId = `Llevar #${nextNumber} - ${nombreFinal}`;
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
        console.error("Error creando pedido para llevar:", error);
        return null; 
    } finally {
        isProcessingRef.current = false;
    }
  };

  const handleCancelOrder = async (orderId, reason = 'Cancelado desde vista general') => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    try {
      await client.put(`/pos/orders/${orderId}/cancel`, { cancelReason: reason });
      loadMesas();
    } catch (error) {
      console.error('Error al eliminar el pedido:', error);
      throw error; 
    } finally {
      isProcessingRef.current = false;
    }
  };

  const handleRestoreOrder = async (orderId) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    try {
      await client.put(`/pos/orders/${orderId}/restore`);
      loadMesas();
    } catch (error) {
      console.error('Error al restaurar la cuenta:', error);
      throw error;
    } finally {
      isProcessingRef.current = false;
    }
  };

  const handleRestoreItem = async (orderId, itemId) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    try {
      await client.put(`/pos/orders/${orderId}/items/${itemId}/restore`);
      loadMesas();
    } catch (error) {
      console.error('Error al restaurar producto:', error);
      throw error;
    } finally {
      isProcessingRef.current = false;
    }
  };

  return { 
    mesasFiltradas, stats, zonas, zonaActiva, setZonaActiva, 
    refresh: loadMesas, liberarMesa: loadMesas, 
    actualizarEstadoMesa: loadMesas, pagoParcialMesa: loadMesas, unirMesas: loadMesas, 
    nuevoPedidoLlevar, nuevoPedidoVitrina, isLoading,
    mesasSalon, mesasLlevar,
    dailySummary,
    fetchSummary: loadMesas,
    handleLiberarMesa: loadMesas,
    handleUpdateTotal: loadMesas,
    handleUnirMesas: loadMesas,
    handlePagoParcial: loadMesas,
    handleCancelOrder, 
    handleRestoreOrder,
    handleRestoreItem
  };
};