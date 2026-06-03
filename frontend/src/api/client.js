import axios from 'axios';

const client = axios.create({
  // Detecta automáticamente si estás en localhost o en una IP (ej. 192.168.1.5)
  baseURL: import.meta.env.VITE_API_URL || `http://${window.location.hostname}:4000/api`,
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