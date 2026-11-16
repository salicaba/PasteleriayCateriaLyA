// backend/src/modules/auth/auth.routes.js
import { Router } from 'express';
import { login, logout, registerTestUser } from './auth.controller.js';

const router = Router();

router.post('/login', login);
router.post('/logout', logout); // 🔥 NUEVA RUTA
router.post('/register', registerTestUser);

export default router;