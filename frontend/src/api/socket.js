// frontend/src/api/socket.js
import { io } from 'socket.io-client';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// 🔥 BLINDAJE ABSOLUTO: Ignoramos Vercel y forzamos la ruta correcta de Render.
const backendUrl = isLocalhost 
  ? 'http://localhost:4000' 
  : 'https://lya-backend-2gay.onrender.com';

// 1. 🔥 EXPORTACIÓN NOMBRADA: Para useMesasController, useKitchenController, etc.
export const socket = io(backendUrl, {
  transports: ['websocket', 'polling'], // Priorizamos WebSockets
  tryAllTransports: true,               // Si WS falla al despertar en tablet/APK, cae a polling sin morir
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,       // 🔥 Nunca se rinde permanentemente
  reconnectionDelay: 1000,              // Reintenta rápido al volver de otra app (1s)
  reconnectionDelayMax: 5000,           // Máximo 5s entre reintentos
  timeout: 20000,                       // Margen suficiente para Render
});

socket.on('connect_error', (err) => {
  console.warn('⚠️ Error de conexión en Socket.io:', err.message);
});

// 2. 🔥 EXPORTACIÓN POR DEFECTO: Para App.jsx
export default socket;