import { Router } from 'express';
import { createOrder, addItemsToOrder, getActiveOrders } from './pos.controller.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/rbac.middleware.js';

const router = Router();

// Todas estas rutas requieren estar logueado y ser Owner o Employee
router.use(verifyToken, authorizeRoles('Owner', 'Employee'));

router.post('/orders', createOrder); // Abre mesa o ticket
router.post('/orders/:orderId/items', addItemsToOrder); // Manda a cocina
router.get('/orders/active', getActiveOrders); // Lee las órdenes abiertas

export default router;