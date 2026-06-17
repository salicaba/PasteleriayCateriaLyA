// backend/src/modules/pos/pos.payments.controller.js
import { getIO } from '../../config/socket.js'; 
import Order from './Order.model.js';
import Table from './Table.model.js';
import Transaction from '../cash/Transaction.model.js';

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