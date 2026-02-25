import { useState, useEffect } from 'react';
import { fetchPedidosPasteleria } from '../models/pedidosModel';

export const usePedidosController = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Vistas y Modales
  const [viewMode, setViewMode] = useState('grid'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fechaPredefinida, setFechaPredefinida] = useState(null); // NUEVO ESTADO
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

  // NUEVAS FUNCIONES PARA EL MODAL DE NUEVO PEDIDO
  const abrirModalNuevoPedido = (fecha = null) => {
    setFechaPredefinida(fecha);
    setIsModalOpen(true);
  };

  const cerrarModalNuevoPedido = () => {
    setIsModalOpen(false);
    setFechaPredefinida(null);
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
    cerrarModalNuevoPedido(); // Usamos la nueva función para limpiar
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
    pedidos, loading, 
    viewMode, setViewMode, 
    isModalOpen, abrirModalNuevoPedido, cerrarModalNuevoPedido, fechaPredefinida, // Exportamos lo nuevo
    abonoModal, setAbonoModal, abrirModalAbono, 
    ticketModal, abrirTicket, cerrarTicket,
    calcularFinanzas, agregarNuevoPedido, registrarAbono
  };
};