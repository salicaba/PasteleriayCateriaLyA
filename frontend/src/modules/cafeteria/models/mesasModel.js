export const ZONAS = [
  { id: 'salon', label: 'Salón Principal' },
  { id: 'terraza', label: 'Terraza' },
  { id: 'barra', label: 'Barra' }
];

export const MOCK_MESAS = [
  // SALÓN
  { id: 1, numero: '1', zona: 'salon', estado: 'ocupada', total: 155.00, horaInicio: '10:30 AM', personas: 2 },
  { id: 2, numero: '2', zona: 'salon', estado: 'libre', total: 0, horaInicio: null, personas: 0 },
  { id: 3, numero: '3', zona: 'salon', estado: 'libre', total: 0, horaInicio: null, personas: 0 },
  { id: 4, numero: '4', zona: 'salon', estado: 'ocupada', total: 85.50, horaInicio: '11:15 AM', personas: 4 },
  { id: 5, numero: '5', zona: 'salon', estado: 'libre', total: 0, horaInicio: null, personas: 0 },
  { id: 6, numero: '6', zona: 'salon', estado: 'libre', total: 0, horaInicio: null, personas: 0 },
  
  // TERRAZA
  { id: 7, numero: 'T-1', zona: 'terraza', estado: 'libre', total: 0, horaInicio: null, personas: 0 },
  { id: 8, numero: 'T-2', zona: 'terraza', estado: 'ocupada', total: 420.00, horaInicio: '09:00 AM', personas: 6 },
  { id: 9, numero: 'T-3', zona: 'terraza', estado: 'libre', total: 0, horaInicio: null, personas: 0 },
  
  // BARRA
  { id: 10, numero: 'B-1', zona: 'barra', estado: 'libre', total: 0, horaInicio: null, personas: 0 },
  { id: 11, numero: 'B-2', zona: 'barra', estado: 'ocupada', total: 45.00, horaInicio: '12:00 PM', personas: 1 },
];