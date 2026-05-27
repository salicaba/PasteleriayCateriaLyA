import client from '../../../api/client.js';

// AQUÍ ESTABA EL DETALLE: Agregamos "/pedidos" a la ruta base
const API_URL = '/pasteleria/pedidos'; 

export const fetchPedidosPasteleria = async () => {
  try {
    const response = await client.get(API_URL);
    // Devuelve el array de pedidos que viene dentro de 'data'
    return response.data.data;
  } catch (error) {
    console.error("Error al obtener los pedidos desde la BD:", error);
    return [];
  }
};

export const crearPedidoReal = async (pedidoData) => {
  try {
    const response = await client.post(API_URL, pedidoData);
    return response.data;
  } catch (error) {
    console.error("Error al crear el pedido en la BD:", error);
    throw error;
  }
};

export const registrarAbonoReal = async (id, monto) => {
  try {
    const response = await client.post(`${API_URL}/${id}/abonos`, { monto });
    return response.data;
  } catch (error) {
    console.error("Error al registrar el abono en la BD:", error);
    throw error;
  }
};

export const actualizarEstadoPedidoReal = async (id, estado) => {
  try {
    // Usamos PUT para que coincida exactamente con tu router.put del backend
    const response = await client.put(`${API_URL}/${id}/estado`, { estado });
    return response.data.data; 
  } catch (error) {
    console.error("Error al actualizar el estado en la BD:", error);
    throw error;
  }
};

export const editarPedidoReal = async (id, pedidoData) => {
  try {
    const response = await client.put(`${API_URL}/${id}`, pedidoData);
    return response.data;
  } catch (error) {
    console.error("Error al editar el pedido en la BD:", error);
    throw error;
  }
};