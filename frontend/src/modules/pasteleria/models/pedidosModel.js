import client from '../../../api/client';

export const fetchPedidosPasteleria = async () => {
  try {
    const response = await client.get('/pasteleria/pedidos');
    return response.data.data || [];
  } catch (error) {
    console.error("Error al obtener los pedidos reales:", error);
    return [];
  }
};

export const crearPedidoReal = async (datosPedido) => {
  try {
    const response = await client.post('/pasteleria/pedidos', datosPedido);
    return response.data;
  } catch (error) {
    console.error("Error al crear el pedido en la BD:", error);
    throw error;
  }
};

export const registrarAbonoReal = async (pedidoId, monto) => {
  try {
    const response = await client.post(`/pasteleria/pedidos/${pedidoId}/abonos`, { monto });
    return response.data;
  } catch (error) {
    console.error("Error al registrar el abono en la BD:", error);
    throw error;
  }
};

export const actualizarEstadoPedidoReal = async (pedidoId, estado) => {
  try {
    const response = await client.put(`/pasteleria/pedidos/${pedidoId}/estado`, { estado });
    return response.data.data; // Retorna el pedido actualizado
  } catch (error) {
    console.error("Error al actualizar el estado en la BD:", error);
    throw error;
  }
};