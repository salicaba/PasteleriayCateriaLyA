import { Router } from 'express';
import { 
  getConfig, 
  updateConfig, 
  getQrStatus, 
  setQrStatus 
} from './settings.controller.js'; 

const router = Router();

// ==========================================
// CONFIGURACIÓN GENERAL DEL NEGOCIO
// ==========================================

// Obtener la configuración actual
router.get('/', getConfig);

// Actualizar o guardar la configuración
router.put('/', updateConfig);


// ==========================================
// KILL-SWITCH: ESTADO DEL SERVICIO QR
// ==========================================

// Obtener el estado actual del servicio QR
router.get('/qr-status', getQrStatus);

// Apagar o encender el servicio QR
router.post('/qr-status', setQrStatus);

export default router;