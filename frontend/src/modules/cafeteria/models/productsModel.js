import client from '../../../api/client.js';

export const CATEGORIAS = [
  { id: 'todas', nombre: 'Todas' },
  { id: 'bebidas', nombre: 'Bebidas' },
  { id: 'postres', nombre: 'Postres' },
  { id: 'comida', nombre: 'Comida' }
];

// --- AGREGA ESTO DEBAJO DE LAS CATEGORÍAS ---
export const MODIFIERS = [
  { id: 'm1', nombre: 'Leche Deslactosada', precio: 5 },
  { id: 'm2', nombre: 'Leche de Almendra', precio: 10 },
  { id: 'm3', nombre: 'Sin Azúcar', precio: 0 },
  { id: 'm4', nombre: 'Extra Shot', precio: 15 },
  { id: 'm5', nombre: 'Para Llevar', precio: 0 }
];

// Obtenemos los productos reales desde MySQL
export const fetchProducts = async () => {
  try {
    const response = await client.get('/menu/products');
    
    // Mapeamos los datos del backend para que coincidan con lo que espera tu frontend actual
    return response.data.map(p => ({
      id: p.id,
      nombre: p.name,
      precio: Number(p.basePrice),
      categoria: p.categoryId, // Asegúrate de tener categorías que coincidan
      imagen: p.imageUrl || '/default-product.png',
      stock: p.stockQuantity,
      controlarStock: p.controlarStock,
      detalles: '',
      variantes: p.variants || []
    }));
  } catch (error) {
    console.error("Error al obtener los productos:", error);
    return []; // Retorna array vacío en caso de error para no romper la app
  }
};