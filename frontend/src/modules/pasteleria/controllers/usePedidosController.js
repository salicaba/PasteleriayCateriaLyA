import { useState, useEffect } from 'react';
import { fetchPedidosPasteleria } from '../models/pedidosModel';

export const usePedidosController = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [abonoModal, setAbonoModal] = useState({ isOpen: false, pedidoId: null, cliente: '' });
  const [ticketModal, setTicketModal] = useState({ isOpen: false, pedido: null });

  useEffect(() => {
    loadPedidos();
  }, []);

  const loadPedidos = async () => {
    setLoading(true);
    const data = await fetchPedidosPasteleria();
    setPedidos(data);
    setLoading(false);
  };

  const calcularFinanzas = (pedido) => {
    if(!pedido) return { totalPagado: 0, deuda: 0, estaLiquidado: false, requiereLiquidacionUrgente: false };
    const totalPagado = pedido.abonos.reduce((sum, abono) => sum + abono.monto, 0);
    const deuda = pedido.costoTotal - totalPagado;
    const estaLiquidado = deuda <= 0;
    
    const fechaEntrega = new Date(pedido.fechaEntrega);
    const hoy = new Date();
    const esParaHoy = fechaEntrega.toDateString() === hoy.toDateString();

    const requiereLiquidacionUrgente = esParaHoy && !estaLiquidado;

    return { totalPagado, deuda, estaLiquidado, requiereLiquidacionUrgente };
  };

  const agregarNuevoPedido = (nuevoPedido) => {
    const anticipoNum = parseFloat(nuevoPedido.anticipo) || 0;
    const pedidoFormateado = {
      id: `PED-00${pedidos.length + 1}`,
      ...nuevoPedido,
      costoTotal: parseFloat(nuevoPedido.costoTotal),
      abonos: anticipoNum > 0 ? [{ id: Date.now().toString(), fecha: new Date().toISOString(), monto: anticipoNum }] : [],
      estado: 'pendiente'
    };
    setPedidos([pedidoFormateado, ...pedidos]);
    setIsModalOpen(false);
  };

  const registrarAbono = (pedidoId, montoAbono) => {
    const monto = parseFloat(montoAbono);
    if (!monto || monto <= 0) return;

    setPedidos(pedidos.map(p => {
      if (p.id === pedidoId) {
        return {
          ...p,
          abonos: [...p.abonos, { id: Date.now().toString(), fecha: new Date().toISOString(), monto: monto }]
        };
      }
      return p;
    }));
    setAbonoModal({ isOpen: false, pedidoId: null, cliente: '' });
  };

  const abrirModalAbono = (pedido) => setAbonoModal({ isOpen: true, pedidoId: pedido.id, cliente: pedido.cliente });
  
  const abrirTicket = (pedido) => setTicketModal({ isOpen: true, pedido });
  const cerrarTicket = () => setTicketModal({ isOpen: false, pedido: null });

  return {
    pedidos, loading, isModalOpen, setIsModalOpen, 
    abonoModal, setAbonoModal, abrirModalAbono, 
    ticketModal, abrirTicket, cerrarTicket,
    calcularFinanzas, agregarNuevoPedido, registrarAbono
  };
};