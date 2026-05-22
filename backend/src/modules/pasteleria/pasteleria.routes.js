import { Router } from 'express';
import { 
  getPedidos, 
  createPedido, 
  addAbono, 
  updateEstado, 
  updatePedido,
  printPedidoTicket,   // <-- NUEVO
  sharePedidoTicket    // <-- NUEVO
} from './pasteleria.controller.js';

const router = Router();

router.get('/pedidos', getPedidos);
router.post('/pedidos', createPedido);
router.post('/pedidos/:id/abonos', addAbono);
router.put('/pedidos/:id/estado', updateEstado);
router.put('/pedidos/:id', updatePedido); 

// Rutas para Impresión Térmica y Ticket Digital (Compartir)
router.post('/pedidos/:id/print', printPedidoTicket);
router.get('/pedidos/:id/share', sharePedidoTicket);

export default router;