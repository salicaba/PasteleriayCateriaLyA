export const MOCK_ORDERS = [
  {
    id: 'ORD-101',
    mesa: 'Mesa 4',
    mesero: 'Juan P.',
    hora: '10:42 AM',
    estado: 'pendiente', // pendiente, preparando, listo
    items: [
      {
        id: 1,
        nombre: 'Rebanada de Pastel',
        qty: 1,
        precio: 45,
        // Caso simple: 1 sola preparación
        preparaciones: [{ tamano: 'Estándar', extras: [] }]
      }
    ]
  },
  {
    id: 'ORD-102',
    mesa: 'Terraza 2',
    mesero: 'Ana G.',
    hora: '10:45 AM',
    estado: 'pendiente',
    items: [
      {
        id: 2,
        nombre: 'Latte Caliente',
        qty: 2, // <--- EN EL TICKET DEL POS SE VE COMO "2 x Latte"
        precio: 55,
        // <--- AQUÍ ESTÁ LA MAGIA: La cocina recibe el desglose
        preparaciones: [
          { tamano: 'Grande', leche: 'Entera', extras: [] },     // Café 1
          { tamano: 'Grande', leche: 'Deslactosada', extras: [] } // Café 2
        ]
      },
      {
        id: 5,
        nombre: 'Capuchino',
        qty: 1,
        precio: 60,
        preparaciones: [
          { tamano: 'Chico', leche: 'Almendras', extras: ['Canela'] }
        ]
      }
    ]
  }
];