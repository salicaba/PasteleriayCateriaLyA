import express from 'express';
import { 
  getInventory, 
  createItem, 
  registerTransaction, 
  getItemHistory, 
  deleteItem,
  processReconciliation,
  getGlobalHistory // 🔥 1. Importamos la nueva función del controlador
} from './inventory.controller.js';

import { verifyToken } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', getInventory);
router.post('/', createItem);

// 🔥 2. COLOCAR AQUÍ: La ruta global debe ir antes de cualquier ruta dinámica con parámetros (/:id)
router.get('/history/global', verifyToken, getGlobalHistory);

router.post('/reconciliation', verifyToken, processReconciliation);
router.post('/transaction', registerTransaction);

router.get('/:id/history', getItemHistory);
router.delete('/:id', deleteItem);

export default router;