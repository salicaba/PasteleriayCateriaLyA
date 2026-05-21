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

    await OrderItem.bulkCreate(itemsToInsert);
    
    const subtotalNuevo = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    await order.update({ totalAmount: Number(order.totalAmount) + subtotalNuevo });

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
            kitchenStatus: item.kitchenStatus
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
             kitchenStatus: item.kitchenStatus
           });
        } else {
           await item.update({ cuenta: targetCuenta });
        }
    }

    const allItems = await OrderItem.findAll({
      where: { orderId: item.orderId },
      include: [{ model: Product, as: 'product', attributes: ['name', 'basePrice', 'imageUrl'] }]
    });
    
    res.json({ message: 'Producto movido y agrupado con éxito', orderItems: allItems });
  } catch (error) {
    res.status(500).json({ message: 'Error al mover producto', error: error.message });
  }
};

// ==========================================
// 🖨️ IMPRIMIR TICKET (CONSOLA BACKEND)
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

    console.log(`[IMPRESIÓN] Ticket enviado para la orden: ${orderId} - Cuenta: ${cuentaName || 'Toda la mesa'}`);
    res.json({ message: 'Ticket enviado a impresión exitosamente' });
  } catch (error) {
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

    let itemsFiltrados = order.items || [];
    if (cuenta && cuenta !== 'General') {
      itemsFiltrados = itemsFiltrados.filter(i => i.cuenta === cuenta);
    }

    const totalAmount = itemsFiltrados.reduce((sum, item) => sum + Number(item.subtotal), 0);
    const dateStr = new Date(order.createdAt).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // Obtener las cuentas únicas presentes en este ticket
    const cuentasUnicas = Array.from(new Set(itemsFiltrados.map(i => i.cuenta || 'General')));

    const isLlevar = order.orderType === 'LLEVAR';
    const identificadorMesa = isLlevar ? `Pedido #${order.ticketId || 'Llevar'}` : `Mesa #${order.table?.number || 'Salón'}`;

    // Construcción del HTML dinámico responsivo móvil agrupando por cuentas activas
    const htmlResponse = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tu Ticket de Consumo - 𝓛𝔂𝓐</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800;900&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f8fafc; }
        @media print {
          .no-print { display: none !important; }
          .print-card { box-shadow: none !important; border: none !important; padding: 0 !important; background: white !important; }
          body { background: white !important; }
        }
      </style>
    </head>
    <body class="text-gray-800 antialiased flex flex-col items-center min-h-screen p-4 sm:p-6 select-none">
      
      <div class="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-100 p-6 sm:p-8 mt-4 mb-24 relative print-card transition-all duration-300">
        
        <div class="text-center mb-6">
          <h1 class="text-5xl font-black text-amber-600 mb-2" style="font-family: 'Times New Roman', serif; font-style: italic;">𝓛𝔂𝓐</h1>
          <p class="text-xs uppercase tracking-widest font-extrabold text-slate-400">Pastelería & Cafetería</p>
          <p class="text-xs text-slate-500 mt-1 font-medium">Pijijiapan, Chiapas</p>
        </div>

        <div class="border-t-2 border-dashed border-slate-200 my-4"></div>

        <div class="space-y-2 text-sm font-medium text-slate-600 mb-6">
          <div class="flex justify-between">
            <span>Fecha de emisión:</span>
            <span class="text-slate-900 font-bold">${dateStr}</span>
          </div>
          <div class="flex justify-between">
            <span>Servicio:</span>
            <span class="text-slate-900 font-black uppercase tracking-wide">${identificadorMesa}</span>
          </div>
          ${cuenta ? `
          <div class="flex justify-between">
            <span>Cuenta de:</span>
            <span class="text-amber-600 font-black uppercase">${cuenta}</span>
          </div>` : ''}
        </div>

        <div class="border-t-2 border-dashed border-slate-200 my-4"></div>

        <div class="space-y-6">
          <h3 class="text-xs uppercase font-black tracking-wider text-slate-400 mb-2">Detalle de consumo</h3>
          
          ${cuentasUnicas.map(accName => {
            const accountItems = itemsFiltrados.filter(i => (i.cuenta || 'General') === accName);
            if (accountItems.length === 0) return '';

            return `
              <div class="space-y-3">
                ${cuentasUnicas.length > 1 && !cuenta ? `
                  <div class="text-xs font-extrabold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg uppercase tracking-wide">
                    ● Cuenta: ${accName}
                  </div>
                ` : ''}
                
                ${accountItems.map(item => {
                  let preps = [];
                  try { preps = JSON.parse(item.notes || '[]'); } catch(e){}
                  if(!Array.isArray(preps)) preps = [preps];

                  return `
                  <div class="flex items-start gap-3 text-sm px-1">
                    <span class="font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-lg text-xs mt-0.5">${item.quantity}x</span>
                    <div class="flex-1 min-w-0">
                      <p class="font-bold text-slate-900 break-words">${item.product?.name || 'Producto'}</p>
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

      <div class="fixed bottom-6 left-0 right-0 flex justify-center p-4 no-print z-50">
        <button onclick="window.print()" class="bg-slate-900 hover:bg-slate-800 text-white font-black px-8 py-4 rounded-2xl shadow-xl hover:shadow-slate-300/50 active:scale-95 transition-all duration-200 flex items-center gap-3 text-sm uppercase tracking-wider">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Guardar Ticket en PDF
        </button>
      </div>

    </body>
    </html>
    `;

    res.status(200).send(htmlResponse);
  } catch (error) {
    res.status(500).send('<h3>Error al renderizar el ticket digital</h3>');
  }
};