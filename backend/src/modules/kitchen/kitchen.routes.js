// backend/src/modules/kitchen/kitchen.routes.js
import { Router } from 'express';
import { getKitchenTickets, updateKitchenStatus } from './kitchen.controller.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/rbac.middleware.js';

const router = Router();

// 🔥 CORRECCIÓN: Roles actualizados a 'Administrador' y 'Empleado' para coincidir con el token y la BD
router.use(verifyToken, authorizeRoles('Administrador', 'Empleado'));

router.get('/tickets', getKitchenTickets); // Pantalla del Kanban de cocina
router.put('/tickets/:itemId/status', updateKitchenStatus); // Botón de "Comenzar" o "Terminar" platillo

export default router;