import { useState, useMemo } from 'react';
import { MOCK_PRODUCTS } from '../models/productsModel';

export const usePosController = () => {
  const [cart, setCart] = useState([]);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('todas');
  const [isSuccess, setIsSuccess] = useState(false);

  const addToCart = (productWithDetails) => {
    setCart(prev => {
      // Determinamos el precio que efectivamente se va a cobrar
      const precioACobrar = productWithDetails.precioFinal || productWithDetails.precio;

      // Buscamos si existe un producto con mismo ID y MISMO PRECIO
      const existingItemIndex = prev.findIndex(p => 
        p.id === productWithDetails.id && 
        (p.precioFinal || p.precio) === precioACobrar
      );

      if (existingItemIndex !== -1) {
        // Si coinciden en ID y Precio, los agrupamos
        const newCart = [...prev];
        const itemExistente = newCart[existingItemIndex];

        newCart[existingItemIndex] = {
          ...itemExistente,
          qty: itemExistente.qty + 1,
          // Guardamos un historial de preparaciones para la comanda de cocina
          preparaciones: [
            ...(itemExistente.preparaciones || [itemExistente.detalles]),
            productWithDetails.detalles
          ]
        };
        return newCart;
      }
      
      // Si el precio es distinto (por un extra caro), se crea una línea nueva
      return [...prev, { 
        ...productWithDetails, 
        precio: precioACobrar,
        qty: 1,
        preparaciones: [productWithDetails.detalles] // Primera preparación
      }];
    });
  };

  const removeFromCart = (id, precio) => {
    setCart(prev => prev.map(p => 
      (p.id === id && p.precio === precio) ? { ...p, qty: p.qty - 1 } : p
    ).filter(p => p.qty > 0));
  };

  const deleteLine = (id, precio) => {
    setCart(prev => prev.filter(p => !(p.id === id && p.precio === precio)));
  };

  const total = useMemo(() => cart.reduce((acc, curr) => acc + (curr.precio * curr.qty), 0), [cart]);
  
  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter(p => {
      const matchCategoria = categoriaActiva === 'todas' || p.categoria === categoriaActiva;
      const matchTexto = p.nombre.toLowerCase().includes(filtroTexto.toLowerCase());
      return matchCategoria && matchTexto;
    });
  }, [filtroTexto, categoriaActiva]);

  const getProductQty = (id) => {
    return cart.filter(p => p.id === id).reduce((acc, item) => acc + item.qty, 0);
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

  return { 
    cart, total, addToCart, removeFromCart, deleteLine, 
    filtroTexto, setFiltroTexto, 
    categoriaActiva, setCategoriaActiva,
    filteredProducts, getProductQty, handleCheckout, isSuccess
  };
};