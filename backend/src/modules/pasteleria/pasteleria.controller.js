import PasteleriaOrder from './PasteleriaOrder.model.js';

// Obtener todos los pedidos
export const getPedidos = async (req, res) => {
  try {
    const pedidos = await PasteleriaOrder.findAll({
      order: [['fechaEntrega', 'ASC']] // Ordenados por fecha de entrega
    });
    res.json({ data: pedidos });
  } catch (error) {
    console.error("Error al obtener pedidos:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Crear un nuevo pedido
export const createPedido = async (req, res) => {
  try {
    const count = await PasteleriaOrder.count();
    const newId = `PED-${String(count + 1).padStart(3, '0')}`;

    const nuevoPedido = await PasteleriaOrder.create({
      id: newId,
      ...req.body
    });

    res.status(201).json({ data: nuevoPedido });
  } catch (error) {
    console.error("Error al crear pedido:", error);
    res.status(500).json({ message: "Error al crear el pedido" });
  }
};

// Registrar un abono a un pedido existente
export const addAbono = async (req, res) => {
  try {
    const { id } = req.params;
    const { monto } = req.body;

    const pedido = await PasteleriaOrder.findByPk(id);
    if (!pedido) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    const abonosActuales = pedido.abonos || [];
    const nuevoAbono = {
      id: Date.now().toString(),
      fecha: new Date().toISOString(),
      monto: parseFloat(monto)
    };

    pedido.abonos = [...abonosActuales, nuevoAbono];
    await pedido.save();

    res.json({ data: pedido });
  } catch (error) {
    console.error("Error al registrar abono:", error);
    res.status(500).json({ message: "Error al registrar el abono" });
  }
};

// Actualizar el estado de un pedido (Ej. Marcar como entregado)
export const updateEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const pedido = await PasteleriaOrder.findByPk(id);
    if (!pedido) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    pedido.estado = estado;
    // Al guardar, Sequelize actualiza automáticamente el campo 'updatedAt'
    await pedido.save();

    res.json({ data: pedido });
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    res.status(500).json({ message: "Error al actualizar el estado del pedido" });
  }
};