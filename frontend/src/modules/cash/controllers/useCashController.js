import { useState, useEffect } from 'react';
import api from '../../../api/client';
import toast from 'react-hot-toast';

export const useCashController = (user) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const fetchTransactions = async (date) => {
    setLoading(true);
    try {
      const response = await api.get(`/cash?date=${date}`);
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

  const handleCancelTransaction = async (id) => {
    if (user?.role !== 'Administrador') {
      toast.error('Acceso denegado: Solo el Administrador puede anular.');
      return;
    }
    
    if(!window.confirm("¿Estás completamente seguro de anular este ingreso? Se descontará de la caja y revertirá el estatus en el sistema original.")) return;

    try {
      await api.post(`/cash/${id}/cancel`);
      toast.success('Movimiento anulado exitosamente');
      fetchTransactions(selectedDate);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al anular transacción');
    }
  };

  // --- NUEVA FUNCIÓN: RESTAURAR ---
  const handleRestoreTransaction = async (id) => {
    if (user?.role !== 'Administrador') {
      toast.error('Acceso denegado: Solo el Administrador puede restaurar.');
      return;
    }
    
    if(!window.confirm("¿Restaurar este ingreso? El dinero volverá a sumarse a la caja y se marcará como pagado nuevamente.")) return;

    try {
      await api.post(`/cash/${id}/restore`);
      toast.success('Movimiento restaurado exitosamente');
      fetchTransactions(selectedDate);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al restaurar transacción');
    }
  };

  const resumen = transactions.reduce((acc, tx) => {
    const val = parseFloat(tx.amount);
    if (tx.status === 'CANCELLED') {
      acc.anulados += val;
    } else {
      acc.total += val;
      if (tx.source === 'CAFETERIA') acc.cafeteria += val;
      if (tx.source === 'PASTELERIA') acc.pasteleria += val;
    }
    return acc;
  }, { total: 0, cafeteria: 0, pasteleria: 0, anulados: 0 });

  return {
    transactions,
    loading,
    selectedDate,
    setSelectedDate,
    resumen,
    handleCancelTransaction,
    handleRestoreTransaction // <-- Exportamos la nueva función
  };
};