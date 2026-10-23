// backend/src/modules/pos/pos.payments.controller.js
import { getIO } from '../../config/socket.js'; 
import Order from './Order.model.js';
import Table from './Table.model.js';
import Transaction from '../cash/Transaction.model.js';
import Product from '../menu/Product.model.js';

// 🔥 CEREBRO EXTRACTOR VISUAL
const parseAccountName = (str) => {
  if (!str) return 'General';
  const s = String(str);
  if (s.includes(' | ')) return s.split(' | ')[0].trim();
  if (s.includes(' - ')) {
    const parts = s.split(' - ');
    const possiblePhone = parts[parts.length - 1].replace(/\D/g, '');
    if (possiblePhone.length >= 10) return parts.slice(0, -1).join(' - ').trim();
  }
  return s;
};

// ==========================================
// 💰 REGISTRAR PAGO (Parcial o Total)
// ==========================================
export const payOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cuentaName, isFullPayment, paymentMethod, ticketDiscount } = req.body;
    
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

    const orderItems = order.items || [];
    const activeItems = orderItems.filter(i => i.status === 'ACTIVE' || !i.status);
    
    const itemsToPay = isFullPayment
      ? activeItems.filter(i => !paidAccounts.includes(i.cuenta))
      : activeItems.filter(i => i.cuenta === cuentaName);

    let amountCafeteria = 0;
    let amountPasteleria = 0;

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

    // 🔥 APLICAR DESCUENTO DE TICKET POR CUENTA EN CAJA Y GUARDAR METADATA PARA EL TICKET
    const discountAmt = ticketDiscount && Number(ticketDiscount.amount) > 0 ? Number(ticketDiscount.amount) : 0;
    if (discountAmt > 0 && itemsToPay.length > 0) {
      let remainingDiscount = discountAmt;
      if (amountCafeteria >= remainingDiscount) {
        amountCafeteria -= remainingDiscount;
        remainingDiscount = 0;
      } else {
        remainingDiscount -= amountCafeteria;
        amountCafeteria = 0;
        amountPasteleria = Math.max(0, amountPasteleria - remainingDiscount);
      }

      // Guardamos la metadata del descuento en el primer item de esta cuenta para que el ticket físico y digital lo impriman
      const anchorItem = itemsToPay[0];
      let anchorNotes = [];
      try { anchorNotes = JSON.parse(anchorItem.notes || '[]'); } catch(e) {}
      if (!Array.isArray(anchorNotes)) anchorNotes = [anchorNotes];

      anchorNotes = anchorNotes.filter(n => !(n && n._isTicketDiscountMeta));
      anchorNotes.push({
        _isTicketDiscountMeta: true,
        promoId: ticketDiscount.promoId || null,
        name: ticketDiscount.name || 'Descuento Promoción',
        amount: discountAmt
      });
      await anchorItem.update({ notes: JSON.stringify(anchorNotes) });
    }

    if (!isFullPayment && cuentaName && !paidAccounts.includes(cuentaName)) {
      paidAccounts.push(cuentaName);
    }

    const updatedTotalAmount = Math.max(0, Number(order.totalAmount) - discountAmt);

    await order.update({ 
      status: isFullPayment ? 'PAID' : order.status, 
      paidAccounts: paidAccounts,
      totalAmount: updatedTotalAmount
    });

    const isMixed = amountCafeteria > 0 && amountPasteleria > 0;
    let descBase = `Pago de Consumo (${identificador})`;
    
    if (!isFullPayment && cuentaName) {
      descBase += ` Cuenta: ${parseAccountName(cuentaName)}`;
    }
    if (discountAmt > 0) {
      descBase += ` [Promo -$${discountAmt.toFixed(2)}]`;
    }
    
    const mixTag = isMixed ? ' | 🔗 Ticket Mixto' : '';
    const userId = req.user?.id || req.userId || req.usuario?.id || null;
    const localNow = new Date();

    if (amountCafeteria > 0) {
      const folioCaf = `CAF-${baseFolio}`;
      await Transaction.create({
        folio: folioCaf, 
        source: 'CAFETERIA',
        amount: amountCafeteria,
        description: `${descBase} ${folioCaf}${mixTag}`,
        paymentMethod: dbMethod, 
        referenceId: order.id,
        createdBy: userId,
        createdAt: localNow
      });
    }

    if (amountPasteleria > 0) {
      const folioPas = `PAS-${baseFolio}`;
      await Transaction.create({
        folio: folioPas, 
        source: 'PASTELERIA',
        amount: amountPasteleria,
        description: `${descBase} ${folioPas}${mixTag}`,
        paymentMethod: dbMethod, 
        referenceId: order.id,
        createdBy: userId,
        createdAt: localNow
      });
    }

    getIO().emit('pos:update');
    getIO().emit('orderPaid', { 
      orderId: order.id, 
      tableId: order.tableId, 
      ticketId: order.ticketId, 
      isFullPayment, 
      cuentaName 
    });

    res.json({ message: 'Pago registrado con éxito en Caja', order });
  } catch (error) { 
    console.error('Error al procesar pago:', error);
    res.status(500).json({ message: 'Error al procesar pago', error: error.message }); 
  }
};