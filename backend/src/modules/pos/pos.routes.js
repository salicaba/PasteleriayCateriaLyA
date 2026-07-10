// backend/src/modules/pos/pos.routes.js
import { Router } from 'express';
import { verifyToken } from '../../middlewares/auth.middleware.js';

import { 
  createOrder, 
  addItemsToOrder, 
  getActiveOrderByTable, 
  closeOrder, 
  getActiveOrders, 
  moveItemAccount, 
  deliverAllItems,
  checkOrderStatus // 🔥 IMPORTAMOS LA NUEVA FUNCIÓN AQUÍ
} from './pos.orders.controller.js';

import { getTables, createTable, deleteTable } from './pos.tables.controller.js';
import { payOrder } from './pos.payments.controller.js';
import { printOrderTicket, shareOrderTicket } from './pos.tickets.controller.js';
import { cancelOrderItem, cancelOrder, getDailySummary, restoreOrderItem, restoreOrder } from './pos.cancellations.controller.js';

const router = Router();

// =========================================================================
// 🟢 RUTAS PÚBLICAS (No necesitan token, van antes del middleware)
// =========================================================================
router.get('/ticket/:orderId', shareOrderTicket); 
router.get('/orders/:orderId/share', shareOrderTicket); 

router.post('/orders', createOrder);
router.post('/orders/:orderId/items', addItemsToOrder);

// 🔥 NUEVA RUTA: El celular del cliente usará esto para saber de qué color pintar la pantalla
router.get('/orders/:orderId/status', checkOrderStatus);

// =========================================================================
// 🔴 APLICAMOS EL MIDDLEWARE: Todo lo de abajo requerirá usuario logueado
// =========================================================================
router.use(verifyToken);

router.get('/orders/daily-summary', getDailySummary);
router.get('/orders/active', getActiveOrders);
router.get('/orders/table/:tableId', getActiveOrderByTable); 
router.put('/orders/:orderId/pay', payOrder); 
router.put('/orders/:orderId/close', closeOrder); 
router.post('/orders/:orderId/print', printOrderTicket);

router.get('/tables', getTables);
router.post('/tables', createTable);
router.delete('/tables/:id', deleteTable);
router.put('/orders/items/:itemId/move', moveItemAccount);

router.put('/orders/:id/deliver-all', deliverAllItems);
router.put('/orders/:id/items/:itemId/cancel', cancelOrderItem);
router.put('/orders/:id/cancel', cancelOrder);
router.put('/orders/:id/restore', restoreOrder);
router.put('/orders/:id/items/:itemId/restore', restoreOrderItem);

export default router;