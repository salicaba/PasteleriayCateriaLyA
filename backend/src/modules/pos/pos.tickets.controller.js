// backend/src/modules/pos/pos.tickets.controller.js
import { Op, Sequelize } from 'sequelize';
import Order from './Order.model.js';
import OrderItem from './OrderItem.model.js';
import Product from '../menu/Product.model.js';
import Table from './Table.model.js';
import Transaction from '../cash/Transaction.model.js';
import User from '../users/User.model.js'; 
import { ThermalPrinter, PrinterTypes, CharacterSet } from 'node-thermal-printer';

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

    const ticketFolio = rawId || (isLlevar ? 'LLEVAR-' : 'CAFE-') + order.id.split('-')[0].toUpperCase();

    printer.alignCenter();
    printer.println("COMPROBANTE DE VENTA");
    printer.setTextDoubleHeight();
    printer.setTextDoubleWidth();
    printer.println(ticketFolio); // Folio en Grande
    printer.setTextNormal();
    printer.drawLine();
    
    // 🔥 Formateo y saneo de fecha para impresora térmica
    const d = new Date();
    const diaSemana = d.toLocaleDateString('es-MX', { weekday: 'long' });
    const diaSemanaCap = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
    const fechaFormateada = d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaFormateada = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
    const currentDateTimeStr = `${diaSemanaCap}, ${fechaFormateada} ${horaFormateada}`;
    const fechaImpresion = currentDateTimeStr.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    printer.alignLeft();
    printer.println(`Expedicion:       ${fechaImpresion}`);
    printer.println(`Atendido por:     ${cashierName}`);
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
    const estadoLiquidacion = order.status === 'PAID' ? 'LIQUIDADO' : 'PENDIENTE';
    const nombreCliente = order.clientName || (cuentaSeleccionada !== 'Todas' ? cuentaSeleccionada : 'Público General');
    
    const d = new Date(order.createdAt);
    const diaSemana = d.toLocaleDateString('es-MX', { weekday: 'long' });
    const diaSemanaCap = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
    const fechaFormateada = d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaFormateada = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = `${diaSemanaCap}, ${fechaFormateada} ${horaFormateada}`;

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

    const ticketFolio = rawId || (isLlevar ? 'LLEVAR-' : 'CAFE-') + order.id.split('-')[0].toUpperCase();

    const htmlResponse = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ticket de Consumo #${ticketFolio} - 𝓛𝔂𝓪</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script>
        tailwind.config = { corePlugins: { preflight: true } }
      </script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800;900&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f8fafc; }
        @media print { .no-print { display: none !important; } }
      </style>
    </head>
    <body class="text-slate-800 antialiased flex flex-col items-center justify-start min-h-screen pt-8 px-4 sm:px-6 select-none bg-slate-50">
      
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

        <div id="ticket-card" class="w-full bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 p-6 sm:p-8 relative transition-all duration-300">
          
          <div class="text-center mb-6">
            <div class="text-4xl mb-2 text-slate-800">☕</div>
            <h1 class="text-5xl font-black text-slate-900 mb-1 leading-normal tracking-wider" style="font-family: 'Times New Roman', serif; font-style: italic;">𝓛𝔂𝓪</h1>
            <p class="text-[10px] uppercase tracking-widest font-extrabold text-slate-500">Cafetería</p>
            <h2 class="text-3xl font-black text-slate-900 tracking-wider mt-4">${ticketFolio}</h2>
          </div>

          <div class="space-y-1.5 text-sm font-medium text-slate-600 mb-6 px-1">
            <div class="flex justify-between items-start">
              <span>Expedición:</span>
              <span class="text-slate-900 font-bold text-right">${dateStr}</span>
            </div>
            <div class="flex justify-between items-center">
              <span>Atendido por:</span>
              <span class="text-slate-900 font-bold capitalize">${cashierName}</span>
            </div>
            <div class="flex justify-between items-center">
              <span>Cliente:</span>
              <span class="text-slate-900 font-bold capitalize truncate max-w-[60%] text-right">${nombreCliente}</span>
            </div>
            <div class="flex justify-between items-center">
              <span>Servicio:</span>
              <span class="text-slate-900 font-black uppercase tracking-wide">${identificadorMesa}</span>
            </div>
          </div>

          <div class="border-t border-slate-200 my-5"></div>

          <div class="space-y-4">
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
                    <div class="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg uppercase tracking-wider text-center">
                      — Cuenta: ${accName} —
                    </div>
                  ` : ''}
                  
                  ${groupedAccountItems.map(item => {
                    let preps = [];
                    try { preps = JSON.parse(item.notes); } catch(e){}

                    return `
                    <div class="flex items-start gap-3 text-sm px-1">
                      <span class="font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-xs mt-0.5">${item.quantity}x</span>
                      <div class="flex-1 min-w-0">
                        <p class="font-bold text-slate-900 break-words leading-tight">
                          ${item.isTakeaway ? '<span class="text-orange-600 mr-1 text-[10px] uppercase tracking-tighter bg-orange-50 px-1 py-0.5 rounded">🛍️ Llevar</span>' : ''}
                          ${item.product?.name || 'Producto'}
                        </p>
                        ${item.quantity > 1 ? `<p class="text-[10px] font-bold text-slate-500 mt-1 mb-0.5">Unitario: $${item.unitPrice.toFixed(2)}</p>` : ''}
                        ${preps.map(p => p.tamano ? `<p class="text-[11px] text-slate-500 font-medium mt-0.5">- ${p.tamano} ${p.leche ? `• ${p.leche}` : ''}</p>` : '').join('')}
                      </div>
                      <span class="font-black text-slate-900 shrink-0">$${Number(item.subtotal).toFixed(2)}</span>
                    </div>
                    `;
                  }).join('')}
                </div>
              `;
            }).join('')}
          </div>

          <div class="border-t border-slate-200 my-5"></div>

          ${cuentasAVisualizar.length > 1 && cuentaSeleccionada === 'Todas' ? `
            <div class="space-y-2 text-xs font-semibold text-slate-500 mb-5 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p class="font-black text-slate-400 uppercase tracking-wider mb-3 text-[10px] text-center">Resumen por Cuentas</p>
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
            <div class="border-t border-slate-200 my-5"></div>
          ` : ''}

          <div class="flex flex-col gap-2 mb-2">
            <div class="flex justify-between items-baseline">
              <span class="text-sm font-black text-slate-600 uppercase tracking-tight">Total Consumido</span>
              <span class="text-3xl font-black text-slate-900 tracking-tighter">$${totalAmount.toFixed(2)}</span>
            </div>
            <div class="flex justify-between items-center mt-2">
              <span class="text-xs font-bold text-slate-500">Estado de Cuenta:</span>
              <span class="text-xs font-black uppercase tracking-widest px-2 py-1 rounded border-2 border-slate-800 text-slate-800">
                ${estadoLiquidacion}
              </span>
            </div>
          </div>

          <div class="border-t border-slate-200 my-5"></div>

          <div class="text-center space-y-2 mb-6 bg-slate-50/80 p-4 rounded-2xl">
            <p class="text-[10px] font-black uppercase text-slate-500 tracking-widest">Ubicación</p>
            <p class="text-[11px] text-slate-600 font-medium leading-relaxed">
              Segunda Calle Ote. Nte., Nuevo Mexico,<br>30540 Pijijiapan, Chis.
            </p>
            <a href="http://googleusercontent.com/maps.google.com/6" target="_blank" class="inline-flex items-center justify-center gap-1.5 mt-3 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-sm active:scale-95 transition-all no-underline">
              📍 Ver en Google Maps
            </a>
          </div>

          <div class="text-center mt-8 space-y-1">
            <p class="font-black text-slate-800 text-sm">¡Gracias por celebrar con nosotros!</p>
            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Comprobante Digital de Caja</p>
          </div>

        </div>
      </div>

      <div class="h-32 w-full shrink-0 no-print"></div>

      <div class="fixed bottom-6 left-0 right-0 flex justify-center p-4 no-print z-50">
        <div class="flex gap-3 w-full max-w-sm px-4">
          <button onclick="descargarPDF()" class="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 rounded-2xl shadow-xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider">
            📥 PDF
          </button>
          <button onclick="descargarImagen()" class="flex-1 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 font-black py-3.5 rounded-2xl shadow-xl shadow-slate-200/50 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider">
            📸 Imagen
          </button>
        </div>
      </div>

      <script>
        function descargarPDF() {
          const element = document.getElementById('ticket-card');
          const heightMm = (element.scrollHeight * 0.264583) + 5;
          const options = {
            margin: 0,
            filename: 'Ticket_Lya_Cafeteria_${ticketFolio}.pdf',
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { scale: 3, useCORS: true, backgroundColor: '#ffffff' },
            jsPDF: { unit: 'mm', format: [80, heightMm], orientation: 'portrait' },
            pagebreak: { mode: 'avoid-all' }
          };
          html2pdf().set(options).from(element).save();
        }

        function descargarImagen() {
          const element = document.getElementById('ticket-card');
          html2canvas(element, { scale: 3, useCORS: true, backgroundColor: '#ffffff' }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'Ticket_Lya_Cafeteria_${ticketFolio}.png';
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