import { useState, useCallback, useEffect } from 'react';
import client from '../../../api/client.js';

export const useKitchenController = () => {
  const [orders, setOrders] = useState([]);

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
          preparaciones: preps.map((p, i) => ({
            idPrep: `${item.id}-${i}`,
            tamano: p.tamano || 'Estándar',
            leche: p.leche,
            extras: p.extras || [],
            isReady: item.kitchenStatus === 'READY'
          })),
          kitchenStatus: item.kitchenStatus
        });
      });

      setOrders(Object.values(groupedOrders));
    } catch (error) { console.error("Error KDS:", error); }
  }, []);

  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchKitchenOrders]);

  return {
    orders: [...orders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    
    // 🔥 LÓGICA DE TOGGLE: Permite desmarcar si hubo error
    toggleItemReady: async (orderId, itemId) => {
        const order = orders.find(o => o.id === orderId);
        const item = order?.items.find(i => i.id === itemId);
        if (!item) return;

        // Si ya está READY, lo pasamos a PENDING. Si no, a READY.
        const newStatus = item.kitchenStatus === 'READY' ? 'PENDING' : 'READY';
        
        try {
            await client.put(`/kitchen/tickets/${itemId}/status`, { status: newStatus });
            fetchKitchenOrders();
        } catch(e){ console.error("Error al cambiar estado"); }
    },

    markAllReady: async (orderId) => {
        const order = orders.find(o => o.id === orderId);
        if(!order) return;
        try {
            const promises = order.items
                .filter(i => i.kitchenStatus !== 'READY')
                .map(i => client.put(`/kitchen/tickets/${i.id}/status`, { status: 'READY' }));
            await Promise.all(promises);
            fetchKitchenOrders();
        } catch(e){}
    },

    // 🔥 COMPLETAR: Este es el botón final que hace desaparecer la mesa (Estado DELIVERED)
    completeOrder: async (orderId) => {
        const order = orders.find(o => o.id === orderId);
        if(!order) return;
        try {
            const promises = order.items.map(i => client.put(`/kitchen/tickets/${i.id}/status`, { status: 'DELIVERED' }));
            await Promise.all(promises);
            fetchKitchenOrders();
        } catch(e){}
    }
  };
};