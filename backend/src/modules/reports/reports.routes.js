import { Router } from 'express';
import { getDashboardData } from './reports.controller.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/rbac.middleware.js';

const router = Router();

// Protegemos la ruta para que solo Administradores puedan ver los reportes
router.get('/dashboard', verifyToken, authorizeRoles('Administrador'), getDashboardData);

export default router;