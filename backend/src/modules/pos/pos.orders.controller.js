// backend/src/modules/pos/pos.orders.controller.js
import { getIO } from '../../config/socket.js'; 
import Order from './Order.model.js';
import OrderItem from './OrderItem.model.js';
import Product from '../menu/Product.model.js';
import Table from './Table.model.js';

const cleanAccountBase = (str) => String(str || '').split(' | ')[0].split(' - ')[0].trim().toLowerCase();

const parseAccountDisplayName = (str) => {
  if (!str) return 'General';
  const s = String(str);
  if (s.includes(' | ')) return s.split(' | ')[0].trim();
  if (s.includes(' - ')) {
    const parts = s.split(' - ');
    const possiblePhone = parts[parts.length - 1].replace(/\D/g, '');
    if (possiblePhone.length >= 10) return parts.slice(0, -1).join(' - ').trim();
  }
  return s.trim();
};

// ==========================================
// 🧙‍♂️ UTILIDAD: DESEMPAQUETAR METADATA DE PROMOCIÓN Y LIBERACIÓN
// ==========================================
const extractPromoMeta = (item) => {
  const plainItem = item.toJSON ? item.toJSON() : item;
  plainItem.isAutoPromo = false;
  plainItem.promoLabel = null;
  plainItem.precioOriginal = null;
  plainItem.isTransferred = false;
  plainItem.transfers = [];
  plainItem._isReleased = false; 
  
  if (plainItem.notes) {
    try {
      let parsedNotes = JSON.parse(plainItem.notes);
      if (Array.isArray(parsedNotes)) {
        const meta = parsedNotes.find(n => n && n._isPromoMeta);
        if (meta) {
          plainItem.isAutoPromo = meta.isAutoPromo;
          plainItem.promoLabel = meta.promoLabel;
          plainItem.precioOriginal = meta.precioOriginal;
          plainItem.isTransferred = Boolean(meta.isTransferred);
          plainItem.transfers = Array.isArray(meta.transfers) ? meta.transfers : [];
        }
        if (parsedNotes.some(n => n && n._isReleased)) {
          plainItem._isReleased = true;
        }
      }
    } catch(e) {}
  }
  return plainItem;
};

// Combina historiales de transferencia agrupando por cuenta origen
const mergeTransferArrays = (arrA = [], arrB = []) => {
  const combined = [];
  [...arrA, ...arrB].forEach(t => {
    if (!t || !t.fromCuenta || Number(t.qty) <= 0) return;
    const existing = combined.find(
      c => cleanAccountBase(c.fromCuenta) === cleanAccountBase(t.fromCuenta) &&
           cleanAccountBase(c.toCuenta) === cleanAccountBase(t.toCuenta)
    );
    if (existing) {
      existing.qty += Number(t.qty);
    } else {
      combined.push({
        fromCuenta: t.fromCuenta,
        toCuenta: t.toCuenta,
        qty: Number(t.qty)
      });
    }
  });
  return combined;
};

// ==========================================
// 🛒 CREAR O RECUPERAR ORDEN (Folios y Fecha Segura)
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

    const localNow = new Date();

    const newOrder = await Order.create({ 
      orderType: finalOrderType, 
      ticketId: finalTicketId, 
      tableId: finalTableId, 
      createdBy: employeeId, 
      status: 'OPEN', 
      totalAmount: 0,
      createdAt: localNow
    });

    getIO().emit('pos:update');
    res.status(201).json({ message: 'Orden iniciada', order: newOrder });
  } catch (error) { 
    console.error("🔥 Error crítico al crear orden:", error);
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ success: false, message: "La mesa que intentas usar no existe o tu sesión tiene datos cruzados." });
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: "Esta mesa ya tiene un pedido activo en curso." });
    }
    return res.status(500).json({ success: false, message: `Error interno de base de datos: ${error.message}` });
  }
};

// ==========================================
// ➕ AGREGAR PRODUCTOS A LA COMANDA & CONTROL DE STOCK
// ==========================================
export const addItemsToOrder = async (req, res) => {
  try {
    let { orderId } = req.params;
    const { items } = req.body; 
    let order = await Order.findByPk(orderId);
    
    if (order && !['OPEN', 'PAID'].includes(order.status)) {
      order = await Order.create({
        orderType: order.orderType,
        tableId: order.tableId,
        ticketId: order.ticketId,
        createdBy: req.user?.id || null,
        status: 'OPEN',
        totalAmount: 0
      });
      orderId = order.id; 
    } else if (!order) {
      return res.status(400).json({ message: 'La orden no existe.' });
    }

    const productIds = items.map(i => i.productId);
    const productsInfo = await Product.findAll({
      where: { id: productIds },
      attributes: ['id', 'requiereCocina']
    });
    const reqCocinaMap = {};
    productsInfo.forEach(p => {
      reqCocinaMap[p.id] = p.requiereCocina;
    });

    const isExpress = order.ticketId && (
      order.ticketId.startsWith('MOSTRADOR') || 
      order.ticketId.startsWith('VITRINA') || 
      order.ticketId.startsWith('MOS-')
    );

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

      const requiereCocina = reqCocinaMap[item.productId] !== false;
      let statusCocina = 'PENDING';
      
      if (isExpress && !requiereCocina) {
        statusCocina = 'DELIVERED';
      }

      return { 
        ...item, 
        orderId, 
        cuenta: order.orderType === 'LLEVAR' ? 'General' : (item.cuenta || 'General'), 
        kitchenStatus: statusCocina,
        isTakeaway: item.isTakeaway || false,
        notes: JSON.stringify(parsedNotes)
      };
    });

    await OrderItem.bulkCreate(itemsToInsert);
    
    const subtotalNuevo = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    
    if (order.status === 'PAID') {
      await order.update({ status: 'OPEN', totalAmount: Number(order.totalAmount) + subtotalNuevo });
    } else {
      await order.update({ totalAmount: Number(order.totalAmount) + subtotalNuevo });
    }

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
        
        await product.update({ stockQuantity: newStock, isAgotado: isNowAgotado });
        stockAlerts.push({ id: product.id, stock: newStock, isAgotado: isNowAgotado });
      }
    }

    if (stockAlerts.length > 0) getIO().emit('stock:update', stockAlerts);

    const allItems = await OrderItem.findAll({
      where: { orderId, status: 'ACTIVE' },
      include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice', 'imageUrl'] }]
    });

    getIO().emit('pos:update');
    getIO().emit('kitchen:update'); 
    
    const cleanItems = allItems.map(extractPromoMeta).filter(i => !i._isReleased);
    
    res.status(201).json({ message: 'Productos procesados', orderItems: cleanItems, newOrderId: orderId });
  } catch (error) { 
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
      validOrder.items = validOrder.items.map(extractPromoMeta).filter(i => !i._isReleased);
      validOrder.totalAmount = validOrder.items.reduce((sum, item) => sum + Number(item.subtotal), 0);
      
      if (validOrder.paidAccounts && Array.isArray(validOrder.paidAccounts)) {
        const visibleAccounts = new Set(validOrder.items.map(i => i.cuenta || 'General'));
        validOrder.paidAccounts = validOrder.paidAccounts.filter(acc => visibleAccounts.has(acc));
      }
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
    if (order.tableId) {
      await Table.update({ status: 'active' }, { where: { id: order.tableId } });
    }
    getIO().emit('pos:update');
    res.json({ message: 'Mesa liberada y orden archivada.' });
  } catch (error) { 
    res.status(500).json({ message: 'Error al cerrar mesa', error: error.message }); 
  }
};

// ==========================================
// 🔒 CERRAR CUENTA INDIVIDUAL (Liberar Cuenta)
// ==========================================
export const closeAccount = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cuentaName } = req.body;

    if (!cuentaName) {
      return res.status(400).json({ message: "Se requiere el nombre de la cuenta" });
    }

    const items = await OrderItem.findAll({ where: { orderId, cuenta: cuentaName, status: 'ACTIVE' } });
    
    for (const item of items) {
      let notes = [];
      try { notes = JSON.parse(item.notes || '[]'); } catch(e){}
      if (!Array.isArray(notes)) notes = [notes];
      
      if (!notes.some(n => n && n._isReleased)) {
        notes.push({ _isReleased: true });
        await item.update({ notes: JSON.stringify(notes) });
      }
    }

    const allActiveItems = await OrderItem.findAll({ where: { orderId, status: 'ACTIVE' } });
    const remainingVisible = allActiveItems.filter(item => {
      try {
        const n = JSON.parse(item.notes || '[]');
        return !(Array.isArray(n) && n.some(x => x && x._isReleased));
      } catch(e) { return true; }
    });

    if (remainingVisible.length === 0) {
      const order = await Order.findByPk(orderId);
      if (order && order.status !== 'CLOSED') {
        await order.update({ status: 'CLOSED' });
        if (order.tableId) {
          await Table.update({ status: 'active' }, { where: { id: order.tableId } });
        }
      }
    }

    getIO().emit('pos:update');
    return res.status(200).json({ success: true, message: `La cuenta ${cuentaName} ha sido liberada exitosamente.` });
  } catch (error) {
    console.error("Error al cerrar la cuenta:", error);
    return res.status(500).json({ message: "Error interno al liberar la cuenta." });
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
        plainOrder.items = plainOrder.items.map(extractPromoMeta).filter(i => !i._isReleased);
        plainOrder.totalAmount = plainOrder.items.reduce((sum, item) => sum + Number(item.subtotal), 0);
        
        if (plainOrder.paidAccounts && Array.isArray(plainOrder.paidAccounts)) {
          const visibleAccounts = new Set(plainOrder.items.map(i => i.cuenta || 'General'));
          plainOrder.paidAccounts = plainOrder.paidAccounts.filter(acc => visibleAccounts.has(acc));
        }
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
    const { targetCuenta, qtyToMove, revokeMovedItemPromo = false, revokePromos = [] } = req.body;
    
    const item = await OrderItem.findByPk(itemId, {
      include: [{ model: Product, as: 'product', attributes: ['basePrice'] }]
    });
    if (!item) return res.status(404).json({ message: 'Producto no encontrado' });

    const sourceCuenta = item.cuenta || 'General';
    const safeQtyToMove = Math.min(item.quantity, Number(qtyToMove || item.quantity));
    
    let moveNotes = [];
    try { moveNotes = JSON.parse(item.notes || '[]'); } catch(e){}
    if (!Array.isArray(moveNotes)) moveNotes = [moveNotes];
    
    let metaObj = null;
    const metaIdx = moveNotes.findIndex(n => n && n._isPromoMeta);
    if (metaIdx >= 0) { metaObj = moveNotes.splice(metaIdx, 1)[0]; }
    
    const isAutoPromo = revokeMovedItemPromo ? false : (metaObj ? metaObj.isAutoPromo : false);
    const promoLabel = revokeMovedItemPromo ? null : (metaObj ? metaObj.promoLabel : null);
    const originalUnitPrice = Number(item.subtotal) / item.quantity;
    const movedUnitPrice = revokeMovedItemPromo
      ? Number(metaObj?.precioOriginal || item.product?.basePrice || originalUnitPrice)
      : originalUnitPrice;

    // 🔥 RASTREO DE TRANSFERENCIAS ENTRE CUENTAS (Para vista del cliente)
    const prevTransfers = Array.isArray(metaObj?.transfers) ? metaObj.transfers.map(t => ({ ...t })) : [];
    const totalPrevTransferred = prevTransfers.reduce((sum, t) => sum + Number(t.qty || 0), 0);
    const ownUnitsInSource = Math.max(0, item.quantity - totalPrevTransferred);

    const ownMoved = Math.min(ownUnitsInSource, safeQtyToMove);
    let remToTakeFromPrev = safeQtyToMove - ownMoved;

    const movedTransfers = [];
    if (ownMoved > 0 && cleanAccountBase(sourceCuenta) !== cleanAccountBase(targetCuenta)) {
      movedTransfers.push({
        fromCuenta: sourceCuenta,
        toCuenta: targetCuenta,
        qty: ownMoved
      });
    }

    for (const t of prevTransfers) {
      if (remToTakeFromPrev <= 0) break;
      const take = Math.min(Number(t.qty || 0), remToTakeFromPrev);
      if (take > 0) {
        t.qty -= take;
        remToTakeFromPrev -= take;
        // Si no está regresando a la cuenta original del dueño, actualizamos el nuevo destino
        if (cleanAccountBase(t.fromCuenta) !== cleanAccountBase(targetCuenta)) {
          movedTransfers.push({
            fromCuenta: t.fromCuenta,
            toCuenta: targetCuenta,
            qty: take
          });
        }
      }
    }

    const remainingTransfers = prevTransfers.filter(t => Number(t.qty) > 0);

    const movedMetaObj = {
      _isPromoMeta: true,
      isAutoPromo: isAutoPromo,
      promoLabel: promoLabel,
      precioOriginal: revokeMovedItemPromo ? null : (metaObj?.precioOriginal || null),
      isTransferred: true,
      transfers: mergeTransferArrays([], movedTransfers)
    };
    
    const existingItems = await OrderItem.findAll({
      where: { orderId: item.orderId, productId: item.productId, cuenta: targetCuenta, kitchenStatus: item.kitchenStatus, isTakeaway: item.isTakeaway, status: 'ACTIVE' }
    });

    const existingItem = existingItems.find(i => {
      if ((Number(i.subtotal) / i.quantity) !== movedUnitPrice) return false;
      let eNotes = [];
      try { eNotes = JSON.parse(i.notes || '[]'); } catch(e){}
      const eMeta = eNotes.find(n => n && n._isPromoMeta);
      const eIsPromo = eMeta ? eMeta.isAutoPromo : false;
      const eLabel = eMeta ? eMeta.promoLabel : null;
      return eIsPromo === isAutoPromo && eLabel === promoLabel;
    });

    const notesToMove = moveNotes.slice(0, safeQtyToMove);
    const remainingNotes = moveNotes.slice(safeQtyToMove);

    if (metaObj || remainingTransfers.length > 0) {
      remainingNotes.push({
        ...(metaObj || { _isPromoMeta: true, isAutoPromo: false, promoLabel: null, precioOriginal: null }),
        transfers: remainingTransfers
      });
    }
    
    if (existingItem && existingItem.id !== item.id) {
      let existingNotes = [];
      try { existingNotes = JSON.parse(existingItem.notes || '[]'); } catch(e){}
      if (!Array.isArray(existingNotes)) existingNotes = [existingNotes];
      
      let existingMeta = null;
      const eMetaIdx = existingNotes.findIndex(n => n && n._isPromoMeta);
      if (eMetaIdx >= 0) existingMeta = existingNotes.splice(eMetaIdx, 1)[0];

      const mergedMetaForExisting = {
        ...movedMetaObj,
        transfers: mergeTransferArrays(existingMeta?.transfers || [], movedMetaObj.transfers)
      };
      notesToMove.push(mergedMetaForExisting);
      
      await existingItem.update({ 
        quantity: existingItem.quantity + safeQtyToMove, 
        subtotal: Number(existingItem.subtotal) + (movedUnitPrice * safeQtyToMove), 
        notes: JSON.stringify([...existingNotes, ...notesToMove]) 
      });
      if (safeQtyToMove >= item.quantity) {
        await item.destroy();
      } else {
        await item.update({
          quantity: item.quantity - safeQtyToMove,
          subtotal: originalUnitPrice * (item.quantity - safeQtyToMove),
          notes: JSON.stringify(remainingNotes)
        });
      }
    } else {
      notesToMove.push(movedMetaObj);
      if (safeQtyToMove < item.quantity) {
        await item.update({
          quantity: item.quantity - safeQtyToMove,
          subtotal: originalUnitPrice * (item.quantity - safeQtyToMove),
          notes: JSON.stringify(remainingNotes)
        });
        await OrderItem.create({
          orderId: item.orderId,
          productId: item.productId,
          quantity: safeQtyToMove,
          subtotal: movedUnitPrice * safeQtyToMove,
          cuenta: targetCuenta,
          notes: JSON.stringify(notesToMove),
          kitchenStatus: item.kitchenStatus,
          isTakeaway: item.isTakeaway,
          status: 'ACTIVE'
        });
      } else {
        await item.update({
          cuenta: targetCuenta,
          subtotal: movedUnitPrice * item.quantity,
          notes: JSON.stringify(notesToMove)
        });
      }
    }

    // 🔥 Si al mover este ítem se rompió una promoción de otro ítem en la cuenta origen, revertimos su precio a normal
    if (Array.isArray(revokePromos) && revokePromos.length > 0) {
      for (const rev of revokePromos) {
        const ghostItem = await OrderItem.findByPk(rev.itemId, {
          include: [{ model: Product, as: 'product', attributes: ['basePrice'] }]
        });
        if (!ghostItem || ghostItem.status !== 'ACTIVE') continue;

        let gNotes = [];
        try { gNotes = JSON.parse(ghostItem.notes || '[]'); } catch(e){}
        if (!Array.isArray(gNotes)) gNotes = [gNotes];

        let gMeta = null;
        const gMetaIdx = gNotes.findIndex(n => n && n._isPromoMeta);
        if (gMetaIdx >= 0) gMeta = gNotes.splice(gMetaIdx, 1)[0];

        const regularPrice = Number(gMeta?.precioOriginal || ghostItem.product?.basePrice || (Number(ghostItem.subtotal) / ghostItem.quantity));
        const currentGhostUnitPrice = Number(ghostItem.subtotal) / ghostItem.quantity;
        const qtyRev = Math.min(ghostItem.quantity, Number(rev.qtyToRevoke || ghostItem.quantity));

        const revokedMeta = {
          _isPromoMeta: true,
          isAutoPromo: false,
          promoLabel: null,
          precioOriginal: null,
          isTransferred: true,
          transfers: gMeta?.transfers || []
        };

        if (qtyRev >= ghostItem.quantity) {
          await ghostItem.update({
            subtotal: regularPrice * ghostItem.quantity,
            notes: JSON.stringify([...gNotes, revokedMeta])
          });
        } else {
          const revNotes = gNotes.slice(0, qtyRev);
          const remNotes = gNotes.slice(qtyRev);
          if (gMeta) remNotes.push(gMeta);
          revNotes.push(revokedMeta);

          await ghostItem.update({
            quantity: ghostItem.quantity - qtyRev,
            subtotal: currentGhostUnitPrice * (ghostItem.quantity - qtyRev),
            notes: JSON.stringify(remNotes)
          });

          await OrderItem.create({
            orderId: ghostItem.orderId,
            productId: ghostItem.productId,
            quantity: qtyRev,
            subtotal: regularPrice * qtyRev,
            cuenta: ghostItem.cuenta,
            notes: JSON.stringify(revNotes),
            kitchenStatus: ghostItem.kitchenStatus,
            isTakeaway: ghostItem.isTakeaway,
            status: 'ACTIVE'
          });
        }
      }
    }

    const allItems = await OrderItem.findAll({
      where: { orderId: item.orderId, status: 'ACTIVE' },
      include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice', 'imageUrl'] }]
    });

    const newOrderTotal = allItems.reduce((sum, i) => sum + Number(i.subtotal), 0);
    await Order.update({ totalAmount: newOrderTotal }, { where: { id: item.orderId } });
    
    getIO().emit('pos:update');
    const cleanItems = allItems.map(extractPromoMeta).filter(i => !i._isReleased);
    res.json({ message: 'Producto movido y agrupado con éxito', orderItems: cleanItems });
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
// 🍕🔥 DIVISIÓN DE ENTREGAS (Split Deliver)
// ==========================================
export const splitDeliverItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { qtyToDeliver } = req.body;
    
    const item = await OrderItem.findByPk(itemId);
    if (!item) return res.status(404).json({ message: 'Producto no encontrado' });
    if (item.kitchenStatus === 'DELIVERED') return res.status(400).json({ message: 'El producto ya está entregado' });

    if (qtyToDeliver >= item.quantity) {
      await item.update({ kitchenStatus: 'DELIVERED' });
    } else {
      const unitPrice = Number(item.subtotal) / item.quantity;
      
      let moveNotes = [];
      try { moveNotes = JSON.parse(item.notes || '[]'); } catch(e){}
      if (!Array.isArray(moveNotes)) moveNotes = [moveNotes];
      
      let metaObj = null;
      const metaIdx = moveNotes.findIndex(n => n && n._isPromoMeta);
      if (metaIdx >= 0) { metaObj = moveNotes.splice(metaIdx, 1)[0]; }

      const deliveredNotes = moveNotes.slice(0, qtyToDeliver);
      const remainingNotes = moveNotes.slice(qtyToDeliver);

      if (metaObj) {
        const prevTransfers = Array.isArray(metaObj.transfers) ? metaObj.transfers.map(t => ({ ...t })) : [];
        let remDel = qtyToDeliver;
        const delTransfers = [];
        for (const t of prevTransfers) {
          if (remDel <= 0) break;
          const take = Math.min(Number(t.qty || 0), remDel);
          if (take > 0) {
            delTransfers.push({ ...t, qty: take });
            t.qty -= take;
            remDel -= take;
          }
        }
        const remTransfers = prevTransfers.filter(t => Number(t.qty) > 0);
        deliveredNotes.push({ ...metaObj, transfers: delTransfers });
        remainingNotes.push({ ...metaObj, transfers: remTransfers });
      }

      await item.update({ 
        quantity: item.quantity - qtyToDeliver, 
        subtotal: unitPrice * (item.quantity - qtyToDeliver), 
        notes: JSON.stringify(remainingNotes) 
      });

      await OrderItem.create({ 
        orderId: item.orderId, 
        productId: item.productId, 
        quantity: qtyToDeliver, 
        subtotal: unitPrice * qtyToDeliver, 
        cuenta: item.cuenta, 
        notes: JSON.stringify(deliveredNotes), 
        kitchenStatus: 'DELIVERED',
        isTakeaway: item.isTakeaway, 
        status: 'ACTIVE' 
      });
    }

    getIO().emit('pos:update');
    res.json({ message: 'Entrega parcial registrada con éxito' });
  } catch (error) {
    console.error("Error en splitDeliverItem:", error);
    res.status(500).json({ message: 'Error al registrar entrega', error: error.message });
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

    const targetCuenta = order.orderType === 'LLEVAR' ? 'General' : cuenta;
    const targetBase = cleanAccountBase(targetCuenta);

    let allOrderItems = [];
    if (targetCuenta) {
      allOrderItems = await OrderItem.findAll({ 
        where: { orderId },
        include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice', 'imageUrl'] }]
      });
    }

    // 1. Buscar productos propios de esta cuenta
    const itemsCuenta = targetCuenta ? allOrderItems.filter(i => {
      if (order.orderType === 'LLEVAR') return (i.cuenta || 'General') === 'General';
      return i.cuenta === targetCuenta || cleanAccountBase(i.cuenta) === targetBase;
    }) : [];

    const activeOwnItems = itemsCuenta.filter(i => i.status === 'ACTIVE');

    // 2. Buscar productos que fueron trasladados desde esta cuenta hacia otra cuenta de la mesa
    const transferredItems = [];
    const transferredToSet = new Set();

    if (targetCuenta && order.orderType !== 'LLEVAR') {
      const otherAccountItems = allOrderItems.filter(
        i => i.status === 'ACTIVE' && cleanAccountBase(i.cuenta) !== targetBase
      );

      otherAccountItems.forEach(otherItem => {
        const plainOther = extractPromoMeta(otherItem);
        const matchingTransfers = (plainOther.transfers || []).filter(
          t => cleanAccountBase(t.fromCuenta) === targetBase && Number(t.qty) > 0
        );

        if (matchingTransfers.length > 0) {
          const movedQtyFromThisClient = Math.min(
            plainOther.quantity,
            matchingTransfers.reduce((sum, t) => sum + Number(t.qty || 0), 0)
          );

          if (movedQtyFromThisClient > 0) {
            const destName = parseAccountDisplayName(plainOther.cuenta);
            transferredToSet.add(destName);

            const unitPrice = Number(plainOther.subtotal || 0) / (plainOther.quantity || 1);
            const existingTransferred = transferredItems.find(
              ti => String(ti.productId) === String(plainOther.productId) &&
                    ti.toCuenta === destName &&
                    Math.abs(ti.unitPrice - unitPrice) < 0.01
            );

            if (existingTransferred) {
              existingTransferred.qty += movedQtyFromThisClient;
              existingTransferred.subtotal += unitPrice * movedQtyFromThisClient;
            } else {
              transferredItems.push({
                id: plainOther.productId,
                productId: plainOther.productId,
                backendItemId: plainOther.id,
                nombre: plainOther.product?.name || 'Producto',
                imagen: plainOther.product?.imageUrl || null,
                qty: movedQtyFromThisClient,
                unitPrice: unitPrice,
                subtotal: unitPrice * movedQtyFromThisClient,
                toCuenta: destName,
                isTakeaway: Boolean(plainOther.isTakeaway)
              });
            }
          }
        }
      });
    }

    const transferredToAccounts = Array.from(transferredToSet);
    const hasOwnItems = activeOwnItems.length > 0;
    const allTransferred = !hasOwnItems && transferredItems.length > 0;

    if (['CLOSED', 'CANCELLED', 'DELETED'].includes(order.status)) {
      return res.json({
        status: order.status,
        accountStatus: order.status,
        hasOwnItems,
        allTransferred,
        transferredItems,
        transferredToAccounts
      });
    }
    
    let accountStatus = order.status;
    let clientItems = []; 
    
    if (targetCuenta) {
      if (itemsCuenta.length > 0) {
        const allCancelled = itemsCuenta.every(i => i.status === 'CANCELLED');
        
        const isReleased = !allCancelled && activeOwnItems.length > 0 && activeOwnItems.every(item => {
          try {
            const n = JSON.parse(item.notes || '[]');
            return Array.isArray(n) && n.some(x => x && x._isReleased);
          } catch(e) { return false; }
        });

        const isPaid = order.paidAccounts && Array.isArray(order.paidAccounts) && 
                       order.paidAccounts.some(acc => acc === targetCuenta || cleanAccountBase(acc) === targetBase);

        if (allCancelled) {
          accountStatus = 'CANCELLED';
        } else if (isReleased) {
          accountStatus = 'CLOSED';
        } else if (isPaid) {
          accountStatus = 'PAID';
        } else {
          accountStatus = 'OPEN';
          clientItems = activeOwnItems.map(extractPromoMeta).filter(i => !i._isReleased);
        }
      } else if (order.paidAccounts && Array.isArray(order.paidAccounts) && order.paidAccounts.some(acc => acc === targetCuenta || cleanAccountBase(acc) === targetBase)) {
        accountStatus = 'PAID';
      }
    }
    
    res.json({
      status: order.status,
      accountStatus,
      items: clientItems,
      hasOwnItems,
      allTransferred,
      transferredItems,
      transferredToAccounts
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al verificar estado', error: error.message });
  }
};