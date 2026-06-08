// backend/src/modules/pasteleria/pasteleria.routes.js
import { Router } from 'express';
import { 
  getPedidos, 
  createPedido, 
  addAbono, 
  updateEstado, 
  updatePedido,
  printPedidoTicket,   
  sharePedidoTicket    
} from './pasteleria.controller.js';
import { verifyToken } from '../../middlewares/auth.middleware.js'; // <-- Importamos tu candado

const router = Router();

// ==========================================
// 🌍 RUTAS PÚBLICAS (No requieren sesión)
// ==========================================
// 🟢 NUEVA RUTA: Más corta, elegante y directa para el cliente
router.get('/ticket/:id', sharePedidoTicket);

// La mantenemos por si hay algún link viejo en un chat de WhatsApp
router.get('/pedidos/:id/share', sharePedidoTicket);


// ==========================================
// 🛡️ BARRERA DE SEGURIDAD 
// ==========================================
// Todo lo que esté debajo de esta línea exigirá estar logueado en el sistema
router.use(verifyToken);


// ==========================================
// 🔒 RUTAS PRIVADAS (Solo Empleados / Admins)
// ==========================================
router.get('/pedidos', getPedidos);
router.post('/pedidos', createPedido);
router.post('/pedidos/:id/abonos', addAbono);
router.put('/pedidos/:id/estado', updateEstado);
router.put('/pedidos/:id', updatePedido); 
router.post('/pedidos/:id/print', printPedidoTicket);

export default router;