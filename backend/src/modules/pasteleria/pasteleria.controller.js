import PasteleriaOrder from './PasteleriaOrder.model.js';
import BusinessConfig from '../settings/BusinessConfig.model.js';
import Transaction from '../cash/Transaction.model.js'; 

// Obtener todos los pedidos
export const getPedidos = async (req, res) => {
  try {
    const pedidos = await PasteleriaOrder.findAll({
      order: [['fechaEntrega', 'ASC']]
    });
    res.json({ data: pedidos });
  } catch (error) {
    console.error("Error al obtener pedidos:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Crear un nuevo pedido
export const createPedido = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId || req.usuario?.id || null;
    const { abonos, ...pedidoData } = req.body;

    const randomNum = Math.floor(100 + Math.random() * 900);
    const newId = `PED-${Date.now().toString().slice(-6)}${randomNum}`;

    let abonosParaGuardar = [];

    if (abonos && Array.isArray(abonos) && abonos.length > 0) {
      for (const abono of abonos) {
        const montoAbono = parseFloat(abono.monto);
        if (montoAbono > 0) {
          
          let dbMethod = 'CASH';
          if (abono.metodo === 'transferencia') dbMethod = 'TRANSFER';
          else if (abono.metodo === 'tarjeta') dbMethod = 'CARD'; 

          const tx = await Transaction.create({
            source: 'PASTELERIA',
            paymentMethod: dbMethod, 
            amount: montoAbono,
            // 🔥 Modificado: Ya no incluye el método en texto
            description: `Anticipo Pedido: ${pedidoData.cliente || 'Público General'} ${newId}`,
            referenceId: newId,
            createdBy: userId
          });
          
          abonosParaGuardar.push({
            id: tx.id,
            fecha: abono.fecha || new Date().toISOString(),
            monto: montoAbono,
            metodo: abono.metodo || 'efectivo' 
          });
        }
      }
    }

    const nuevoPedido = await PasteleriaOrder.create({
      id: newId,
      ...pedidoData,
      abonos: abonosParaGuardar 
    });

    res.status(201).json({ data: nuevoPedido });
  } catch (error) {
    console.error("Error al crear pedido:", error);
    res.status(500).json({ message: "Error al crear el pedido" });
  }
};

// Registrar un abono a un pedido existente
export const addAbono = async (req, res) => {
  try {
    const { id } = req.params;
    const { monto, metodo } = req.body; 
    
    const userId = req.user?.id || req.userId || req.usuario?.id || null;

    const pedido = await PasteleriaOrder.findByPk(id);
    if (!pedido) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    let dbMethod = 'CASH';
    if (metodo === 'transferencia') dbMethod = 'TRANSFER';
    else if (metodo === 'tarjeta') dbMethod = 'CARD';

    const abonosActuales = pedido.abonos || [];
    const totalPagado = abonosActuales.reduce((sum, ab) => sum + parseFloat(ab.monto), 0) + parseFloat(monto);
    const costoTotal = parseFloat(pedido.costoTotal) || 0;
    const isLiquidacion = totalPagado >= costoTotal;
    const tipoMovimiento = isLiquidacion ? 'Liquidación' : 'Abono';

    const tx = await Transaction.create({
      source: 'PASTELERIA',
      paymentMethod: dbMethod, 
      amount: parseFloat(monto),
      // 🔥 Modificado: Ya no incluye el método en texto
      description: `${tipoMovimiento} Pedido: ${pedido.cliente} ${pedido.id}`,
      referenceId: pedido.id,
      createdBy: userId
    });

    const nuevoAbono = {
      id: tx.id, 
      fecha: new Date().toISOString(),
      monto: parseFloat(monto),
      metodo: metodo || 'efectivo'
    };

    pedido.abonos = [...abonosActuales, nuevoAbono];
    await pedido.save();

    res.json({ data: pedido });
  } catch (error) {
    console.error("Error al registrar abono:", error);
    res.status(500).json({ message: "Error al registrar el abono" });
  }
};

// Actualizar el estado de un pedido
export const updateEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const pedido = await PasteleriaOrder.findByPk(id);
    if (!pedido) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    pedido.estado = estado;
    await pedido.save();

    res.json({ data: pedido });
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    res.status(500).json({ message: "Error al actualizar el estado del pedido" });
  }
};

// Actualizar un pedido completo
export const updatePedido = async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await PasteleriaOrder.findByPk(id);
    
    if (!pedido) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    await pedido.update(req.body);
    res.json({ data: pedido });
  } catch (error) {
    console.error("Error al editar pedido:", error);
    res.status(500).json({ message: "Error al actualizar el pedido" });
  }
};

// ==========================================
// 🖨️ IMPRIMIR TICKET (MOCK NATIVO EN CONSOLA)
// ==========================================
export const printPedidoTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await PasteleriaOrder.findByPk(id);

    if (!pedido) {
      return res.status(404).json({ message: 'Pedido no encontrado para imprimir' });
    }

    const totalPagado = pedido.abonos?.reduce((sum, abono) => sum + parseFloat(abono.monto), 0) || 0;
    const costoTotal = parseFloat(pedido.costoTotal) || 0;
    const deuda = costoTotal - totalPagado;
    const fecha = new Date(pedido.fechaEntrega).toLocaleString('es-MX', { 
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' 
    });

    const tipoEntregaStr = pedido.tipoEntrega || 'sucursal';
    const porcionesSeguras = Array.isArray(pedido.porciones) ? pedido.porciones.join(' / ') : (pedido.porciones || '');
    const saboresSeguros = Array.isArray(pedido.saborPan) ? pedido.saborPan.join(' / ') : (pedido.saborPan || '');

    console.log(`\n==========================================`);
    console.log(`                  𝓛𝔂𝓪`);
    console.log(`         Pastelería & Cafetería`);
    console.log(`          Pijijiapan, Chiapas`);
    console.log(`------------------------------------------`);
    console.log(`          COMPROBANTE DE PEDIDO`);
    console.log(`                ${pedido.id}`);
    console.log(`------------------------------------------`);
    console.log(`Cliente:  ${pedido.cliente || 'Público General'}`);
    console.log(`Teléfono: ${pedido.telefono || 'N/A'}`);
    console.log(`Entrega:  ${fecha}`);
    console.log(`Tipo:     ${tipoEntregaStr.toUpperCase()}`);
    console.log(`------------------------------------------`);
    console.log(`DETALLES DEL PEDIDO:`);
    console.log(`Categoría:${pedido.categoria || 'Pastel'}`);
    if (porcionesSeguras) console.log(`Tamaño:   ${porcionesSeguras}`);
    if (saboresSeguros)   console.log(`Sabores:  ${saboresSeguros}`);
    console.log(`Desc:     ${pedido.descripcion || 'Ninguna'}`);
    console.log(`------------------------------------------`);
    console.log(`Costo Total:  $${costoTotal.toFixed(2)}`);
    console.log(`Abonado:      $${totalPagado.toFixed(2)}`);
    console.log(`------------------------------------------`);
    console.log(`RESTA:        $${deuda.toFixed(2)}`);
    console.log(`------------------------------------------`);
    if (deuda > 0) {
      console.log(`    El pedido debe estar liquidado al`);
      console.log(`          momento de su entrega.`);
    }
    console.log(`          *** TICKET SIMULADO ***`);
    console.log(`        ¡Gracias por su preferencia!`);
    console.log(`==========================================\n`);

    res.json({ message: 'Ticket de pastelería enviado a impresión simulada exitosamente' });
  } catch (error) {
    console.error('❌ Error al intentar simular la impresión del ticket:', error);
    res.status(500).json({ message: 'Error al intentar imprimir el ticket', error: error.message });
  }
};

// ==========================================
// 📱 GENERAR VISTA DEL TICKET DIGITAL (HTML/WHATSAPP)
// ==========================================
export const sharePedidoTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await PasteleriaOrder.findByPk(id);

    if (!pedido) {
      return res.status(404).send('<h1>Pedido no encontrado o expirado</h1>');
    }

    let bankAccounts = [];
    try {
      const config = await BusinessConfig.findOne();
      if (config && config.bank_accounts) {
        bankAccounts = config.bank_accounts;
      }
    } catch (e) { console.error("Error obteniendo bancos", e); }

    const totalPagado = pedido.abonos?.reduce((sum, abono) => sum + parseFloat(abono.monto), 0) || 0;
    const costoTotal = parseFloat(pedido.costoTotal) || 0;
    const deuda = costoTotal - totalPagado;

    const fechaStr = new Date(pedido.fechaEntrega).toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const porcionesHtml = Array.isArray(pedido.porciones) ? pedido.porciones.join(' / ') : (pedido.porciones || '');
    const saboresHtml = Array.isArray(pedido.saborPan) ? pedido.saborPan.join(' / ') : (pedido.saborPan || '');

    const htmlResponse = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Comprobante de Pedido - 𝓛𝔂𝓪</title>
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
          <h1 class="text-5xl font-black text-amber-600 mb-2" style="font-family: 'Times New Roman', serif; font-style: italic;">𝓛𝔂𝓪</h1>
          <p class="text-xs uppercase tracking-widest font-extrabold text-slate-400">Pastelería & Cafetería</p>
          <p class="text-xs text-slate-500 mt-1 font-medium">Pijijiapan, Chiapas</p>
        </div>

        <div class="border-t-2 border-dashed border-slate-200 my-4"></div>

        <div class="text-center mb-6">
          <p class="text-xs font-black uppercase text-slate-400 tracking-wider">Folio de Pedido</p>
          <p class="text-2xl font-black text-slate-900">${pedido.id}</p>
        </div>

        <div class="space-y-3 text-sm font-medium text-slate-600 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div class="flex justify-between">
            <span class="text-slate-400">Cliente:</span>
            <span class="text-slate-900 font-bold capitalize text-right">${pedido.cliente || 'N/A'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Entrega:</span>
            <span class="text-amber-600 font-black capitalize text-right">${fechaStr}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Tipo:</span>
            <span class="text-slate-900 font-bold uppercase text-right">${pedido.tipoEntrega || 'sucursal'}</span>
          </div>
        </div>

        <div class="border-t-2 border-dashed border-slate-200 my-4"></div>

        <div class="space-y-3 mb-6">
          <h3 class="text-xs uppercase font-black tracking-wider text-slate-400 mb-2">Detalles del Pedido</h3>
          <p class="text-sm"><span class="font-bold text-slate-400">Categoría:</span> <span class="font-bold text-slate-800">${pedido.categoria || 'Pastel'}</span></p>
          ${porcionesHtml ? `<p class="text-sm"><span class="font-bold text-slate-400">Tamaño:</span> <span class="font-bold text-slate-800">${porcionesHtml}</span></p>` : ''}
          ${saboresHtml ? `<p class="text-sm"><span class="font-bold text-slate-400">Sabores:</span> <span class="font-bold text-slate-800">${saboresHtml}</span></p>` : ''}
          <p class="text-sm text-slate-600 italic mt-2 bg-amber-50/50 p-3 rounded-xl border border-amber-100">"${pedido.descripcion || 'Sin detalles adicionales'}"</p>
        </div>

        <div class="border-t-2 border-dashed border-slate-200 my-4"></div>

        <div class="space-y-2 mb-4">
          <div class="flex justify-between text-sm">
            <span class="font-bold text-slate-400">Costo Total:</span>
            <span class="font-bold text-slate-800">$${costoTotal.toFixed(2)}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="font-bold text-emerald-500">Abonado:</span>
            <span class="font-bold text-emerald-600">$${totalPagado.toFixed(2)}</span>
          </div>
        </div>

        <div class="flex justify-between items-baseline mb-6 pt-3 border-t border-slate-100">
          <span class="text-base font-black text-slate-900 uppercase tracking-tight">Resta por pagar</span>
          <span class="text-3xl font-black ${deuda > 0 ? 'text-red-500' : 'text-emerald-500'} tracking-tighter">$${deuda.toFixed(2)}</span>
        </div>

        ${deuda > 0 && bankAccounts.length > 0 ? `
          <div class="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-6">
             <p class="text-xs font-black text-blue-800 uppercase text-center mb-3">Datos para Depósito / Transferencia</p>
             <div class="space-y-3">
               ${bankAccounts.map(acc => `
                 <div class="text-[11px] bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                    <p class="font-black uppercase text-blue-900 mb-1">${acc.bank_name}</p>
                    ${acc.account_holder ? `<div class="flex justify-between text-slate-600"><span class="font-medium">Titular:</span><span class="font-bold text-slate-800">${acc.account_holder}</span></div>` : ''}
                    ${acc.account_number ? `<div class="flex justify-between text-slate-600"><span class="font-medium">Cuenta:</span><span class="font-bold text-slate-800">${acc.account_number}</span></div>` : ''}
                    ${acc.clabe ? `<div class="flex justify-between text-slate-600"><span class="font-medium">CLABE:</span><span class="font-bold text-slate-800">${acc.clabe}</span></div>` : ''}
                 </div>
               `).join('')}
             </div>
             <p class="text-[10px] text-center mt-3 text-blue-700 font-bold italic">Importante: En el concepto de pago coloca tu folio: <span class="bg-blue-200 text-blue-900 px-1 rounded">${pedido.id}</span></p>
          </div>
        ` : ''}

        <div class="text-center mt-6 space-y-1">
          <p class="font-extrabold text-slate-800 text-sm">¡Gracias por celebrar con nosotros!</p>
          ${deuda > 0 ? '<p class="text-xs text-red-400 font-bold mt-1">El pedido debe estar liquidado al momento de su entrega.</p>' : '<p class="text-xs text-emerald-500 font-bold mt-1">¡Pedido totalmente liquidado!</p>'}
        </div>

      </div>

      <div class="fixed bottom-6 left-0 right-0 flex justify-center p-4 no-print z-50">
        <button onclick="window.print()" class="bg-slate-900 hover:bg-slate-800 text-white font-black px-8 py-4 rounded-2xl shadow-xl hover:shadow-slate-300/50 active:scale-95 transition-all duration-200 flex items-center gap-3 text-sm uppercase tracking-wider">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Guardar / Descargar PDF
        </button>
      </div>

    </body>
    </html>
    `;

    res.status(200).send(htmlResponse);
  } catch (error) {
    res.status(500).send('<h3>Error al renderizar el comprobante digital</h3>');
  }
};