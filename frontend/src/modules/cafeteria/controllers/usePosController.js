// src/modules/cafeteria/controllers/usePosController.js
import { useState, useMemo, useEffect } from 'react';
import { fetchProducts, fetchCategories } from '../models/productsModel';
import client from '../../../api/client.js';
import toast from 'react-hot-toast';

export const usePosController = (mesaInicial, isOpen, todasLasMesas = []) => {
  const [dbProducts, setDbProducts] = useState([]); 
  const [dbCategories, setDbCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [orderStatus, setOrderStatus] = useState('OPEN');
  const [paidAccounts, setPaidAccounts] = useState([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [cuentaActiva, setCuentaActiva] = useState('General');
  const [nombresCuentas, setNombresCuentas] = useState(['General']);
  
  const [cuentasTelefonos, setCuentasTelefonos] = useState({});
  const [filtroTexto, setFiltroTexto] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('todas');

  const mesaActual = useMemo(() => {
    if (!mesaInicial) return null;
    return todasLasMesas.find(m => m.id === mesaInicial.id) || mesaInicial;
  }, [mesaInicial, todasLasMesas]);

  const isVitrina = mesaActual?.zona === 'vitrina';

  useEffect(() => {
    const loadData = async () => {
      const [prods, cats] = await Promise.all([fetchProducts(), fetchCategories()]);
      setDbProducts(prods); 
      setDbCategories(cats);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!isOpen) {
        setCart([]); 
        setActiveOrderId(null); 
        setOrderStatus('OPEN'); 
        setPaidAccounts([]);
        setNombresCuentas(['General']); 
        setCuentaActiva('General');
        setCuentasTelefonos({});
        return;
    }

    let nuevasCuentas = new Set(['General']);

    if (mesaActual && mesaActual.estado === 'ocupada') {
        const currentOrderId = mesaActual.orderId;
        setActiveOrderId(currentOrderId);
        setOrderStatus(mesaActual.orderStatus || 'OPEN');
        setPaidAccounts(mesaActual.paidAccounts || []);

        if (currentOrderId) {
            const storedPhones = localStorage.getItem(`lya_phones_${currentOrderId}`);
            if (storedPhones) {
                try { 
                  setCuentasTelefonos(JSON.parse(storedPhones)); 
                } catch(e) {}
            }
        }

        const dbItems = mesaActual.items || [];
        
        const loadedCart = dbItems.map(item => {
            let parsedPreps = [];
            if (item.notes) {
                try { 
                  parsedPreps = JSON.parse(item.notes); 
                } catch(e) { 
                  parsedPreps = [{ detalles: "Personalización cargada" }]; 
                }
            }
            if (!Array.isArray(parsedPreps)) parsedPreps = [parsedPreps || {}];

            return {
                id: item.productId,
                nombre: item.product?.name || 'Producto',
                imagen: item.product?.imageUrl || null,
                precio: parseFloat(item.subtotal) / item.quantity,
                qty: item.quantity,
                preparaciones: parsedPreps,
                enviadoCocina: true,
                kitchenStatus: item.kitchenStatus,
                status: item.status || 'ACTIVE',
                cuenta: item.cuenta || 'General',
                isTakeaway: item.isTakeaway || false,
                backendItemId: item.id,
                requiereCocina: item.product?.requiereCocina !== false 
            };
        });

        setCart(prev => {
            const localItems = prev.filter(p => !p.enviadoCocina);
            const sentButNotLoaded = prev.filter(p => 
                p.enviadoCocina && !loadedCart.some(loaded => loaded.backendItemId === p.backendItemId)
            );
            const finalCart = [...loadedCart, ...sentButNotLoaded, ...localItems];
            finalCart.forEach(c => nuevasCuentas.add(c.cuenta));
            return finalCart;
        });

        if (mesaActual.paidAccounts) {
          mesaActual.paidAccounts.forEach(pa => nuevasCuentas.add(pa));
        }
    } else {
        setCart(prev => { 
          prev.forEach(c => nuevasCuentas.add(c.cuenta)); 
          return prev; 
        });
    }

    setNombresCuentas(prev => Array.from(new Set([...prev, ...Array.from(nuevasCuentas)])));

  }, [isOpen, mesaActual]);

  const addToCart = (productWithDetails, forceCuenta = null) => {
    if (orderStatus === 'PAID') return;
    const targetCuenta = forceCuenta || cuentaActiva;
    
    setCart(prev => {
      const precio = productWithDetails.precioFinal || productWithDetails.precioBase || productWithDetails.precio || 0;
      const index = prev.findIndex(p => 
        p.id === productWithDetails.id && 
        p.precio === precio && 
        !p.enviadoCocina && 
        p.cuenta === targetCuenta && 
        !!p.isTakeaway === !!productWithDetails.isTakeaway
      );

      if (index !== -1) {
          const newCart = [...prev];
          newCart[index] = { 
            ...newCart[index], 
            qty: newCart[index].qty + 1, 
            preparaciones: [...newCart[index].preparaciones, productWithDetails.detalles || {}] 
          };
          return newCart;
        }
        
      return [...prev, { 
        ...productWithDetails, 
        precio, 
        qty: 1, 
        preparaciones: [productWithDetails.detalles || {}], 
        enviadoCocina: false, 
        status: 'ACTIVE', 
        cuenta: targetCuenta, 
        isTakeaway: productWithDetails.isTakeaway || false, 
        requiereCocina: productWithDetails.requiereCocina !== false 
      }];
    });
  };

  const simulateKitchenSend = async (onComplete = null) => {
    const itemsNuevos = cart.filter(p => !p.enviadoCocina);
    if (itemsNuevos.length === 0) { 
      if (onComplete) onComplete(); 
      return; 
    }
    
    setIsSuccess(true);
    
    try {
      let orderId = activeOrderId;
      if (!orderId) {
        const isLlevar = mesaActual?.zona === 'llevar';
        const res = await client.post('/pos/orders', { 
          orderType: isLlevar ? 'LLEVAR' : 'SALON', 
          tableId: isLlevar ? null : mesaActual?.id, 
          ticketId: isLlevar ? mesaActual?.numero : null 
        });
        orderId = res.data.order.id;
        setActiveOrderId(orderId);
      }

      const payload = itemsNuevos.map(item => ({ 
        productId: item.id, 
        quantity: item.qty, 
        subtotal: item.precio * item.qty, 
        cuenta: item.cuenta || 'General', 
        notes: JSON.stringify(item.preparaciones), 
        isTakeaway: item.isTakeaway || false 
      }));

      const response = await client.post(`/pos/orders/${orderId}/items`, { items: payload });
      let allItemsFromDB = response.data.orderItems || [];
      
      const updatedCart = allItemsFromDB.map(item => {
          let parsedPreps = [];
          if (item.notes) { 
            try { 
              parsedPreps = JSON.parse(item.notes); 
            } catch(e) { 
              parsedPreps = [{ detalles: "Personalización" }]; 
            } 
          }
          if (!Array.isArray(parsedPreps)) parsedPreps = [parsedPreps || {}];
          
          return { 
            id: item.productId, 
            nombre: item.product?.name || 'Producto', 
            imagen: item.product?.imageUrl || null, 
            precio: parseFloat(item.subtotal) / item.quantity, 
            qty: item.quantity, 
            preparaciones: parsedPreps, 
            enviadoCocina: true, 
            kitchenStatus: item.kitchenStatus, 
            status: item.status || 'ACTIVE', 
            cuenta: item.cuenta || 'General', 
            isTakeaway: item.isTakeaway || false, 
            backendItemId: item.id, 
            requiereCocina: itemsNuevos.find(n => n.id === item.productId)?.requiereCocina !== false 
          };
      });

      setCart(prev => {
          const unsentLocal = prev.filter(p => !p.enviadoCocina && !itemsNuevos.includes(p));
          return [...updatedCart, ...unsentLocal];
      });
      
      setTimeout(() => { 
        setIsSuccess(false); 
        if (onComplete) onComplete(); 
      }, 1500);

    } catch (error) { 
        setIsSuccess(false); 
        if (onComplete) onComplete(); 
        console.error("Error al enviar a cocina:", error);
    }
  };

  const removeFromCart = (itemToRemove) => { 
    if(!itemToRemove.enviadoCocina) setCart(prev => {
        const newCart = [...prev];
        const idx = newCart.findIndex(p => 
          p.id === itemToRemove.id && 
          p.precio === itemToRemove.precio && 
          p.cuenta === itemToRemove.cuenta && 
          !!p.isTakeaway === !!itemToRemove.isTakeaway && 
          !p.enviadoCocina
        );
        
        if (idx !== -1) {
            newCart[idx] = { 
              ...newCart[idx], 
              qty: newCart[idx].qty - 1, 
              preparaciones: newCart[idx].preparaciones.slice(0, -1) 
            };
            if (newCart[idx].qty <= 0) newCart.splice(idx, 1);
        }
        return newCart;
    });
  };

  const deleteLine = (itemToRemove) => { 
    if(!itemToRemove.enviadoCocina) setCart(prev => prev.filter(p => !(
      p.id === itemToRemove.id && 
      p.precio === itemToRemove.precio && 
      p.cuenta === itemToRemove.cuenta && 
      !!p.isTakeaway === !!itemToRemove.isTakeaway && 
      !p.enviadoCocina
    )));
  };

  const toggleItemTakeaway = (itemToToggle) => {
    if (itemToToggle.enviadoCocina) return;
    
    setCart(prev => {
      const newCart = [...prev];
      const idx = newCart.findIndex(p => 
        p.id === itemToToggle.id && 
        p.precio === itemToToggle.precio && 
        p.cuenta === itemToToggle.cuenta && 
        !!p.isTakeaway === !!itemToToggle.isTakeaway && 
        !p.enviadoCocina
      );

      if (idx !== -1) {
        const currentItem = newCart[idx];
        const targetTakeawayState = !currentItem.isTakeaway;
        
        if (currentItem.qty === 1) { 
          newCart[idx] = { ...currentItem, isTakeaway: targetTakeawayState }; 
        } else {
          const prepToMove = currentItem.preparaciones[currentItem.preparaciones.length - 1];
          newCart[idx] = { 
            ...currentItem, 
            qty: currentItem.qty - 1, 
            preparaciones: currentItem.preparaciones.slice(0, -1) 
          };
          
          const existingTargetIdx = newCart.findIndex(p => 
            p.id === currentItem.id && 
            p.precio === currentItem.precio && 
            p.cuenta === currentItem.cuenta && 
            !!p.isTakeaway === targetTakeawayState && 
            !p.enviadoCocina
          );
          
          if (existingTargetIdx !== -1) { 
            newCart[existingTargetIdx] = { 
              ...newCart[existingTargetIdx], 
              qty: newCart[existingTargetIdx].qty + 1, 
              preparaciones: [...newCart[existingTargetIdx].preparaciones, prepToMove] 
            }; 
          } else { 
            newCart.push({ 
              ...currentItem, 
              qty: 1, 
              preparaciones: [prepToMove], 
              isTakeaway: targetTakeawayState 
            }); 
          }
        }
      }
      return newCart;
    });
  };

  const moveItemToCuenta = async (item, target, qtyToMove = item.qty) => { 
    const itemsToProcess = item._groupedItems || [item];
    
    try {
        let remainingToMove = qtyToMove;
        let allItemsFromDB = null;
        let dbMoveMade = false;
        
        for (const subItem of itemsToProcess) {
            if (remainingToMove <= 0) break;
            const qtyFromThis = Math.min(subItem.qty, remainingToMove);
            
            if (subItem.enviadoCocina) {
                const response = await client.put(`/pos/orders/items/${subItem.backendItemId}/move`, { 
                  targetCuenta: target, 
                  qtyToMove: qtyFromThis 
                });
                allItemsFromDB = response.data.orderItems || [];
                dbMoveMade = true;
            } else {
                setCart(prev => {
                   const newCart = [...prev];
                   let idx = newCart.indexOf(subItem);
                   
                   if (idx === -1) { 
                     idx = newCart.findIndex(p => 
                       p.id === subItem.id && 
                       p.precio === subItem.precio && 
                       p.cuenta === (subItem.cuenta || 'General') && 
                       !!p.isTakeaway === !!subItem.isTakeaway && 
                       !p.enviadoCocina
                     ); 
                   }
                   
                   if(idx !== -1) {
                       const existingIdx = newCart.findIndex(p => 
                         p.id === subItem.id && 
                         p.precio === subItem.precio && 
                         p.cuenta === target && 
                         !!p.isTakeaway === !!subItem.isTakeaway && 
                         !p.enviadoCocina
                       );
                       
                       if (existingIdx !== -1) {
                           newCart[existingIdx] = { 
                             ...newCart[existingIdx], 
                             qty: newCart[existingIdx].qty + qtyFromThis, 
                             preparaciones: [...newCart[existingIdx].preparaciones, ...subItem.preparaciones.slice(0, qtyFromThis)] 
                           };
                           
                           if (qtyFromThis < newCart[idx].qty) { 
                             newCart[idx] = { 
                               ...newCart[idx], 
                               qty: newCart[idx].qty - qtyFromThis, 
                               preparaciones: newCart[idx].preparaciones.slice(qtyFromThis) 
                             }; 
                           } else { 
                             newCart.splice(idx, 1); 
                           }
                       } else {
                           if (qtyFromThis < newCart[idx].qty) { 
                             newCart[idx] = { 
                               ...newCart[idx], 
                               qty: newCart[idx].qty - qtyFromThis, 
                               preparaciones: newCart[idx].preparaciones.slice(qtyFromThis) 
                             }; 
                             newCart.push({ 
                               ...subItem, 
                               cuenta: target, 
                               qty: qtyFromThis, 
                               preparaciones: subItem.preparaciones.slice(0, qtyFromThis) 
                             }); 
                           } else { 
                             newCart[idx] = { ...newCart[idx], cuenta: target }; 
                           }
                       }
                   }
                   return newCart;
                });
            }
            remainingToMove -= qtyFromThis;
        }
        
        if (dbMoveMade && allItemsFromDB) {
            const updatedCart = allItemsFromDB.map(dbItem => {
                let parsedPreps = [];
                if (dbItem.notes) { 
                  try { 
                    parsedPreps = JSON.parse(dbItem.notes); 
                  } catch(e) { 
                    parsedPreps = [{ detalles: "Personalización" }]; 
                  } 
                }
                if (!Array.isArray(parsedPreps)) parsedPreps = [parsedPreps || {}];
                
                return { 
                  id: dbItem.productId, 
                  nombre: dbItem.product?.name || 'Producto', 
                  imagen: dbItem.product?.imageUrl || null, 
                  precio: parseFloat(dbItem.subtotal) / dbItem.quantity, 
                  qty: dbItem.quantity, 
                  preparaciones: parsedPreps, 
                  enviadoCocina: true, 
                  kitchenStatus: dbItem.kitchenStatus, 
                  status: dbItem.status || 'ACTIVE', 
                  cuenta: dbItem.cuenta || 'General', 
                  isTakeaway: dbItem.isTakeaway || false, 
                  backendItemId: dbItem.id, 
                  requiereCocina: dbItem.product?.requiereCocina !== false 
                };
            });
            
            setCart(prev => { 
              const unsentLocal = prev.filter(p => !p.enviadoCocina); 
              return [...updatedCart, ...unsentLocal]; 
            });
        }
    } catch (error) { 
      console.error("Error al mover en BD", error); 
    }
  };

  const addNewCuenta = (n, telefono = '') => { 
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

  const toggleDeliveredStatus = async (groupedItem) => {
    if (!groupedItem) return;
    
    const itemsToUpdate = groupedItem._groupedItems || [groupedItem];
    if (itemsToUpdate.length === 0) return;
    
    const currentStatus = itemsToUpdate[0].kitchenStatus;
    if (currentStatus !== 'READY' && currentStatus !== 'DELIVERED') return;
    
    const newStatus = currentStatus === 'DELIVERED' ? 'READY' : 'DELIVERED';
    
    try {
        await Promise.all(itemsToUpdate.map(async (subItem) => { 
          if (subItem.backendItemId) { 
            await client.put(`/kitchen/tickets/${subItem.backendItemId}/status`, { status: newStatus }); 
          } 
        }));
        
        setCart(prev => { 
          const newCart = [...prev]; 
          itemsToUpdate.forEach(subItem => { 
            const idx = newCart.findIndex(p => p.backendItemId === subItem.backendItemId); 
            if (idx !== -1) { 
              newCart[idx] = { ...newCart[idx], kitchenStatus: newStatus }; 
            } 
          }); 
          return newCart; 
        });
    } catch (e) { 
      console.error("Error al actualizar entrega", e); 
    }
  };

  const deliverAllActiveItems = async () => {
    if (!activeOrderId) return;
    try {
        await client.put(`/pos/orders/${activeOrderId}/deliver-all`);
        setCart(prev => prev.map(item => 
          (item.enviadoCocina && ['PENDING', 'PREPARING', 'READY'].includes(item.kitchenStatus) && item.status !== 'CANCELLED') 
          ? { ...item, kitchenStatus: 'DELIVERED' } 
          : item
        ));
        toast.success('Todos los productos marcados como entregados');
    } catch (error) { 
      toast.error('Error al actualizar los productos'); 
    }
  };

  const cancelItem = async (item, cancelReason = 'Cancelación desde POS', cancelQty = item.qty) => {
    if (!item.enviadoCocina) { 
      deleteLine(item); 
      return; 
    }
    if (!activeOrderId || !item.backendItemId) return;
    
    try {
        const response = await client.put(`/pos/orders/${activeOrderId}/items/${item.backendItemId}/cancel`, { 
          cancelReason, 
          cancelQty 
        });
        
        if (response.data.orderItems) {
            const updatedCart = response.data.orderItems.map(dbItem => {
                let parsedPreps = [];
                if (dbItem.notes) { 
                  try { 
                    parsedPreps = JSON.parse(dbItem.notes); 
                  } catch(e) { 
                    parsedPreps = [{ detalles: "Personalización" }]; 
                  } 
                }
                if (!Array.isArray(parsedPreps)) parsedPreps = [parsedPreps || {}];
                return { 
                  id: dbItem.productId, 
                  nombre: dbItem.product?.name || 'Producto', 
                  imagen: dbItem.product?.imageUrl || null, 
                  precio: parseFloat(dbItem.subtotal) / dbItem.quantity, 
                  qty: dbItem.quantity, 
                  preparaciones: parsedPreps, 
                  enviadoCocina: true, 
                  kitchenStatus: dbItem.kitchenStatus, 
                  status: dbItem.status || 'ACTIVE', 
                  cuenta: dbItem.cuenta || 'General', 
                  isTakeaway: dbItem.isTakeaway || false, 
                  backendItemId: dbItem.id, 
                  requiereCocina: dbItem.product?.requiereCocina !== false 
                };
            });
            setCart(prev => { 
              const unsentLocal = prev.filter(p => !p.enviadoCocina); 
              return [...updatedCart, ...unsentLocal]; 
            });
        } else {
            setCart(prev => prev.map(p => 
              p.backendItemId === item.backendItemId ? { ...p, status: 'CANCELLED' } : p
            ));
        }
        
        if (response.data.wasRefunded) {
          toast.success('Cancelado. Reembolso registrado en caja.');
        } else {
          toast.success('Producto cancelado correctamente.');
        }
    } catch (error) { 
      toast.error('Error al cancelar el producto'); 
    }
  };

  const cancelAccountItems = async (cuentaName, cancelReason = 'Cancelación de cuenta') => {
    const itemsToCancel = cart.filter(item => 
      item.cuenta === cuentaName && 
      item.enviadoCocina && 
      item.status !== 'CANCELLED'
    );
    if (itemsToCancel.length === 0) return;
    
    try {
        for (const item of itemsToCancel) {
            await client.put(`/pos/orders/${activeOrderId}/items/${item.backendItemId}/cancel`, { 
              cancelReason, 
              cancelQty: item.qty 
            });
        }
        setCart(prev => prev.map(item => 
          itemsToCancel.some(i => i.backendItemId === item.backendItemId) 
          ? { ...item, status: 'CANCELLED' } 
          : item
        ));
        toast.success(`Cuenta ${cuentaName} cancelada`);
    } catch (error) { 
      toast.error('Error al cancelar la cuenta'); 
    }
  };

  const cancelFullOrder = async (cancelReason = 'Cancelación de cuenta completa') => {
    if (!activeOrderId) return;
    try {
        const response = await client.put(`/pos/orders/${activeOrderId}/cancel`, { cancelReason });
        setOrderStatus('CANCELLED');
        setCart(prev => prev.map(item => item.enviadoCocina ? { ...item, status: 'CANCELLED' } : item));
        
        if (response.data.refundedAmount > 0) {
          toast.success(`Orden cancelada. Reembolso de $${response.data.refundedAmount} registrado.`);
        } else {
          toast.success('Orden cancelada correctamente.');
        }
    } catch (error) { 
      toast.error(error.response?.data?.message || 'Error al cancelar la orden'); 
    }
  };

  const validateAllDelivered = (cuentaName = null) => { 
    const itemsToCheck = cart.filter(c => 
      (cuentaName ? c.cuenta === cuentaName : true) && c.status !== 'CANCELLED'
    ); 
    if (itemsToCheck.length === 0) return false;
    return itemsToCheck.every(item => item.enviadoCocina && item.kitchenStatus === 'DELIVERED'); 
  };

  const payCuenta = async (nombreCuenta, paymentDetails, onComplete) => {
    try {
      const method = paymentDetails?.method || 'efectivo'; 
      if(activeOrderId) {
        await client.put(`/pos/orders/${activeOrderId}/pay`, { 
          cuentaName: nombreCuenta, 
          isFullPayment: false, 
          paymentMethod: method 
        });
      }
      setPaidAccounts(prev => [...prev, nombreCuenta]);
      if (onComplete) onComplete();
    } catch (error) { 
      toast.error("Hubo un error al procesar el pago."); 
    }
  };

  const handleCheckout = async (paymentDetails, onComplete) => {
    try {
      if (cart.some(p => !p.enviadoCocina)) {
        await new Promise(resolve => simulateKitchenSend(resolve));
      }
      const method = paymentDetails?.method || 'efectivo';
      if(activeOrderId) {
        await client.put(`/pos/orders/${activeOrderId}/pay`, { 
          isFullPayment: true, 
          paymentMethod: method 
        });
      }
      setOrderStatus('PAID');
      if (onComplete) onComplete();
    } catch (error) { 
      toast.error("Hubo un error al cobrar la mesa."); 
    }
  };

  const handleCloseTable = async (onComplete) => {
      if(activeOrderId) { 
        await client.put(`/pos/orders/${activeOrderId}/close`); 
        localStorage.removeItem(`lya_phones_${activeOrderId}`); 
      }
      setCart([]); 
      setActiveOrderId(null); 
      setOrderStatus('OPEN'); 
      setPaidAccounts([]);
      if(onComplete) onComplete();
  };

  const handlePrintTicket = async (cuentaName = null) => {
    if (!activeOrderId) return;
    try { 
      await client.post(`/pos/orders/${activeOrderId}/print`, { cuentaName }); 
    } catch (error) {}
  };

  const total = useMemo(() => 
    cart.filter(item => !paidAccounts.includes(item.cuenta || 'General') && item.status !== 'CANCELLED')
        .reduce((acc, curr) => acc + (curr.precio * curr.qty), 0), 
  [cart, paidAccounts]);

  const unsentTotal = useMemo(() => 
    cart.filter(p => !p.enviadoCocina && p.status !== 'CANCELLED')
        .reduce((acc, curr) => acc + (curr.precio * curr.qty), 0), 
  [cart]);

  const hasUnsentItems = useMemo(() => cart.some(p => !p.enviadoCocina), [cart]);

  const cuentasDisponibles = useMemo(() => 
    Array.from(new Set([...nombresCuentas, ...cart.map(i => i.cuenta || 'General')])), 
  [cart, nombresCuentas]);

  const getSubtotalByCuenta = (nombreCuenta) => 
    cart.filter(item => item.cuenta === nombreCuenta && item.status !== 'CANCELLED')
        .reduce((acc, curr) => acc + (curr.precio * curr.qty), 0);

  const getProductQty = (id) => 
    cart.filter(p => p.id === id && !p.enviadoCocina && p.cuenta === cuentaActiva && p.status !== 'CANCELLED')
        .reduce((acc, item) => acc + item.qty, 0);

  const filteredProducts = useMemo(() => {
    return dbProducts.filter(p => {
       const matchText = p.nombre.toLowerCase().includes(filtroTexto.toLowerCase());
       const matchCat = categoriaActiva === 'todas' || p.categoria === categoriaActiva;
       if (isVitrina) return matchText && matchCat && p.requiereCocina === false;
       return matchText && matchCat;
    });
  }, [filtroTexto, categoriaActiva, dbProducts, isVitrina]);

  return { 
    cart, total, unsentTotal, hasUnsentItems, addToCart, removeFromCart, deleteLine, moveItemToCuenta, toggleDeliveredStatus,
    filtroTexto, setFiltroTexto, categoriaActiva, setCategoriaActiva, filteredProducts, getProductQty, 
    handleCheckout, handleCloseTable, handlePrintTicket, simulateKitchenSend, isSuccess,
    cuentaActiva, setCuentaActiva, cuentasDisponibles, addNewCuenta, getSubtotalByCuenta, payCuenta,
    dbCategories, orderStatus, paidAccounts, validateAllDelivered, toggleItemTakeaway, cuentasTelefonos,
    deliverAllActiveItems, cancelItem, cancelFullOrder, cancelAccountItems 
  };
};