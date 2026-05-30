import express from 'express';
import { 
  getInventory, 
  createItem, 
  registerTransaction, 
  getItemHistory, 
  deleteItem,
  processReconciliation 
} from './inventory.controller.js';

// 🔥 CORRECCIÓN: Importamos verifyToken (que es el nombre real en tu middleware)
import { verifyToken } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', getInventory);
router.post('/', createItem);

// 🔥 CORRECCIÓN: Usamos verifyToken para proteger la ruta
router.post('/reconciliation', verifyToken, processReconciliation);

router.post('/transaction', registerTransaction);
router.get('/:id/history', getItemHistory);
router.delete('/:id', deleteItem);

export default router;