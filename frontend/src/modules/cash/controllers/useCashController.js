import { useState, useEffect } from 'react';
import api from '../../../api/client';
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

  const fetchTransactions = async (date) => {
    setLoading(true);
    try {
      const response = await api.get(`/cash?date=${date}&type=INCOME`);
      setTransactions(response.data);
      toast.dismiss('fetch-cash-error'); // Quitamos el error si esta vez sí tuvo éxito
    } catch (error) {
      // 🔥 SOLUCIÓN: Le ponemos un "id" para que react-hot-toast no lo duplique jamás
      toast.error('Error al cargar los movimientos de caja', { id: 'fetch-cash-error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(selectedDate);
  }, [selectedDate]);

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
      fetchTransactions(selectedDate);
    } catch (error) {
      toast.error(error.response?.data?.message || `Error al ${actionType === 'CANCEL' ? 'anular' : 'restaurar'} transacción`);
    }
  };

  const resumen = transactions.reduce((acc, tx) => {
    const val = parseFloat(tx.amount);
    if (tx.status === 'CANCELLED') {
      acc.anulados += val;
    } else {
      if (tx.type === 'INCOME') {
        acc.total += val;
        if (tx.source === 'CAFETERIA') acc.cafeteria += val;
        if (tx.source === 'PASTELERIA') acc.pasteleria += val;
      }
    }
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