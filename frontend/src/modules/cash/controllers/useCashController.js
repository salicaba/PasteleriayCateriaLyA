// src/modules/cash/controllers/useCashController.js
import { useState, useEffect, useCallback } from 'react';
import api from '../../../api/client';
import { socket } from '../../../api/socket';
import toast from 'react-hot-toast';

export const useCashController = (user) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    actionType: null, 
    transactionId: null,
    title: '',
    message: ''
  });

  const fetchTransactions = useCallback(async (date, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get(`/cash?date=${date}&type=INCOME`);
      setTransactions(response.data || []);
      toast.dismiss('fetch-cash-error');
    } catch (error) {
      toast.error('Error al cargar los movimientos de caja', { id: 'fetch-cash-error' });
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions(selectedDate);
  }, [selectedDate, fetchTransactions]);

  // 🔥 Sincronización en tiempo real cuando se cobra o anula en otra terminal
  useEffect(() => {
    const onPosUpdate = () => fetchTransactions(selectedDate, true);
    socket.on('pos:update', onPosUpdate);
    socket.on('orderPaid', onPosUpdate);
    socket.on('orderCancelled', onPosUpdate);
    socket.on('orderItemCancelled', onPosUpdate);
    return () => {
      socket.off('pos:update', onPosUpdate);
      socket.off('orderPaid', onPosUpdate);
      socket.off('orderCancelled', onPosUpdate);
      socket.off('orderItemCancelled', onPosUpdate);
    };
  }, [selectedDate, fetchTransactions]);

  const requestCancelTransaction = (id) => {
    if (user?.role !== 'Administrador') {
      toast.error('Acceso denegado: Solo el Administrador puede anular.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      actionType: 'CANCEL',
      transactionId: id,
      title: 'Anular Ingreso',
      message: '¿Estás completamente seguro de anular este ingreso? Se descontará de la caja y revertirá el estatus en el sistema original.'
    });
  };

  const requestRestoreTransaction = (id) => {
    if (user?.role !== 'Administrador') {
      toast.error('Acceso denegado: Solo el Administrador puede restaurar.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      actionType: 'RESTORE',
      transactionId: id,
      title: 'Restaurar Ingreso',
      message: '¿Restaurar este ingreso? El dinero volverá a sumarse a la caja y se marcará como pagado nuevamente.'
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, actionType: null, transactionId: null, title: '', message: '' });
  };

  const executeConfirmAction = async () => {
    const { actionType, transactionId } = confirmModal;
    if (!transactionId) return;

    closeConfirmModal(); 

    try {
      if (actionType === 'CANCEL') {
        await api.post(`/cash/${transactionId}/cancel`);
        toast.success('Movimiento anulado exitosamente');
      } else if (actionType === 'RESTORE') {
        await api.post(`/cash/${transactionId}/restore`);
        toast.success('Movimiento restaurado exitosamente');
      }
      fetchTransactions(selectedDate, true);
    } catch (error) {
      toast.error(error.response?.data?.message || `Error al ${actionType === 'CANCEL' ? 'anular' : 'restaurar'} transacción`);
    }
  };

  const resumen = transactions.reduce((acc, tx) => {
    const val = parseFloat(tx.amount) || 0;

    // 1. EXTRAER ANULACIONES PARCIALES OCULTAS EN LA DESCRIPCIÓN
    let anuladoParcial = 0;
    const partes = (tx.description || '').split(' | ');
    
    for (let i = 1; i < partes.length; i++) {
      const mod = partes[i];
      if (mod.includes('-$')) {
        const match = mod.match(/\$\s*(\d+(\.\d+)?)/);
        if (match) {
          anuladoParcial += parseFloat(match[1]);
        }
      }
    }

    // 2. SUMAR AL RESUMEN
    let dineroAnulado = anuladoParcial;

    if (tx.status === 'CANCELLED') {
      dineroAnulado += Math.abs(val);
    } else {
      if (val < 0) {
        dineroAnulado += Math.abs(val);
      }

      // 3. Afectamos la caja general (Los ingresos netos)
      if (tx.type === 'INCOME') {
        acc.total += val;
        if (tx.source === 'CAFETERIA') acc.cafeteria += val;
        if (tx.source === 'PASTELERIA') acc.pasteleria += val;
      }
    }
    
    acc.anulados += dineroAnulado;
    return acc;
  }, { total: 0, cafeteria: 0, pasteleria: 0, anulados: 0 });

  return {
    transactions,
    loading,
    selectedDate,
    setSelectedDate,
    resumen,
    handleCancelTransaction: requestCancelTransaction, 
    handleRestoreTransaction: requestRestoreTransaction, 
    confirmModal,
    closeConfirmModal,
    executeConfirmAction
  };
};