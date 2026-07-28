// frontend/src/api/client.js
import axios from 'axios';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// 🔥 BLINDAJE ABSOLUTO: Forzamos la ruta de la API, sin depender de Vercel.
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
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn('⚠️ Sesión expirada o token inválido. Cerrando sesión automáticamente...');
      
      localStorage.removeItem('lya_token');
      localStorage.removeItem('lya_user');
      localStorage.removeItem('lya_pos_session');
      
      window.dispatchEvent(new Event('auth_error'));
    }
    return Promise.reject(error);
  }
);

export default client;