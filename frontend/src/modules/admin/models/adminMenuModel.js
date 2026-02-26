export const MOCK_CATEGORIES = ['Bebidas Calientes', 'Bebidas Frías', 'Postres', 'Comida'];

export const MOCK_ADMIN_PRODUCTS = [
  {
    id: 'prod-001',
    nombre: 'Latte Caliente',
    categoria: 'Bebidas Calientes',
    precioBase: 55,
    disponible: true,
    imagen: '☕', // En producción será una URL de Firebase Storage
    opciones: {
      tamanos: ['Chico', 'Mediano', 'Grande'],
      leches: ['Entera', 'Deslactosada', 'Almendras', 'Avena'],
      extras: ['Carga Extra', 'Vainilla', 'Caramelo']
    }
  },
  {
    id: 'prod-002',
    nombre: 'Rebanada Tres Leches',
    categoria: 'Postres',
    precioBase: 65,
    disponible: false, // Ejemplo de producto "Sold Out"
    imagen: '🍰',
    opciones: {
      tamanos: ['Estándar'],
      leches: [],
      extras: ['Vela de Cumpleaños']
    }
  }
];