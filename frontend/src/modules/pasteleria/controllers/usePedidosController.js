import { useState, useEffect } from 'react';
import { fetchPedidosPasteleria, actualizarEstadoPedidoReal } from '../models/pedidosModel';

export const usePedidosController = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Vistas, Filtros y Modales
  const [viewMode, setViewMode] = useState('grid'); 
  const [activeTab, setActiveTab] = useState('activos'); // 'activos', 'atrasados', 'entregadosHoy'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fechaPredefinida, setFechaPredefinida] = useState(null);
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

  // LOGICA DE FILTRADO Y BÚSQUEDA CORREGIDA
  const obtenerPedidosFiltrados = () => {
    let filtrados = [...pedidos];

    // 1. Si hay texto en el buscador, filtramos sobre los NO entregados
    // Esto asegura que encuentres activos y atrasados, pero nunca los ya finalizados.
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return filtrados.filter(p => 
        p.estado !== 'entregado' && (
          p.cliente.toLowerCase().includes(q) || 
          p.id.toLowerCase().includes(q) ||
          (p.descripcion && p.descripcion.toLowerCase().includes(q))
        )
      ).sort((a, b) => new Date(a.fechaEntrega) - new Date(b.fechaEntrega));
    }

    // 2. Si no hay búsqueda, filtramos por pestaña activa
    const ahora = new Date();
    
    filtrados = filtrados.filter(p => {
      const fechaEntrega = new Date(p.fechaEntrega);
      const isEntregado = p.estado === 'entregado';

      if (activeTab === 'activos') {
        return !isEntregado && fechaEntrega >= ahora;
      }
      
      if (activeTab === 'atrasados') {
        return !isEntregado && fechaEntrega < ahora;
      }
      
      if (activeTab === 'entregadosHoy') {
        if (!isEntregado) return false;
        const updatedAt = new Date(p.updatedAt);
        return updatedAt.toDateString() === ahora.toDateString();
      }
      
      return true;
    });

    return filtrados.sort((a, b) => new Date(a.fechaEntrega) - new Date(b.fechaEntrega));
  };

  // ACCIONES
  const marcarComoEntregado = async (pedidoId) => {
    try {
      const pedidoActualizado = await actualizarEstadoPedidoReal(pedidoId, 'entregado');
      setPedidos(pedidos.map(p => p.id === pedidoId ? pedidoActualizado : p));
    } catch (error) {
      console.error("Error al entregar:", error);
    }
  };

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
    cerrarModalNuevoPedido();
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
    pedidos, // <-- AÑADIR ESTA LÍNEA AQUÍ
    pedidosFiltrados: obtenerPedidosFiltrados(),
    loading, 
    viewMode, setViewMode,
    activeTab, setActiveTab,
    searchQuery, setSearchQuery,
    isModalOpen, abrirModalNuevoPedido, cerrarModalNuevoPedido, fechaPredefinida,
    abonoModal, setAbonoModal, abrirModalAbono, 
    ticketModal, abrirTicket, cerrarTicket,
    calcularFinanzas, agregarNuevoPedido, registrarAbono, marcarComoEntregado
  };
};