// frontend/src/api/socket.js
import { io } from 'socket.io-client';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// 🔥 BLINDAJE ABSOLUTO: Ignoramos Vercel y forzamos la ruta correcta de Render.
const backendUrl = isLocalhost 
  ? 'http://localhost:4000' 
  : 'https://lya-backend-2gay.onrender.com';

// 1. 🔥 EXPORTACIÓN NOMBRADA: Para useMesasController, useKitchenController, etc. (import { socket } from...)
export const socket = io(backendUrl, {
  transports: ['websocket', 'polling'], // Priorizamos WebSockets
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});

socket.on('connect_error', (err) => {
  console.warn('⚠️ Error de conexión en Socket.io:', err.message);
});

// 2. 🔥 EXPORTACIÓN POR DEFECTO: Para App.jsx (import socket from...)
export default socket;