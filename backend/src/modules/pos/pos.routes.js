import { Router } from 'express';
import { 
  getActiveOrders, 
  createOrder, 
  addItemsToOrder,
  getTables,      // <-- Importamos las funciones de mesas
  createTable,
  deleteTable
} from './pos.controller.js';

const router = Router();

// ==========================================
// RUTAS DE ÓRDENES
// ==========================================
router.get('/orders/active', getActiveOrders);
router.post('/orders', createOrder);
router.post('/orders/:orderId/items', addItemsToOrder);

// ==========================================
// RUTAS DE MESAS (Catálogo y QR)
// ==========================================
// Estas son las rutas que tu frontend está intentando leer (y que daban 404)
router.get('/tables', getTables);
router.post('/tables', createTable);
router.delete('/tables/:id', deleteTable);

export default router;