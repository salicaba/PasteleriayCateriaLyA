export const MOCK_PRODUCTS = [
  { id: 1, nombre: 'Latte Vainilla', precio: 55, categoria: 'cafes', imagen: 'https://images.unsplash.com/photo-1570968992193-96a292294c50?w=400' },
  { id: 2, nombre: 'Capuchino', precio: 50, categoria: 'cafes', imagen: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400' },
  { id: 3, nombre: 'Pastel Zanahoria', precio: 65, categoria: 'pasteles', imagen: 'https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=400' },
  { id: 4, nombre: 'Red Velvet', precio: 70, categoria: 'pasteles', imagen: 'https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?w=400' },
  { id: 5, nombre: 'Croissant', precio: 35, categoria: 'pan', imagen: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400' },
  { id: 6, nombre: 'Bagel Salmón', precio: 85, categoria: 'comida', imagen: 'https://images.unsplash.com/photo-1519340333755-56e9c1d04579?w=400' },
];

export const CATEGORIAS = [
  { id: 'todas', label: 'Todo' },
  { id: 'cafes', label: 'Cafés' },
  { id: 'pasteles', label: 'Pasteles' },
  { id: 'pan', label: 'Panadería' },
  { id: 'comida', label: 'Snacks' },
];

export const MODIFIERS = {
  cafes: [
    {
      id: 'size',
      title: 'Tamaño',
      type: 'single', // Solo puedes elegir uno
      options: [
        { id: 's', label: 'Chico (8oz)', price: 0 },
        { id: 'm', label: 'Mediano (12oz)', price: 10 },
        { id: 'l', label: 'Grande (16oz)', price: 15 },
      ]
    },
    {
      id: 'milk',
      title: 'Tipo de Leche',
      type: 'single',
      options: [
        { id: 'entera', label: 'Entera', price: 0 },
        { id: 'deslac', label: 'Deslactosada', price: 0 },
        { id: 'almendra', label: 'Almendra', price: 12 },
        { id: 'avena', label: 'Avena', price: 12 },
      ]
    },
    {
      id: 'extras',
      title: 'Extras',
      type: 'multiple', // Puedes elegir varios
      options: [
        { id: 'shot', label: 'Shot Espresso', price: 10 },
        { id: 'vainilla', label: 'Jarabe Vainilla', price: 8 },
        { id: 'crema', label: 'Crema Batida', price: 5 },
      ]
    }
  ],
  pasteles: [
    {
      id: 'calentar',
      title: 'Preparación',
      type: 'single',
      options: [
        { id: 'frio', label: 'Temperatura Ambiente', price: 0 },
        { id: 'caliente', label: 'Calentar', price: 0 },
      ]
    }
  ]
};