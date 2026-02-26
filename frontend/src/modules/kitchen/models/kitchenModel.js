export const MOCK_ORDERS = [
  {
    id: 'ORD-101',
    mesa: 'Mesa 4',
    mesero: 'Juan P.',
    batch: 1, // Tanda 1
    createdAt: new Date(Date.now() - 3 * 60000).toISOString(), // Hace 3 minutos (Verde)
    estado: 'pendiente',
    items: [
      {
        id: 1,
        nombre: 'Rebanada de Pastel',
        qty: 1,
        precio: 45,
        preparaciones: [
          // Añadimos idPrep e isReady a cada preparación individual
          { idPrep: 'p1-1', tamano: 'Estándar', extras: [], isReady: false } 
        ]
      }
    ]
  },
  {
    id: 'ORD-102',
    mesa: 'Terraza 2',
    mesero: 'Ana G.',
    batch: 1,
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(), // Hace 8 minutos (Amarillo)
    estado: 'pendiente',
    items: [
      {
        id: 2,
        nombre: 'Latte Caliente',
        qty: 2,
        precio: 55,
        preparaciones: [
          { idPrep: 'p2-1', tamano: 'Grande', leche: 'Entera', extras: [], isReady: false },
          { idPrep: 'p2-2', tamano: 'Grande', leche: 'Deslactosada', extras: [], isReady: false }
        ]
      },
      {
        id: 5,
        nombre: 'Capuchino',
        qty: 1,
        precio: 60,
        preparaciones: [
          { idPrep: 'p5-1', tamano: 'Chico', leche: 'Almendras', extras: ['Canela'], isReady: false }
        ]
      }
    ]
  },
  {
    id: 'ORD-103',
    mesa: 'Mesa 4',
    mesero: 'Juan P.',
    batch: 2, // ¡Tanda 2! La mesa 4 pidió algo más tarde
    createdAt: new Date(Date.now() - 11 * 60000).toISOString(), // Hace 11 minutos (Rojo)
    estado: 'pendiente',
    items: [
      {
        id: 8,
        nombre: 'Frappé Oreo',
        qty: 1,
        precio: 75,
        preparaciones: [
          { idPrep: 'p8-1', tamano: 'Grande', extras: ['Extra Crema'], isReady: false }
        ]
      }
    ]
  }
];