import { Router } from 'express';
import { getCategories, createCategory, updateCategory, reorderCategories, deleteCategory, getProducts, createProduct, updateProduct, deleteProduct, getGlobalOptions, createGlobalOption, deleteGlobalOption } from './menu.controller.js';

const router = Router();

// Rutas de Categorías
router.get('/categories', getCategories);
router.post('/categories', createCategory);

// 👇 FIX: La ruta específica (/reorder) DEBE ir antes que la paramétrica (/:id) para evitar falsos positivos
router.put('/categories/reorder', reorderCategories);
router.put('/categories/:id', updateCategory);

router.delete('/categories/:id', deleteCategory);

// Rutas de Productos
router.get('/products', getProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Rutas de Opciones Globales
router.get('/options', getGlobalOptions);
router.post('/options', createGlobalOption);
router.delete('/options/:id', deleteGlobalOption);

export default router;