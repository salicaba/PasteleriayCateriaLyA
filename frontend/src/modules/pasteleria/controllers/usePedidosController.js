import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  fetchPedidosPasteleria, 
  actualizarEstadoPedidoReal,
  crearPedidoReal,
  registrarAbonoReal,
  editarPedidoReal // 🚀 Asegúrate de tener esta función en tu modelo
} from '../models/pedidosModel';

export const usePedidosController = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState('grid'); 
  const [activeTab, setActiveTab] = useState('activos'); 
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fechaPredefinida, setFechaPredefinida] = useState(null);
  
  // ESTADO PROFESIONAL PARA EL MODAL DE ABONOS
  const [abonoModal, setAbonoModal] = useState({ isOpen: false, pedido: null });
  const [abonoForm, setAbonoForm] = useState({ monto: '', metodo: 'efectivo', recibido: '' });

  const [ticketModal, setTicketModal] = useState({ isOpen: false, pedido: null });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, tipo: '', pedido: null });

  // 🚀 ESTADOS PARA EL NUEVO FLUJO DE DETALLE Y EDICIÓN
  const [detalleModal, setDetalleModal] = useState({ isOpen: false, pedido: null });
  const [pedidoAEditar, setPedidoAEditar] = useState(null);

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
    const totalPagado = pedido.abonos?.reduce((sum, abono) => sum + parseFloat(abono.monto), 0) || 0;
    const deuda = parseFloat(pedido.costoTotal) - totalPagado;
    const estaLiquidado = deuda <= 0;
    
    const fechaEntrega = new Date(pedido.fechaEntrega);
    const hoy = new Date();
    const esParaHoy = fechaEntrega.toDateString() === hoy.toDateString();

    const requiereLiquidacionUrgente = esParaHoy && !estaLiquidado;

    return { totalPagado, deuda, estaLiquidado, requiereLiquidacionUrgente };
  };

  const calcularConteos = () => {
    const ahora = new Date();
    let activos = 0, atrasados = 0, entregadosHoy = 0, canceladosHoy = 0;

    pedidos.forEach(p => {
      const fechaEntrega = new Date(p.fechaEntrega);
      const isEntregado = p.estado === 'entregado';
      const isCancelado = p.estado === 'cancelado';
      const isHoy = new Date(p.updatedAt).toDateString() === ahora.toDateString();

      if (!isEntregado && !isCancelado && fechaEntrega >= ahora) activos++;
      if (!isEntregado && !isCancelado && fechaEntrega < ahora) atrasados++;
      if (isEntregado && isHoy) entregadosHoy++;
      if (isCancelado && isHoy) canceladosHoy++;
    });

    return { activos, atrasados, entregadosHoy, canceladosHoy };
  };

  const obtenerPedidosFiltrados = () => {
    let filtrados = [...pedidos];

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return filtrados.filter(p => 
        p.estado !== 'entregado' && 
        p.estado !== 'cancelado' && (
          p.cliente.toLowerCase().includes(q) || 
          p.id.toLowerCase().includes(q) ||
          (p.descripcion && p.descripcion.toLowerCase().includes(q))
        )
      ).sort((a, b) => new Date(a.fechaEntrega) - new Date(b.fechaEntrega));
    }

    const ahora = new Date();
    
    filtrados = filtrados.filter(p => {
      const fechaEntrega = new Date(p.fechaEntrega);
      const isEntregado = p.estado === 'entregado';
      const isCancelado = p.estado === 'cancelado';

      if (activeTab === 'activos') return !isEntregado && !isCancelado && fechaEntrega >= ahora;
      if (activeTab === 'atrasados') return !isEntregado && !isCancelado && fechaEntrega < ahora;
      
      if (activeTab === 'entregadosHoy') {
        if (!isEntregado) return false;
        return new Date(p.updatedAt).toDateString() === ahora.toDateString();
      }

      if (activeTab === 'canceladosHoy') {
        if (!isCancelado) return false;
        return new Date(p.updatedAt).toDateString() === ahora.toDateString();
      }
      
      return true;
    });

    return filtrados.sort((a, b) => new Date(a.fechaEntrega) - new Date(b.fechaEntrega));
  };

  const pedirConfirmacion = (pedido, tipo) => setConfirmModal({ isOpen: true, tipo, pedido });
  const cerrarConfirmacion = () => setConfirmModal({ isOpen: false, tipo: '', pedido: null });

  const ejecutarAccionConfirmada = async () => {
    const { tipo, pedido } = confirmModal;
    if (!pedido) return;

    let nuevoEstado = '';
    if (tipo === 'entregar') nuevoEstado = 'entregado';
    if (tipo === 'cancelar') nuevoEstado = 'cancelado';
    if (tipo === 'restaurar') nuevoEstado = 'pendiente';

    try {
      const toastId = toast.loading(`Procesando...`);
      const pedidoActualizado = await actualizarEstadoPedidoReal(pedido.id, nuevoEstado);
      
      setPedidos(pedidos.map(p => p.id === pedido.id ? pedidoActualizado : p));
      cerrarConfirmacion();

      if (tipo === 'entregar') toast.success('Pedido entregado con éxito', { id: toastId });
      if (tipo === 'cancelar') toast.success('Pedido cancelado', { id: toastId });
      if (tipo === 'restaurar') toast.success('Pedido restaurado', { id: toastId });
    } catch (error) {
      toast.error('Hubo un error al conectar con el servidor');
      cerrarConfirmacion();
    }
  };

  // 🚀 LÓGICA DE DETALLE Y EDICIÓN
  const abrirDetalles = (pedido) => setDetalleModal({ isOpen: true, pedido });
  const cerrarDetalles = () => setDetalleModal({ isOpen: false, pedido: null });

  const iniciarEdicion = (pedido) => {
    setPedidoAEditar(pedido);
    setIsModalOpen(true);
  };

  const abrirModalNuevoPedido = (fecha = null) => {
    setPedidoAEditar(null); // Asegurarnos de que no haya pedido en edición
    setFechaPredefinida(fecha);
    setIsModalOpen(true);
  };

  const cerrarModalNuevoPedido = () => {
    setIsModalOpen(false);
    setFechaPredefinida(null);
    setPedidoAEditar(null);
  };

  // 🚀 FUNCIÓN UNIFICADA PARA GUARDAR (CREAR O EDITAR)
  const guardarPedido = async (datosPedido) => {
    try {
      const toastId = toast.loading(pedidoAEditar ? 'Actualizando pedido...' : 'Guardando pedido...');
      const anticipoNum = parseFloat(datosPedido.anticipo) || 0;
      
      // Si es un pedido nuevo, preparamos el formato de abonos inicial y el estado
      let pedidoAEnviar = { ...datosPedido };
      pedidoAEnviar.costoTotal = parseFloat(datosPedido.costoTotal);
      
      if (!pedidoAEditar) {
        pedidoAEnviar.abonos = anticipoNum > 0 ? [{ id: Date.now().toString(), fecha: new Date().toISOString(), monto: anticipoNum }] : [];
        pedidoAEnviar.estado = 'pendiente';
      }

      let pedidoResult;
      
      if (pedidoAEditar) {
        // Llamar a la API para EDITAR
        pedidoResult = await editarPedidoReal(pedidoAEditar.id, pedidoAEnviar);
        const dataActualizada = pedidoResult.data || pedidoResult;
        setPedidos(pedidos.map(p => p.id === pedidoAEditar.id ? dataActualizada : p));
        toast.success('Pedido actualizado correctamente', { id: toastId });
      } else {
        // Llamar a la API para CREAR
        pedidoResult = await crearPedidoReal(pedidoAEnviar);
        const dataGuardada = pedidoResult.data || pedidoResult;
        setPedidos([dataGuardada, ...pedidos]);
        toast.success('Pedido creado correctamente', { id: toastId });
      }

      cerrarModalNuevoPedido();
      // Si el modal de detalle estaba abierto, lo actualizamos con la nueva info o lo cerramos
      if (detalleModal.isOpen) {
         cerrarDetalles();
      }
    } catch (error) {
      console.error("Error guardando pedido:", error);
      toast.error('No se pudo guardar el pedido en la base de datos');
    }
  };


  const registrarAbono = async (pedidoId, montoAbono, metodoPago) => {
    const monto = parseFloat(montoAbono);
    if (!monto || monto <= 0) return;

    try {
      const toastId = toast.loading('Procesando pago...');
      await registrarAbonoReal(pedidoId, monto); 

      setPedidos(pedidos.map(p => {
        if (p.id === pedidoId) {
          return {
            ...p,
            abonos: [...(p.abonos || []), { id: Date.now().toString(), fecha: new Date().toISOString(), monto: monto, metodo: metodoPago }]
          };
        }
        return p;
      }));

      toast.success('Abono registrado correctamente', { id: toastId });
      setAbonoModal({ isOpen: false, pedido: null });
      
      // Si el modal de detalles está abierto viendo este pedido, lo cerramos para evitar desincronización
      if (detalleModal.isOpen && detalleModal.pedido?.id === pedidoId) {
        cerrarDetalles();
      }
    } catch (error) {
      console.error("Error al registrar abono:", error);
      toast.error('No se pudo guardar el pago');
    }
  };

  const abrirModalAbono = (pedido) => {
    setAbonoForm({ monto: '', metodo: 'efectivo', recibido: '' });
    setAbonoModal({ isOpen: true, pedido });
  };

  const abrirTicket = (pedido) => setTicketModal({ isOpen: true, pedido });
  const cerrarTicket = () => setTicketModal({ isOpen: false, pedido: null });

  return {
    pedidos, pedidosFiltrados: obtenerPedidosFiltrados(), conteos: calcularConteos(), loading, 
    viewMode, setViewMode, activeTab, setActiveTab, searchQuery, setSearchQuery,
    isModalOpen, abrirModalNuevoPedido, cerrarModalNuevoPedido, fechaPredefinida,
    abonoModal, setAbonoModal, abonoForm, setAbonoForm, abrirModalAbono, 
    ticketModal, abrirTicket, cerrarTicket,
    confirmModal, pedirConfirmacion, cerrarConfirmacion, ejecutarAccionConfirmada,
    detalleModal, abrirDetalles, cerrarDetalles,  // 🚀 Nuevas variables exportadas
    pedidoAEditar, iniciarEdicion,                // 🚀 Nuevas variables exportadas
    calcularFinanzas, 
    guardarPedido,  // 🚀 Reemplaza a agregarNuevoPedido
    registrarAbono
  };
};