// frontend/src/modules/kitchen/controllers/useKitchenController.js
import { useState, useCallback, useMemo, useEffect } from 'react';
import client from '../../../api/client.js';

export const useKitchenController = () => {
  const [orders, setOrders] = useState([]);

  const fetchKitchenOrders = useCallback(async () => {
    try {
      const res = await client.get('/kitchen/tickets');
      const tickets = res.data; 

      const groupedOrders = {};

      tickets.forEach(item => {
        // 🔥 FIX: Mapeo estricto del objeto Order (Sequelize devuelve 'order' en minúscula)
        const order = item.order || item.Order; 
        if (!order) return;

        if (!groupedOrders[order.id]) {
          groupedOrders[order.id] = {
            id: order.id,
            tipo: order.orderType === 'LLEVAR' ? 'llevar' : 'salon',
            // Si es salón, debe decir "Mesa X", si no, el nombre del cliente
            mesa: order.orderType === 'LLEVAR' ? (order.ticketId || 'Para Llevar') : `Mesa ${order.tableId || 'S/N'}`,
            createdAt: order.createdAt,
            items: []
          };
        }

        let preparaciones = [];
        try { preparaciones = item.notes ? JSON.parse(item.notes) : []; } catch (e) { preparaciones = []; }

        groupedOrders[order.id].items.push({
          id: item.id,
          nombre: item.product?.name || 'Producto',
          qty: item.quantity,
          preparaciones: preparaciones.map((p, i) => ({
            idPrep: `${item.id}-${i}`,
            tamano: p.tamano || 'Estándar',
            leche: p.leche,
            extras: p.extras || [],
            isReady: item.kitchenStatus === 'READY' || item.kitchenStatus === 'DELIVERED'
          })),
          originalItemId: item.id, 
          kitchenStatus: item.kitchenStatus,
          cuenta: item.cuenta
        });
      });

      setOrders(Object.values(groupedOrders));
    } catch (error) { console.error("Error KDS:", error); }
  }, []);

  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchKitchenOrders]);

  return { 
    orders: [...orders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)), 
    toggleItemReady: async (orderId, itemId, idPrep) => {
        try { await client.put(`/kitchen/tickets/${itemId}/status`, { status: 'READY' }); fetchKitchenOrders(); } catch(e){}
    },
    completeOrder: async (orderId) => {
        const order = orders.find(o => o.id === orderId);
        if(!order) return;
        try { await Promise.all(order.items.map(i => client.put(`/kitchen/tickets/${i.id}/status`, { status: 'DELIVERED' }))); fetchKitchenOrders(); } catch(e){}
    }
  };
};