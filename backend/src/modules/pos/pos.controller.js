import { Op, Sequelize } from 'sequelize';
import { getIO } from '../../config/socket.js'; 
import Order from './Order.model.js';
import OrderItem from './OrderItem.model.js';
import Product from '../menu/Product.model.js';
import Table from './Table.model.js';
import Transaction from '../cash/Transaction.model.js';
import User from '../users/User.model.js'; 
import { ThermalPrinter, PrinterTypes, CharacterSet } from 'node-thermal-printer';

// ==========================================
// 🛒 CREAR O RECUPERAR ORDEN (Folios Seguros)
// ==========================================
export const createOrder = async (req, res) => {
  try {
    const { orderType, tableId } = req.body;
    let { ticketId } = req.body;
    const employeeId = req.user?.id || null; 
    const finalTableId = orderType === 'SALON' ? tableId : null;

    if (orderType === 'SALON' && finalTableId) {
      const existingOrder = await Order.findOne({ 
        where: { tableId: finalTableId, status: ['OPEN', 'PAID'] } 
      });
      if (existingOrder) return res.status(200).json({ message: 'Orden activa recuperada', order: existingOrder });
    }

    let finalTicketId = null;
    if (orderType === 'LLEVAR') {
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
      orderType, 
      ticketId: finalTicketId, 
      tableId: finalTableId, 
      createdBy: employeeId, 
      status: 'OPEN', 
      totalAmount: 0 
    });
    
    getIO().emit('pos:update');
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
          where: { status: 'ACTIVE' },
          required: false, 
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
    const { cuentaName, isFullPayment, paymentMethod } = req.body;
    
    const order = await Order.findByPk(orderId, { 
      include: ['items', { model: Table, as: 'table' }] 
    });
    
    if (!order) return res.status(404).json({ message: 'Orden no encontrada' });
    
    let paidAccounts = [...(order.paidAccounts || [])];
    let amountToRegister = 0;
    
    const randomNum = Math.floor(100 + Math.random() * 900);
    const folioUnico = `CAF-${Date.now().toString().slice(-6)}${randomNum}`;
    let desc = '';

    let identificador = '';
    if (order.orderType === 'LLEVAR') {
      if (order.ticketId && (order.ticketId.startsWith('MOSTRADOR') || order.ticketId.startsWith('VITRINA') || order.ticketId.startsWith('MOS-'))) {
        identificador = 'MOSTRADOR'; 
      } else {
        const rawId = String(order.ticketId || '');
        const partes = rawId.split(' - ');
        let idLimpio = partes[0] || 'Pedido';
        idLimpio = idLimpio.replace(/Llevar\s*#?/i, '').trim();
        identificador = `Para Llevar #${idLimpio}`;
      }
    } else {
      const numMesa = order.table ? order.table.number : (order.tableId || '?');
      identificador = `Mesa #${numMesa}`;
    }

    let dbMethod = 'CASH';
    if (paymentMethod === 'transferencia' || paymentMethod === 'TRANSFER') dbMethod = 'TRANSFER';
    else if (paymentMethod === 'tarjeta' || paymentMethod === 'CARD') dbMethod = 'CARD';

    const activeItems = order.items.filter(i => i.status === 'ACTIVE');

    if (isFullPayment) {
      const unpaidItems = activeItems.filter(i => !paidAccounts.includes(i.cuenta));
      amountToRegister = unpaidItems.reduce((sum, i) => sum + Number(i.subtotal), 0);
      desc = `Pago de Consumo (${identificador})  ${folioUnico}`; 
    } else if (cuentaName) {
      amountToRegister = activeItems.filter(i => i.cuenta === cuentaName).reduce((sum, i) => sum + Number(i.subtotal), 0);
      desc = `Pago de Consumo (${identificador}) Cuenta: ${cuentaName}  ${folioUnico}`;
      if (!paidAccounts.includes(cuentaName)) paidAccounts.push(cuentaName);
    }

    await order.update({ 
      status: isFullPayment ? 'PAID' : order.status, 
      paidAccounts: paidAccounts 
    });

    if (amountToRegister > 0) {
      const userId = req.user?.id || req.userId || req.usuario?.id || null;
      await Transaction.create({
        folio: folioUnico, 
        source: 'CAFETERIA',
        amount: amountToRegister,
        description: desc,
        paymentMethod: dbMethod, 
        referenceId: order.id,
        createdBy: userId 
      });
    }

    getIO().emit('pos:update');
    res.json({ message: 'Pago registrado con éxito en Caja', order });
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
    
    getIO().emit('pos:update');
    res.status(201).json(newTable);
  } catch (error) { 
    res.status(500).json({ message: 'Error al crear mesa', error: error.message }); 
  }
};

export const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;
    await Table.update({ status: 'inactive' }, { where: { id } });
    
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
    
    getIO().emit('pos:update');
    res.json({ message: 'Mesa eliminada y re-indexada correctamente' });
  } catch (error) { 
    res.status(500).json({ message: 'Error al eliminar mesa', error: error.message }); 
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
// 🖨️ IMPRIMIR TICKET (CONSOLA BACKEND / FÍSICO)
// ==========================================
export const printOrderTicket = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cuentaName } = req.body; 

    const order = await Order.findByPk(orderId, {
      include: [
        { model: Table, as: 'table' },
        { 
          model: OrderItem, 
          as: 'items', 
          where: { status: 'ACTIVE' },
          required: false,
          include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice'] }] 
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Orden no encontrada para imprimir' });
    }

    let cashierName = 'Sistema';
    try {
      const tx = await Transaction.findOne({ where: { referenceId: order.id, source: 'CAFETERIA' }, order: [['createdAt', 'DESC']] });
      const userIdToLook = (tx && tx.createdBy) ? tx.createdBy : order.createdBy;
      if (userIdToLook) {
        const userObj = await User.findByPk(userIdToLook);
        if (userObj) cashierName = userObj.fullName?.split(' ')[0] || userObj.username;
      }
    } catch(e){}

    let printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,      
      characterSet: CharacterSet.PC852_LATIN2,
      removeSpecialCharacters: false,
      width: 42,
    });

    printer.alignCenter();
    printer.setTextDoubleHeight();
    printer.setTextDoubleWidth();
    printer.println("𝓛𝔂𝓪"); 
    
    printer.setTextNormal();
    printer.bold(true);
    printer.println("Pasteleria & Cafeteria");
    printer.bold(false);
    printer.println("Pijijiapan, Chiapas");
    
    printer.drawLine();
    
    printer.alignLeft();
    printer.println(`Fecha de emision: ${new Date().toLocaleString()}`);
    printer.println(`Atendido por:     ${cashierName}`);
    
    let isLlevar = order.orderType === 'LLEVAR';
    let rawId = String(order.ticketId || '');
    let identificadorMesa = '';

    if (isLlevar) {
      if (rawId.startsWith('MOSTRADOR') || rawId.startsWith('VITRINA') || rawId.startsWith('MOS-')) {
        identificadorMesa = rawId; 
      } else {
        let idLimpio = rawId.split(' - ')[0].replace(/Llevar\s*#?/i, '').trim();
        identificadorMesa = `Pedido #${idLimpio || 'Llevar'}`;
      }
    } else {
      identificadorMesa = `Mesa #${order.table?.number || 'Salon'}`;
    }
    
    printer.println(`Servicio:         ${identificadorMesa}`);
    if (cuentaName && cuentaName !== 'General') {
      printer.println(`Cuenta de:        ${cuentaName}`);
    }
    
    printer.drawLine();

    printer.alignCenter();
    printer.bold(true);
    printer.println("DETALLE DE CONSUMO");
    printer.bold(false);
    printer.alignLeft();

    let itemsFiltrados = order.items || [];
    if (cuentaName && cuentaName !== 'General') {
      itemsFiltrados = itemsFiltrados.filter(i => i.cuenta === cuentaName);
    }

    const cuentasUnicas = Array.from(new Set(itemsFiltrados.map(i => i.cuenta || 'General')));
    let grandTotal = 0;

    cuentasUnicas.forEach(accName => {
      const accountItemsRaw = itemsFiltrados.filter(i => (i.cuenta || 'General') === accName);
      if (accountItemsRaw.length === 0) return;

      if (cuentasUnicas.length > 1 && (!cuentaName || cuentaName === 'General')) {
        printer.println("");
        printer.println(`>> CUENTA: ${accName.toUpperCase()}`);
        printer.println("------------------------------------------");
      }

      const groupedAccountItems = [];
      accountItemsRaw.forEach(item => {
        let notes = '[]';
        try { 
          const parsed = JSON.parse(item.notes || '[]');
          notes = JSON.stringify(Array.isArray(parsed) ? parsed : [parsed]);
        } catch(e){}
        
        const key = `${item.productId}-${item.isTakeaway}-${notes}`;
        const existing = groupedAccountItems.find(g => g.key === key);
        
        if (existing) {
          existing.quantity += item.quantity;
          existing.subtotal += Number(item.subtotal);
        } else {
          groupedAccountItems.push({
            key,
            product: item.product,
            quantity: item.quantity,
            subtotal: Number(item.subtotal),
            unitPrice: Number(item.subtotal) / item.quantity,
            isTakeaway: item.isTakeaway,
            notes: notes
          });
        }
      });

      printer.tableCustom([
        { text: "Cant", align: "LEFT", width: 0.15 },
        { text: "Desc", align: "LEFT", width: 0.55 },
        { text: "Imp", align: "RIGHT", width: 0.30 }
      ]);

      groupedAccountItems.forEach(item => {
        const subtotal = item.subtotal;
        grandTotal += subtotal;
        const nombreLlevar = item.isTakeaway ? `(Llevar) ${item.product?.name || "Prod"}` : (item.product?.name || "Prod");
        
        printer.tableCustom([
          { text: `${item.quantity}x`, align: "LEFT", width: 0.15 },
          { text: nombreLlevar, align: "LEFT", width: 0.55 },
          { text: `$${subtotal.toFixed(2)}`, align: "RIGHT", width: 0.30 }
        ]);

        if (item.quantity > 1) {
          printer.println(`  Unitario: $${item.unitPrice.toFixed(2)}`);
        }

        let preps = [];
        try { preps = JSON.parse(item.notes); } catch(e){}
        preps.forEach(p => {
          if (p.tamano) {
            let extra = `- ${p.tamano}`;
            if (p.leche) extra += ` * ${p.leche}`;
            printer.println(`  ${extra}`);
          }
        });
      });
    });

    printer.drawLine();

    if (cuentasUnicas.length > 1 && (!cuentaName || cuentaName === 'General')) {
      printer.alignCenter();
      printer.bold(true);
      printer.println("RESUMEN POR CUENTAS");
      printer.bold(false);
      printer.alignLeft();
      
      cuentasUnicas.forEach(accName => {
        const subTotalAcc = itemsFiltrados.filter(i => (i.cuenta || 'General') === accName).reduce((sum, i) => sum + Number(i.subtotal), 0);
        printer.tableCustom([
          { text: accName.toUpperCase(), align: "LEFT", width: 0.60 },
          { text: `$${subTotalAcc.toFixed(2)}`, align: "RIGHT", width: 0.40 }
        ]);
      });
      printer.drawLine();
    }

    printer.alignRight();
    printer.setTextDoubleHeight();
    printer.println(`TOTAL CONSUMIDO: $${grandTotal.toFixed(2)}`);
    printer.setTextNormal();
    
    printer.drawLine();
    printer.alignCenter();
    printer.bold(true);
    printer.println("!Muchas gracias por tu preferencia!");
    printer.bold(false);
    printer.println("Este documento es un comprobante");
    printer.println("de caja impreso.");
    printer.cut(); 

    console.log(`\n=== TICKET FÍSICO PARA ORDEN ${orderId} ===`);
    console.log(printer.getText());
    console.log(`==========================================\n`);

    res.json({ message: 'Ticket enviado a impresión exitosamente' });
  } catch (error) {
    console.error('❌ Error al intentar imprimir el ticket:', error);
    res.status(500).json({ message: 'Error al intentar imprimir el ticket', error: error.message });
  }
};

// ==========================================
// 📱 GENERAR VISTA DEL TICKET DIGITAL PARA EL CLIENTE (WHATSAPP/PDF)
// ==========================================
export const shareOrderTicket = async (req, res) => {
  try {
    let { orderId } = req.params;
    let cuentaSeleccionada = req.query.cuenta || 'Todas';

    if (orderId && orderId.length < 36) {
      const foundOrder = await Order.findOne({
        where: Sequelize.where(
          Sequelize.cast(Sequelize.col('id'), 'varchar'),
          { [Op.like]: `${orderId}%` }
        ),
        attributes: ['id']
      });

      if (foundOrder) {
        orderId = foundOrder.id; 
      } else {
        return res.status(404).send('<h1>Ticket no encontrado o expirado</h1>');
      }
    }

    const order = await Order.findByPk(orderId, {
      include: [
        { model: Table, as: 'table', attributes: ['number', 'zone'] },
        { 
          model: OrderItem, 
          as: 'items', 
          where: { status: 'ACTIVE' },
          required: false,
          include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice'] }] 
        }
      ]
    });

    if (!order) {
      return res.status(404).send('<h1>Ticket no encontrado o expirado</h1>');
    }

    let cashierName = 'Sistema';
    try {
      const tx = await Transaction.findOne({ where: { referenceId: order.id, source: 'CAFETERIA' }, order: [['createdAt', 'DESC']] });
      const userIdToLook = (tx && tx.createdBy) ? tx.createdBy : order.createdBy;
      if (userIdToLook) {
        const userObj = await User.findByPk(userIdToLook);
        if (userObj) cashierName = userObj.fullName?.split(' ')[0] || userObj.username;
      }
    } catch(e) {}

    let allItems = order.items || [];
    const cuentasDisponibles = Array.from(new Set(allItems.map(i => i.cuenta || 'General')));

    let itemsFiltrados = allItems;
    if (cuentaSeleccionada !== 'Todas') {
      itemsFiltrados = allItems.filter(i => (i.cuenta || 'General') === cuentaSeleccionada);
    }

    const totalAmount = itemsFiltrados.reduce((sum, item) => sum + Number(item.subtotal), 0);
    const dateStr = new Date(order.createdAt).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const cuentasAVisualizar = Array.from(new Set(itemsFiltrados.map(i => i.cuenta || 'General')));

    let isLlevar = order.orderType === 'LLEVAR';
    let rawId = String(order.ticketId || '');
    let identificadorMesa = '';

    if (isLlevar) {
      if (rawId.startsWith('MOSTRADOR') || rawId.startsWith('VITRINA') || rawId.startsWith('MOS-')) {
        identificadorMesa = rawId;
      } else {
        let idLimpio = rawId.split(' - ')[0].replace(/Llevar\s*#?/i, '').trim();
        identificadorMesa = `Pedido #${idLimpio || 'Llevar'}`;
      }
    } else {
      identificadorMesa = `Mesa #${order.table?.number || 'Salón'}`;
    }

    const htmlResponse = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tu Ticket de Consumo - 𝓛𝔂𝓪</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800;900&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f8fafc; }
        @media print { .no-print { display: none !important; } }
      </style>
    </head>
    <body class="text-gray-800 antialiased flex flex-col items-center justify-start min-h-screen pt-8 px-4 sm:px-6 select-none bg-slate-50">
      
      <div id="ticket-download-area" class="w-full max-w-md flex flex-col items-center justify-center p-2 bg-transparent">
        
        ${(cuentasDisponibles.length > 1 && cuentaSeleccionada === 'Todas') ? `
        <div class="w-full mb-4 no-print bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200 shadow-sm">
          <label class="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 text-center">👀 Ver cuenta de:</label>
          <div class="relative">
            <select onchange="window.location.href='?cuenta=' + encodeURIComponent(this.value)" class="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 appearance-none text-center shadow-sm cursor-pointer">
              <option value="Todas" ${cuentaSeleccionada === 'Todas' ? 'selected' : ''}>🌟 Todas las cuentas (General)</option>
              ${cuentasDisponibles.map(c => `
                <option value="${c}" ${cuentaSeleccionada === c ? 'selected' : ''}>👤 Cuenta: ${c}</option>
              `).join('')}
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
              <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>
        ` : ''}

        <div id="ticket-card" class="w-full bg-white rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-100 p-6 sm:p-8 relative transition-all duration-300">
          
          <div class="text-center mb-6">
            <h1 class="text-5xl font-black text-amber-600 mb-4 pb-2 leading-normal tracking-wider" style="font-family: 'Times New Roman', serif; font-style: italic;">𝓛𝔂𝓪</h1>
            <p class="text-xs uppercase tracking-widest font-extrabold text-slate-400">Pastelería & Cafetería</p>
            <p class="text-xs text-slate-500 mt-1 font-medium">Pijijiapan, Chiapas</p>
          </div>

          <div class="border-t-2 border-dashed border-slate-200 my-4"></div>

          <div class="space-y-2 text-sm font-medium text-slate-600 mb-6">
            <div class="flex justify-between items-center">
              <span>Fecha de emisión:</span>
              <span class="text-slate-900 font-bold">${dateStr}</span>
            </div>
            <div class="flex justify-between items-center">
              <span>Atendido por:</span>
              <span class="text-slate-900 font-bold capitalize">${cashierName}</span>
            </div>
            <div class="flex justify-between items-center">
              <span>Servicio:</span>
              <span class="text-slate-900 font-black uppercase tracking-wide">${identificadorMesa}</span>
            </div>
            ${cuentaSeleccionada !== 'Todas' ? `
            <div class="flex justify-between items-center">
              <span>Cuenta de:</span>
              <span class="text-amber-600 font-black uppercase">${cuentaSeleccionada}</span>
            </div>` : ''}
          </div>

          <div class="border-t-2 border-dashed border-slate-200 my-4"></div>

          <div class="space-y-6">
            <h3 class="text-xs uppercase font-black tracking-wider text-slate-400 mb-2">Detalle de consumo</h3>
            
            ${cuentasAVisualizar.map(accName => {
              const accountItemsRaw = itemsFiltrados.filter(i => (i.cuenta || 'General') === accName);
              if (accountItemsRaw.length === 0) return '';

              const groupedAccountItems = [];
              accountItemsRaw.forEach(item => {
                let notes = '[]';
                try { 
                  const parsed = JSON.parse(item.notes || '[]');
                  notes = JSON.stringify(Array.isArray(parsed) ? parsed : [parsed]);
                } catch(e){}
                
                const key = `${item.productId}-${item.isTakeaway}-${notes}`;
                const existing = groupedAccountItems.find(g => g.key === key);
                
                if (existing) {
                  existing.quantity += item.quantity;
                  existing.subtotal += Number(item.subtotal);
                } else {
                  groupedAccountItems.push({
                    key,
                    product: item.product,
                    quantity: item.quantity,
                    subtotal: Number(item.subtotal),
                    unitPrice: Number(item.subtotal) / item.quantity,
                    isTakeaway: item.isTakeaway || false,
                    notes: notes
                  });
                }
              });

              return `
                <div class="space-y-3">
                  ${cuentasAVisualizar.length > 1 && cuentaSeleccionada === 'Todas' ? `
                    <div class="text-xs font-extrabold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg uppercase tracking-wide">
                      ● Cuenta: ${accName}
                    </div>
                  ` : ''}
                  
                  ${groupedAccountItems.map(item => {
                    let preps = [];
                    try { preps = JSON.parse(item.notes); } catch(e){}

                    return `
                    <div class="flex items-start gap-3 text-sm px-1">
                      <span class="font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-lg text-xs mt-0.5">${item.quantity}x</span>
                      <div class="flex-1 min-w-0">
                        <p class="font-bold text-slate-900 break-words">
                          ${item.isTakeaway ? '<span class="text-orange-500 mr-1 text-[11px] uppercase tracking-tighter bg-orange-50 px-1 rounded">🛍️ Llevar</span>' : ''}
                          ${item.product?.name || 'Producto'}
                        </p>
                        ${item.quantity > 1 ? `<p class="text-[10px] font-bold text-slate-500 mt-0.5 mb-0.5">Unitario: $${item.unitPrice.toFixed(2)}</p>` : ''}
                        ${preps.map(p => p.tamano ? `<p class="text-[11px] text-slate-400 font-medium font-italic">- ${p.tamano} ${p.leche ? `• ${p.leche}` : ''}</p>` : '').join('')}
                      </div>
                      <span class="font-bold text-slate-900 shrink-0">$${Number(item.subtotal).toFixed(2)}</span>
                    </div>
                    `;
                  }).join('')}
                </div>
              `;
            }).join('')}
          </div>

          <div class="border-t-2 border-dashed border-slate-200 my-6"></div>

          ${cuentasAVisualizar.length > 1 && cuentaSeleccionada === 'Todas' ? `
            <div class="space-y-2 text-xs font-semibold text-slate-500 mb-4 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
              <p class="font-black text-slate-400 uppercase tracking-wider mb-2 text-[10px]">Resumen por Cuentas</p>
              ${cuentasAVisualizar.map(accName => {
                const subTotalAcc = itemsFiltrados.filter(i => (i.cuenta || 'General') === accName).reduce((sum, i) => sum + Number(i.subtotal), 0);
                return `
                  <div class="flex justify-between">
                    <span class="uppercase">${accName}:</span>
                    <span class="font-bold text-slate-800">$${subTotalAcc.toFixed(2)}</span>
                  </div>
                `;
              }).join('')}
            </div>
            <div class="border-t border-slate-100 my-4"></div>
          ` : ''}

          <div class="flex justify-between items-baseline mb-4">
            <span class="text-base font-black text-slate-900 uppercase tracking-tight">Total Consumido</span>
            <span class="text-3xl font-black text-slate-900 tracking-tighter">$${totalAmount.toFixed(2)}</span>
          </div>

          <div class="border-t border-slate-100 my-4"></div>

          <div class="text-center space-y-2 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <p class="text-[10px] font-black uppercase text-amber-600 tracking-widest">Visítanos en</p>
            <p class="text-xs text-slate-600 font-medium leading-relaxed">
              Segunda Calle Ote. Nte., Nuevo Mexico,<br>30540 Pijijiapan, Chis.
            </p>
            <a href="http://googleusercontent.com/maps.google.com/6" target="_blank" class="inline-flex items-center justify-center gap-1.5 mt-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-sm active:scale-95 transition-all">
              📍 Ver en Google Maps
            </a>
          </div>

          <div class="text-center mt-6 space-y-1">
            <p class="font-extrabold text-slate-800 text-sm">¡Muchas gracias por tu preferencia!</p>
            <p class="text-xs text-slate-400 font-medium">Este documento es un comprobante digital de caja.</p>
          </div>

        </div>
      </div>

      <div class="h-32 w-full shrink-0 no-print"></div>

      <div class="fixed bottom-6 left-0 right-0 flex justify-center p-4 no-print z-50">
        <div class="flex gap-3 w-full max-w-sm px-4">
          <button onclick="descargarPDF()" class="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider">
            📥 PDF
          </button>
          <button onclick="descargarImagen()" class="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider">
            📸 Imagen
          </button>
        </div>
      </div>

      <script>
        function descargarPDF() {
          const element = document.getElementById('ticket-card');
          const heightMm = (element.scrollHeight * 0.264583) + 2;
          const options = {
            margin: 0,
            filename: 'Ticket-Consumo-\${orderId}.pdf',
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { scale: 3, useCORS: true },
            jsPDF: { unit: 'mm', format: [80, heightMm], orientation: 'portrait' },
            pagebreak: { mode: 'avoid-all' }
          };
          html2pdf().set(options).from(element).save();
        }

        function descargarImagen() {
          const element = document.getElementById('ticket-card');
          html2canvas(element, { scale: 3, useCORS: true, backgroundColor: '#ffffff' }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'Ticket-Consumo-\${orderId}.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
          });
        }
      </script>
    </body>
    </html>
    `;

    res.status(200).send(htmlResponse);
  } catch (error) {
    res.status(500).send('<h3>Error al renderizar el ticket digital</h3>');
  }
};

// 📌 1. Marcar toda la orden como entregada
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

// 📌 2. Cancelar un producto individual
export const cancelOrderItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { cancelReason, cancelQty } = req.body; 
    const userId = req.user?.id; 

    const item = await OrderItem.findOne({ where: { id: itemId, orderId: id } });
    if (!item) return res.status(404).json({ message: 'Producto no encontrado' });

    const order = await Order.findByPk(id);

    const qtyToCancel = (cancelQty && cancelQty < item.quantity) ? parseInt(cancelQty, 10) : item.quantity;
    const isPartial = qtyToCancel < item.quantity;

    const unitPrice = Number(item.subtotal) / item.quantity;
    const refundAmount = unitPrice * qtyToCancel;

    let wasPaid = order.status === 'PAID' || (order.paidAccounts && order.paidAccounts.includes(item.cuenta));

    if (wasPaid && refundAmount > 0) {
      await Transaction.create({
        type: 'EXPENSE',
        source: 'CAFETERIA',
        expenseCategory: 'REFUND',
        amount: refundAmount,
        description: `Reembolso por cancelación de producto en Ticket ${order.ticketId || id}`,
        referenceId: order.id,
        createdBy: userId
      });
    }

    const previousKitchenStatus = item.kitchenStatus;
    let notesArray = [];
    try { notesArray = JSON.parse(item.notes || '[]'); } catch(e) {}
    if (!Array.isArray(notesArray)) notesArray = [notesArray];

    if (isPartial) {
        const cancelledNotes = notesArray.slice(0, qtyToCancel);
        const remainingNotes = notesArray.slice(qtyToCancel);

        await OrderItem.create({
            orderId: item.orderId,
            productId: item.productId,
            quantity: qtyToCancel,
            subtotal: refundAmount,
            cuenta: item.cuenta,
            isTakeaway: item.isTakeaway,
            notes: JSON.stringify(cancelledNotes),
            kitchenStatus: item.kitchenStatus,
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelReason: cancelReason || 'Cancelación parcial desde POS',
            cancelledBy: userId
        });

        await item.update({
            quantity: item.quantity - qtyToCancel,
            subtotal: Number(item.subtotal) - refundAmount,
            notes: JSON.stringify(remainingNotes)
        });
    } else {
        await item.update({
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: cancelReason || 'Cancelación desde POS',
          cancelledBy: userId
        });
    }

    if (['PENDING', 'PREPARING', 'READY'].includes(previousKitchenStatus)) {
      getIO().emit('orderItemCancelled', { orderId: id, itemId: item.id });
    }

    // 🔥 ACTUALIZAR EL TOTAL DE LA ORDEN MATEMÁTICAMENTE
    const newTotal = await OrderItem.sum('subtotal', { where: { orderId: id, status: 'ACTIVE' } }) || 0;
    const activeItems = await OrderItem.count({ where: { orderId: id, status: 'ACTIVE' } });
    
    if (activeItems === 0 && order.status !== 'CLOSED') {
      await order.update({ status: 'CANCELLED', totalAmount: 0, cancelledAt: new Date(), cancelReason: 'Todos los productos fueron cancelados automáticamente', cancelledBy: userId });
      if (order.tableId) await Table.update({ status: 'active' }, { where: { id: order.tableId } });
    } else {
      await order.update({ totalAmount: newTotal });
    }

    const allItems = await OrderItem.findAll({
      where: { orderId: id, status: 'ACTIVE' },
      include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice', 'imageUrl', 'requiereCocina'] }]
    });

    getIO().emit('pos:update'); 
    res.json({ message: 'Producto cancelado correctamente', wasRefunded: wasPaid, orderItems: allItems });
  } catch (error) {
    console.error('Error en cancelOrderItem:', error);
    res.status(500).json({ message: 'Error al cancelar producto' });
  }
};

// 📌 3. Cancelar cuenta completa
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancelReason } = req.body;
    const userId = req.user?.id;

    // 🔥 CORRECCIÓN: Se especifica { model: OrderItem, as: 'items' } para respetar el alias
    const order = await Order.findByPk(id, { 
      include: [{ model: OrderItem, as: 'items' }] 
    });
    
    if (!order) return res.status(404).json({ message: 'Orden no encontrada' });

    if (order.status === 'CLOSED') {
      return res.status(400).json({ message: 'No se puede cancelar una orden cerrada definitivamente' });
    }

    let totalRefund = 0;

    // 🔥 CORRECCIÓN: Ahora se itera sobre order.items en lugar de order.OrderItems
    for (const item of order.items) {
      if (item.status === 'ACTIVE') {
        const previousKitchenStatus = item.kitchenStatus;
        
        let wasPaid = order.status === 'PAID' || 
                      (order.paidAccounts && order.paidAccounts.includes(item.cuenta));
        if (wasPaid) totalRefund += Number(item.subtotal);

        await item.update({
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: cancelReason || 'Cancelación de cuenta completa',
          cancelledBy: userId
        });

        if (['PENDING', 'PREPARING', 'READY'].includes(previousKitchenStatus)) {
          getIO().emit('orderItemCancelled', { orderId: id, itemId: item.id });
        }
      }
    }

    if (totalRefund > 0) {
      await Transaction.create({
        type: 'EXPENSE',
        source: 'CAFETERIA',
        expenseCategory: 'REFUND',
        amount: totalRefund,
        description: `Reembolso total por cancelación de Orden ${order.ticketId || id}`,
        referenceId: order.id,
        createdBy: userId
      });
    }

    // Poner el total en cero al cancelar toda la orden
    await order.update({
      status: 'CANCELLED',
      totalAmount: 0,
      cancelledAt: new Date(),
      cancelReason: cancelReason || 'Cancelada desde POS',
      cancelledBy: userId
    });

    if (order.tableId) {
      await Table.update({ status: 'active' }, { where: { id: order.tableId } });
    }

    getIO().emit('pos:update'); 
    res.json({ message: 'Cuenta cancelada completamente', refundedAmount: totalRefund });
  } catch (error) {
    console.error('Error en cancelOrder:', error);
    res.status(500).json({ message: 'Error al cancelar la cuenta' });
  }
};

// ==========================================
// 📊 OBTENER RESUMEN DIARIO (VENDIDOS Y PAPELERA)
// ==========================================
export const getDailySummary = async (req, res) => {
  try {
    // Importamos Op dinámicamente por si no está declarado al inicio del archivo
    const { Op } = await import('sequelize'); 

    // Configuramos el inicio y fin del día actual
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const dateFilter = { [Op.between]: [startOfDay, endOfDay] };

    // 1. Órdenes Pagadas
    const vendidosOrders = await Order.findAll({
      where: { status: 'PAID', createdAt: dateFilter },
      // required: false garantiza que si no tiene mesa (Llevar), igual aparezca
      include: [{ model: Table, as: 'table', required: false }],
      order: [['createdAt', 'DESC']]
    });

    // 2. Órdenes Canceladas (LA PAPELERA)
    const cancelledOrders = await Order.findAll({
      where: { status: 'CANCELLED', cancelledAt: dateFilter },
      // 🔥 AQUÍ ESTABA EL PROBLEMA: required: false permite que entren los Para Llevar
      include: [{ model: Table, as: 'table', required: false }],
      order: [['cancelledAt', 'DESC']]
    });

    // 3. Productos Cancelados Sueltos
    const cancelledItems = await OrderItem.findAll({
      where: { status: 'CANCELLED', cancelledAt: dateFilter },
      include: [{ model: Product, as: 'product' }],
      order: [['cancelledAt', 'DESC']]
    });

    // 4. Transacciones del día
    const transactions = await Transaction.findAll({
      where: { createdAt: dateFilter },
      order: [['createdAt', 'DESC']]
    });

    // Enviamos todo al frontend
    res.json({
      vendidosCount: vendidosOrders.length,
      papeleraCount: cancelledOrders.length + cancelledItems.length,
      vendidosOrders,
      cancelledOrders,
      cancelledItems,
      transactions
    });
  } catch (error) {
    console.error('Error en getDailySummary:', error);
    res.status(500).json({ message: 'Error al obtener el resumen diario' });
  }
};

// ==========================================
// ♻️ RESTAURAR PRODUCTO CANCELADO
// ==========================================
export const restoreOrderItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const userId = req.user?.id;

    const item = await OrderItem.findOne({ where: { id: itemId, orderId: id } });
    if (!item) return res.status(404).json({ message: 'Producto no encontrado en la papelera' });

    const order = await Order.findByPk(id);
    
    let wasPaid = order.status === 'PAID' || (order.paidAccounts && order.paidAccounts.includes(item.cuenta));
    
    if (wasPaid) {
      const unitPrice = Number(item.subtotal) / item.quantity;
      const amountToRestore = unitPrice * item.quantity;
      
      await Transaction.create({
        type: 'INCOME',
        source: 'CAFETERIA',
        expenseCategory: 'RECOVERY', 
        amount: amountToRestore,
        description: `Recuperación por producto restaurado en Ticket ${order.ticketId || id}`,
        referenceId: order.id,
        createdBy: userId
      });
    }

    await item.update({
      status: 'ACTIVE',
      cancelledAt: null,
      cancelReason: null,
      cancelledBy: null
    });

    // 🔥 RECALCULAR TOTAL AL RESTAURAR
    const newTotal = await OrderItem.sum('subtotal', { where: { orderId: id, status: 'ACTIVE' } }) || 0;
    await order.update({ totalAmount: newTotal });

    getIO().emit('orderItemRestored', { orderId: id, itemId: item.id });
    getIO().emit('pos:update');

    res.json({ message: 'Producto restaurado exitosamente', wasRefundReversed: wasPaid });
  } catch (error) {
    console.error('Error en restoreOrderItem:', error);
    res.status(500).json({ message: 'Error al restaurar producto' });
  }
};

// ==========================================
// ♻️ RESTAURAR ORDEN COMPLETA (CUENTA)
// ==========================================
export const restoreOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // 🔥 CORRECCIÓN: Se especifica el alias aquí también
    const order = await Order.findByPk(id, { 
      include: [{ model: OrderItem, as: 'items' }] 
    });
    
    if (!order) return res.status(404).json({ message: 'Orden no encontrada' });

    if (order.tableId) {
      const table = await Table.findByPk(order.tableId);
      if (table && table.status === 'active') {
        await table.update({ status: 'ocupada' });
      } else if (table && table.status === 'ocupada') {
        return res.status(400).json({ message: `La mesa #${table.number} ya está ocupada por otro cliente. Libere la mesa primero.` });
      }
    }

    let totalRestoredAmount = 0;

    // 🔥 CORRECCIÓN: Y se cambia a order.items en el bucle
    for (const item of order.items) {
      if (item.status === 'CANCELLED' && item.cancelReason === 'Cancelación de cuenta completa') {
        let wasPaid = order.status === 'PAID' || (order.paidAccounts && order.paidAccounts.includes(item.cuenta));
        if (wasPaid) totalRestoredAmount += Number(item.subtotal);

        await item.update({ status: 'ACTIVE', cancelledAt: null, cancelReason: null, cancelledBy: null });
        getIO().emit('orderItemRestored', { orderId: id, itemId: item.id });
      }
    }

    if (totalRestoredAmount > 0) {
      await Transaction.create({
        type: 'INCOME',
        source: 'CAFETERIA',
        expenseCategory: 'RECOVERY',
        amount: totalRestoredAmount,
        description: `Recuperación global por orden restaurada: ${order.ticketId || id}`,
        referenceId: order.id,
        createdBy: userId
      });
    }

    // Recalcular total de la orden al restaurar
    const newTotal = await OrderItem.sum('subtotal', { where: { orderId: id, status: 'ACTIVE' } }) || 0;

    await order.update({
      status: 'OPEN',
      totalAmount: newTotal,
      cancelledAt: null,
      cancelReason: null,
      cancelledBy: null
    });

    getIO().emit('pos:update');
    res.json({ message: 'Orden restaurada correctamente' });
  } catch (error) {
    console.error('Error en restoreOrder:', error);
    res.status(500).json({ message: 'Error al restaurar la cuenta' });
  }
};