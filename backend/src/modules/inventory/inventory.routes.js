import express from 'express';
// 1. Añade 'deleteItem' a la importación
import { getInventory, createItem, registerTransaction, getItemHistory, deleteItem } from './inventory.controller.js';

const router = express.Router();

router.get('/', getInventory);
router.post('/', createItem);
router.post('/transaction', registerTransaction);
router.get('/:id/history', getItemHistory);

// 2. Añade esta nueva ruta:
router.delete('/:id', deleteItem);

export default router;