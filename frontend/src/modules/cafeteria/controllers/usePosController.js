// frontend/src/modules/cafeteria/controllers/usePosController.js
import { useState, useMemo, useEffect } from 'react';
import { fetchProducts, fetchCategories } from '../models/productsModel';
import client from '../../../api/client.js';

export const usePosController = (mesaActual, isOpen) => {
  const [dbProducts, setDbProducts] = useState([]); 
  const [dbCategories, setDbCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [orderStatus, setOrderStatus] = useState('OPEN');
  const [paidAccounts, setPaidAccounts] = useState([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [cuentaActiva, setCuentaActiva] = useState('General');
  const [nombresCuentas, setNombresCuentas] = useState(['General']);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('todas');

  useEffect(() => {
    const loadData = async () => {
      const [prods, cats] = await Promise.all([fetchProducts(), fetchCategories()]);
      setDbProducts(prods); setDbCategories(cats);
    };
    loadData();
  }, []);

  // 🔥 LA SOLUCIÓN DEFINITIVA A LA PERSISTENCIA
  useEffect(() => {
    if (!isOpen) return; // Solo reconstruir si el modal está abriéndose

    if (mesaActual && mesaActual.estado === 'ocupada') {
        setActiveOrderId(mesaActual.orderId);
        setOrderStatus(mesaActual.orderStatus || 'OPEN');
        setPaidAccounts(mesaActual.paidAccounts || []);

        const dbItems = mesaActual.items || [];
        
        const loadedCart = dbItems.map(item => {
            let parsedPreps = [];
            if (item.notes) {
                try { parsedPreps = JSON.parse(item.notes); } catch(e) { parsedPreps = [{ detalles: item.notes }]; }
            } else {
                parsedPreps = [{}];
            }

            return {
                id: item.productId,
                nombre: item.product?.name || 'Producto',
                imagen: item.product?.imageUrl || null,
                precio: parseFloat(item.subtotal) / item.quantity,
                qty: item.quantity,
                preparaciones: parsedPreps,
                enviadoCocina: true,
                kitchenStatus: item.kitchenStatus,
                cuenta: item.cuenta || 'General',
                backendItemId: item.id
            };
        });

        // Combinar inteligentemente sin pisar los ítems que no has enviado aún
        setCart(prev => {
            const unsent = prev.filter(p => !p.enviadoCocina);
            return [...loadedCart, ...unsent];
        });

        setNombresCuentas(prev => {
            const s = new Set(['General', ...loadedCart.map(c => c.cuenta), ...prev]);
            if (mesaActual.paidAccounts) mesaActual.paidAccounts.forEach(pa => s.add(pa));
            return Array.from(s);
        });
    } else {
        setCart([]); setActiveOrderId(null); setOrderStatus('OPEN'); setPaidAccounts([]);
        setNombresCuentas(['General']); setCuentaActiva('General');
    }
  }, [isOpen, mesaActual]); // <-- Dependencia directa a si abres el modal y la data de la mesa

  const addToCart = (productWithDetails, forceCuenta = null) => {
    if (orderStatus === 'PAID') return;
    const targetCuenta = forceCuenta || cuentaActiva;
    setCart(prev => {
      const precio = productWithDetails.precioFinal || productWithDetails.precioBase || productWithDetails.precio || 0;
      const index = prev.findIndex(p => p.id === productWithDetails.id && p.precio === precio && !p.enviadoCocina && p.cuenta === targetCuenta);

      if (index !== -1) {
        const newCart = [...prev];
        newCart[index].qty += 1;
        newCart[index].preparaciones.push(productWithDetails.detalles || {});
        return newCart;
      }
      return [...prev, { ...productWithDetails, precio, qty: 1, preparaciones: [productWithDetails.detalles || {}], enviadoCocina: false, cuenta: targetCuenta }];
    });
  };

  const simulateKitchenSend = async (onComplete = null) => {
    const itemsNuevos = cart.filter(p => !p.enviadoCocina);
    if (itemsNuevos.length === 0) return;

    setIsSuccess(true);
    try {
      let orderId = activeOrderId;
      if (!orderId) {
        const isLlevar = mesaActual?.zona === 'llevar';
        const res = await client.post('/pos/orders', { orderType: isLlevar ? 'LLEVAR' : 'SALON', tableId: isLlevar ? null : mesaActual?.id, ticketId: isLlevar ? mesaActual?.numero : null });
        orderId = res.data.order.id;
        setActiveOrderId(orderId);
      }

      const payload = itemsNuevos.map(item => ({
        productId: item.id, quantity: item.qty, subtotal: item.precio * item.qty, cuenta: item.cuenta || 'General', notes: JSON.stringify(item.preparaciones) 
      }));

      await client.post(`/pos/orders/${orderId}/items`, { items: payload });
      setCart(prev => prev.map(p => ({ ...p, enviadoCocina: true })));
      setTimeout(() => { setIsSuccess(false); if (onComplete) onComplete(); }, 1500);
    } catch (error) { setIsSuccess(false); }
  };

  const removeFromCart = (id, precio, env, cuenta) => { if(!env) setCart(prev => prev.map(p => p.id === id && p.precio === precio && p.cuenta === cuenta ? {...p, qty: p.qty - 1, preparaciones: p.preparaciones.slice(0, -1)} : p).filter(p => p.qty > 0)) };
  const deleteLine = (id, precio, env, cuenta) => { if(!env) setCart(prev => prev.filter(p => !(p.id === id && p.precio === precio && p.cuenta === cuenta))) };
  const moveItemToCuenta = (item, target) => { if(!item.enviadoCocina) setCart(prev => prev.map(i => i === item ? {...i, cuenta: target} : i)) };
  const addNewCuenta = (n) => { if(n.trim() && !nombresCuentas.includes(n.trim())) { setNombresCuentas(prev => [...prev, n.trim()]); setCuentaActiva(n.trim()); } };
  const toggleDeliveredStatus = (cartIndex) => { setCart(prev => { const newCart = [...prev]; newCart[cartIndex].kitchenStatus = newCart[cartIndex].kitchenStatus === 'DELIVERED' ? 'READY' : 'DELIVERED'; return newCart; }); };
  const validateAllDelivered = (cuentaName = null) => { const itemsToCheck = cuentaName ? cart.filter(c => c.cuenta === cuentaName) : cart; return itemsToCheck.every(item => item.enviadoCocina && item.kitchenStatus === 'DELIVERED'); };

  const payCuenta = async (nombreCuenta, paymentDetails, onComplete) => {
    setIsSuccess(true);
    try {
      if(activeOrderId) await client.put(`/pos/orders/${activeOrderId}/pay`, { cuentaName: nombreCuenta, isFullPayment: false });
      setPaidAccounts(prev => [...prev, nombreCuenta]);
      setTimeout(() => { if (onComplete) onComplete(); setIsSuccess(false); }, 1500);
    } catch (error) { setIsSuccess(false); }
  };

  const handleCheckout = async (paymentDetails, onComplete) => {
    if (cart.length === 0 && paymentDetails?.amountPaid <= 0) return;
    setIsSuccess(true);
    try {
      if (cart.some(p => !p.enviadoCocina)) await simulateKitchenSend(null);
      if(activeOrderId) await client.put(`/pos/orders/${activeOrderId}/pay`, { isFullPayment: true });
      setOrderStatus('PAID');
      setTimeout(() => { if (onComplete) onComplete(); setIsSuccess(false); }, 1500);
    } catch (error) { setIsSuccess(false); }
  };

  const handleCloseTable = async (onComplete) => {
      if(activeOrderId) await client.put(`/pos/orders/${activeOrderId}/close`);
      setCart([]); setActiveOrderId(null); setOrderStatus('OPEN'); setPaidAccounts([]);
      if(onComplete) onComplete();
  };

  const handlePrintTicket = (cuentaName = null) => { alert(`🖨️ Enviando a impresora: ${cuentaName ? 'Cuenta ' + cuentaName : 'Mesa Completa'}`); };

  const total = useMemo(() => cart.reduce((acc, curr) => acc + (curr.precio * curr.qty), 0), [cart]);
  const unsentTotal = useMemo(() => cart.filter(p => !p.enviadoCocina).reduce((acc, curr) => acc + (curr.precio * curr.qty), 0), [cart]);
  const hasUnsentItems = useMemo(() => cart.some(p => !p.enviadoCocina), [cart]);
  const cuentasDisponibles = useMemo(() => Array.from(new Set([...nombresCuentas, ...cart.map(i => i.cuenta || 'General')])), [cart, nombresCuentas]);
  const getSubtotalByCuenta = (nombreCuenta) => cart.filter(item => item.cuenta === nombreCuenta).reduce((acc, curr) => acc + (curr.precio * curr.qty), 0);
  const getProductQty = (id) => cart.filter(p => p.id === id && !p.enviadoCocina && p.cuenta === cuentaActiva).reduce((acc, item) => acc + item.qty, 0);

  const filteredProducts = useMemo(() => {
    return dbProducts.filter(p => (categoriaActiva === 'todas' || p.categoria === categoriaActiva) && p.nombre.toLowerCase().includes(filtroTexto.toLowerCase()));
  }, [filtroTexto, categoriaActiva, dbProducts]);

  return { 
    cart, total, unsentTotal, hasUnsentItems, addToCart, removeFromCart, deleteLine, moveItemToCuenta, toggleDeliveredStatus,
    filtroTexto, setFiltroTexto, categoriaActiva, setCategoriaActiva, filteredProducts, getProductQty, 
    handleCheckout, handleCloseTable, handlePrintTicket, simulateKitchenSend, isSuccess,
    cuentaActiva, setCuentaActiva, cuentasDisponibles, addNewCuenta, getSubtotalByCuenta, payCuenta,
    dbCategories, orderStatus, paidAccounts, validateAllDelivered
  };
};