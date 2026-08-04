import { Router } from 'express';
import { getDashboardData, getProductStats } from './reports.controller.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/rbac.middleware.js';

const router = Router();

// Protegemos la ruta para que solo Administradores puedan ver los reportes
router.get('/dashboard', verifyToken, authorizeRoles('Administrador'), getDashboardData);

// 🔥 NUEVA RUTA: Estadísticas por producto
router.get('/product/:productId/stats', verifyToken, authorizeRoles('Administrador'), getProductStats);

export default router;