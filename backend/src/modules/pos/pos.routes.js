// backend/src/modules/pos/pos.routes.js
import { Router } from 'express';
import { verifyToken } from '../../middlewares/auth.middleware.js';

// --- NUEVAS IMPORTACIONES MODULARES ---
import { 
  createOrder, 
  addItemsToOrder, 
  getActiveOrderByTable, 
  closeOrder, 
  getActiveOrders, 
  moveItemAccount, 
  deliverAllItems 
} from './pos.orders.controller.js';

import { 
  getTables, 
  createTable, 
  deleteTable 
} from './pos.tables.controller.js';

import { 
  payOrder 
} from './pos.payments.controller.js';

import { 
  printOrderTicket, 
  shareOrderTicket 
} from './pos.tickets.controller.js';

import { 
  cancelOrderItem, 
  cancelOrder, 
  getDailySummary, 
  restoreOrderItem, 
  restoreOrder 
} from './pos.cancellations.controller.js';
// ---------------------------------------

const router = Router();

// 🟢 RUTAS PÚBLICAS (No necesitan token, van antes del middleware)
// Esta es la ruta más corta para los clientes
router.get('/ticket/:orderId', shareOrderTicket); 
// Mantenemos la anterior temporalmente por si hay tickets viejos dando vueltas
router.get('/orders/:orderId/share', shareOrderTicket); 

// 🔥 FIX: MOVIMOS ESTAS DOS RUTAS AQUÍ ARRIBA PARA QUE EL QR PÚBLICO PUEDA CONFIRMAR ÓRDENES
router.post('/orders', createOrder);
router.post('/orders/:orderId/items', addItemsToOrder);

// 🔴 APLICAMOS EL MIDDLEWARE: Todo lo de abajo requerirá usuario logueado (Cajero/Admin)
router.use(verifyToken);
router.get('/orders/daily-summary', getDailySummary);

// Rutas PROTEGIDAS (Ya tendrán req.user disponible)
router.get('/orders/active', getActiveOrders);
router.get('/orders/table/:tableId', getActiveOrderByTable); 
router.put('/orders/:orderId/pay', payOrder); 
router.put('/orders/:orderId/close', closeOrder); 
router.post('/orders/:orderId/print', printOrderTicket);

router.get('/tables', getTables);
router.post('/tables', createTable);
router.delete('/tables/:id', deleteTable);
router.put('/orders/items/:itemId/move', moveItemAccount);

// 🔥 RUTAS DE CANCELACIÓN
router.put('/orders/:id/deliver-all', deliverAllItems);
router.put('/orders/:id/items/:itemId/cancel', cancelOrderItem);
router.put('/orders/:id/cancel', cancelOrder);

// ♻️ NUEVAS RUTAS DE RESTAURACIÓN (Papelera)
router.put('/orders/:id/restore', restoreOrder);
router.put('/orders/:id/items/:itemId/restore', restoreOrderItem);

export default router;