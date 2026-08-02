// frontend/src/modules/pasteleria/controllers/usePasteleriaConfig.js
import { useState, useEffect, useCallback } from 'react';
import client from '../../../api/client';

const DEFAULT_CONFIG = {
  categorias: [],
  tamanos: [],
  sabores: []
};

export const usePasteleriaConfig = () => {
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('lya_pasteleria_config');
    return saved ? JSON.parse(saved) : null; 
  });
  
  const [isLoading, setIsLoading] = useState(true);

  // 1. OBTENCIÓN DESDE LA BASE DE DATOS
  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      // Apuntamos a la ruta maestra de configuración
      const res = await client.get('/settings'); 
      // Buscamos nuestra llave específica
      const data = res.data?.pasteleria_config || DEFAULT_CONFIG;
      
      setConfig(data);
      localStorage.setItem('lya_pasteleria_config', JSON.stringify(data)); 
    } catch (error) {
      console.error("Error obteniendo config de BD, usando caché local:", error);
      if (!config) setConfig(DEFAULT_CONFIG);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // 2. PERSISTENCIA REAL EN BASE DE DATOS
  const updateConfig = async (newConfig) => {
    setConfig(newConfig);
    localStorage.setItem('lya_pasteleria_config', JSON.stringify(newConfig));

    try {
      // Mandamos a guardar específicamente la llave 'pasteleria_config'
      await client.put('/settings', { pasteleria_config: newConfig });
    } catch (error) {
      console.error("Error al guardar la configuración en la BD:", error);
      throw error; 
    }
  };

  return { 
    config: config || DEFAULT_CONFIG, 
    updateConfig, 
    isLoading 
  };
};