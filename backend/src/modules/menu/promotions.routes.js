import { Router } from 'express';
import { getAllPromotions, setupPromotion, togglePromotionStatus, updatePromotion, deletePromotion } from './promotions.controller.js';
import { verifyToken, isAdmin } from '../../middlewares/auth.middleware.js';

const router = Router();

// Obtener todas las promociones (Globales y Específicas)
router.get('/', getAllPromotions);

// 🔥 NUEVA RUTA: Crear promoción global
router.post('/', [verifyToken, isAdmin], setupPromotion);

// Crear promoción específica a un producto (Mantenemos por si acaso)
router.post('/product/:productId', [verifyToken, isAdmin], setupPromotion);

// Alternar estado (encender/apagar)
router.patch('/:id/toggle', [verifyToken, isAdmin], togglePromotionStatus);

// Editar promoción
router.put('/:id', [verifyToken, isAdmin], updatePromotion);

// Eliminar promoción
router.delete('/:id', [verifyToken, isAdmin], deletePromotion);

export default router;