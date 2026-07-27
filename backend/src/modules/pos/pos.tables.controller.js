// backend/src/modules/pos/pos.tables.controller.js
import { getIO } from '../../config/socket.js'; 
import Table from './Table.model.js';
import Order from './Order.model.js'; 
// 🔥 Importamos la configuración para leer los QRs apagados
import BusinessConfig from '../settings/BusinessConfig.model.js'; 

// ==========================================
// 🪑 GESTIÓN DE MESAS (CRUD)
// ==========================================

export const getTables = async (req, res) => {
  try {
    const tables = await Table.findAll({ 
      where: { status: 'active' }, 
      order: [['id', 'ASC']] 
    });
    res.json(tables);
  } catch (error) { 
    res.status(500).json({ message: 'Error al obtener mesas', error: error.message }); 
  }
};

// 🔥 RUTA PÚBLICA ACTUALIZADA: Ahora envía las Mesas + La Configuración Granular
export const getPublicTables = async (req, res) => {
  try {
    const tables = await Table.findAll({
      where: { status: 'active' },
      attributes: ['id', 'number', 'zone', 'qrToken', 'status'], 
      order: [['id', 'ASC']]
    });
    
    // Obtenemos qué QRs están apagados y el estado global
    const config = await BusinessConfig.findOne();
    let disabled_qrs = [];
    try {
        if (config?.disabled_qrs) {
            disabled_qrs = typeof config.disabled_qrs === 'string' ? JSON.parse(config.disabled_qrs) : config.disabled_qrs;
        }
    } catch(e) {}

    res.status(200).json({
      tables: tables, // Enviamos el array
      disabled_qrs: Array.isArray(disabled_qrs) ? disabled_qrs : [],
      isQrActive: config ? config.qr_service_active : true
    });
  } catch (error) {
    console.error('Error al obtener mesas públicas:', error);
    res.status(500).json({ message: 'Error interno del servidor al cargar el mapa de mesas.', error: error.message });
  }
};

export const createTable = async (req, res) => {
  try {
    const { zone } = req.body;
    const count = await Table.count({ where: { status: 'active', zone: zone || 'salon' } });
    const nextNumber = (count + 1).toString();
    
    const newTable = await Table.create({ 
      number: nextNumber, 
      zone: zone || 'salon', 
      qrToken: `qr-${Date.now()}-${nextNumber}` 
    });
    
    getIO().emit('pos:update');
    res.status(201).json(newTable);
  } catch (error) { 
    res.status(500).json({ message: 'Error al crear mesa', error: error.message }); 
  }
};

export const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;
    const activeOrder = await Order.findOne({
      where: {
        tableId: id,
        status: ['OPEN', 'PAID'] 
      }
    });

    if (activeOrder) {
      return res.status(400).json({ 
        message: 'No se puede eliminar la mesa porque tiene productos o clientes activos.' 
      });
    }

    await Table.update({ status: 'inactive' }, { where: { id } });
    
    const remainingTables = await Table.findAll({ 
      where: { status: 'active', zone: 'salon' }, 
      order: [['id', 'ASC']] 
    });
    
    for (let i = 0; i < remainingTables.length; i++) {
      const newNumber = (i + 1).toString();
      if (remainingTables[i].number !== newNumber) {
        await remainingTables[i].update({ number: newNumber });
      }
    }
    
    getIO().emit('pos:update');
    res.json({ message: 'Mesa eliminada y re-indexada correctamente' });
  } catch (error) { 
    res.status(500).json({ message: 'Error al eliminar mesa', error: error.message }); 
  }
};