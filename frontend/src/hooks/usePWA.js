// frontend/src/hooks/usePWA.js
import { useState, useEffect } from 'react';

export const usePWA = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Detección de entorno Standalone (App instalada)
    const checkStandalone = () => {
      return (
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        window.navigator.standalone === true
      );
    };
    
    setIsStandalone(checkStandalone());

    // 2. Captura del evento de instalación del navegador
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault(); // ESTO EVITA CUALQUIER RECARGA O CAMBIO DE PANTALLA NATIVO
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // 3. Limpieza post-instalación
    const handleAppInstalled = () => {
      setIsInstallable(false);
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return null;
    
    // Disparamos el prompt nativo
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
    
    // Retornamos el resultado sin forzar navegación
    return outcome;
  };

  return { isInstallable, promptInstall, isStandalone };
};