import { Router } from 'express';
import { getAllPromotions, setupPromotion, togglePromotionStatus, updatePromotion, deletePromotion } from './promotions.controller.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';

const router = Router();

// Obtener todas las promociones (Globales y Específicas)
router.get('/', getAllPromotions);

// 🔥 NUEVA RUTA: Crear promoción global
router.post('/', [verifyToken], setupPromotion);

// Crear promoción específica a un producto (Mantenemos por si acaso)
router.post('/product/:productId', [verifyToken], setupPromotion);

// Alternar estado (encender/apagar)
router.patch('/:id/toggle', [verifyToken], togglePromotionStatus);

// Editar promoción
router.put('/:id', [verifyToken], updatePromotion);

// Eliminar promoción
router.delete('/:id', [verifyToken], deletePromotion);

export default router;