// src/modules/pos/pos.routes.js
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
  shareOrderTicket // <-- NUEVO CONTROLADOR
} from './pos.controller.js';

const router = Router();

router.get('/orders/active', getActiveOrders);
router.get('/orders/table/:tableId', getActiveOrderByTable); 
router.post('/orders', createOrder);
router.post('/orders/:orderId/items', addItemsToOrder);
router.put('/orders/:orderId/pay', payOrder); 
router.put('/orders/:orderId/close', closeOrder); 
router.post('/orders/:orderId/print', printOrderTicket);

// NUEVO: Ruta pública para que el cliente vea y descargue su ticket en PDF
router.get('/orders/:orderId/share', shareOrderTicket); 

router.get('/tables', getTables);
router.post('/tables', createTable);
router.delete('/tables/:id', deleteTable);

router.put('/orders/items/:itemId/move', moveItemAccount);

export default router;