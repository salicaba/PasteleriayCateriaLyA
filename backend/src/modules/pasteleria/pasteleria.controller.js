import { Op } from 'sequelize';
import sequelize from '../../config/database.js'; // Necesario para transacciones seguras
import PasteleriaOrder from './PasteleriaOrder.model.js';
import BusinessConfig from '../settings/BusinessConfig.model.js';
import Transaction from '../cash/Transaction.model.js'; 

// ==========================================
// 🎂 OBTENCIÓN DE PEDIDOS
// ==========================================

export const getPedidos = async (req, res) => {
  try {
    const pedidos = await PasteleriaOrder.findAll({
      attributes: { exclude: ['imagenesReferencia'] },
      order: [['fechaEntrega', 'ASC']]
    });
    res.json({ data: pedidos });
  } catch (error) {
    console.error("Error al obtener pedidos:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const getPedidoById = async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await PasteleriaOrder.findByPk(id);
    
    if (!pedido) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }
    res.json({ data: pedido });
  } catch (error) {
    console.error("Error al obtener el pedido individual:", error);
    res.status(500).json({ message: "Error al obtener el pedido" });
  }
};

// ==========================================
// 📝 CREACIÓN Y MODIFICACIÓN
// ==========================================

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
// 💰 FINANZAS Y ABONOS
// ==========================================

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

// ==========================================
// 🔄 CONTROL DE ESTADOS (Manejo de Caja Sincronizado)
// ==========================================

// Controlador global de estado (Para mantener retrocompatibilidad)
export const updateEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const userId = req.user?.id || req.userId || req.usuario?.id || null;

    const pedido = await PasteleriaOrder.findByPk(id);
    if (!pedido) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    pedido.estado = estado;
    await pedido.save();

    if (estado === 'cancelado') {
      await Transaction.update(
        { status: 'CANCELLED', cancelledBy: userId, cancelledAt: new Date() },
        { where: { referenceId: pedido.id, source: 'PASTELERIA', status: 'ACTIVE' } }
      );
    } else if (estado === 'pendiente') {
      await Transaction.update(
        { status: 'ACTIVE', cancelledBy: null, cancelledAt: null },
        { where: { referenceId: pedido.id, source: 'PASTELERIA', status: 'CANCELLED' } }
      );
    }

    res.json({ data: pedido });
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    res.status(500).json({ message: "Error al actualizar el estado del pedido" });
  }
};

// Acciones Específicas de Estado
export const entregarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await PasteleriaOrder.findByPk(id);

    if (!pedido) return res.status(404).json({ message: 'Pedido no encontrado' });

    pedido.estado = 'entregado';
    await pedido.save();

    res.json({ message: 'Pedido entregado correctamente', data: pedido });
  } catch (error) {
    console.error('Error al entregar pedido:', error);
    res.status(500).json({ message: 'Error al entregar el pedido' });
  }
};

export const cancelarPedido = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.userId || req.usuario?.id || null;
    const pedido = await PasteleriaOrder.findByPk(id, { transaction: t });

    if (!pedido) {
      await t.rollback();
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    // Cambiar estado del pedido
    pedido.estado = 'cancelado';
    await pedido.save({ transaction: t });

    // Anular transacciones financieras en Caja sin alterar su createdAt
    await Transaction.update(
      { status: 'CANCELLED', cancelledBy: userId, cancelledAt: new Date() },
      { 
        where: { referenceId: pedido.id, source: 'PASTELERIA', status: 'ACTIVE' },
        transaction: t 
      }
    );

    await t.commit();
    res.json({ message: 'Pedido cancelado y dinero descontado de caja correctamente', data: pedido });
  } catch (error) {
    await t.rollback();
    console.error('Error al cancelar pedido de pastelería:', error);
    res.status(500).json({ message: 'Error interno al cancelar el pedido' });
  }
};

export const restaurarPedido = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const pedido = await PasteleriaOrder.findByPk(id, { transaction: t });

    if (!pedido) {
      await t.rollback();
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    // Regresar el pedido a pendiente
    pedido.estado = 'pendiente';
    await pedido.save({ transaction: t });

    // Revivir las transacciones para que el dinero vuelva a la Caja en sus fechas originales
    await Transaction.update(
      { status: 'ACTIVE', cancelledBy: null, cancelledAt: null },
      { 
        where: { referenceId: pedido.id, source: 'PASTELERIA', status: 'CANCELLED' },
        transaction: t 
      }
    );

    await t.commit();
    res.json({ message: 'Pedido restaurado. El dinero ha vuelto a la caja.', data: pedido });
  } catch (error) {
    await t.rollback();
    console.error('Error al restaurar pedido de pastelería:', error);
    res.status(500).json({ message: 'Error interno al restaurar el pedido' });
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
    console.log(`        Pastelería & Cafetería`);
    console.log(`         Pijijiapan, Chiapas`);
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
        <div id="ticket-card" class="w-full bg-white rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-100 p-6 sm:p-8 relative transition-all duration-300">
          
          <div class="text-center mb-6">
            <h1 class="text-5xl font-black text-amber-600 mb-4 pb-2 leading-normal tracking-wider" style="font-family: 'Times New Roman', serif; font-style: italic;">𝓛𝔂𝓪</h1>
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
              <span class="text-slate-900 font-bold capitalize text-right">${pedido.cliente || 'Público General'}</span>
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

          <div class="text-center space-y-2 mt-2 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <p class="text-[10px] font-black uppercase text-amber-600 tracking-widest">Ubicación de entrega / Sucursal</p>
            <p class="text-xs text-slate-600 font-medium leading-relaxed">
              Segunda Calle Ote. Nte., Nuevo Mexico,<br>30540 Pijijiapan, Chis.
            </p>
            <a href="http://googleusercontent.com/maps.google.com/6" target="_blank" class="inline-flex items-center justify-center gap-1.5 mt-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-sm active:scale-95 transition-all">
              📍 Cómo llegar en Maps
            </a>
          </div>

          <div class="text-center mt-6 space-y-1">
            <p class="font-extrabold text-slate-800 text-sm">¡Gracias por celebrar con nosotros!</p>
            ${deuda > 0 ? '<p class="text-xs text-red-400 font-bold mt-1">El pedido debe estar liquidado al momento de su entrega.</p>' : '<p class="text-xs text-emerald-500 font-bold mt-1">¡Pedido totalmente liquidado!</p>'}
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
            filename: 'Ticket-Pedido-${pedido.id}.pdf',
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { scale: 3, useCORS: true },
            jsPDF: { unit: 'mm', format: [85, heightMm], orientation: 'portrait' },
            pagebreak: { mode: 'avoid-all' }
          };
          html2pdf().set(options).from(element).save();
        }

        function descargarImagen() {
          const element = document.getElementById('ticket-card');
          html2canvas(element, { scale: 3, useCORS: true, backgroundColor: '#ffffff' }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'Ticket-Pedido-${pedido.id}.png';
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
    res.status(500).send('<h3>Error al renderizar el comprobante digital</h3>');
  }
};