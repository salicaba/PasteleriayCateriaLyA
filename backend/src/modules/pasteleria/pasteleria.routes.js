// backend/src/modules/pasteleria/pasteleria.routes.js
import { Router } from 'express';
import { 
  getPedidos, 
  getPedidoById,
  createPedido, 
  addAbono, 
  updateEstado, 
  updatePedido,
  printPedidoTicket,   
  sharePedidoTicket,
  entregarPedido,    // 🔥 NUEVO: Para marcar entregas
  cancelarPedido,    // 🔥 NUEVO: Cancela pedido y anula dinero en Caja
  restaurarPedido    // 🔥 NUEVO: Restaura pedido y revive dinero en Caja
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
router.get('/pedidos/:id', getPedidoById);
router.post('/pedidos', createPedido);
router.post('/pedidos/:id/abonos', addAbono);
router.put('/pedidos/:id', updatePedido); 
router.post('/pedidos/:id/print', printPedidoTicket);

// Ruta global de estados (Mantenida por retrocompatibilidad)
router.put('/pedidos/:id/estado', updateEstado);

// 🔥 NUEVAS RUTAS DE ESTADOS ESPECÍFICOS (Con sincronización de caja y transacciones)
router.put('/pedidos/:id/entregar', entregarPedido);
router.put('/pedidos/:id/cancelar', cancelarPedido);
router.put('/pedidos/:id/restaurar', restaurarPedido);

export default router;