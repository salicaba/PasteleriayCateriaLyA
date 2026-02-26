import { useState, useCallback } from 'react';
import { MOCK_ORDERS } from '../models/kitchenModel';

export const useKitchenController = () => {
  const [orders, setOrders] = useState(MOCK_ORDERS);

  // Marcar/Desmarcar una PREPARACIÓN ESPECÍFICA (ej. el latte deslactosado)
  const toggleItemReady = useCallback((orderId, itemId, idPrep) => {
    setOrders(prevOrders => {
      return prevOrders.map(order => {
        if (order.id !== orderId) return order;
        
        const updatedItems = order.items.map(item => {
          if (item.id !== itemId) return item;
          
          // Actualizamos solo la preparación específica de este item
          const updatedPreps = item.preparaciones.map(prep => 
            prep.idPrep === idPrep ? { ...prep, isReady: !prep.isReady } : prep
          );
          
          return { ...item, preparaciones: updatedPreps };
        });
        
        return { ...order, items: updatedItems };
      });
    });
  }, []);

  // Despachar la comanda completa
  const completeOrder = useCallback((orderId) => {
    setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
  }, []);

  return {
    orders,
    toggleItemReady,
    completeOrder
  };
};