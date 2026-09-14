//frontend/src/modules/kitchen/controllers/useKitchenController.js
import { useState, useCallback, useEffect } from 'react';
import client from '../../../api/client.js';
import { socket } from '../../../api/socket.js'; // 🔥 IMPORTAMOS EL SOCKET

export const useKitchenController = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingItems, setProcessingItems] = useState(new Set());
  const [processingOrders, setProcessingOrders] = useState(new Set());
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const fetchKitchenOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await client.get('/kitchen/tickets');
      const tickets = res.data;
      const groupedOrders = {};

      tickets.forEach(item => {
        const order = item.order || item.Order;
        if (!order) return;

        if (!groupedOrders[order.id]) {
          groupedOrders[order.id] = {
            id: order.id,
            tipo: order.orderType === 'LLEVAR' ? 'llevar' : 'salon',
            mesa: order.orderType === 'LLEVAR' 
                  ? (order.ticketId || 'Para Llevar') 
                  : `Mesa ${order.table?.number || order.tableId || 'S/N'}`,
            createdAt: order.createdAt,
            items: []
          };
        }

        let preps = [];
        try { preps = item.notes ? JSON.parse(item.notes) : []; } catch (e) { preps = []; }

        groupedOrders[order.id].items.push({
          id: item.id,
          nombre: item.product?.name || 'Producto',
          qty: item.quantity,
          status: item.status, 
          isTakeaway: item.isTakeaway, 
          requiereCocina: item.product?.requiereCocina !== false,
          createdAt: item.createdAt || order.createdAt, // 🔥 Extraemos el tiempo exacto de ESTE producto
          preparaciones: preps.map((p, i) => ({
            idPrep: `${item.id}-${i}`,
            tamano: p.tamano || 'Estándar',
            leche: p.leche,
            extras: p.extras || [],
            isReady: item.kitchenStatus === 'PREPARING'
          })),
          kitchenStatus: item.kitchenStatus
        });
      });

      // 🔥 Calculamos el tiempo base de la comanda usando el producto más antiguo que NO esté cancelado
      const parsedOrders = Object.values(groupedOrders).map(group => {
        const activeItems = group.items.filter(i => i.status !== 'CANCELLED');
        const itemsToConsider = activeItems.length > 0 ? activeItems : group.items;
        
        const oldestTime = itemsToConsider.reduce((min, i) => {
          const time = new Date(i.createdAt).getTime();
          return time < min ? time : min;
        }, new Date(itemsToConsider[0].createdAt).getTime());

        return {
          ...group,
          oldestItemTime: oldestTime // Fecha que dicta la urgencia de esta tanda
        };
      });

      setOrders(parsedOrders);
    } catch (error) { 
      console.error("Error KDS:", error); 
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKitchenOrders(false);
    // Para no causar conflictos con las actualizaciones en tiempo real, 
    // aumentamos un poco el intervalo o confiamos en los sockets.
    const interval = setInterval(() => fetchKitchenOrders(true), 15000); 
    return () => clearInterval(interval);
  }, [fetchKitchenOrders]);

  // 🔥 MAGIA DE LIMPIEZA EN COCINA: Escuchamos eventos del socket
  useEffect(() => {
    const recargarCocina = () => fetchKitchenOrders(true);

    // Escuchar actualizaciones del POS y cancelaciones
    socket.on('pos:update', recargarCocina);
    socket.on('kitchen:update', recargarCocina);
    socket.on('orderItemCancelled', recargarCocina);
    socket.on('orderCancelled', recargarCocina);
    socket.on('orderItemRestored', recargarCocina);
    socket.on('orderRestored', recargarCocina);

    return () => {
      socket.off('pos:update', recargarCocina);
      socket.off('kitchen:update', recargarCocina);
      socket.off('orderItemCancelled', recargarCocina);
      socket.off('orderCancelled', recargarCocina);
      socket.off('orderItemRestored', recargarCocina);
      socket.off('orderRestored', recargarCocina);
    };
  }, [fetchKitchenOrders]);

  return {
    // 🔥 Ahora ordenamos (FIFO) basados estrictamente en el producto activo más antiguo
    orders: [...orders].sort((a, b) => a.oldestItemTime - b.oldestItemTime),
    loading,
    processingItems,
    processingOrders,
    toast,
    
    toggleItemReady: async (orderId, itemId) => {
        setProcessingItems(prev => new Set(prev).add(itemId));
        const order = orders.find(o => o.id === orderId);
        const item = order?.items.find(i => i.id === itemId);
        
        if (!item) {
          setProcessingItems(prev => { const next = new Set(prev); next.delete(itemId); return next; });
          return;
        }

        const isCancelled = item.status === 'CANCELLED';
        const newStatus = isCancelled ? 'READY' : (item.kitchenStatus === 'PREPARING' ? 'PENDING' : 'PREPARING');
        
        // 1. ACTUALIZACIÓN OPTIMISTA (Instantánea en UI)
        if (isCancelled) {
             setOrders(prev => prev.map(o => {
                if (o.id === orderId) {
                    return { ...o, items: o.items.filter(i => i.id !== itemId) };
                }
                return o;
             }).filter(o => o.items.length > 0));
        } else {
             setOrders(prev => prev.map(o => o.id === orderId ? {
                ...o,
                items: o.items.map(i => i.id === itemId ? { ...i, kitchenStatus: newStatus } : i)
             } : o));
        }

        // 2. PETICIÓN A LA API (SIN RECARGAR INMEDIATAMENTE)
        try {
            await client.put(`/kitchen/tickets/${itemId}/status`, { status: newStatus });
            // Ya NO llamamos a fetchKitchenOrders(true) aquí
            if(isCancelled) showToast('Producto cancelado descartado', 'success');
        } catch(e){ 
            console.error("Error al cambiar estado individual"); 
            showToast('Error al actualizar producto', 'error');
            // Si falla, sí recargamos para revertir la acción optimista
            fetchKitchenOrders(true); 
        } finally {
            setProcessingItems(prev => { const next = new Set(prev); next.delete(itemId); return next; });
        }
    },

    markAllReady: async (orderId) => {
        setProcessingOrders(prev => new Set(prev).add(orderId));
        const order = orders.find(o => o.id === orderId);
        if(!order) {
          setProcessingOrders(prev => { const next = new Set(prev); next.delete(orderId); return next; });
          return;
        }

        // 1. ACTUALIZACIÓN OPTIMISTA
        setOrders(prev => prev.map(o => o.id === orderId ? {
            ...o,
            items: o.items.map(i => i.status === 'CANCELLED' ? i : { ...i, kitchenStatus: 'PREPARING' })
        } : o));

        // 2. PETICIÓN A LA API
        try {
            const promises = order.items
                .filter(i => i.kitchenStatus !== 'PREPARING' && i.status !== 'CANCELLED')
                .map(i => client.put(`/kitchen/tickets/${i.id}/status`, { status: 'PREPARING' }));
            await Promise.all(promises);
            // Ya NO llamamos a fetchKitchenOrders(true) aquí
            showToast('Productos activos preparados');
        } catch(e){ 
            console.error("Error al marcar todo preparado"); 
            showToast('Error al procesar comanda', 'error');
            fetchKitchenOrders(true); 
        } finally {
            setProcessingOrders(prev => { const next = new Set(prev); next.delete(orderId); return next; });
        }
    },

    completeOrder: async (orderId) => {
        setProcessingOrders(prev => new Set(prev).add(orderId));
        const order = orders.find(o => o.id === orderId);
        if(!order) {
          setProcessingOrders(prev => { const next = new Set(prev); next.delete(orderId); return next; });
          return;
        }

        // 1. ACTUALIZACIÓN OPTIMISTA (Oculta la orden)
        setOrders(prev => prev.filter(o => o.id !== orderId));

        // 2. PETICIÓN A LA API
        try {
            const promises = order.items.map(i => client.put(`/kitchen/tickets/${i.id}/status`, { status: 'READY' }));
            await Promise.all(promises);
            
            // Ya NO llamamos a fetchKitchenOrders(true) aquí
            
            const allCancelled = order.items.every(i => i.status === 'CANCELLED');
            showToast(allCancelled ? 'Comanda cancelada descartada' : '¡Comanda despachada con éxito!');
        } catch(e){ 
            console.error("Error al enviar pedido a meseros"); 
            showToast('Error al despachar la comanda', 'error');
            // Si falla, recargamos para que vuelva a aparecer
            fetchKitchenOrders(true);
        } finally {
            setProcessingOrders(prev => { const next = new Set(prev); next.delete(orderId); return next; });
        }
    }
  };
};