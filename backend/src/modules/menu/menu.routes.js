// src/modules/menu/menu.routes.js
import { Router } from 'express';
import { 
  getCategories, 
  createCategory, 
  reorderCategories, 
  deleteCategory,
  updateCategory, // <-- ¡AQUÍ ESTÁ LA CORRECCIÓN!
  getProducts, 
  createProduct,
  updateProduct,
  deleteProduct
} from './menu.controller.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/rbac.middleware.js';

const router = Router();

// ==========================================
// 📁 RUTAS DE CATEGORÍAS
// ==========================================

router.get('/categories', verifyToken, authorizeRoles('Owner', 'Employee'), getCategories);
router.post('/categories', verifyToken, authorizeRoles('Owner'), createCategory);
router.put('/categories/reorder', verifyToken, authorizeRoles('Owner'), reorderCategories);
router.put('/categories/:id', verifyToken, authorizeRoles('Owner'), updateCategory); // Ruta de edición
router.delete('/categories/:id', verifyToken, authorizeRoles('Owner'), deleteCategory);

// ==========================================
// 🍔 RUTAS DE PRODUCTOS
// ==========================================

router.get('/products', verifyToken, authorizeRoles('Owner', 'Employee'), getProducts);
router.post('/products', verifyToken, authorizeRoles('Owner'), createProduct);
router.put('/products/:id', verifyToken, authorizeRoles('Owner'), updateProduct);
router.delete('/products/:id', verifyToken, authorizeRoles('Owner'), deleteProduct);

export default router;