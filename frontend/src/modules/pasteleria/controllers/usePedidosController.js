// src/modules/pasteleria/controllers/usePedidosController.js
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  fetchPedidosPasteleria, 
  actualizarEstadoPedidoReal,
  crearPedidoReal,
  registrarAbonoReal,
  editarPedidoReal,
  fetchPedidoByIdReal
} from '../models/pedidosModel';

export const usePedidosController = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  
  const [viewMode, setViewMode] = useState('grid'); 
  const [activeTab, setActiveTab] = useState('activos'); 
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fechaPredefinida, setFechaPredefinida] = useState(null);
  
  const [abonoModal, setAbonoModal] = useState({ isOpen: false, pedido: null });
  const [abonoForm, setAbonoForm] = useState({ monto: '', metodo: 'efectivo', recibido: '' });

  const [ticketModal, setTicketModal] = useState({ isOpen: false, pedido: null });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, tipo: '', pedido: null });

  const [detalleModal, setDetalleModal] = useState({ isOpen: false, pedido: null });
  const [pedidoAEditar, setPedidoAEditar] = useState(null);

  // 🔥 NUEVO ESTADO PARA LA PANTALLA DE ÉXITO TIPO CAFETERÍA
  const [successScreen, setSuccessScreen] = useState({ isOpen: false, title: '', subtitle: '' });

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

    setIsSubmitting(true);
    try {
      // 🔥 Eliminado el toast.loading
      const pedidoActualizado = await actualizarEstadoPedidoReal(pedido.id, nuevoEstado);
      
      setPedidos(pedidos.map(p => p.id === pedido.id ? pedidoActualizado : p));
      cerrarConfirmacion();

      if (tipo === 'entregar') toast.success('Pedido entregado con éxito');
      if (tipo === 'cancelar') toast.success('Pedido cancelado');
      if (tipo === 'restaurar') toast.success('Pedido restaurado');
    } catch (error) {
      toast.error('Hubo un error al conectar con el servidor');
      cerrarConfirmacion();
    } finally {
      setIsSubmitting(false);
    }
  };

  const abrirDetalles = async (pedidoLigero) => {
    setDetalleModal({ isOpen: true, pedido: pedidoLigero }); 
    const pedidoCompleto = await fetchPedidoByIdReal(pedidoLigero.id);
    if (pedidoCompleto) {
      setDetalleModal(prev => ({ isOpen: prev.isOpen, pedido: pedidoCompleto }));
    }
  };

  const cerrarDetalles = () => setDetalleModal({ isOpen: false, pedido: null });

  const iniciarEdicion = async (pedidoLigero) => {
    const pedidoCompleto = await fetchPedidoByIdReal(pedidoLigero.id);
    setPedidoAEditar(pedidoCompleto || pedidoLigero);
    setIsModalOpen(true);
  };

  const abrirModalNuevoPedido = (fecha = null) => {
    setPedidoAEditar(null); 
    setFechaPredefinida(fecha);
    setIsModalOpen(true);
  };

  const cerrarModalNuevoPedido = () => {
    setIsModalOpen(false);
    setFechaPredefinida(null);
    setPedidoAEditar(null);
  };

  const guardarPedido = async (datosPedido) => {
    setIsSubmitting(true);
    try {
      // 🔥 Eliminado el toast.loading
      const anticipoNum = parseFloat(datosPedido.anticipo) || 0;
      
      let pedidoAEnviar = { ...datosPedido };
      pedidoAEnviar.costoTotal = parseFloat(datosPedido.costoTotal);
      
      if (!pedidoAEditar) {
        pedidoAEnviar.abonos = anticipoNum > 0 ? [{ id: Date.now().toString(), fecha: new Date().toISOString(), monto: anticipoNum }] : [];
        pedidoAEnviar.estado = 'pendiente';
      }

      let pedidoResult;
      
      if (pedidoAEditar) {
        pedidoResult = await editarPedidoReal(pedidoAEditar.id, pedidoAEnviar);
        const dataActualizada = pedidoResult.data || pedidoResult;
        
        const { imagenesReferencia, ...dataActualizadaLigera } = dataActualizada;
        
        setPedidos(pedidos.map(p => p.id === pedidoAEditar.id ? dataActualizadaLigera : p));
        
        const finanzasEditado = calcularFinanzas(dataActualizada);
        if (finanzasEditado.estaLiquidado) {
          setSuccessScreen({ isOpen: true, title: '¡Pedido Liquidado!', subtitle: 'El pedido ha sido actualizado y el saldo está en $0.00' });
          setTimeout(() => setSuccessScreen({ isOpen: false, title: '', subtitle: '' }), 2500);
        } else {
          toast.success('Pedido actualizado correctamente');
        }

      } else {
        pedidoResult = await crearPedidoReal(pedidoAEnviar);
        const dataGuardada = pedidoResult.data || pedidoResult;
        
        const { imagenesReferencia, ...dataGuardadaLigera } = dataGuardada;
        
        setPedidos([dataGuardadaLigera, ...pedidos]);
        
        const finanzasCreado = calcularFinanzas(dataGuardada);
        if (finanzasCreado.estaLiquidado) {
           setSuccessScreen({ isOpen: true, title: '¡Pedido Pagado!', subtitle: 'El pedido fue creado y liquidado al 100%' });
           setTimeout(() => setSuccessScreen({ isOpen: false, title: '', subtitle: '' }), 2500);
        } else {
           toast.success('Pedido creado correctamente');
        }
      }

      cerrarModalNuevoPedido();
      if (detalleModal.isOpen) {
         cerrarDetalles();
      }
    } catch (error) {
      console.error("Error guardando pedido:", error);
      toast.error('No se pudo guardar el pedido en la base de datos');
    } finally {
      setIsSubmitting(false);
    }
  };

  const registrarAbono = async (pedidoId, montoAbono, metodoPago) => {
    const monto = parseFloat(montoAbono);
    if (!monto || monto <= 0) return;

    setIsSubmitting(true);
    try {
      // 🔥 Eliminado el toast.loading
      await registrarAbonoReal(pedidoId, monto); 

      const pedidoActual = pedidos.find(p => p.id === pedidoId);
      
      const pedidoActualizado = {
         ...pedidoActual,
         abonos: [...(pedidoActual.abonos || []), { id: Date.now().toString(), fecha: new Date().toISOString(), monto: monto, metodo: metodoPago }]
      };

      setPedidos(pedidos.map(p => p.id === pedidoId ? pedidoActualizado : p));
      setAbonoModal({ isOpen: false, pedido: null });
      
      if (detalleModal.isOpen && detalleModal.pedido?.id === pedidoId) {
        cerrarDetalles();
      }

      const finanzasActualizadas = calcularFinanzas(pedidoActualizado);
      
      // 🔥 ACTIVAMOS LA PANTALLA DE ÉXITO ESTILO CAFETERÍA
      if (finanzasActualizadas.estaLiquidado) {
         setSuccessScreen({ 
            isOpen: true, 
            title: '¡Pedido Liquidado!', 
            subtitle: 'El abono cubre el total de la deuda. El cliente ya no debe nada.' 
         });
      } else {
         setSuccessScreen({ 
            isOpen: true, 
            title: '¡Abono Registrado!', 
            subtitle: `Se agregó el pago de $${monto.toFixed(2)} correctamente.` 
         });
      }
      setTimeout(() => setSuccessScreen({ isOpen: false, title: '', subtitle: '' }), 2500);

    } catch (error) {
      console.error("Error al registrar abono:", error);
      toast.error('No se pudo guardar el pago');
    } finally {
      setIsSubmitting(false);
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
    detalleModal, abrirDetalles, cerrarDetalles,  
    pedidoAEditar, iniciarEdicion,                
    calcularFinanzas, 
    guardarPedido,  
    registrarAbono,
    successScreen, // 🔥 EXPORTAMOS LA NUEVA VARIABLE
    isSubmitting 
  };
};