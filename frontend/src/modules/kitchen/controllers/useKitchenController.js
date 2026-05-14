import { useState, useCallback, useMemo, useEffect } from 'react';
import client from '../../../api/client.js';

export const useKitchenController = () => {
  const [orders, setOrders] = useState([]);

  // Extraer tickets de la API y transformar la estructura para la Vista
  const fetchKitchenOrders = useCallback(async () => {
    try {
      const res = await client.get('/kitchen/tickets');
      const tickets = res.data; // Array de OrderItems con Order y Product incluidos

      const groupedOrders = {};

      tickets.forEach(item => {
        const order = item.Order;
        if (!order) return;

        // Agrupar por ID de Orden
        if (!groupedOrders[order.id]) {
          groupedOrders[order.id] = {
            id: order.id,
            tipo: order.orderType === 'LLEVAR' ? 'llevar' : 'salon',
            mesa: order.orderType === 'LLEVAR' ? (order.ticketId || 'Para Llevar') : `Mesa ${order.tableId || 'S/N'}`,
            batch: 1,
            mesero: 'Cajero', // Se puede mapear el User dinámicamente si se incluye en la consulta
            createdAt: order.createdAt,
            items: []
          };
        }

        // Mapear el campo 'notes' hacia la estructura de 'preparaciones' visuales
        const preparaciones = item.notes 
          ? item.notes.split(', ').map((nota, i) => ({
              idPrep: `${item.id}-${i}`,
              tamano: nota,
              isReady: item.kitchenStatus === 'READY' || item.kitchenStatus === 'DELIVERED',
              extras: []
            }))
          : [{
              idPrep: `${item.id}-0`,
              tamano: 'Estándar',
              isReady: item.kitchenStatus === 'READY' || item.kitchenStatus === 'DELIVERED',
              extras: []
            }];

        groupedOrders[order.id].items.push({
          id: item.id,
          nombre: item.Product?.name || 'Producto General',
          qty: item.quantity,
          preparaciones: preparaciones,
          originalItemId: item.id, 
          kitchenStatus: item.kitchenStatus
        });
      });

      setOrders(Object.values(groupedOrders));
    } catch (error) {
      console.error("Error al sincronizar KDS de cocina:", error);
    }
  }, []);

  // Polling automático cada 10 segundos
  useEffect(() => {
    fetchKitchenOrders();
    const intervalId = setInterval(fetchKitchenOrders, 10000);
    return () => clearInterval(intervalId);
  }, [fetchKitchenOrders]);

  // Actualizar el estado de la preparación en tiempo real
  const toggleItemReady = useCallback(async (orderId, itemId, idPrep) => {
    // 1. Optimistic Update (Actualiza la UI inmediatamente para dar fluidez)
    let targetOriginalItemId = null;

    setOrders(prevOrders => prevOrders.map(order => {
      if (order.id !== orderId) return order;
      return {
        ...order,
        items: order.items.map(item => {
          if (item.id !== itemId) return item;
          targetOriginalItemId = item.originalItemId;
          
          const updatedPreps = item.preparaciones.map(prep => 
            prep.idPrep === idPrep ? { ...prep, isReady: !prep.isReady } : prep
          );
          return { ...item, preparaciones: updatedPreps };
        })
      };
    }));

    // 2. Persistir el cambio en la base de datos
    if (targetOriginalItemId) {
      try {
        await client.put(`/kitchen/tickets/${targetOriginalItemId}/status`, { status: 'READY' });
      } catch (error) {
        console.error("Error al actualizar estado del platillo:", error);
        fetchKitchenOrders(); // Revertir a la verdad del backend en caso de error
      }
    }
  }, [fetchKitchenOrders]);

  // Despachar comanda (Quitarla del KDS)
  const completeOrder = useCallback(async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Optimistic Update
    setOrders(prevOrders => prevOrders.filter(o => o.id !== orderId));

    try {
      const updates = order.items.map(item => 
        client.put(`/kitchen/tickets/${item.originalItemId}/status`, { status: 'DELIVERED' })
      );
      await Promise.all(updates);
    } catch (error) {
      console.error("Error al despachar la comanda completa:", error);
      fetchKitchenOrders();
    }
  }, [orders, fetchKitchenOrders]);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [orders]);

  return {
    orders: sortedOrders,
    toggleItemReady,
    completeOrder
  };
};