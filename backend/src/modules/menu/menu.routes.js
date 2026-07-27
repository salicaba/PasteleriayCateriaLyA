// backend/src/modules/menu/menu.routes.js
import { Router } from 'express';
import { verifyToken } from '../../middlewares/auth.middleware.js'; // 🔥 IMPORTAMOS EL CANDADO DE SEGURIDAD
import { 
  getCategories, 
  createCategory, 
  updateCategory, 
  reorderCategories, 
  deleteCategory, 
  getProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  getGlobalOptions, 
  createGlobalOption, 
  deleteGlobalOption,
  reorderGlobalOptions
} from './menu.controller.js';

const router = Router();

// =========================================================
// 🟢 RUTAS PÚBLICAS (El Kiosko del cliente necesita ver esto)
// =========================================================
router.get('/categories', getCategories);
router.get('/products', getProducts);
router.get('/options', getGlobalOptions);

// =========================================================
// 🔴 RUTAS PROTEGIDAS (Solo los empleados pueden modificar)
// =========================================================
router.use(verifyToken); // 🔥 A partir de aquí, o tienes sesión, o te rechaza

// Rutas de Categorías
router.post('/categories', createCategory);
router.put('/categories/reorder', reorderCategories);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Rutas de Productos
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Rutas de Opciones Globales
router.post('/options', createGlobalOption);
router.put('/options/reorder', reorderGlobalOptions); 
router.delete('/options/:id', deleteGlobalOption);

export default router;