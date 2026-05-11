import axios from 'axios';

// Asegúrate de que esta URL coincida con tu puerto real (por tus logs anteriores, es el 4000)
const API_URL = 'http://localhost:4000/api/pasteleria/pedidos';

export const fetchPedidosPasteleria = async () => {
  try {
    const response = await axios.get(API_URL);
    // Devuelve el array de pedidos que viene dentro de 'data'
    return response.data.data;
  } catch (error) {
    console.error("Error al obtener los pedidos desde la BD:", error);
    return [];
  }
};

export const crearPedidoReal = async (pedidoData) => {
  try {
    const response = await axios.post(API_URL, pedidoData);
    return response.data;
  } catch (error) {
    console.error("Error al crear el pedido en la BD:", error);
    throw error;
  }
};

export const registrarAbonoReal = async (id, monto) => {
  try {
    const response = await axios.post(`${API_URL}/${id}/abonos`, { monto });
    return response.data;
  } catch (error) {
    console.error("Error al registrar el abono en la BD:", error);
    throw error;
  }
};

export const actualizarEstadoPedidoReal = async (id, estado) => {
  try {
    const response = await axios.put(`${API_URL}/${id}/estado`, { estado });
    return response.data.data; // Retorna el pedido ya actualizado
  } catch (error) {
    console.error("Error al actualizar el estado en la BD:", error);
    throw error;
  }
};

// 🚀 ESTA ES LA FUNCIÓN QUE FALTABA Y CAUSABA LA PANTALLA BLANCA
export const editarPedidoReal = async (id, pedidoData) => {
  try {
    // Hace un PUT a la ruta que creamos hace un momento en el backend
    const response = await axios.put(`${API_URL}/${id}`, pedidoData);
    return response.data;
  } catch (error) {
    console.error("Error al editar el pedido en la BD:", error);
    throw error;
  }
};