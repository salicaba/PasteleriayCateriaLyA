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
  deleteTable
} from './pos.controller.js';

const router = Router();

router.get('/orders/active', getActiveOrders);
router.get('/orders/table/:tableId', getActiveOrderByTable); // NUEVO
router.post('/orders', createOrder);
router.post('/orders/:orderId/items', addItemsToOrder);
router.put('/orders/:orderId/pay', payOrder); // NUEVO
router.put('/orders/:orderId/close', closeOrder); // NUEVO

router.get('/tables', getTables);
router.post('/tables', createTable);
router.delete('/tables/:id', deleteTable);

export default router;