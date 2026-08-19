import express from 'express';
import { 
  getInventory, 
  createItem, 
  registerTransaction, 
  getItemHistory, 
  deleteItem,
  processReconciliation,
  getGlobalHistory,
  cancelTransaction, // 🔥 ¡Faltaba importar esta!
  restoreTransaction // 🔥 ¡Y esta también!
} from './inventory.controller.js';

import { verifyToken } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// 🔥 1. Blindaje total: Todas las rutas de inventario deben estar protegidas
router.get('/', verifyToken, getInventory);
router.post('/', verifyToken, createItem);

// 🔥 2. RUTAS ESTÁTICAS: La ruta global DEBE ir antes de las dinámicas (/:id)
router.get('/history/global', verifyToken, getGlobalHistory);

router.post('/reconciliation', verifyToken, processReconciliation);
router.post('/transaction', verifyToken, registerTransaction);

// 🔥 RUTAS DE ANULACIÓN Y RESTAURACIÓN
router.post('/transaction/:id/cancel', verifyToken, cancelTransaction);
router.post('/transaction/:id/restore', verifyToken, restoreTransaction);

// 🔥 3. RUTAS DINÁMICAS: Siempre al final
router.get('/:id/history', verifyToken, getItemHistory);
router.delete('/:id', verifyToken, deleteItem);

export default router;