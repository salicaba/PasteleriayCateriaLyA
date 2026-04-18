// src/modules/auth/controllers/useAuthController.js
import { useState } from 'react';
import client from '../../../api/client.js';

export const useAuthController = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.post('/auth/login', { username, password });
      
      const { token, user } = response.data;
      
      // Guardar sesión en el navegador
      localStorage.setItem('lya_token', token);
      localStorage.setItem('lya_user', JSON.stringify(user));

      // Aquí puedes actualizar tu contexto global o redirigir
      return user; 
    } catch (err) {
      setError(err.response?.data?.message || 'Error de conexión con el servidor');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('lya_token');
    localStorage.removeItem('lya_user');
  };

  return { login, logout, loading, error };
};