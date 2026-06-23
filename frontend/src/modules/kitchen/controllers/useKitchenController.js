// src/modules/kitchen/controllers/useKitchenController.js
import { useState, useCallback, useEffect } from 'react';
import client from '../../../api/client.js';

export const useKitchenController = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingItems, setProcessingItems] = useState(new Set());
  const [processingOrders, setProcessingOrders] = useState(new Set());

  const fetchKitchenOrders = useCallback(async () => {
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
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchKitchenOrders]);

  return {
    orders: [...orders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    loading,
    processingItems,
    processingOrders,
    
    toggleItemReady: async (orderId, itemId) => {
        setProcessingItems(prev => new Set(prev).add(itemId));
        const order = orders.find(o => o.id === orderId);
        const item = order?.items.find(i => i.id === itemId);
        
        if (!item) {
          setProcessingItems(prev => { const next = new Set(prev); next.delete(itemId); return next; });
          return;
        }

        const newStatus = item.kitchenStatus === 'PREPARING' ? 'PENDING' : 'PREPARING';
        
        try {
            await client.put(`/kitchen/tickets/${itemId}/status`, { status: newStatus });
            await fetchKitchenOrders();
        } catch(e){ 
            console.error("Error al cambiar estado individual"); 
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

        try {
            const promises = order.items
                .filter(i => i.kitchenStatus !== 'PREPARING')
                .map(i => client.put(`/kitchen/tickets/${i.id}/status`, { status: 'PREPARING' }));
            await Promise.all(promises);
            await fetchKitchenOrders();
        } catch(e){ 
            console.error("Error al marcar todo preparado"); 
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

        try {
            const promises = order.items.map(i => client.put(`/kitchen/tickets/${i.id}/status`, { status: 'READY' }));
            await Promise.all(promises);
            await fetchKitchenOrders();
        } catch(e){ 
            console.error("Error al enviar pedido a meseros"); 
        } finally {
            setProcessingOrders(prev => { const next = new Set(prev); next.delete(orderId); return next; });
        }
    }
  };
};