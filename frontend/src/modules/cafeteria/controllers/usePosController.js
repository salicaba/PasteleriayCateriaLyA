// src/modules/cafeteria/controllers/usePosController.js
import { useState, useMemo, useEffect } from 'react';
import client from '../../../api/client.js';

// ----------------------------------------------------------------------
// HELPER FUNCTIONS: INYECCIÓN DE OPCIONES PREDETERMINADAS
// ----------------------------------------------------------------------
const getProductModifiers = (product) => {
  if (!product) return [];
  let ops = product.opciones;
  if (typeof ops === 'string') { try { ops = JSON.parse(ops); } catch (e) { } }
  if (typeof ops === 'string') { try { ops = JSON.parse(ops); } catch (e) { } }
  
  if (ops && typeof ops === 'object') {
      const mods = [];
      const mapOption = (opt) => {
          if (typeof opt === 'string') return { id: opt, label: opt, price: 0 };
          return { id: opt.nombre || 'Opción', label: opt.nombre || 'Opción', price: Number(opt.precioAdicional || 0) };
      };

      const tamanos = Array.isArray(ops.tamanos) ? ops.tamanos : [];
      const leches = Array.isArray(ops.leches) ? ops.leches : [];
      const extras = Array.isArray(ops.extras) ? ops.extras : [];

      if (tamanos.length > 0) mods.push({ id: 'tamano', title: 'Tamaño', type: 'single', options: tamanos.map(mapOption) });
      if (leches.length > 0) mods.push({ id: 'leche', title: 'Tipo de Leche', type: 'single', options: leches.map(mapOption) });
      if (extras.length > 0) mods.push({ id: 'extras', title: 'Extras Adicionales', type: 'multiple', options: extras.map(mapOption) });

      return mods;
  }
  return [];
};

const getDefaultCustomizations = (product) => {
  const modifiers = getProductModifiers(product);
  if (modifiers.length === 0) return null;

  let total = Number(product.precioBase || product.precio || 0);
  let tamanoStr = 'Estándar';
  let lecheStr = null;
  let extrasArr = [];

  modifiers.forEach(mod => {
      if (mod.type === 'single' && mod.options.length > 0) {
          const opt = mod.options[0];
          total += opt.price;
          
          const idLower = String(mod.id).toLowerCase();
          const titleLower = String(mod.title).toLowerCase();
          
          if (idLower.includes('leche') || titleLower.includes('leche')) {
              lecheStr = opt.label;
          } else if (idLower.includes('taman') || idLower.includes('tamañ') || titleLower.includes('tamañ')) {
              tamanoStr = opt.label;
          } else {
              extrasArr.push(opt.label);
          }
      }
  });

  return {
      precioFinal: total,
      detalles: { tamano: tamanoStr, ...(lecheStr && { leche: lecheStr }), ...(extrasArr.length > 0 && { extras: extrasArr }) },
  };
};

// ----------------------------------------------------------------------
// HOOK PRINCIPAL
// ----------------------------------------------------------------------
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

  const [notification, setNotification] = useState(null);
  const triggerNotification = (msg, type = 'success') => {
    setNotification({ msg, type, show: true });
    setTimeout(() => setNotification(null), 3500);
  };

  const mesaActual = useMemo(() => {
    if (!mesaInicial) return null;
    return todasLasMesas.find(m => m.id === mesaInicial.id) || mesaInicial;
  }, [mesaInicial, todasLasMesas]);

  const isVitrina = mesaActual?.zona === 'vitrina';
  const isLlevar = mesaActual?.zona === 'llevar';

  // 🔥 REGISTRO ABSOLUTO DE CUENTAS PAGADAS 🔥
  const cuentasPagadasReales = Array.from(new Set([...(paidAccounts || [])]));

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prodsRes, catsRes] = await Promise.all([
          client.get('/menu/products'),
          client.get('/menu/categories')
        ]);
        
        const prods = prodsRes.data;
        const cats = catsRes.data;

        const activeProducts = prods.filter(p => {
          const estado = p.isActive !== undefined ? p.isActive : p.disponible;
          if (estado === false || estado === 0 || estado === '0') return false;
          return true;
        }).map(p => ({
          ...p,
          nombre: p.name || p.nombre || 'Sin Nombre',
          precio: parseFloat(p.basePrice || p.precio || 0),
          imagen: p.imageUrl || p.imagen || p.image || null,
          categoria: p.categoryId || p.categoria,
          stock: p.stockQuantity || p.stock || 0
        }));
        
        setDbProducts(activeProducts); 

        const hasTodas = cats.some(c => c.id === 'todas' || c.name.trim().toLowerCase() === 'todas');
        const finalCats = hasTodas ? cats : [{ id: 'todas', name: 'Todas' }, ...cats];
        
        setDbCategories(finalCats);
      } catch (error) {
        console.error("Error al cargar menú en POS", error);
      }
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
        
        let loadedPaidAccounts = mesaActual.paidAccounts || [];

        if (currentOrderId) {
            // RECUPERAR TELÉFONOS
            const storedPhones = localStorage.getItem(`lya_phones_${currentOrderId}`);
            if (storedPhones) {
                try { 
                  setCuentasTelefonos(JSON.parse(storedPhones)); 
                } catch(e) {}
            }

            // 🛡️ ESCUDO CONTRA AMNESIA DE BD: RECUPERAR PAGOS LOCALES
            const storedPaid = localStorage.getItem(`lya_paid_${currentOrderId}`);
            if (storedPaid) {
                try {
                  const parsedPaid = JSON.parse(storedPaid);
                  loadedPaidAccounts = Array.from(new Set([...loadedPaidAccounts, ...parsedPaid]));
                } catch(e) {}
            }
        }
        
        // Fusión de memorias
        setPaidAccounts(prev => Array.from(new Set([...prev, ...loadedPaidAccounts])));

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
                nombre: item.product?.name || item.product?.nombre || 'Producto',
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

        // Asegurar que las cuentas pagadas existan en la lista de nombres
        loadedPaidAccounts.forEach(pa => nuevasCuentas.add(pa));
        
    } else {
        setCart(prev => { 
          prev.forEach(c => nuevasCuentas.add(c.cuenta)); 
          return prev; 
        });
    }

    setNombresCuentas(prev => Array.from(new Set([...prev, ...Array.from(nuevasCuentas)])));

  }, [isOpen, mesaActual]);

  const addToCart = (productWithDetails, forceCuenta = null) => {
    const targetCuenta = forceCuenta || cuentaActiva;

    if (cuentasPagadasReales.includes(targetCuenta)) {
        triggerNotification(`La cuenta "${targetCuenta}" está sellada y cobrada. Selecciona una cuenta nueva.`, 'error');
        return;
    }
    
    let finalDetails = productWithDetails.detalles || {};
    let finalPrice = productWithDetails.precioFinal || productWithDetails.precioBase || productWithDetails.precio || 0;
    
    if (!productWithDetails.detalles) {
        const defaultCustoms = getDefaultCustomizations(productWithDetails);
        if (defaultCustoms) {
            finalDetails = defaultCustoms.detalles;
            finalPrice = defaultCustoms.precioFinal;
        }
    }

    setCart(prev => {
      const detailStr = JSON.stringify(finalDetails);
      
      const index = prev.findIndex(p => {
         if (p.id !== productWithDetails.id || 
             p.precio !== finalPrice || 
             p.enviadoCocina || 
             p.cuenta !== targetCuenta || 
             !!p.isTakeaway !== !!productWithDetails.isTakeaway) {
             return false;
         }
         return p.preparaciones.every(prep => JSON.stringify(prep) === detailStr);
      });

      if (index !== -1) {
          const newCart = [...prev];
          newCart[index] = { 
            ...newCart[index], 
            qty: newCart[index].qty + 1, 
            preparaciones: [...newCart[index].preparaciones, finalDetails] 
          };
          return newCart;
        }
        
      return [...prev, { 
        ...productWithDetails, 
        precio: finalPrice, 
        qty: 1, 
        preparaciones: [finalDetails], 
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
        const isLlevarMode = mesaActual?.zona === 'llevar';
        const res = await client.post('/pos/orders', { 
          orderType: isLlevarMode ? 'LLEVAR' : 'SALON', 
          tableId: isLlevarMode ? null : mesaActual?.id, 
          ticketId: isLlevarMode ? mesaActual?.numero : null 
        });
        orderId = res.data.order.id;
        setActiveOrderId(orderId);

        setCuentasTelefonos(prev => {
            if (Object.keys(prev).length > 0) {
                localStorage.setItem(`lya_phones_${orderId}`, JSON.stringify(prev));
            }
            return prev;
        });
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
            nombre: item.product?.name || item.product?.nombre || 'Producto', 
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
        console.error("Error al enviar a cocina:", error);
        throw error;
    }
  };

  const removeFromCart = (itemToRemove) => { 
    if(!itemToRemove.enviadoCocina) setCart(prev => {
        const newCart = [...prev];
        const prepStr = JSON.stringify(itemToRemove.preparaciones[0] || {});
        const idx = newCart.findIndex(p => 
          p.id === itemToRemove.id && 
          p.precio === itemToRemove.precio && 
          p.cuenta === itemToRemove.cuenta && 
          !!p.isTakeaway === !!itemToRemove.isTakeaway && 
          !p.enviadoCocina &&
          JSON.stringify(p.preparaciones[0] || {}) === prepStr
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
    if(!itemToRemove.enviadoCocina) {
        const prepStr = JSON.stringify(itemToRemove.preparaciones[0] || {});
        setCart(prev => prev.filter(p => !(
          p.id === itemToRemove.id && 
          p.precio === itemToRemove.precio && 
          p.cuenta === itemToRemove.cuenta && 
          !!p.isTakeaway === !!itemToRemove.isTakeaway && 
          !p.enviadoCocina &&
          JSON.stringify(p.preparaciones[0] || {}) === prepStr
        )));
    }
  };

  const toggleItemTakeaway = (itemToToggle) => {
    if (itemToToggle.enviadoCocina) return;
    
    setCart(prev => {
      const newCart = [...prev];
      const prepStr = JSON.stringify(itemToToggle.preparaciones[0] || {});
      const idx = newCart.findIndex(p => 
        p.id === itemToToggle.id && 
        p.precio === itemToToggle.precio && 
        p.cuenta === itemToToggle.cuenta && 
        !!p.isTakeaway === !!itemToToggle.isTakeaway && 
        !p.enviadoCocina &&
        JSON.stringify(p.preparaciones[0] || {}) === prepStr
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
            !p.enviadoCocina &&
            JSON.stringify(p.preparaciones[0] || {}) === prepStr
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
    if (cuentasPagadasReales.includes(target)) {
        triggerNotification(`La cuenta "${target}" ya está cobrada. No puedes moverle más productos.`, 'error');
        return;
    }

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
                   const prepStr = JSON.stringify(subItem.preparaciones[0] || {});
                   let idx = newCart.indexOf(subItem);
                   
                   if (idx === -1) { 
                     idx = newCart.findIndex(p => 
                       p.id === subItem.id && 
                       p.precio === subItem.precio && 
                       p.cuenta === (subItem.cuenta || 'General') && 
                       !!p.isTakeaway === !!subItem.isTakeaway && 
                       !p.enviadoCocina &&
                       JSON.stringify(p.preparaciones[0] || {}) === prepStr
                     ); 
                   }
                   
                   if(idx !== -1) {
                       const existingIdx = newCart.findIndex(p => 
                         p.id === subItem.id && 
                         p.precio === subItem.precio && 
                         p.cuenta === target && 
                         !!p.isTakeaway === !!subItem.isTakeaway && 
                         !p.enviadoCocina &&
                         JSON.stringify(p.preparaciones[0] || {}) === prepStr
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
                  nombre: dbItem.product?.name || dbItem.product?.nombre || 'Producto', 
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
      triggerNotification("Error al mover los ítems de cuenta.", "error");
      throw error;
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
      triggerNotification("No se pudo actualizar el estado de entrega.", "error");
      throw e;
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
    } catch (error) { 
      console.error("Error en deliverAllActiveItems:", error);
      triggerNotification("Hubo un error al entregar todo.", "error");
      throw error; 
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
                  nombre: dbItem.product?.name || dbItem.product?.nombre || 'Producto', 
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
          triggerNotification('Cancelado. Reembolso registrado en caja.', 'success');
        } else {
          triggerNotification('Item cancelado de la orden.', 'success');
        }
    } catch (error) { 
      triggerNotification("Error al cancelar el ítem.", "error");
      throw error; 
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
        triggerNotification(`Ítems de la cuenta ${cuentaName} cancelados.`, 'success');
    } catch (error) { 
      triggerNotification("Error al cancelar los ítems de la cuenta.", "error");
      throw error; 
    }
  };

  const cancelFullOrder = async (cancelReason = 'Cancelación de cuenta completa') => {
    if (!activeOrderId) return;
    try {
        const response = await client.put(`/pos/orders/${activeOrderId}/cancel`, { cancelReason });
        setOrderStatus('CANCELLED');
        setCart(prev => prev.map(item => item.enviadoCocina ? { ...item, status: 'CANCELLED' } : item));
        
        // Limpiamos los archivos fantasma
        localStorage.removeItem(`lya_paid_${activeOrderId}`); 
        localStorage.removeItem(`lya_phones_${activeOrderId}`);

        if (response.data.refundedAmount > 0) {
          triggerNotification(`Orden cancelada. Reembolso de $${response.data.refundedAmount} registrado.`, 'success');
        } else {
          triggerNotification(`Orden anulada correctamente.`, 'success');
        }
    } catch (error) { 
      triggerNotification("Error crítico al anular la orden.", "error");
      throw error; 
    }
  };

  const validateAllDelivered = (cuentaName = null) => { 
    const itemsToCheck = cart.filter(c => 
      (cuentaName ? c.cuenta === cuentaName : true) && c.status !== 'CANCELLED'
    ); 
    if (itemsToCheck.length === 0) return false;
    
    const hasPendingDelivery = itemsToCheck.some(item => 
       !item.enviadoCocina || ['PENDING', 'PREPARING', 'READY'].includes(item.kitchenStatus)
    );
    return !hasPendingDelivery;
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
      
      // ESCUDO DE GUARDADO: Memoria Local Permanente
      setPaidAccounts(prev => {
          const newArr = Array.from(new Set([...prev, nombreCuenta]));
          if (activeOrderId) localStorage.setItem(`lya_paid_${activeOrderId}`, JSON.stringify(newArr));
          return newArr;
      });

      if (onComplete) onComplete();
    } catch (error) { 
      throw error; 
    }
  };

  const handleCheckout = async (paymentDetails, onComplete) => {
    try {
      if (cart.some(p => !p.enviadoCocina)) {
        await new Promise((resolve, reject) => simulateKitchenSend(resolve).catch(reject));
      }
      const method = paymentDetails?.method || 'efectivo';
      if(activeOrderId) {
        await client.put(`/pos/orders/${activeOrderId}/pay`, { 
          isFullPayment: true, 
          paymentMethod: method 
        });
      }
      setOrderStatus('PAID');
      
      // ESCUDO DE GUARDADO: Memoria Local Permanente
      setPaidAccounts(prev => {
        const todasLasCuentas = Array.from(new Set(cart.map(i => i.cuenta || 'General')));
        const newArr = Array.from(new Set([...prev, ...todasLasCuentas]));
        if (activeOrderId) localStorage.setItem(`lya_paid_${activeOrderId}`, JSON.stringify(newArr));
        return newArr;
      });

      if (onComplete) onComplete();
    } catch (error) { 
      throw error; 
    }
  };

  const handleCloseTable = async (onComplete) => {
      try {
        if(activeOrderId) { 
          await client.put(`/pos/orders/${activeOrderId}/close`); 
          
          // DESTRUCCIÓN LIMPIA AL FINALIZAR MESA
          localStorage.removeItem(`lya_phones_${activeOrderId}`); 
          localStorage.removeItem(`lya_paid_${activeOrderId}`); 
        }
        setCart([]); 
        setActiveOrderId(null); 
        setOrderStatus('OPEN'); 
        setPaidAccounts([]);
        
        if(onComplete) onComplete();
      } catch (error) {
        throw error;
      }
  };

  const handlePrintTicket = async (cuentaName = null) => {
    if (!activeOrderId) return;
    try { 
      await client.post(`/pos/orders/${activeOrderId}/print`, { cuentaName }); 
    } catch (error) {}
  };

  const total = useMemo(() => 
    cart.filter(item => !cuentasPagadasReales.includes(item.cuenta || 'General') && item.status !== 'CANCELLED')
        .reduce((acc, curr) => acc + (curr.precio * curr.qty), 0), 
  [cart, cuentasPagadasReales]);

  const unsentTotal = useMemo(() => 
    cart.filter(p => !p.enviadoCocina && p.status !== 'CANCELLED')
        .reduce((acc, curr) => acc + (curr.precio * curr.qty), 0), 
  [cart]);

  const hasUnsentItems = useMemo(() => cart.some(p => !p.enviadoCocina), [cart]);

  const cuentasDisponibles = useMemo(() => 
    Array.from(new Set([...nombresCuentas, ...cart.map(i => i.cuenta || 'General')])), 
  [cart, nombresCuentas]);

  const getSubtotalByCuenta = (nombreCuenta) => {
    // 🛡️ BARRERA ABSOLUTA: Si la cuenta está en el registro cobrado, retorna $0 al sistema.
    if (cuentasPagadasReales.includes(nombreCuenta)) return 0;
    
    return cart.filter(item => item.cuenta === nombreCuenta && item.status !== 'CANCELLED')
        .reduce((acc, curr) => acc + (curr.precio * curr.qty), 0);
  };

  const getProductQty = (id) => 
    cart.filter(p => p.id === id && !p.enviadoCocina && p.cuenta === cuentaActiva && p.status !== 'CANCELLED')
        .reduce((acc, item) => acc + item.qty, 0);

  const filteredProducts = useMemo(() => {
    return dbProducts.filter(p => {
       const productName = p.nombre || p.name || '';
       const matchText = productName.toLowerCase().includes((filtroTexto || '').toLowerCase());
       
       const matchCat = categoriaActiva === 'todas' || p.categoria === categoriaActiva || p.categoryId === categoriaActiva;
       
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
    deliverAllActiveItems, cancelItem, cancelFullOrder, cancelAccountItems, 
    notification, triggerNotification
  };
};