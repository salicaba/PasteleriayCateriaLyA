import { useState, useMemo } from 'react';
import { MOCK_PRODUCTS } from '../models/productsModel';

export const usePosController = () => {
  const [cart, setCart] = useState([]);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('todas');
  const [isSuccess, setIsSuccess] = useState(false);
  const [cuentaActiva, setCuentaActiva] = useState('General');
  const [nombresCuentas, setNombresCuentas] = useState(['General']);

  // --- LÓGICA DE CARRITO Y CUENTAS ---

  const addToCart = (productWithDetails) => {
    setCart(prev => {
      const precioACobrar = productWithDetails.precioFinal || productWithDetails.precioBase || productWithDetails.precio || 0;

      const existingItemIndex = prev.findIndex(p => 
        p.id === productWithDetails.id && 
        (p.precioFinal || p.precioBase || p.precio) === precioACobrar &&
        !p.enviadoCocina &&
        p.cuenta === cuentaActiva
      );

      if (existingItemIndex !== -1) {
        const newCart = [...prev];
        const itemExistente = newCart[existingItemIndex];
        newCart[existingItemIndex] = {
          ...itemExistente,
          qty: itemExistente.qty + 1,
          preparaciones: [...(itemExistente.preparaciones || [itemExistente.detalles]), productWithDetails.detalles]
        };
        return newCart;
      }
      
      return [...prev, { 
        ...productWithDetails, 
        precio: precioACobrar,
        qty: 1,
        preparaciones: [productWithDetails.detalles],
        enviadoCocina: false,
        cuenta: cuentaActiva
      }];
    });
  };

  const removeFromCart = (id, precio, enviadoCocina, cuenta) => {
    if(enviadoCocina) return; 
    setCart(prev => prev.map(p => 
      (p.id === id && p.precio === precio && !p.enviadoCocina && p.cuenta === cuenta) 
        ? { ...p, qty: p.qty - 1 } 
        : p
    ).filter(p => p.qty > 0));
  };

  const deleteLine = (id, precio, enviadoCocina, cuenta) => {
    if(enviadoCocina) return; 
    setCart(prev => prev.filter(p => !(p.id === id && p.precio === precio && !p.enviadoCocina && p.cuenta === cuenta)));
  };

  const moveItemToCuenta = (itemToMove, targetCuenta) => {
    if (!itemToMove || itemToMove.cuenta === targetCuenta) return;

    setCart(prev => {
      const newCart = [...prev];
      const originIndex = newCart.findIndex(p => 
        p.id === itemToMove.id && p.precio === itemToMove.precio && 
        p.enviadoCocina === itemToMove.enviadoCocina && p.cuenta === itemToMove.cuenta
      );

      if (originIndex === -1) return prev;
      
      const originItem = newCart[originIndex];
      let movedPrep = null;
      let remainingPreps = originItem.preparaciones || [];
      if (remainingPreps.length > 0) {
         movedPrep = remainingPreps[remainingPreps.length - 1]; 
         remainingPreps = remainingPreps.slice(0, -1);
      }

      if (originItem.qty > 1) {
        newCart[originIndex] = { ...originItem, qty: originItem.qty - 1, preparaciones: remainingPreps };
      } else {
        newCart.splice(originIndex, 1);
      }

      const targetIndex = newCart.findIndex(p => 
        p.id === itemToMove.id && p.precio === itemToMove.precio && 
        p.enviadoCocina === itemToMove.enviadoCocina && p.cuenta === targetCuenta
      );

      if (targetIndex !== -1) {
         const targetItem = newCart[targetIndex];
         newCart[targetIndex] = {
            ...targetItem,
            qty: targetItem.qty + 1,
            preparaciones: movedPrep ? [...(targetItem.preparaciones || []), movedPrep] : targetItem.preparaciones
         };
      } else {
         newCart.push({
            ...originItem, qty: 1, cuenta: targetCuenta,
            preparaciones: movedPrep ? [movedPrep] : originItem.preparaciones
         });
      }
      return newCart;
    });
  };

  // --- NUEVA LÓGICA DE INVENTARIO ---

  const descontarStock = (itemsParaDescontar) => {
    itemsParaDescontar.forEach(cartItem => {
      // 1. Verificamos si el producto tiene la configuración de inventario encendida
      if (cartItem.controlarStock === true) {
        
        // --- AQUÍ IRÁ TU LLAMADA A FIREBASE/BACKEND EN EL FUTURO ---
        // ej: await db.collection('productos').doc(cartItem.id).update({ stock: increment(-cartItem.qty) });
        console.log(`📉 Descontando ${cartItem.qty} de stock para: ${cartItem.nombre}`);
        
        // --- MODIFICACIÓN TEMPORAL PARA QUE FUNCIONE EL PROTOTIPO ---
        // Buscamos el producto en la constante y le restamos visualmente
        const productRef = MOCK_PRODUCTS.find(p => p.id === cartItem.id);
        if (productRef && productRef.stock !== undefined) {
          productRef.stock = Math.max(0, productRef.stock - cartItem.qty);
        }
      }
    });
  };

  // --- ACCIONES DE COMPROMISO DE LA ORDEN ---

  const enviarACocina = () => {
    setCart(prev => prev.map(p => ({ ...p, enviadoCocina: true })));
  };

  const simulateKitchenSend = (onComplete) => {
    // Solo descontamos los items que NO han sido enviados a cocina antes
    const itemsNuevos = cart.filter(p => !p.enviadoCocina);
    if (itemsNuevos.length > 0) {
      descontarStock(itemsNuevos);
    }

    setIsSuccess(true);
    setTimeout(() => {
      enviarACocina();
      setIsSuccess(false);
      if (onComplete) onComplete();
    }, 1500);
  };

  const handleCheckout = (onComplete) => {
    if (cart.length === 0) return;
    
    // Si cobran directo sin enviar a cocina (ej. venta rápida para llevar),
    // debemos descontar el stock de lo que falte por enviar.
    const itemsSinEnviar = cart.filter(p => !p.enviadoCocina);
    if (itemsSinEnviar.length > 0) {
      descontarStock(itemsSinEnviar);
    }

    setIsSuccess(true);
    setTimeout(() => {
      setCart([]);
      setCuentaActiva('General');
      setNombresCuentas(['General']); 
      setIsSuccess(false);
      if (onComplete) onComplete();
    }, 2500);
  };

  const payCuenta = (nombreCuenta, onComplete) => {
    const itemsDeCuenta = cart.filter(item => item.cuenta === nombreCuenta);
    if (itemsDeCuenta.length === 0) return;

    // Descontar stock solo de los items de esta cuenta que no fueron a cocina
    const itemsSinEnviar = itemsDeCuenta.filter(p => !p.enviadoCocina);
    if (itemsSinEnviar.length > 0) {
      descontarStock(itemsSinEnviar);
    }

    setIsSuccess(true);
    setTimeout(() => {
      setCart(prev => prev.filter(item => item.cuenta !== nombreCuenta));
      setNombresCuentas(prev => prev.filter(n => n !== nombreCuenta || n === 'General'));
      setIsSuccess(false);
      if (cuentaActiva === nombreCuenta) setCuentaActiva('General');
      if (onComplete) onComplete();
    }, 2500);
  };

  // --- UTILIDADES ---

  const total = useMemo(() => cart.reduce((acc, curr) => acc + (curr.precio * curr.qty), 0), [cart]);
  const unsentTotal = useMemo(() => cart.filter(p => !p.enviadoCocina).reduce((acc, curr) => acc + (curr.precio * curr.qty), 0), [cart]);
  const hasUnsentItems = useMemo(() => cart.some(p => !p.enviadoCocina), [cart]);

  const cuentasDisponibles = useMemo(() => {
    const cuentasEnCarrito = cart.map(item => item.cuenta || 'General');
    const combinadas = new Set([...nombresCuentas, ...cuentasEnCarrito]);
    return Array.from(combinadas);
  }, [cart, nombresCuentas]);

  const getSubtotalByCuenta = (nombreCuenta) => {
    return cart.filter(item => item.cuenta === nombreCuenta).reduce((acc, curr) => acc + (curr.precio * curr.qty), 0);
  };

  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter(p => {
      const matchCategoria = categoriaActiva === 'todas' || p.categoria === categoriaActiva;
      const matchTexto = p.nombre.toLowerCase().includes(filtroTexto.toLowerCase());
      return matchCategoria && matchTexto;
    });
  }, [filtroTexto, categoriaActiva]);

  const getProductQty = (id) => {
    return cart.filter(p => p.id === id && !p.enviadoCocina && p.cuenta === cuentaActiva).reduce((acc, item) => acc + item.qty, 0);
  };

  const addNewCuenta = (nombre) => {
    const nombreNormalizado = nombre.trim();
    if (nombreNormalizado) {
      if (!nombresCuentas.includes(nombreNormalizado)) {
        setNombresCuentas(prev => [...prev, nombreNormalizado]);
      }
      setCuentaActiva(nombreNormalizado); 
    }
  };

  return { 
    cart, total, unsentTotal, hasUnsentItems, 
    addToCart, removeFromCart, deleteLine, moveItemToCuenta,
    filtroTexto, setFiltroTexto, categoriaActiva, setCategoriaActiva,
    filteredProducts, getProductQty, 
    handleCheckout, simulateKitchenSend, isSuccess,
    cuentaActiva, setCuentaActiva, cuentasDisponibles, addNewCuenta, getSubtotalByCuenta, payCuenta
  };
};