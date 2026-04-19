import { useState } from 'react';
import client from '../../../api/client.js';

export const useAuthController = (onLoginCallback) => {
  // Mantenemos el nombre 'email' para no romper tu diseño, aunque escribamos un usuario
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); // Evita que la página se recargue
    setIsLoading(true);
    setError(null);

    try {
      // El backend pide 'username', le pasamos lo que escribiste en el input de email
      const response = await client.post('/auth/login', { 
        username: email, 
        password: password 
      });
      
      const { token, user } = response.data;
      
      // Guardamos la sesión en el navegador
      localStorage.setItem('lya_token', token);
      localStorage.setItem('lya_user', JSON.stringify(user));

      // Le avisamos a App.jsx que el login fue un éxito para cambiar de pantalla
      if (onLoginCallback) {
        onLoginCallback(user);
      }
    } catch (err) {
      console.error("Error en login:", err);
      // Extraemos el mensaje de error del backend (ej. "Credenciales inválidas")
      setError(err.response?.data?.message || 'Error al conectar con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('lya_token');
    localStorage.removeItem('lya_user');
  };

  return { 
    email, setEmail, 
    password, setPassword, 
    showPassword, setShowPassword, 
    error, isLoading, 
    handleSubmit, logout 
  };
};