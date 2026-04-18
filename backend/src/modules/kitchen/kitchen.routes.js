import { Router } from 'express';
import { getKitchenTickets, updateKitchenStatus } from './kitchen.controller.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/rbac.middleware.js';

const router = Router();

router.use(verifyToken, authorizeRoles('Owner', 'Employee'));

router.get('/tickets', getKitchenTickets); // Pantalla del Kanban de cocina
router.put('/tickets/:itemId/status', updateKitchenStatus); // Botón de "Comenzar" o "Terminar" platillo

export default router;