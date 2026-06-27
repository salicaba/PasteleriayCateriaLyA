import { useState, useCallback, useEffect } from 'react';
import client from '../../../api/client.js';

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
          status: item.status, // 🔥 AGREGADO: Leemos si está CANCELLED
          isTakeaway: item.isTakeaway, 
          requiereCocina: item.product?.requiereCocina !== false, 
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

      setOrders(Object.values(groupedOrders));
    } catch (error) { 
      console.error("Error KDS:", error); 
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKitchenOrders(false);
    const interval = setInterval(() => fetchKitchenOrders(true), 5000);
    return () => clearInterval(interval);
  }, [fetchKitchenOrders]);

  return {
    orders: [...orders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
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
        // 🔥 Si está cancelado y le damos click, lo marcamos como READY para que desaparezca del KDS
        const newStatus = isCancelled ? 'READY' : (item.kitchenStatus === 'PREPARING' ? 'PENDING' : 'PREPARING');
        
        // Optimistic UI
        if (isCancelled) {
             setOrders(prev => prev.map(o => {
                if (o.id === orderId) {
                    return { ...o, items: o.items.filter(i => i.id !== itemId) };
                }
                return o;
             }).filter(o => o.items.length > 0)); // Si era el único, borramos la orden
        } else {
             setOrders(prev => prev.map(o => o.id === orderId ? {
                ...o,
                items: o.items.map(i => i.id === itemId ? { ...i, kitchenStatus: newStatus } : i)
             } : o));
        }

        try {
            await client.put(`/kitchen/tickets/${itemId}/status`, { status: newStatus });
            fetchKitchenOrders(true); 
            if(isCancelled) showToast('Producto cancelado descartado', 'success');
        } catch(e){ 
            console.error("Error al cambiar estado individual"); 
            showToast('Error al actualizar producto', 'error');
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

        // Optimistic UI (Excluimos los cancelados)
        setOrders(prev => prev.map(o => o.id === orderId ? {
            ...o,
            items: o.items.map(i => i.status === 'CANCELLED' ? i : { ...i, kitchenStatus: 'PREPARING' })
        } : o));

        try {
            const promises = order.items
                .filter(i => i.kitchenStatus !== 'PREPARING' && i.status !== 'CANCELLED') // 🔥 Excluimos cancelados
                .map(i => client.put(`/kitchen/tickets/${i.id}/status`, { status: 'PREPARING' }));
            await Promise.all(promises);
            fetchKitchenOrders(true);
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

        // Optimistic UI
        setOrders(prev => prev.filter(o => o.id !== orderId));

        try {
            // Esto mandará a READY tanto los normales como los cancelados (para limpiar pantalla)
            const promises = order.items.map(i => client.put(`/kitchen/tickets/${i.id}/status`, { status: 'READY' }));
            await Promise.all(promises);
            fetchKitchenOrders(true); 
            
            const allCancelled = order.items.every(i => i.status === 'CANCELLED');
            showToast(allCancelled ? 'Comanda cancelada descartada' : '¡Comanda despachada con éxito!');
        } catch(e){ 
            console.error("Error al enviar pedido a meseros"); 
            showToast('Error al despachar la comanda', 'error');
            fetchKitchenOrders(true);
        } finally {
            setProcessingOrders(prev => { const next = new Set(prev); next.delete(orderId); return next; });
        }
    }
  };
};