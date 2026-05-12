import { Router } from 'express';
// Asegúrate de que el controlador esté exportando correctamente estas funciones
import { getConfig, updateConfig } from './settings.controller.js'; 

const router = Router();

// Obtener la configuración actual
router.get('/', getConfig);

// Actualizar o guardar la configuración
router.put('/', updateConfig);

export default router;