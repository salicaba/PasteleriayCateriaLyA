import Order from './Order.model.js';
import OrderItem from './OrderItem.model.js';
import Product from '../menu/Product.model.js';
import Table from './Table.model.js';

// ==========================================
// 🛒 CREAR O RECUPERAR ORDEN (Evita duplicados)
// ==========================================
export const createOrder = async (req, res) => {
  try {
    const { orderType, ticketId, tableId } = req.body;
    const employeeId = req.user?.id || null; 
    const finalTableId = orderType === 'SALON' ? tableId : null;

    if (orderType === 'SALON' && finalTableId) {
      const existingOrder = await Order.findOne({ 
        where: { tableId: finalTableId, status: ['OPEN', 'PAID'] } 
      });
      if (existingOrder) return res.status(200).json({ message: 'Orden activa recuperada', order: existingOrder });
    }

    const newOrder = await Order.create({ 
      orderType, 
      ticketId: orderType === 'LLEVAR' ? ticketId : null, 
      tableId: finalTableId, 
      createdBy: employeeId, 
      status: 'OPEN', 
      totalAmount: 0 
    });
    
    res.status(201).json({ message: 'Orden iniciada', order: newOrder });
  } catch (error) { 
    res.status(500).json({ message: 'Error al crear orden', error: error.message }); 
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

    const itemsToInsert = items.map(item => ({ 
      ...item, 
      orderId, 
      cuenta: item.cuenta || 'General', 
      kitchenStatus: 'PENDING' 
    }));

    // 1. Guardamos los productos nuevos
    await OrderItem.bulkCreate(itemsToInsert);
    
    // 2. Actualizamos el total de la orden
    const subtotalNuevo = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    await order.update({ totalAmount: Number(order.totalAmount) + subtotalNuevo });

    // 3. 🔥 FIX CRÍTICO: Recuperamos TODOS los items de la orden incluyendo el Modelo Product
    // Esto asegura que el frontend reciba los nombres y no borre los productos visualmente.
    const allItems = await OrderItem.findAll({
      where: { orderId },
      include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice', 'imageUrl'] }]
    });

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
    const order = await Order.findOne({
      where: { tableId, status: ['OPEN', 'PAID'] },
      include: [
        { 
          model: OrderItem, 
          as: 'items', 
          include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice', 'imageUrl'] }] 
        }
      ]
    });
    res.json({ order });
  } catch (error) { 
    res.status(500).json({ message: 'Error al recuperar comanda', error: error.message }); 
  }
};

// ==========================================
// 💰 REGISTRAR PAGO (Parcial o Total)
// ==========================================
export const payOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cuentaName, isFullPayment } = req.body; 
    const order = await Order.findByPk(orderId);
    
    // Clonar el arreglo es clave en Sequelize para que detecte el UPDATE en campos JSON
    let paidAccounts = [...(order.paidAccounts || [])];
    
    if (!isFullPayment && cuentaName && !paidAccounts.includes(cuentaName)) {
      paidAccounts.push(cuentaName);
    }

    await order.update({ 
      status: isFullPayment ? 'PAID' : order.status, 
      paidAccounts: paidAccounts 
    });

    res.json({ message: 'Pago registrado con éxito', order });
  } catch (error) { 
    res.status(500).json({ message: 'Error al procesar pago', error: error.message }); 
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
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice', 'imageUrl'] }] } 
      ]
    });
    res.json(activeOrders);
  } catch (error) { 
    res.status(500).json({ message: 'Error al listar órdenes', error: error.message }); 
  }
};

// ==========================================
// 🪑 GESTIÓN DE MESAS (CRUD)
// ==========================================
export const getTables = async (req, res) => {
  try {
    const tables = await Table.findAll({ 
      where: { status: 'active' }, 
      order: [['id', 'ASC']] 
    });
    res.json(tables);
  } catch (error) { 
    res.status(500).json({ message: 'Error al obtener mesas', error: error.message }); 
  }
};

export const createTable = async (req, res) => {
  try {
    const { zone } = req.body;
    const count = await Table.count({ where: { status: 'active', zone: zone || 'salon' } });
    const nextNumber = (count + 1).toString();
    
    const newTable = await Table.create({ 
      number: nextNumber, 
      zone: zone || 'salon', 
      qrToken: `qr-${Date.now()}-${nextNumber}` 
    });
    
    res.status(201).json(newTable);
  } catch (error) { 
    res.status(500).json({ message: 'Error al crear mesa', error: error.message }); 
  }
};

export const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;
    await Table.update({ status: 'inactive' }, { where: { id } });
    
    // Re-indexar las mesas restantes del salón para que los números sean consecutivos
    const remainingTables = await Table.findAll({ 
      where: { status: 'active', zone: 'salon' }, 
      order: [['id', 'ASC']] 
    });
    
    for (let i = 0; i < remainingTables.length; i++) {
      const newNumber = (i + 1).toString();
      if (remainingTables[i].number !== newNumber) {
        await remainingTables[i].update({ number: newNumber });
      }
    }
    
    res.json({ message: 'Mesa eliminada y re-indexada correctamente' });
  } catch (error) { 
    res.status(500).json({ message: 'Error al eliminar mesa', error: error.message }); 
  }
};

// ==========================================
// 🔄 MOVER / DIVIDIR PRODUCTO ENTRE CUENTAS (CON AUTO-AGRUPACIÓN)
// ==========================================
export const moveItemAccount = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { targetCuenta, qtyToMove } = req.body;
    
    const item = await OrderItem.findByPk(itemId);
    if (!item) return res.status(404).json({ message: 'Producto no encontrado' });
    
    const unitPrice = Number(item.subtotal) / item.quantity;

    // 1. Buscamos si ya existe EXACTAMENTE el mismo producto en la cuenta destino
    const existingItems = await OrderItem.findAll({
        where: {
            orderId: item.orderId,
            productId: item.productId,
            cuenta: targetCuenta,
            kitchenStatus: item.kitchenStatus // Que tengan el mismo estado
        }
    });

    // Verificamos que coincida el precio unitario (para no mezclar si uno tenía descuento manual)
    const existingItem = existingItems.find(i => (Number(i.subtotal) / i.quantity) === unitPrice);

    // Parseamos las notas (preparaciones) para poder dividirlas/juntarlas correctamente
    let moveNotes = [];
    try { moveNotes = JSON.parse(item.notes || '[]'); } catch(e){}
    if (!Array.isArray(moveNotes)) moveNotes = [moveNotes];
    
    const notesToMove = moveNotes.slice(0, qtyToMove);
    const remainingNotes = moveNotes.slice(qtyToMove);

    if (existingItem && existingItem.id !== item.id) {
        // ¡EL PRODUCTO YA EXISTE! Lo fusionamos.
        let existingNotes = [];
        try { existingNotes = JSON.parse(existingItem.notes || '[]'); } catch(e){}
        if (!Array.isArray(existingNotes)) existingNotes = [existingNotes];

        await existingItem.update({
            quantity: existingItem.quantity + qtyToMove,
            subtotal: Number(existingItem.subtotal) + (unitPrice * qtyToMove),
            notes: JSON.stringify([...existingNotes, ...notesToMove]) // Juntamos las preparaciones
        });

        // Si se movió todo, borramos el original. Si no, le restamos la cantidad.
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
        // NO EXISTE EN LA CUENTA DESTINO. Hacemos el movimiento normal.
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
             kitchenStatus: item.kitchenStatus
           });
        } else {
           await item.update({ cuenta: targetCuenta });
        }
    }

    // Devolvemos todos los items para refrescar el frontend
    const allItems = await OrderItem.findAll({
      where: { orderId: item.orderId },
      include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice', 'imageUrl'] }]
    });
    
    res.json({ message: 'Producto movido y agrupado con éxito', orderItems: allItems });
  } catch (error) {
    res.status(500).json({ message: 'Error al mover producto', error: error.message });
  }
};