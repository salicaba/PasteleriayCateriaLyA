import { useState, useEffect } from 'react';
import api from '../../../api/client';
import toast from 'react-hot-toast';

export const useCashController = (user) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    // Forzamos a que agarre tu fecha local (Ej: YYYY-MM-DD)
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // --- NUEVO ESTADO PARA CONTROLAR EL MODAL ELEGANTE ---
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    actionType: null, // Puede ser 'CANCEL' o 'RESTORE'
    transactionId: null,
    title: '',
    message: ''
  });

  const fetchTransactions = async (date) => {
    setLoading(true);
    try {
      // 🔥 CORRECCIÓN: Agregamos &type=INCOME para que ignore los Gastos Operativos (EXPENSE)
      const response = await api.get(`/cash?date=${date}&type=INCOME`);
      setTransactions(response.data);
    } catch (error) {
      toast.error('Error al cargar los movimientos de caja');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(selectedDate);
  }, [selectedDate]);

  // --- PREPARAMOS LA ANULACIÓN (Abre el modal) ---
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

  // --- PREPARAMOS LA RESTAURACIÓN (Abre el modal) ---
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

  // --- CERRAR EL MODAL SIN HACER NADA ---
  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, actionType: null, transactionId: null, title: '', message: '' });
  };

  // --- EJECUTAR LA ACCIÓN UNA VEZ QUE EL CLIENTE DICE "SÍ" EN EL MODAL ---
  const executeConfirmAction = async () => {
    const { actionType, transactionId } = confirmModal;
    if (!transactionId) return;

    closeConfirmModal(); // Escondemos el modal de inmediato para dar sensación de rapidez

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
      // 🔥 DOBLE SEGURIDAD: Solo suma si de verdad el movimiento es un INGRESO
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