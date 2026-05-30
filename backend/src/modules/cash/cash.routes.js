import { Router } from 'express';
import { 
  getTransactions, 
  cancelTransaction, 
  restoreTransaction, 
  registerManualTransaction,
  getFinancialSummary // <-- Importamos la nueva función
} from './cash.controller.js';
import { verifyToken } from '../../middlewares/auth.middleware.js'; 

const router = Router();

router.use(verifyToken); 

router.get('/', getTransactions);
router.get('/summary', getFinancialSummary); // 🔥 NUEVA RUTA DEL DASHBOARD
router.post('/manual', registerManualTransaction); 
router.post('/:id/cancel', cancelTransaction);
router.post('/:id/restore', restoreTransaction);

export default router;