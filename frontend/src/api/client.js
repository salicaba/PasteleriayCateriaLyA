// frontend/src/api/client.js
import axios from 'axios';

// Detectamos si estamos en producción (Vercel) para usar Render
// Si estamos probando en local, usa localhost:4000
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const defaultBaseUrl = isLocalhost 
  ? 'http://localhost:4000/api' 
  : 'https://lya-backend-2gay.onrender.com/api';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Inyecta el token en cada petición al backend
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lya_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Respuestas para manejar la expiración del token globalmente
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si el servidor responde que no hay autorización (401) o el token es inválido/expiró (403)
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn('⚠️ Sesión expirada o token inválido. Cerrando sesión automáticamente...');
      
      // Limpiamos los rastros corruptos o expirados de inmediato
      localStorage.removeItem('lya_token');
      localStorage.removeItem('lya_user');
      localStorage.removeItem('lya_pos_session');
      
      // 🔥 FIX: En lugar de forzar una recarga bruta del navegador que causaba el parpadeo en SPAs,
      // lanzamos un evento global para que React (App.jsx) lo procese y vuelva a Login limpiamente.
      window.dispatchEvent(new Event('auth_error'));
    }
    return Promise.reject(error);
  }
);

export default client;