// backend/src/modules/pos/pos.routes.js
import { Router } from 'express';
import { 
  getActiveOrders, 
  createOrder, 
  addItemsToOrder,
  getActiveOrderByTable,
  payOrder,
  closeOrder,
  getTables,
  createTable,
  deleteTable,
  moveItemAccount,
  printOrderTicket,
  shareOrderTicket 
} from './pos.controller.js';
import { verifyToken } from '../../middlewares/auth.middleware.js'; // <-- 1. Importamos

const router = Router();

// Rutas PÚBLICAS (No necesitan token, van antes del middleware)
router.get('/orders/:orderId/share', shareOrderTicket); 

// APLICAMOS EL MIDDLEWARE: Todo lo de abajo requerirá usuario logueado
router.use(verifyToken);

// Rutas PROTEGIDAS (Ya tendrán req.user disponible)
router.get('/orders/active', getActiveOrders);
router.get('/orders/table/:tableId', getActiveOrderByTable); 
router.post('/orders', createOrder);
router.post('/orders/:orderId/items', addItemsToOrder);
router.put('/orders/:orderId/pay', payOrder); // <-- ¡Aquí es donde ya detectará quién eres!
router.put('/orders/:orderId/close', closeOrder); 
router.post('/orders/:orderId/print', printOrderTicket);

router.get('/tables', getTables);
router.post('/tables', createTable);
router.delete('/tables/:id', deleteTable);

router.put('/orders/items/:itemId/move', moveItemAccount);

export default router;