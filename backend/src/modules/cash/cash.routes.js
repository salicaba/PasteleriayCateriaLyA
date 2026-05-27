import { Router } from 'express';
import { getTransactions, cancelTransaction, restoreTransaction } from './cash.controller.js';
import { verifyToken } from '../../middlewares/auth.middleware.js'; 

const router = Router();

router.use(verifyToken); 

router.get('/', getTransactions);
router.post('/:id/cancel', cancelTransaction);
router.post('/:id/restore', restoreTransaction); // <-- NUEVA RUTA

export default router;