import { useState, useMemo } from 'react';
import { MOCK_PRODUCTS } from '../models/productsModel';

export const usePosController = () => {
  const [cart, setCart] = useState([]);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('todas');
  const [isSuccess, setIsSuccess] = useState(false);

  const addToCart = (productWithDetails) => {
    setCart(prev => {
      const precioACobrar = productWithDetails.precioFinal || productWithDetails.precio;

      // REGLA DE ORO: Solo agrupamos si el producto es igual Y NO HA SIDO ENVIADO A COCINA
      const existingItemIndex = prev.findIndex(p => 
        p.id === productWithDetails.id && 
        (p.precioFinal || p.precio) === precioACobrar &&
        !p.enviadoCocina 
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
      
      // Si ya fue enviado, creamos una línea nueva independiente
      return [...prev, { 
        ...productWithDetails, 
        precio: precioACobrar,
        qty: 1,
        preparaciones: [productWithDetails.detalles],
        enviadoCocina: false // <-- NUEVO ESTADO INICIAL
      }];
    });
  };

  const removeFromCart = (id, precio, enviadoCocina) => {
    if(enviadoCocina) return; // Protección: No se puede restar si ya está en cocina
    setCart(prev => prev.map(p => 
      (p.id === id && p.precio === precio && !p.enviadoCocina) ? { ...p, qty: p.qty - 1 } : p
    ).filter(p => p.qty > 0));
  };

  const deleteLine = (id, precio, enviadoCocina) => {
    if(enviadoCocina) return; // Protección: No se puede borrar si ya está en cocina
    setCart(prev => prev.filter(p => !(p.id === id && p.precio === precio && !p.enviadoCocina)));
  };

  // Marcar lo nuevo como "Enviado"
  const enviarACocina = () => {
    setCart(prev => prev.map(p => ({ ...p, enviadoCocina: true })));
  };

  const total = useMemo(() => cart.reduce((acc, curr) => acc + (curr.precio * curr.qty), 0), [cart]);
  
  // NUEVO: Calculamos solo el dinero de los productos nuevos para sumarlos a la mesa
  const unsentTotal = useMemo(() => cart.filter(p => !p.enviadoCocina).reduce((acc, curr) => acc + (curr.precio * curr.qty), 0), [cart]);
  
  // Bandera para saber si el botón de "Cocina" debe estar activo
  const hasUnsentItems = useMemo(() => cart.some(p => !p.enviadoCocina), [cart]);

  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter(p => {
      const matchCategoria = categoriaActiva === 'todas' || p.categoria === categoriaActiva;
      const matchTexto = p.nombre.toLowerCase().includes(filtroTexto.toLowerCase());
      return matchCategoria && matchTexto;
    });
  }, [filtroTexto, categoriaActiva]);

  const getProductQty = (id) => {
    // Para el menú visual, solo contamos lo nuevo que estamos agregando
    return cart.filter(p => p.id === id && !p.enviadoCocina).reduce((acc, item) => acc + item.qty, 0);
  };

  const handleCheckout = (onComplete) => {
    if (cart.length === 0) return;
    setIsSuccess(true);
    setTimeout(() => {
      setCart([]);
      setIsSuccess(false);
      if (onComplete) onComplete();
    }, 2500);
  };

  // NUEVO: Simula la animación verde, pero NO borra el carrito, solo lo bloquea
  const simulateKitchenSend = (onComplete) => {
    setIsSuccess(true);
    setTimeout(() => {
      enviarACocina();
      setIsSuccess(false);
      if (onComplete) onComplete();
    }, 1500);
  };

  return { 
    cart, total, unsentTotal, hasUnsentItems, 
    addToCart, removeFromCart, deleteLine, 
    filtroTexto, setFiltroTexto, 
    categoriaActiva, setCategoriaActiva,
    filteredProducts, getProductQty, 
    handleCheckout, simulateKitchenSend, isSuccess
  };
};