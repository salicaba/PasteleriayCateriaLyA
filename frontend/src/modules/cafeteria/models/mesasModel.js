import client from '../../../api/client.js';

export const ZONAS = [
  { id: 'salon', label: 'Salón Principal' },
  { id: 'llevar', label: 'Para Llevar' }
];

export const fetchActiveOrders = async () => {
  try {
    const response = await client.get('/pos/orders/active');
    
    // 🔥 FIX CRÍTICO: Devolvemos la data completa y cruda tal cual viene del backend.
    // El useMesasController se encargará de mapearla y ordenarla correctamente,
    // asegurando que no se pierda el tableId, paidAccounts, ni los items al volver a abrir la mesa.
    return response.data;
  } catch (error) {
    console.error("Error al obtener órdenes activas:", error);
    return [];
  }
};