// backend/src/modules/pos/pos.orders.controller.js
import { getIO } from '../../config/socket.js'; 
import Order from './Order.model.js';
import OrderItem from './OrderItem.model.js';
import Product from '../menu/Product.model.js';
import Table from './Table.model.js';

// ==========================================
// 🛒 CREAR O RECUPERAR ORDEN (Folios Seguros)
// ==========================================
export const createOrder = async (req, res) => {
  try {
    const { orderType, tableId } = req.body;
    let { ticketId } = req.body;
    const employeeId = req.user?.id || null; 
    
    // 🔥 FIX CRÍTICO: Prevenir "Ghost Orders". Si es SALON pero el tableId es nulo o inválido, lo forzamos a LLEVAR.
    const finalTableId = orderType === 'SALON' ? tableId : null;
    const finalOrderType = (orderType === 'SALON' && !finalTableId) ? 'LLEVAR' : orderType;

    // 🔥 PURGA MASIVA: Matamos TODOS los zombies de esta mesa antes de crear una orden
    if (finalOrderType === 'SALON' && finalTableId) {
      const existingOrders = await Order.findAll({ 
        where: { tableId: finalTableId, status: ['OPEN', 'PAID'] } 
      });
      
      let validExistingOrder = null;

      for (const ord of existingOrders) {
        const hoursOld = (Date.now() - new Date(ord.createdAt).getTime()) / (1000 * 60 * 60);
        if (hoursOld > 12) {
          await ord.update({ status: 'CLOSED' }); // Asesinato silencioso del zombie
        } else {
          validExistingOrder = ord; // Rescatamos la orden si es de hoy
        }
      }

      if (validExistingOrder) {
        return res.status(200).json({ message: 'Orden activa recuperada', order: validExistingOrder });
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
    
    if (finalOrderType === 'SALON' && finalTableId) {
      await Table.update({ status: 'occupied' }, { where: { id: finalTableId } });
    }

    getIO().emit('pos:update');
    res.status(201).json({ message: 'Orden iniciada', order: newOrder });
  } catch (error) { 
    console.error("🔥 Error crítico al crear orden:", error);

    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        message: "La mesa que intentas usar no existe o tu sesión tiene datos cruzados. Por favor, limpia tu sesión y escanea el QR nuevamente."
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: "Esta mesa ya tiene un pedido activo en curso o hay un conflicto de sesión."
      });
    }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: "Los datos enviados están incompletos o corruptos."
      });
    }

    return res.status(500).json({
      success: false,
      message: `Error interno de base de datos: ${error.message}`
    });
  }
};

// ==========================================
// ➕ AGREGAR PRODUCTOS A LA COMANDA
// ==========================================
export const addItemsToOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { items } = req.body; 
    const order = await Order.findByPk(orderId);
    
    if (!order || !['OPEN', 'PAID'].includes(order.status)) {
      return res.status(400).json({ message: 'La orden no está abierta para recibir productos.' });
    }

    const hoursOld = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);
    if (hoursOld > 12) {
      await order.update({ status: 'CLOSED' });
      if (order.tableId) {
        await Table.update({ status: 'active' }, { where: { id: order.tableId } });
      }
      return res.status(400).json({ message: 'Orden caducada por inactividad.' });
    }

    // 🔥 REGLA DE NEGOCIO: Si es Para Llevar, forzamos Cuenta General en lugar de crear subcuentas por celular
    const itemsToInsert = items.map(item => ({ 
      ...item, 
      orderId, 
      cuenta: order.orderType === 'LLEVAR' ? 'General' : (item.cuenta || 'General'), 
      kitchenStatus: 'PENDING',
      isTakeaway: item.isTakeaway || false 
    }));

    await OrderItem.bulkCreate(itemsToInsert);
    
    const subtotalNuevo = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    await order.update({ totalAmount: Number(order.totalAmount) + subtotalNuevo });

    const allItems = await OrderItem.findAll({
      where: { orderId, status: 'ACTIVE' },
      include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice', 'imageUrl'] }]
    });

    getIO().emit('pos:update');
    getIO().emit('kitchen:update'); 
    
    res.status(201).json({ message: 'Productos enviados a cocina', orderItems: allItems });
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

    let validOrder = null;
    for (const ord of orders) {
      const hoursOld = (Date.now() - new Date(ord.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursOld > 12) {
        await ord.update({ status: 'CLOSED' });
      } else {
        validOrder = ord;
      }
    }
    
    if (!validOrder) {
      await Table.update({ status: 'active' }, { where: { id: tableId } });
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

    const now = Date.now();
    const validOrders = [];
    let zombiesFound = false;

    for (const order of activeOrders) {
      const hoursOld = (now - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursOld > 12) {
        await order.update({ status: 'CLOSED' });
        if (order.tableId) {
          await Table.update({ status: 'active' }, { where: { id: order.tableId } });
        }
        zombiesFound = true;
      } else {
        // 🔥 FILTRO NEO-BENTO: Evitamos Tarjetas Vacías de Clientes Curiosos
        // Si la orden es Para Llevar, NO tiene productos y NO fue creada por un empleado, la ocultamos.
        if (order.orderType === 'LLEVAR' && (!order.items || order.items.length === 0)) {
           if (!order.createdBy) {
              continue; 
           }
        }
        validOrders.push(order);
      }
    }

    if (zombiesFound) {
      getIO().emit('pos:update'); 
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

    const existingItem = existingItems.find(i => (Number(i.subtotal) / i.quantity) === unitPrice);

    let moveNotes = [];
    try { moveNotes = JSON.parse(item.notes || '[]'); } catch(e){}
    if (!Array.isArray(moveNotes)) moveNotes = [moveNotes];
    
    const notesToMove = moveNotes.slice(0, qtyToMove);
    const remainingNotes = moveNotes.slice(qtyToMove);

    if (existingItem && existingItem.id !== item.id) {
        let existingNotes = [];
        try { existingNotes = JSON.parse(existingItem.notes || '[]'); } catch(e){}
        if (!Array.isArray(existingNotes)) existingNotes = [existingNotes];

        await existingItem.update({
            quantity: existingItem.quantity + qtyToMove,
            subtotal: Number(existingItem.subtotal) + (unitPrice * qtyToMove),
            notes: JSON.stringify([...existingNotes, ...notesToMove])
        });

        if (qtyToMove >= item.quantity) {
            await item.destroy();
        } else {
            await item.update({
                quantity: item.quantity - qtyToMove,
                subtotal: unitPrice * (item.quantity - qtyToMove),
                notes: JSON.stringify(remainingNotes)
            });
        }
    } else {
        if (qtyToMove < item.quantity) {
           await item.update({ 
             quantity: item.quantity - qtyToMove, 
             subtotal: unitPrice * (item.quantity - qtyToMove),
             notes: JSON.stringify(remainingNotes)
           });
           
           await OrderItem.create({
             orderId: item.orderId,
             productId: item.productId,
             quantity: qtyToMove,
             subtotal: unitPrice * qtyToMove,
             cuenta: targetCuenta,
             notes: JSON.stringify(notesToMove),
             kitchenStatus: item.kitchenStatus,
             isTakeaway: item.isTakeaway,
             status: 'ACTIVE'
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
    res.json({ message: 'Producto movido y agrupado con éxito', orderItems: allItems });
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
      { 
        where: { 
          orderId: id, 
          status: 'ACTIVE',
          kitchenStatus: ['PENDING', 'PREPARING', 'READY'] 
        } 
      }
    );

    getIO().emit('orderDeliveredAll', { orderId: id });
    getIO().emit('pos:update');

    res.json({ message: 'Todos los productos han sido marcados como entregados' });
  } catch (error) {
    console.error('Error en deliverAllItems:', error);
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
    
    if (!order) {
       return res.json({ status: 'DELETED' });
    }

    if (['CLOSED', 'CANCELLED', 'DELETED'].includes(order.status)) {
      return res.json({ status: order.status });
    }

    if (cuenta && order.paidAccounts && Array.isArray(order.paidAccounts)) {
      if (order.paidAccounts.includes(cuenta)) {
        return res.json({ status: 'PAID' });
      }
    }
    
    res.json({ status: order.status });
  } catch (error) {
    res.status(500).json({ message: 'Error al verificar estado', error: error.message });
  }
};