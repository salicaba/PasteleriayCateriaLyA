import { Router } from 'express';
import { getProducts, createProduct } from './menu.controller.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/rbac.middleware.js';

const router = Router();

// Endpoint para leer: Pasan Owner y Employee
router.get('/products', verifyToken, authorizeRoles('Owner', 'Employee'), getProducts);

// Endpoint para crear: Solo pasa el Owner
router.post('/products', verifyToken, authorizeRoles('Owner'), createProduct);

export default router;