// backend/src/modules/pos/pos.orders.controller.js
import { getIO } from '../../config/socket.js'; 
import Order from './Order.model.js';
import OrderItem from './OrderItem.model.js';
import Product from '../menu/Product.model.js';
import Table from './Table.model.js';

// ==========================================
// 🧙‍♂️ UTILIDAD: DESEMPAQUETAR METADATA DE PROMOCIÓN
// ==========================================
const extractPromoMeta = (item) => {
  const plainItem = item.toJSON ? item.toJSON() : item;
  plainItem.isAutoPromo = false;
  plainItem.promoLabel = null;
  plainItem.precioOriginal = null;
  
  if (plainItem.notes) {
      try {
          let parsedNotes = JSON.parse(plainItem.notes);
          if (Array.isArray(parsedNotes)) {
              const metaIndex = parsedNotes.findIndex(n => n && n._isPromoMeta);
              if (metaIndex >= 0) {
                  const meta = parsedNotes[metaIndex];
                  plainItem.isAutoPromo = meta.isAutoPromo;
                  plainItem.promoLabel = meta.promoLabel;
                  plainItem.precioOriginal = meta.precioOriginal;
                  // Removemos la metadata para que no salga en los detalles visuales
                  parsedNotes.splice(metaIndex, 1);
                  plainItem.notes = JSON.stringify(parsedNotes);
              }
          }
      } catch(e) {}
  }
  return plainItem;
};

// ==========================================
// 🛒 CREAR O RECUPERAR ORDEN (Folios Seguros)
// ==========================================
export const createOrder = async (req, res) => {
  try {
    const { orderType, tableId } = req.body;
    let { ticketId } = req.body;
    const employeeId = req.user?.id || null; 
    
    const finalTableId = orderType === 'SALON' ? tableId : null;
    const finalOrderType = (orderType === 'SALON' && !finalTableId) ? 'LLEVAR' : orderType;

    if (finalOrderType === 'SALON' && finalTableId) {
      const existingOrders = await Order.findAll({ 
        where: { tableId: finalTableId, status: ['OPEN', 'PAID'] } 
      });
      
      if (existingOrders.length > 0) {
        return res.status(200).json({ message: 'Orden activa recuperada', order: existingOrders[0] });
      }
    }

    let finalTicketId = ticketId || null;

    if (finalOrderType === 'LLEVAR') {
      if (ticketId === 'VITRINA-EXPRESS' || ticketId === 'MOSTRADOR') {
        const randomNum = Math.floor(100 + Math.random() * 900);
        const timeCode = Date.now().toString().slice(-6);
        finalTicketId = `MOSTRADOR CAF-${timeCode}${randomNum}`;
      } else {
        const randomNum = Math.floor(1000 + Math.random() * 9000); 
        const timeCode = Date.now().toString().slice(-2);
        const folioSeguro = `${randomNum}${timeCode}`;
        let nombreCliente = 'Cliente';
        if (ticketId) {
           nombreCliente = String(ticketId).replace(/Llevar\s*#?[0-9\-\s]*/i, '').trim();
           if (!nombreCliente) nombreCliente = 'Cliente';
        }
        finalTicketId = `Llevar #${folioSeguro} - ${nombreCliente}`;
      }
    }

    const newOrder = await Order.create({ 
      orderType: finalOrderType, 
      ticketId: finalTicketId, 
      tableId: finalTableId, 
      createdBy: employeeId, 
      status: 'OPEN', 
      totalAmount: 0 
    });

    getIO().emit('pos:update');
    res.status(201).json({ message: 'Orden iniciada', order: newOrder });
  } catch (error) { 
    console.error("🔥 Error crítico al crear orden:", error);
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ success: false, message: "La mesa que intentas usar no existe o tu sesión tiene datos cruzados. Por favor, limpia tu sesión y escanea el QR nuevamente." });
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: "Esta mesa ya tiene un pedido activo en curso o hay un conflicto de sesión." });
    }
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: "Los datos enviados están incompletos o corruptos." });
    }
    return res.status(500).json({ success: false, message: `Error interno de base de datos: ${error.message}` });
  }
};

// ==========================================
// ➕ AGREGAR PRODUCTOS A LA COMANDA & CONTROL DE STOCK
// ==========================================
export const addItemsToOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { items } = req.body; 
    const order = await Order.findByPk(orderId);
    
    if (!order || !['OPEN', 'PAID'].includes(order.status)) {
      return res.status(400).json({ message: 'La orden no está abierta para recibir productos.' });
    }

    // 🔥 BLINDAJE NEO-BENTO: Contrabando de las etiquetas de Promoción dentro del JSON `notes`
    const itemsToInsert = items.map(item => {
      let parsedNotes = [];
      if (item.notes) {
        try { parsedNotes = JSON.parse(item.notes); } catch(e){}
        if (!Array.isArray(parsedNotes)) parsedNotes = [parsedNotes];
      }

      if (item.isAutoPromo || item.promoLabel || item.precioOriginal) {
        parsedNotes.push({
          _isPromoMeta: true,
          isAutoPromo: item.isAutoPromo || false,
          promoLabel: item.promoLabel || null,
          precioOriginal: item.precioOriginal || null
        });
      }

      return { 
        ...item, 
        orderId, 
        cuenta: order.orderType === 'LLEVAR' ? 'General' : (item.cuenta || 'General'), 
        kitchenStatus: 'PENDING',
        isTakeaway: item.isTakeaway || false,
        notes: JSON.stringify(parsedNotes)
      };
    });

    await OrderItem.bulkCreate(itemsToInsert);
    
    const subtotalNuevo = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    
    // 🔥 FIX BUG 1: Si la mesa estaba "Pagada" pero caen nuevos pedidos, ¡REVIVE A OPEN!
    if (order.status === 'PAID') {
        await order.update({ status: 'OPEN', totalAmount: Number(order.totalAmount) + subtotalNuevo });
    } else {
        await order.update({ totalAmount: Number(order.totalAmount) + subtotalNuevo });
    }

    // 🚀 MOTOR DE STOCK: Deducción en Tiempo Real
    const stockToDeduct = {};
    items.forEach(item => {
      if (!stockToDeduct[item.productId]) stockToDeduct[item.productId] = 0;
      stockToDeduct[item.productId] += (item.quantity || 1);
    });

    const stockAlerts = [];
    for (const [productId, qtyToSubstract] of Object.entries(stockToDeduct)) {
      const product = await Product.findByPk(productId);
      if (product && product.controlarStock) {
        const newStock = Math.max(0, product.stockQuantity - qtyToSubstract);
        const isNowAgotado = newStock === 0 || product.isAgotado;
        
        await product.update({ 
          stockQuantity: newStock, 
          isAgotado: isNowAgotado 
        });
        
        stockAlerts.push({ 
          id: product.id, 
          stock: newStock, 
          isAgotado: isNowAgotado 
        });
      }
    }

    // 📡 Emitir actualizaciones de stock si hubo cambios
    if (stockAlerts.length > 0) {
      getIO().emit('stock:update', stockAlerts);
    }

    const allItems = await OrderItem.findAll({
      where: { orderId, status: 'ACTIVE' },
      include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice', 'imageUrl'] }]
    });

    getIO().emit('pos:update');
    getIO().emit('kitchen:update'); 
    
    // Desempaquetamos para enviar al frontend correctamente
    res.status(201).json({ message: 'Productos enviados a cocina', orderItems: allItems.map(extractPromoMeta) });
  } catch (error) { 
    console.error("🔥 Error crítico al agregar items:", error);
    res.status(500).json({ message: 'Error al agregar productos', error: error.message }); 
  }
};

// ==========================================
// 🔍 OBTENER ORDEN COMPLETA (Para el POS)
// ==========================================
export const getActiveOrderByTable = async (req, res) => {
  try {
    const { tableId } = req.params;
    const orders = await Order.findAll({
      where: { tableId, status: ['OPEN', 'PAID'] },
      include: [
        { 
          model: OrderItem, 
          as: 'items', 
          where: { status: 'ACTIVE' },
          required: false, 
          include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice', 'imageUrl'] }] 
        }
      ]
    });
    const validOrder = orders.length > 0 ? orders[0].toJSON() : null;
    
    if (validOrder && validOrder.items) {
        validOrder.items = validOrder.items.map(extractPromoMeta);
    }
    
    res.json({ order: validOrder });
  } catch (error) { 
    res.status(500).json({ message: 'Error al recuperar comanda', error: error.message }); 
  }
};

// ==========================================
// 🚪 CERRAR Y LIBERAR MESA
// ==========================================
export const closeOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findByPk(orderId);
    if (!order) return res.status(404).json({ message: 'Orden no encontrada' });
    await order.update({ status: 'CLOSED' });
    getIO().emit('pos:update');
    res.json({ message: 'Mesa liberada y orden archivada.' });
  } catch (error) { 
    res.status(500).json({ message: 'Error al cerrar mesa', error: error.message }); 
  }
};

// ==========================================
// 📊 LISTAR TODAS LAS ÓRDENES ACTIVAS
// ==========================================
export const getActiveOrders = async (req, res) => {
  try {
    const activeOrders = await Order.findAll({
      where: { status: ['OPEN', 'PAID'] },
      include: [ 
        { model: Table, as: 'table', attributes: ['id', 'number', 'zone'] },
        { 
          model: OrderItem, 
          as: 'items', 
          where: { status: 'ACTIVE' },
          required: false,
          include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice', 'imageUrl'] }] 
        } 
      ]
    });

    const validOrders = [];
    for (const order of activeOrders) {
      if (order.orderType === 'LLEVAR' && (!order.items || order.items.length === 0)) {
         if (!order.createdBy) continue; 
      }
      const plainOrder = order.toJSON();
      if (plainOrder.items) {
          plainOrder.items = plainOrder.items.map(extractPromoMeta);
      }
      validOrders.push(plainOrder);
    }
    res.json(validOrders);
  } catch (error) { 
    res.status(500).json({ message: 'Error al listar órdenes', error: error.message }); 
  }
};

// ==========================================
// 🔄 MOVER / DIVIDIR PRODUCTO ENTRE CUENTAS
// ==========================================
export const moveItemAccount = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { targetCuenta, qtyToMove } = req.body;
    
    const item = await OrderItem.findByPk(itemId);
    if (!item) return res.status(404).json({ message: 'Producto no encontrado' });
    
    // 🔥 Recuperamos la metadata antes de dividir para no perder las promos al mover cuentas
    let moveNotes = [];
    try { moveNotes = JSON.parse(item.notes || '[]'); } catch(e){}
    if (!Array.isArray(moveNotes)) moveNotes = [moveNotes];
    
    let metaObj = null;
    const metaIdx = moveNotes.findIndex(n => n && n._isPromoMeta);
    if (metaIdx >= 0) {
        metaObj = moveNotes.splice(metaIdx, 1)[0];
    }
    
    const isAutoPromo = metaObj ? metaObj.isAutoPromo : false;
    const promoLabel = metaObj ? metaObj.promoLabel : null;
    
    const unitPrice = Number(item.subtotal) / item.quantity;
    
    const existingItems = await OrderItem.findAll({
        where: {
            orderId: item.orderId,
            productId: item.productId,
            cuenta: targetCuenta,
            kitchenStatus: item.kitchenStatus,
            isTakeaway: item.isTakeaway,
            status: 'ACTIVE'
        }
    });

    const existingItem = existingItems.find(i => {
        if ((Number(i.subtotal) / i.quantity) !== unitPrice) return false;
        
        let eNotes = [];
        try { eNotes = JSON.parse(i.notes || '[]'); } catch(e){}
        const eMeta = eNotes.find(n => n && n._isPromoMeta);
        const eIsPromo = eMeta ? eMeta.isAutoPromo : false;
        const eLabel = eMeta ? eMeta.promoLabel : null;
        
        return eIsPromo === isAutoPromo && eLabel === promoLabel;
    });

    const notesToMove = moveNotes.slice(0, qtyToMove);
    const remainingNotes = moveNotes.slice(qtyToMove);

    // Reinyectamos la magia en los objetos separados
    if (metaObj) {
        notesToMove.push(metaObj);
        remainingNotes.push(metaObj);
    }
    
    if (existingItem && existingItem.id !== item.id) {
        let existingNotes = [];
        try { existingNotes = JSON.parse(existingItem.notes || '[]'); } catch(e){}
        if (!Array.isArray(existingNotes)) existingNotes = [existingNotes];
        
        const eMetaIdx = existingNotes.findIndex(n => n && n._isPromoMeta);
        if (eMetaIdx >= 0) existingNotes.splice(eMetaIdx, 1);
        
        await existingItem.update({
            quantity: existingItem.quantity + qtyToMove,
            subtotal: Number(existingItem.subtotal) + (unitPrice * qtyToMove),
            notes: JSON.stringify([...existingNotes, ...notesToMove])
        });
        if (qtyToMove >= item.quantity) {
            await item.destroy();
        } else {
            await item.update({ quantity: item.quantity - qtyToMove, subtotal: unitPrice * (item.quantity - qtyToMove), notes: JSON.stringify(remainingNotes) });
        }
    } else {
        if (qtyToMove < item.quantity) {
           await item.update({ quantity: item.quantity - qtyToMove, subtotal: unitPrice * (item.quantity - qtyToMove), notes: JSON.stringify(remainingNotes) });
           await OrderItem.create({
             orderId: item.orderId, productId: item.productId, quantity: qtyToMove, subtotal: unitPrice * qtyToMove,
             cuenta: targetCuenta, notes: JSON.stringify(notesToMove), kitchenStatus: item.kitchenStatus, isTakeaway: item.isTakeaway, status: 'ACTIVE'
           });
        } else {
           await item.update({ cuenta: targetCuenta });
        }
    }

    const allItems = await OrderItem.findAll({
      where: { orderId: item.orderId, status: 'ACTIVE' },
      include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice', 'imageUrl'] }]
    });
    
    getIO().emit('pos:update');
    res.json({ message: 'Producto movido y agrupado con éxito', orderItems: allItems.map(extractPromoMeta) });
  } catch (error) {
    res.status(500).json({ message: 'Error al mover producto', error: error.message });
  }
};

// ==========================================
// ✅ MARCAR TODA LA ORDEN COMO ENTREGADA
// ==========================================
export const deliverAllItems = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ message: 'Orden no encontrada' });
    await OrderItem.update(
      { kitchenStatus: 'DELIVERED' },
      { where: { orderId: id, status: 'ACTIVE', kitchenStatus: 'READY' } }
    );
    getIO().emit('orderDeliveredAll', { orderId: id });
    getIO().emit('pos:update');
    res.json({ message: 'Todos los productos listos han sido marcados como entregados' });
  } catch (error) {
    res.status(500).json({ message: 'Error al marcar todo como entregado' });
  }
};

// ==========================================
// 🔍 ESTADO EN VIVO PARA CLIENTES (QR Público)
// ==========================================
export const checkOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cuenta } = req.query; 
    const order = await Order.findByPk(orderId);
    if (!order) return res.json({ status: 'DELETED' });
    
    if (['CLOSED', 'CANCELLED', 'DELETED'].includes(order.status)) {
        return res.json({ status: order.status, accountStatus: order.status });
    }
    
    // 🔥 FIX BUG 1: Inteligencia de Cuentas Independientes.
    let accountStatus = order.status;
    
    if (cuenta && order.paidAccounts && Array.isArray(order.paidAccounts)) {
      if (order.paidAccounts.includes(cuenta)) {
          accountStatus = 'PAID';
      } else {
          accountStatus = 'OPEN';
      }
    }
    
    res.json({ status: order.status, accountStatus });
  } catch (error) {
    res.status(500).json({ message: 'Error al verificar estado', error: error.message });
  }
};