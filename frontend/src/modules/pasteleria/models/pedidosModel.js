import client from '../../../api/client'; // <- Aquí estaba el error, ya corregido

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