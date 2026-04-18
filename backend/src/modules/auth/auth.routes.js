import { Router } from 'express';
import { login, registerTestUser } from './auth.controller.js';

const router = Router();

router.post('/login', login);
router.post('/register', registerTestUser); // Solo para crear tu primer usuario de prueba

export default router;