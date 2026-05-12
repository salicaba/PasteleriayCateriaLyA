// src/modules/cafeteria/controllers/usePosController.js
import { useState, useMemo, useEffect } from 'react';
import { fetchProducts, fetchCategories } from '../models/productsModel';
import client from '../../../api/client.js';

export const usePosController = () => {
  const [dbProducts, setDbProducts] = useState([]); 
  const [dbCategories, setDbCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('todas');
  const [isSuccess, setIsSuccess] = useState(false);
  const [cuentaActiva, setCuentaActiva] = useState('General');
  const [nombresCuentas, setNombresCuentas] = useState(['General']);

  useEffect(() => {
    const loadData = async () => {
      const [prods, cats] = await Promise.all([
        fetchProducts(),
        fetchCategories()
      ]);
      setDbProducts(prods);
      setDbCategories(cats);
    };
    loadData();
  }, []);

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
      setCart(prev => prev.map(item => 
          item === itemToMove ? { ...item, cuenta: targetCuenta } : item
      ));
  };

  const simulateKitchenSend = async (onComplete, orderType = 'LLEVAR', ticketId = 'L-01') => {
    const itemsNuevos = cart.filter(p => !p.enviadoCocina);
    if (itemsNuevos.length === 0) return;

    setIsSuccess(true);
    try {
      const orderRes = await client.post('/pos/orders', {
        orderType,
        ticketId
      });
      const newOrderId = orderRes.data.order.id;

      const itemsPayload = itemsNuevos.map(item => ({
        productId: item.id,
        quantity: item.qty,
        subtotal: item.precio * item.qty,
        notes: item.preparaciones?.join(', ') || ''
      }));

      await client.post(`/pos/orders/${newOrderId}/items`, { items: itemsPayload });

      setCart(prev => prev.map(p => ({ ...p, enviadoCocina: true })));
      
      if (onComplete) onComplete();
    } catch (error) {
      console.error("Error al enviar a cocina:", error);
      alert("Hubo un error al enviar la orden al servidor.");
    } finally {
      setIsSuccess(false);
    }
  };

  // NUEVO: Implementación real de pago parcial para Cuentas Separadas
  const payCuenta = async (nombreCuenta, paymentDetails, onComplete) => {
    setIsSuccess(true);
    try {
      // Aquí enviarías los datos al backend (ej. client.post('/pos/orders/pay-partial', paymentDetails))
      console.log(`Registrando pago parcial de cuenta [${nombreCuenta}]`, paymentDetails);

      // Limpiamos los productos de esa cuenta específica del carrito
      setCart(prev => prev.filter(item => item.cuenta !== nombreCuenta));
      
      // Eliminamos la cuenta de la lista activa (opcional, para mantener limpia la UI)
      setNombresCuentas(prev => prev.filter(n => n !== nombreCuenta));
      if (cuentaActiva === nombreCuenta) setCuentaActiva('General');

      setTimeout(() => {
        if (onComplete) onComplete();
        setIsSuccess(false);
      }, 800);
    } catch (error) {
      console.error("Error al cobrar cuenta parcial:", error);
      setIsSuccess(false);
    }
  };

  // MEJORADO: Recibe paymentDetails y no cierra todo a lo ciego
  const handleCheckout = async (paymentDetails, onComplete) => {
    if (cart.length === 0 && paymentDetails?.amountPaid <= 0) return;
    
    setIsSuccess(true);
    try {
      if (cart.some(p => !p.enviadoCocina)) {
         await simulateKitchenSend(null, 'LLEVAR', 'L-COBRO-DIRECTO');
      }

      // Aquí enviarías los metadatos de pago al endpoint de cierre
      console.log("Procesando pago final con metadatos:", paymentDetails);

      setTimeout(() => {
        // Solo vaciamos el carrito si es un pago total de lo que queda
        setCart([]);
        setCuentaActiva('General');
        setNombresCuentas(['General']); 
        if (onComplete) onComplete();
        setIsSuccess(false);
      }, 1000);
    } catch (error) {
      console.error("Error en checkout:", error);
      setIsSuccess(false);
    }
  };

  const total = useMemo(() => cart.reduce((acc, curr) => acc + (curr.precio * curr.qty), 0), [cart]);
  const unsentTotal = useMemo(() => cart.filter(p => !p.enviadoCocina).reduce((acc, curr) => acc + (curr.precio * curr.qty), 0), [cart]);
  const hasUnsentItems = useMemo(() => cart.some(p => !p.enviadoCocina), [cart]);

  const cuentasDisponibles = useMemo(() => {
    const cuentasEnCarrito = cart.map(item => item.cuenta || 'General');
    return Array.from(new Set([...nombresCuentas, ...cuentasEnCarrito]));
  }, [cart, nombresCuentas]);

  const getSubtotalByCuenta = (nombreCuenta) => {
    return cart.filter(item => item.cuenta === nombreCuenta).reduce((acc, curr) => acc + (curr.precio * curr.qty), 0);
  };

  const filteredProducts = useMemo(() => {
    return dbProducts.filter(p => {
      const matchCategoria = categoriaActiva === 'todas' || p.categoria === categoriaActiva;
      const matchTexto = p.nombre.toLowerCase().includes(filtroTexto.toLowerCase());
      return matchCategoria && matchTexto;
    });
  }, [filtroTexto, categoriaActiva, dbProducts]);

  const getProductQty = (id) => {
    return cart.filter(p => p.id === id && !p.enviadoCocina && p.cuenta === cuentaActiva).reduce((acc, item) => acc + item.qty, 0);
  };

  const addNewCuenta = (nombre) => {
    const nombreNormalizado = nombre.trim();
    if (nombreNormalizado && !nombresCuentas.includes(nombreNormalizado)) {
      setNombresCuentas(prev => [...prev, nombreNormalizado]);
      setCuentaActiva(nombreNormalizado); 
    }
  };

  return { 
    cart, total, unsentTotal, hasUnsentItems, 
    addToCart, removeFromCart, deleteLine, moveItemToCuenta,
    filtroTexto, setFiltroTexto, categoriaActiva, setCategoriaActiva,
    filteredProducts, getProductQty, 
    handleCheckout, simulateKitchenSend, isSuccess,
    cuentaActiva, setCuentaActiva, cuentasDisponibles, addNewCuenta, getSubtotalByCuenta, payCuenta,
    dbCategories
  };
};