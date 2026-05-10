import { Router } from 'express';
import { getPedidos, createPedido, addAbono } from './pasteleria.controller.js';

const router = Router();

router.get('/pedidos', getPedidos);
router.post('/pedidos', createPedido);
router.post('/pedidos/:id/abonos', addAbono);

export default router;