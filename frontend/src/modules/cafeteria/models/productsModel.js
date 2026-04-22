// src/modules/cafeteria/models/productsModel.js
import client from '../../../api/client.js';

// 1. Obtenemos los productos reales
export const fetchProducts = async () => {
  try {
    const response = await client.get('/menu/products');
    return response.data.map(p => ({
      id: p.id,
      nombre: p.name,
      precio: Number(p.basePrice),
      categoria: p.categoryId, // UUID de la BD
      imagen: p.imageUrl || '/default-product.png',
      stock: p.stockQuantity,
      controlarStock: p.controlarStock,
      detalles: '',
      variantes: p.variants || [],
      opciones: p.opciones || null
    }));
  } catch (error) {
    console.error("Error al obtener los productos:", error);
    return []; 
  }
};

// 2. NUEVO: Obtenemos las categorías reales de tu Base de Datos
export const fetchCategories = async () => {
  try {
    const response = await client.get('/menu/categories');
    
    // Formateamos lo que llega de MySQL
    const categoriasBD = response.data.map(c => ({
      id: c.id,     // UUID real
      name: c.name  // Ej: "Bebidas", "Postres", etc.
    }));
    
    // Siempre agregamos el botón de "Todas" al inicio
    return [{ id: 'todas', name: 'Todas' }, ...categoriasBD];
  } catch (error) {
    console.error("Error al obtener las categorías:", error);
    return [{ id: 'todas', name: 'Todas' }]; 
  }
};