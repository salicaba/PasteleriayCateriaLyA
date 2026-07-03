// frontend/src/modules/finance/controllers/useFinanceController.js
import { useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const useFinanceController = () => {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null); 
  const [isLoading, setIsLoading] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false); 

  const fetchExpenses = useCallback(async (startDate, endDate) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('lya_token');
      // source=MANUAL para ignorar reembolsos automáticos
      let url = `${API_URL}/cash?type=EXPENSE&source=MANUAL`;
      
      if (startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error al cargar gastos');
      const data = await response.json();
      setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const registerExpense = async (expenseData) => {
    try {
      const token = localStorage.getItem('lya_token');
      const response = await fetch(`${API_URL}/cash/manual`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(expenseData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // 🔥 NUEVO: Función para Anular Gasto (con motivo opcional)
  const cancelExpense = async (id, reason) => {
    try {
      const token = localStorage.getItem('lya_token');
      const response = await fetch(`${API_URL}/cash/${id}/cancel`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // 🔥 NUEVO: Función para Restaurar Gasto
  const restoreExpense = async (id) => {
    try {
      const token = localStorage.getItem('lya_token');
      const response = await fetch(`${API_URL}/cash/${id}/restore`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const fetchFinancialSummary = useCallback(async (startDate, endDate) => {
    setIsSummaryLoading(true);
    try {
      const token = localStorage.getItem('lya_token');
      let url = `${API_URL}/cash/summary`;
      
      if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Error al cargar el resumen financiero');
      const data = await response.json();
      setSummary(data.metrics);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSummaryLoading(false);
    }
  }, []);

  return { 
    expenses, 
    summary, 
    isLoading, 
    isSummaryLoading, 
    fetchExpenses, 
    registerExpense,
    cancelExpense,
    restoreExpense,
    fetchFinancialSummary 
  };
};