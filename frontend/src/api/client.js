import axios from 'axios';

// 🔥 Detectamos si estamos en producción (Vercel) para usar Render
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

// Interceptor: Inyecta el token en cada petición
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

export default client;