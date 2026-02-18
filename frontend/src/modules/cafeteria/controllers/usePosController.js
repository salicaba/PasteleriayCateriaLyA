import { useState, useMemo } from 'react';
import { MOCK_PRODUCTS } from '../models/productsModel';

export const usePosController = () => {
  const [cart, setCart] = useState([]);
  const [filtroTexto, setFiltroTexto] = useState('');
  // Nuevo estado para la categoría activa
  const [categoriaActiva, setCategoriaActiva] = useState('todas');
  const [isSuccess, setIsSuccess] = useState(false);

  const addToCart = (productWithDetails) => {
    setCart(prev => {
      // Buscamos si existe un producto idéntico (Mismo ID y Mismos detalles)
      // Usamos el 'uniqueId' que generamos en el modal si queremos que sean items separados
      // O comparamos los detalles. Para simplificar, si viene del modal, lo tratamos como nuevo item si tiene detalles.
      
      const existingItem = prev.find(p => 
        p.id === productWithDetails.id && 
        p.detalles === productWithDetails.detalles
      );

      if (existingItem) {
        return prev.map(p => 
          (p.id === productWithDetails.id && p.detalles === productWithDetails.detalles)
            ? { ...p, qty: p.qty + 1 } 
            : p
        );
      }
      
      // Si es nuevo, usamos el precioFinal calculado
      return [...prev, { 
        ...productWithDetails, 
        precio: productWithDetails.precioFinal || productWithDetails.precio, // Usar el precio calculado
        qty: 1 
      }];
    });
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.map(p => p.id === id ? { ...p, qty: p.qty - 1 } : p).filter(p => p.qty > 0));
  };

  const deleteLine = (id) => {
    setCart(prev => prev.filter(p => p.id !== id));
  };

  const total = useMemo(() => cart.reduce((acc, curr) => acc + (curr.precio * curr.qty), 0), [cart]);
  
  // Lógica de filtrado doble (Categoría + Texto)
  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter(p => {
      const matchCategoria = categoriaActiva === 'todas' || p.categoria === categoriaActiva;
      const matchTexto = p.nombre.toLowerCase().includes(filtroTexto.toLowerCase());
      return matchCategoria && matchTexto;
    });
  }, [filtroTexto, categoriaActiva]);

  // Función para obtener la cantidad de un producto específico en el carrito
  const getProductQty = (id) => {
    const item = cart.find(p => p.id === id);
    return item ? item.qty : 0;
  };

  const handleCheckout = (onComplete) => {
    if (cart.length === 0) return;

    // 1. Mostrar pantalla de éxito
    setIsSuccess(true);

    // 2. Simular proceso de envío a Firebase (aquí irá la llamada real luego)
    setTimeout(() => {
      // 3. Limpiar todo
      setCart([]);
      setIsSuccess(false);
      
      // 4. Cerrar el modal (ejecutamos la función que nos pasen)
      if (onComplete) onComplete();
      
    }, 2500); // Esperamos 2.5 segundos para que el usuario disfrute la animación
  };

  return { 
    cart, total, addToCart, removeFromCart, deleteLine, 
    filtroTexto, setFiltroTexto, 
    categoriaActiva, setCategoriaActiva, // Exportamos esto
    filteredProducts,
    getProductQty, // Exportamos esto para el badge
    handleCheckout, // Exportamos la función
    isSuccess,
    addToCart
  };
};