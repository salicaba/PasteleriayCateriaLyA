// frontend/src/api/client.js
import axios from 'axios';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const baseUrl = isLocalhost 
  ? 'http://localhost:4000/api' 
  : 'https://lya-backend-2gay.onrender.com/api';

const client = axios.create({
  baseURL: baseUrl,
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

// Interceptor de Respuestas
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isKickout = error.response?.data?.isKickout;
    const message = error.response?.data?.message;

    // 🔥 AISLAMIENTO: Solo cerramos sesión si el token es inválido (401) o si es un Kickout explícito (403 + isKickout)
    if (status === 401 || (status === 403 && isKickout)) {
      console.warn('⚠️ Sesión expirada o revocada. Cerrando sesión limpiamente...');
      window.dispatchEvent(new CustomEvent('auth_error', { 
        detail: { message: message || 'Sesión expirada', isKickout } 
      }));
    } else if (status === 403) {
      // Es un error RBAC normal, solo mostramos alerta sin botar al admin
      window.dispatchEvent(new CustomEvent('rbac_error', { 
        detail: { message: message || 'No tienes permisos para realizar esta acción.' } 
      }));
    }
    
    return Promise.reject(error);
  }
);

export default client;