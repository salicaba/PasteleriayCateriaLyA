import { io } from 'socket.io-client';

// Detecta automáticamente la IP para el WebSocket
const backendUrl = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '') 
  : `http://${window.location.hostname}:4000`;

export const socket = io(backendUrl, {
  autoConnect: true,
  reconnection: true,
});