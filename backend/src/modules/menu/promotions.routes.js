import { Router } from 'express';
import { 
  getAllPromotions, 
  setupPromotion, 
  togglePromotionStatus,
  updatePromotion,
  deletePromotion
} from './promotions.controller.js';

const router = Router();

router.get('/', getAllPromotions);
router.post('/product/:productId', setupPromotion);
router.patch('/:id/toggle', togglePromotionStatus);
router.put('/:id', updatePromotion); // NUEVO: Para editar
router.delete('/:id', deletePromotion); // NUEVO: Para eliminar

export default router;