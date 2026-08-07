import { Router } from 'express';
import { 
  getConfig, 
  updateConfig, 
  getQrStatus, 
  setQrStatus 
} from './settings.controller.js'; 

// 🔥 Inyectamos el middleware de control de roles (RBAC)
import { authorizeRoles } from '../../middlewares/rbac.middleware.js';

const router = Router();

// ==========================================
// CONFIGURACIÓN GENERAL DEL NEGOCIO
// ==========================================

// Obtener la configuración actual (Lectura autorizada para ambos roles)
router.get('/', authorizeRoles('Administrador', 'Empleado'), getConfig);

// Actualizar o guardar la configuración (Escritura autorizada para que el empleado pueda prender/apagar su impresora local)
router.put('/', authorizeRoles('Administrador', 'Empleado'), updateConfig);


// ==========================================
// KILL-SWITCH: ESTADO DEL SERVICIO QR
// ==========================================

// Obtener el estado actual del servicio QR
router.get('/qr-status', authorizeRoles('Administrador', 'Empleado'), getQrStatus);

// Apagar o encender el servicio QR
router.post('/qr-status', authorizeRoles('Administrador', 'Empleado'), setQrStatus);

export default router;