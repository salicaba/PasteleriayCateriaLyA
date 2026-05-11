import { Router } from 'express';
import { getPedidos, createPedido, addAbono, updateEstado, updatePedido } from './pasteleria.controller.js';

const router = Router();

router.get('/pedidos', getPedidos);
router.post('/pedidos', createPedido);
router.post('/pedidos/:id/abonos', addAbono);
router.put('/pedidos/:id/estado', updateEstado);
router.put('/pedidos/:id', updatePedido); // 🚀 Ruta para editar el pedido completo

export default router;