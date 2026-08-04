// frontend/src/modules/cafeteria/controllers/usePosAccounts.js
import { useState, useMemo, useCallback } from 'react';

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
    
    setNombresCuentas(prev => {
      if (!prev.includes(cuentaFormateada)) {
        return [...prev, cuentaFormateada];
      }
      return prev;
    });
    
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

  // 🔥 SOLUCIÓN BUG 2: PURGADOR DE ESTADOS FANTASMA
  // Se llama cada vez que llega la orden desde la API. Si la cuenta fue cancelada, se esfuma de la UI.
  const sincronizarCuentas = useCallback((ordenActiva) => {
    if (!ordenActiva) return;

    const cuentasReales = new Set(['General']); // General siempre sobrevive

    // 1. Validamos cuentas que aún tienen productos ACTIVOS
    if (ordenActiva.items && Array.isArray(ordenActiva.items)) {
      ordenActiva.items.forEach(item => {
        if (item.status === 'ACTIVE') {
          cuentasReales.add(item.cuenta || 'General');
        }
      });
    }

    // 2. Validamos cuentas que ya pagaron y están saldadas
    if (ordenActiva.paidAccounts && Array.isArray(ordenActiva.paidAccounts)) {
      ordenActiva.paidAccounts.forEach(acc => cuentasReales.add(acc));
    }

    // 3. Purgar el estado local (Matar al fantasma)
    setNombresCuentas(prev => {
      const purgado = prev.filter(c => cuentasReales.has(c));
      return purgado.length > 0 ? purgado : ['General'];
    });

    setPaidAccounts(prev => prev.filter(c => cuentasReales.has(c)));

    // Si nos eliminaron la cuenta que estábamos viendo, regresamos al usuario a General
    setCuentaActiva(prev => {
      if (!cuentasReales.has(prev)) return 'General';
      return prev;
    });
  }, []);

  return {
    cuentaActiva, setCuentaActiva,
    nombresCuentas, setNombresCuentas,
    paidAccounts, setPaidAccounts,
    cuentasTelefonos, setCuentasTelefonos,
    cuentasPagadasReales,
    addNewCuenta,
    sincronizarCuentas // EXPORTAMOS LA FUNCIÓN
  };
};