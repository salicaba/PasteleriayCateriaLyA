import { getIO } from '../../config/socket.js'; // <-- AÑADIR ESTO ARRIBA DEL TODO
import Order from './Order.model.js';
import OrderItem from './OrderItem.model.js';
import Product from '../menu/Product.model.js';
import Table from './Table.model.js';
import Transaction from '../cash/Transaction.model.js';
import User from '../users/User.model.js'; 
import { ThermalPrinter, PrinterTypes, CharacterSet } from 'node-thermal-printer';

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
    
    // 🔥 AÑADIDO: Notificar a todos los clientes que hay una nueva orden
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
      where: { orderId },
      include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice', 'imageUrl'] }]
    });

    // 🔥 AÑADIDO: Notificar que se añadieron productos a una orden (Actualiza carrito)
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
      const rawId = String(order.ticketId || '');
      const partes = rawId.split(' - ');
      let idLimpio = partes[0] || 'Pedido';
      idLimpio = idLimpio.replace(/Llevar\s*#?/i, '').trim();
      identificador = `Para Llevar #${idLimpio}`;
    } else {
      const numMesa = order.table ? order.table.number : (order.tableId || '?');
      identificador = `Mesa #${numMesa}`;
    }

    // Detectar el método de pago
    let dbMethod = 'CASH';
    if (paymentMethod === 'transferencia' || paymentMethod === 'TRANSFER') dbMethod = 'TRANSFER';
    else if (paymentMethod === 'tarjeta' || paymentMethod === 'CARD') dbMethod = 'CARD';

    // Construcción de la descripción (completamente limpia del método de pago)
    if (isFullPayment) {
      const unpaidItems = order.items.filter(i => !paidAccounts.includes(i.cuenta));
      amountToRegister = unpaidItems.reduce((sum, i) => sum + Number(i.subtotal), 0);
      
      desc = `Pago de Consumo (${identificador})  ${folioUnico}`; 
      
    } else if (cuentaName) {
      amountToRegister = order.items.filter(i => i.cuenta === cuentaName).reduce((sum, i) => sum + Number(i.subtotal), 0);
      
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

    // 🔥 AÑADIDO: Notificar que se realizó un pago (actualiza visualmente si fue parcial/total)
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

    // 🔥 AÑADIDO: Notificar que la mesa se cerró y liberó
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
    
    // 🔥 AÑADIDO: Opcional pero útil, refresca la vista si el admin crea una nueva mesa
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
    
    // 🔥 AÑADIDO: Opcional pero útil, refresca la vista si el admin borra una mesa
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
            isTakeaway: item.isTakeaway 
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
             isTakeaway: item.isTakeaway
           });
        } else {
           await item.update({ cuenta: targetCuenta });
        }
    }

    const allItems = await OrderItem.findAll({
      where: { orderId: item.orderId },
      include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice', 'imageUrl'] }]
    });
    
    // 🔥 AÑADIDO: Notificar que se movieron productos entre cuentas
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
    let idLimpio = rawId.split(' - ')[0].replace(/Llevar\s*#?/i, '').trim();
    let identificadorMesa = isLlevar ? `Pedido #${idLimpio || 'Llevar'}` : `Mesa #${order.table?.number || 'Salon'}`;
    
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
    const { orderId } = req.params;
    const { cuenta } = req.query; 

    const order = await Order.findByPk(orderId, {
      include: [
        { model: Table, as: 'table', attributes: ['number', 'zone'] },
        { 
          model: OrderItem, 
          as: 'items', 
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

    let itemsFiltrados = order.items || [];
    if (cuenta && cuenta !== 'General') {
      itemsFiltrados = itemsFiltrados.filter(i => i.cuenta === cuenta);
    }

    const totalAmount = itemsFiltrados.reduce((sum, item) => sum + Number(item.subtotal), 0);
    const dateStr = new Date(order.createdAt).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const cuentasUnicas = Array.from(new Set(itemsFiltrados.map(i => i.cuenta || 'General')));

    let isLlevar = order.orderType === 'LLEVAR';
    let rawId = String(order.ticketId || '');
    let idLimpio = rawId.split(' - ')[0].replace(/Llevar\s*#?/i, '').trim();
    let identificadorMesa = isLlevar ? `Pedido #${idLimpio || 'Llevar'}` : `Mesa #${order.table?.number || 'Salón'}`;

    const htmlResponse = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tu Ticket de Consumo - 𝓛𝔂𝓪</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800;900&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f8fafc; }
        @media print {
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body class="text-gray-800 antialiased flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 select-none">
      
      <div id="ticket-download-area" class="w-full max-w-md flex flex-col items-center justify-center p-2 bg-transparent">
        
        <div id="ticket-card" class="w-full bg-white rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-100 p-6 sm:p-8 relative transition-all duration-300">
          
          <div class="text-center mb-6">
            <h1 class="text-5xl font-black text-amber-600 mb-2" style="font-family: 'Times New Roman', serif; font-style: italic;">𝓛𝔂𝓪</h1>
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
            ${cuenta ? `
            <div class="flex justify-between items-center">
              <span>Cuenta de:</span>
              <span class="text-amber-600 font-black uppercase">${cuenta}</span>
            </div>` : ''}
          </div>

          <div class="border-t-2 border-dashed border-slate-200 my-4"></div>

          <div class="space-y-6">
            <h3 class="text-xs uppercase font-black tracking-wider text-slate-400 mb-2">Detalle de consumo</h3>
            
            ${cuentasUnicas.map(accName => {
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
                  ${cuentasUnicas.length > 1 && !cuenta ? `
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

          ${cuentasUnicas.length > 1 && !cuenta ? `
            <div class="space-y-2 text-xs font-semibold text-slate-500 mb-4 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
              <p class="font-black text-slate-400 uppercase tracking-wider mb-2 text-[10px]">Resumen por Cuentas</p>
              ${cuentasUnicas.map(accName => {
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

          <div class="text-center mt-6 space-y-1">
            <p class="font-extrabold text-slate-800 text-sm">¡Muchas gracias por tu preferencia!</p>
            <p class="text-xs text-slate-400 font-medium">Este documento es un comprobante digital de caja.</p>
          </div>

        </div>
      </div>

      <div class="fixed bottom-6 left-0 right-0 flex justify-center p-4 no-print z-50">
        <button onclick="descargarPDF()" class="bg-slate-900 hover:bg-slate-800 text-white font-black px-8 py-4 rounded-2xl shadow-xl hover:shadow-slate-300/50 active:scale-95 transition-all duration-200 flex items-center gap-3 text-sm uppercase tracking-wider">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Guardar Ticket en PDF
        </button>
      </div>

      <script>
        function descargarPDF() {
          const element = document.getElementById('ticket-card');
          
          // 1. Calculamos la altura total real del diseño web
          const heightPx = element.scrollHeight;
          
          // 2. Convertimos a milímetros y le damos 2mm de respiro al final
          const heightMm = (heightPx * 0.264583) + 2;
          
          const options = {
            margin:       0, // 🔥 CERO MÁRGENES
            filename:     'Ticket-Consumo-${orderId}.pdf',
            image:        { type: 'jpeg', quality: 1 },
            html2canvas:  { scale: 3, useCORS: true, logging: false },
            // 🔥 HOJA INFINITA: Ancho de 80mm (estándar de barra) y alto exacto
            jsPDF:        { unit: 'mm', format: [80, heightMm], orientation: 'portrait' },
            pagebreak:    { mode: 'avoid-all' }
          };
          
          html2pdf().set(options).from(element).save();
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