import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ClientLogin from './views/ClientLogin';
import ClientMenu from './views/ClientMenu';

const THEME_CLASSES = ['light', 'dark', 'theme-lya'];

// Función para auto-detectar el tema preferido
const getInitialTheme = () => {
  const saved = localStorage.getItem('lya_client_theme');
  if (saved !== null) return Number(saved);
  // Si el sistema del celular está en modo oscuro, usa el índice 1 (Oscuro)
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 1; 
  }
  // Si no, el predeterminado es el 2 (Tema Lya)
  return 2; 
};

export default function ClientApp({ type }) {
  const { tableId } = useParams();
  
  const [themeIndex] = useState(getInitialTheme);

  // Inyecta el tema al cargar la app
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'theme-lya');
    root.classList.add(THEME_CLASSES[themeIndex]);
    if (localStorage.getItem('lya_client_theme') === null) {
      localStorage.setItem('lya_client_theme', themeIndex);
    }
  }, [themeIndex]);

  const [clientData, setClientData] = useState(() => {
    const saved = localStorage.getItem('lya_client_session');
    return saved ? JSON.parse(saved) : null;
  });

  return (
    <div className="min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg text-gray-900 dark:text-gray-100 lya:text-lya-text relative overflow-hidden">
      <Toaster position="top-center" />
      <main className="flex-1 flex flex-col w-full max-w-md mx-auto relative h-full z-10">
        {!clientData ? (
          <ClientLogin 
            onLogin={(data) => {
              setClientData(data);
              localStorage.setItem('lya_client_session', JSON.stringify(data));
            }} 
            type={type} 
            tableId={tableId} 
          />
        ) : (
          <ClientMenu clientData={clientData} type={type} tableId={tableId} />
        )}
      </main>
    </div>
  );
}