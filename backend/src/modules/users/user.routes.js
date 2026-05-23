// src/modules/users/user.routes.js
import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from './user.controller.js';

const router = Router();

// Endpoints base: /api/users
router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;