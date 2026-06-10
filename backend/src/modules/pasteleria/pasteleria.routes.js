// backend/src/modules/pasteleria/pasteleria.routes.js
import { Router } from 'express';
import { 
  getPedidos, 
  getPedidoById, // 🔥 NUEVO IMPORT
  createPedido, 
  addAbono, 
  updateEstado, 
  updatePedido,
  printPedidoTicket,   
  sharePedidoTicket    
} from './pasteleria.controller.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';

const router = Router();

// ==========================================
// 🌍 RUTAS PÚBLICAS (No requieren sesión)
// ==========================================
router.get('/ticket/:id', sharePedidoTicket);
router.get('/pedidos/:id/share', sharePedidoTicket);

// ==========================================
// 🛡️ BARRERA DE SEGURIDAD 
// ==========================================
router.use(verifyToken);

// ==========================================
// 🔒 RUTAS PRIVADAS (Solo Empleados / Admins)
// ==========================================
router.get('/pedidos', getPedidos);
router.get('/pedidos/:id', getPedidoById); // 🔥 AQUÍ ESTÁ LA RUTA CORREGIDA
router.post('/pedidos', createPedido);
router.post('/pedidos/:id/abonos', addAbono);
router.put('/pedidos/:id/estado', updateEstado);
router.put('/pedidos/:id', updatePedido); 
router.post('/pedidos/:id/print', printPedidoTicket);

export default router;