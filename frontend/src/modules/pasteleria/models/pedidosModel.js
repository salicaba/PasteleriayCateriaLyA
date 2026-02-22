export const mockPedidos = [
  {
    id: "PED-001",
    cliente: "María González",
    telefono: "555-0192",
    descripcion: "Pastel de Boda. Entregar directamente en el salón de eventos.",
    fechaEntrega: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(), // En 2 días
    costoTotal: 2500,
    abonos: [
      { id: "A-1", fecha: new Date().toISOString(), monto: 500 },
      { id: "A-2", fecha: new Date().toISOString(), monto: 500 }
    ],
    estado: "produccion",
    porciones: ["50 pax (Base)", "30 pax (Medio)"], // Ahora es un arreglo libre
    saborPan: ["Chocolate oscuro", "Red Velvet"], // Ahora es un arreglo libre
    tipoEntrega: 'domicilio',
    direccion: 'Salón Las Palmas, Av. Central #123'
  },
  {
    id: "PED-002",
    cliente: "Carlos Ruiz",
    telefono: "555-8473",
    descripcion: "Cheesecake decorado con fresas frescas y letrero de 'Feliz Cumpleaños'.",
    fechaEntrega: new Date().toISOString(), // Hoy
    costoTotal: 600,
    abonos: [
      { id: "A-3", fecha: new Date().toISOString(), monto: 200 }
    ],
    estado: "listo",
    porciones: ["15 pax"],
    saborPan: ["Fresa natural"],
    tipoEntrega: 'sucursal'
  }
];

export const fetchPedidosPasteleria = async () => {
  // Retorno inmediato, sin simulador de carga
  return [...mockPedidos];
};