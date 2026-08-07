import { Router } from 'express';
import { 
  getConfig, 
  updateConfig, 
  getQrStatus, 
  setQrStatus 
} from './settings.controller.js'; 

import { authorizeRoles } from '../../middlewares/rbac.middleware.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';

const router = Router();

// ==========================================
// CONFIGURACIÓN GENERAL DEL NEGOCIO
// ==========================================

// 🟢 GET: PÚBLICO (Vital para que el frontend detecte conexión en el Login sin tener token)
router.get('/', getConfig);

// 🔴 PUT: PROTEGIDO (Solo Admin y Empleado pueden guardar cambios)
router.put('/', verifyToken, authorizeRoles('Administrador', 'Empleado'), updateConfig);


// ==========================================
// KILL-SWITCH: ESTADO DEL SERVICIO QR
// ==========================================

// 🟢 GET: PÚBLICO (El Kiosko cliente necesita leer esto para saber si mostrar el QR)
router.get('/qr-status', getQrStatus);

// 🔴 POST: PROTEGIDO
router.post('/qr-status', verifyToken, authorizeRoles('Administrador', 'Empleado'), setQrStatus);

export default router;