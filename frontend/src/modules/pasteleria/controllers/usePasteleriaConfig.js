import { useState, useEffect } from 'react';

// Todo vacío para que tú lo llenes
const DEFAULT_CONFIG = {
  categorias: [],
  tamanos: [],
  sabores: []
};

export const usePasteleriaConfig = () => {
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('lya_pasteleria_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  useEffect(() => {
    localStorage.setItem('lya_pasteleria_config', JSON.stringify(config));
  }, [config]);

  const updateConfig = (newConfig) => {
    setConfig(newConfig);
  };

  return { config, updateConfig };
};