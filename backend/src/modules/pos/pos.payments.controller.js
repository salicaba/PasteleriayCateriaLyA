// backend/src/modules/pos/pos.payments.controller.js
import { getIO } from '../../config/socket.js'; 
import Order from './Order.model.js';
import Table from './Table.model.js';
import Transaction from '../cash/Transaction.model.js';
import Product from '../menu/Product.model.js';

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
    
    const randomNum = Math.floor(100 + Math.random() * 900);
    const timestamp = Date.now().toString().slice(-6);
    const baseFolio = `${timestamp}${randomNum}`; 

    let identificador = '';
    if (order.orderType === 'LLEVAR') {
      if (order.ticketId && (order.ticketId.startsWith('MOSTRADOR') || order.ticketId.startsWith('VITRINA') || order.ticketId.startsWith('MOS-'))) {
        identificador = 'Mostrador'; 
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
    
    const itemsToPay = isFullPayment
      ? activeItems.filter(i => !paidAccounts.includes(i.cuenta))
      : activeItems.filter(i => i.cuenta === cuentaName);

    let amountCafeteria = 0;
    let amountPasteleria = 0;

    // 🔥 LÓGICA DE SPLIT: Separar ingresos por departamento
    if (itemsToPay.length > 0) {
      const productIds = itemsToPay.map(i => i.productId);
      const products = await Product.findAll({ where: { id: productIds } });
      const productMap = {};
      products.forEach(p => productMap[p.id] = p.departamento);

      itemsToPay.forEach(item => {
        const dept = productMap[item.productId] || 'cafeteria';
        if (dept === 'pasteleria') {
          amountPasteleria += Number(item.subtotal);
        } else {
          amountCafeteria += Number(item.subtotal);
        }
      });
    }

    // Actualizar cuentas pagadas
    if (!isFullPayment && cuentaName && !paidAccounts.includes(cuentaName)) {
      paidAccounts.push(cuentaName);
    }

    await order.update({ 
      status: isFullPayment ? 'PAID' : order.status, 
      paidAccounts: paidAccounts 
    });

    const isMixed = amountCafeteria > 0 && amountPasteleria > 0;
    let descBase = `Pago de Consumo (${identificador})`;
    if (!isFullPayment && cuentaName) {
      descBase += ` Cuenta: ${cuentaName}`;
    }
    
    const mixTag = isMixed ? ' | 🔗 Ticket Mixto' : '';
    const userId = req.user?.id || req.userId || req.usuario?.id || null;

    // Crear transacciones separadas si hay montos
    if (amountCafeteria > 0) {
      await Transaction.create({
        folio: `CAF-${baseFolio}`, 
        source: 'CAFETERIA',
        amount: amountCafeteria,
        description: `${descBase}${mixTag}`,
        paymentMethod: dbMethod, 
        referenceId: order.id,
        createdBy: userId 
      });
    }

    if (amountPasteleria > 0) {
      await Transaction.create({
        folio: `PAS-${baseFolio}`, 
        source: 'PASTELERIA',
        amount: amountPasteleria,
        description: `${descBase}${mixTag}`,
        paymentMethod: dbMethod, 
        referenceId: order.id,
        createdBy: userId 
      });
    }

    getIO().emit('pos:update');
    res.json({ message: 'Pago registrado con éxito en Caja', order });
  } catch (error) { 
    console.error('Error al procesar pago:', error);
    res.status(500).json({ message: 'Error al procesar pago', error: error.message }); 
  }
};