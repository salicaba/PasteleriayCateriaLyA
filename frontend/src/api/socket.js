// frontend/src/api/socket.js
import { io } from 'socket.io-client';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const defaultBaseUrl = isLocalhost 
  ? 'http://localhost:4000' 
  : 'https://lya-backend-2gay.onrender.com';

// 🚀 AUTO-CORRECCIÓN: Obtenemos la URL y la limpiamos
let rawUrl = import.meta.env.VITE_API_URL || defaultBaseUrl;

// Si por accidente en Vercel se puso "https://https://", esto lo repara.
// Además, le quitamos el "/api" final si lo tiene, porque Socket.io usa la raíz del dominio.
const cleanUrl = rawUrl
  .replace('https://https://', 'https://')
  .replace('http://http://', 'http://')
  .replace(/\/api\/?$/, ''); 

export const socket = io(cleanUrl, {
  transports: ['websocket', 'polling'], // Priorizamos WebSockets para mayor velocidad
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});

socket.on('connect_error', (err) => {
  console.warn('⚠️ Error de conexión en Socket.io:', err.message);
});