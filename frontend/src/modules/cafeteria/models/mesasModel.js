import client from '../../../api/client.js';

export const ZONAS = [
  { id: 'salon', label: 'Salón Principal' },
  { id: 'llevar', label: 'Para Llevar' }
];

export const fetchActiveOrders = async () => {
  try {
    const response = await client.get('/pos/orders/active');
    
    // Transformamos las órdenes de la BD al formato de mesas del frontend
    return response.data.map(order => ({
      id: order.id,
      numero: order.orderType === 'LLEVAR' ? order.ticketId : 'Mesa DB', // Aquí luego enlazaremos tableId
      zona: order.orderType === 'LLEVAR' ? 'llevar' : 'salon',
      estado: 'ocupada',
      total: Number(order.totalAmount),
      horaInicio: new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      personas: 1, // Por defecto
      items: order.items
    }));
  } catch (error) {
    console.error("Error al obtener órdenes activas:", error);
    return [];
  }
};