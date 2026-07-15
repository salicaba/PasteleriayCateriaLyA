// src/modules/cafeteria/controllers/usePosAccounts.js
import { useState, useMemo } from 'react';

export const usePosAccounts = () => {
  const [cuentaActiva, setCuentaActiva] = useState('General');
  const [nombresCuentas, setNombresCuentas] = useState(['General']);
  const [paidAccounts, setPaidAccounts] = useState([]);
  const [cuentasTelefonos, setCuentasTelefonos] = useState({});

  // 🔥 REGISTRO ABSOLUTO DE CUENTAS PAGADAS 🔥
  const cuentasPagadasReales = useMemo(() => 
    Array.from(new Set([...(paidAccounts || [])])), 
  [paidAccounts]);

  const addNewCuenta = (n, telefono = '', activeOrderId = null) => { 
    const cuentaFormateada = n.trim();
    if(!cuentaFormateada) return;
    
    setCuentaActiva(cuentaFormateada);
    
    if (!nombresCuentas.includes(cuentaFormateada)) { 
      setNombresCuentas(prev => [...prev, cuentaFormateada]); 
    }
    
    if (telefono) { 
      setCuentasTelefonos(prev => { 
        const newPhones = { ...prev, [cuentaFormateada]: telefono }; 
        if (activeOrderId) { 
          localStorage.setItem(`lya_phones_${activeOrderId}`, JSON.stringify(newPhones)); 
        } 
        return newPhones; 
      }); 
    }
  };

  return {
    cuentaActiva, setCuentaActiva,
    nombresCuentas, setNombresCuentas,
    paidAccounts, setPaidAccounts,
    cuentasTelefonos, setCuentasTelefonos,
    cuentasPagadasReales,
    addNewCuenta
  };
};