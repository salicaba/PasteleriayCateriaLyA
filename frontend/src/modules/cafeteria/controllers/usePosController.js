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

  const addToCart = (productWithDetails, forceCuenta = null) => {
    setCart(prev => {
      const targetCuenta = forceCuenta || cuentaActiva;
      const precioACobrar = productWithDetails.precioFinal || productWithDetails.precioBase || productWithDetails.precio || 0;
      
      const existingItemIndex = prev.findIndex(p => 
        p.id === productWithDetails.id && 
        (p.precioFinal || p.precioBase || p.precio) === precioACobrar &&
        !p.enviadoCocina &&
        p.cuenta === targetCuenta
      );

      if (existingItemIndex !== -1) {
        const newCart = [...prev];
        const itemExistente = newCart[existingItemIndex];
        
        // Clonamos la última preparación si es que estamos agregando desde el botón + del sidebar
        const nuevaPrep = productWithDetails.detalles || 
          (itemExistente.preparaciones?.length > 0 
            ? itemExistente.preparaciones[itemExistente.preparaciones.length - 1] 
            : {});

        newCart[existingItemIndex] = {
          ...itemExistente,
          qty: itemExistente.qty + 1,
          preparaciones: [...(itemExistente.preparaciones || []), nuevaPrep]
        };
        return newCart;
      }
      
      return [...prev, { 
        ...productWithDetails, 
        precio: precioACobrar,
        qty: 1,
        preparaciones: [productWithDetails.detalles || {}],
        enviadoCocina: false,
        cuenta: targetCuenta
      }];
    });
  };

  // ¡AQUÍ ESTÁ LA CORRECCIÓN MÁGICA!
  const removeFromCart = (id, precio, enviadoCocina, cuenta) => {
    if(enviadoCocina) return; 
    setCart(prev => prev.map(p => {
      if (p.id === id && p.precio === precio && !p.enviadoCocina && p.cuenta === cuenta) {
        // Copiamos las preparaciones actuales
        const nuevasPrep = [...(p.preparaciones || [])];
        // Eliminamos la última preparación de la lista visual
        nuevasPrep.pop();
        
        return { 
          ...p, 
          qty: p.qty - 1, 
          preparaciones: nuevasPrep // Asignamos la lista corregida
        };
      }
      return p;
    }).filter(p => p.qty > 0)); // Si la cantidad llega a 0, se elimina todo el producto
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
        notes: item.preparaciones?.map(prep => {
          let nota = prep.tamano || 'Estándar';
          if (prep.leche) nota += ` - ${prep.leche}`;
          if (prep.extras && prep.extras.length > 0) nota += ` (+${prep.extras.join(', ')})`;
          return nota;
        }).join(', ') || ''
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

  const payCuenta = async (nombreCuenta, paymentDetails, onComplete) => {
    setIsSuccess(true);
    try {
      console.log(`Registrando pago parcial de cuenta [${nombreCuenta}]`, paymentDetails);
      setCart(prev => prev.filter(item => item.cuenta !== nombreCuenta));
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

  const handleCheckout = async (paymentDetails, onComplete) => {
    if (cart.length === 0 && paymentDetails?.amountPaid <= 0) return;
    
    setIsSuccess(true);
    try {
      if (cart.some(p => !p.enviadoCocina)) {
         await simulateKitchenSend(null, 'LLEVAR', 'L-COBRO-DIRECTO');
      }

      console.log("Procesando pago final con metadatos:", paymentDetails);

      setTimeout(() => {
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