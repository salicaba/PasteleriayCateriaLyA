import { useState } from 'react';
import { MOCK_ORDERS } from '../models/kitchenModel';

export const useKitchenController = () => {
  const [orders, setOrders] = useState(MOCK_ORDERS);

  const completeOrder = (orderId) => {
    // En la vida real, esto haría una petición a la API
    // Aquí lo animamos sacándolo de la lista
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const markItemReady = (orderId, itemIndex) => {
    // Lógica futura: Tachar items individuales
    console.log(`Item ${itemIndex} de orden ${orderId} listo`);
  };

  return {
    orders,
    completeOrder,
    markItemReady
  };
};