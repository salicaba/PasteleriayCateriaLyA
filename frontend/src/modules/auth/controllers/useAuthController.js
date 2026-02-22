import { useState } from 'react';

export const useAuthController = (onLoginSuccess) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // MOCK DE VALIDACIÓN (Simulación de delay de red)
    setTimeout(() => {
      if (email === 'admin@lya.com' && password === 'admin123') {
        onLoginSuccess({ email, name: 'Administrador LyA', role: 'admin' });
      } else {
        setError('Credenciales incorrectas. Intente con admin@lya.com');
      }
      setIsLoading(false);
    }, 1000);
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    error,
    isLoading,
    handleSubmit
  };
};