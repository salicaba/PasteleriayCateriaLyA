// frontend/src/hooks/usePWA.js
import { useState, useEffect } from 'react';

export const usePWA = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Detección de entorno Standalone (App instalada Y ejecutándose como app)
    const checkStandalone = () => {
      return (
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        window.navigator.standalone === true
      );
    };
    
    setIsStandalone(checkStandalone());

    // 2. Captura del evento de instalación del navegador
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // 3. Limpieza post-instalación
    const handleAppInstalled = () => {
      setIsInstallable(false);
      // 🔥 ELIMINAMOS EL CAMBIO DE ESTADO AQUÍ
      // Instalar la app NO convierte a la pestaña actual en la app.
      // El cliente debe quedarse exactamente donde estaba (el Login de su QR).
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
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
    
    return outcome;
  };

  return { isInstallable, promptInstall, isStandalone };
};