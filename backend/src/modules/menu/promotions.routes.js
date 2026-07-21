import { Router } from 'express';
import { getAllPromotions, setupPromotion, togglePromotionStatus } from './promotions.controller.js';
// Ajusta las rutas de los middlewares si tu estructura de carpetas difiere ligeramente
import { verifyToken } from '../../middlewares/auth.middleware.js'; 

const router = Router();

// Endpoint público/privado (dependiendo si el QR necesita jalar esto directamente)
router.get('/', getAllPromotions);

// Endpoints protegidos (Solo Admin/Empleados autorizados)
router.post('/product/:productId', verifyToken, setupPromotion);
router.patch('/:id/toggle', verifyToken, togglePromotionStatus);

export default router;