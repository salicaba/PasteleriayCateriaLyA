import InventoryItem from './InventoryItem.model.js';
import InventoryTransaction from './InventoryTransaction.model.js';
import sequelize from '../../config/database.js';
import User from '../users/User.model.js';

// 1. Obtener todo el inventario activo
export const getInventory = async (req, res) => {
  try {
    const items = await InventoryItem.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']]
    });
    res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ message: 'Error interno al obtener inventario.' });
  }
};

// 2. Crear un nuevo insumo (El Catálogo)
export const createItem = async (req, res) => {
  try {
    const { name, sku, unit, minimumStock } = req.body;
    
    const newItem = await InventoryItem.create({
      name,
      sku: sku || null,
      unit,
      minimumStock: minimumStock || 0,
      currentStock: 0,
      averageCost: 0 
    });

    res.status(201).json({ message: 'Insumo creado con éxito', item: newItem });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Ya existe un insumo con ese SKU.' });
    }
    res.status(500).json({ message: 'Error al crear insumo.' });
  }
};

// 3. EL MOTOR CONTABLE: Registrar Entradas o Mermas
export const registerTransaction = async (req, res) => {
  // Usamos una transacción de BD: Si algo falla, no se guarda NADA a medias.
  const t = await sequelize.transaction();
  
  try {
    const { inventoryItemId, type, quantity, unitCost, reference, notes, userId } = req.body;

    const item = await InventoryItem.findByPk(inventoryItemId, { transaction: t });
    if (!item) throw new Error('Insumo no encontrado');

    let newStock = parseFloat(item.currentStock);
    let currentAvgCost = parseFloat(item.averageCost);
    let newAvgCost = currentAvgCost;
    let transactionTotalCost = 0;
    let actualUnitCost = parseFloat(unitCost) || currentAvgCost;

    const parsedQty = parseFloat(quantity);
    if (parsedQty <= 0) throw new Error('La cantidad debe ser mayor a cero');

    // LÓGICA DE ENTRADA (COMPRA DE INSUMOS)
    if (type === 'IN') {
      transactionTotalCost = parsedQty * actualUnitCost;
      const currentTotalValue = newStock * currentAvgCost;
      
      newStock += parsedQty; // Sumamos al stock
      
      // Fórmula del Costo Promedio Ponderado
      if (newStock > 0) {
        newAvgCost = (currentTotalValue + transactionTotalCost) / newStock;
      }
    } 
    // LÓGICA DE MERMA (CADUCIDAD / ROTURA)
    else if (type === 'WASTE') {
      if (newStock < parsedQty) throw new Error('Stock insuficiente para registrar esta merma');
      
      // Las mermas siempre salen al costo promedio actual del sistema
      transactionTotalCost = parsedQty * currentAvgCost; 
      actualUnitCost = currentAvgCost;
      newStock -= parsedQty; // Restamos del stock
    } 
    else {
      throw new Error('Tipo de transacción no soportada');
    }

    // 1. Guardar la evidencia histórica (Kardex)
    await InventoryTransaction.create({
      inventoryItemId,
      userId: userId || null, 
      type,
      quantity: parsedQty,
      unitCost: actualUnitCost,
      totalCost: transactionTotalCost,
      reference: reference || null,
      notes: notes || null
    }, { transaction: t });

    // 2. Actualizar el stock y costo del catálogo
    await item.update({
      currentStock: newStock,
      averageCost: newAvgCost
    }, { transaction: t });

    await t.commit(); // Todo salió bien, guardamos definitivamente

    res.status(201).json({ 
      message: 'Transacción registrada con éxito', 
      currentStock: newStock, 
      averageCost: newAvgCost 
    });

  } catch (error) {
    await t.rollback(); // Si hubo error, revertimos la BD para evitar inconsistencias
    console.error('Error en transacción de inventario:', error);
    res.status(400).json({ message: error.message || 'Error al procesar la transacción.' });
  }
};

// 4. Obtener el historial de un insumo (Para mostrar en el Modal del Frontend)
export const getItemHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await InventoryTransaction.findAll({
      where: { inventoryItemId: id },
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'fullName'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50 // Solo traemos los últimos 50 movimientos para no saturar la vista
    });
    res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ message: 'Error al obtener el historial.' });
  }
};

// Añadir al final del archivo inventory.controller.js
export const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await InventoryItem.findByPk(id);
    
    if (!item) return res.status(404).json({ message: 'Insumo no encontrado' });

    // Hacemos un "Soft Delete" apagando el estado activo para no romper el Kardex
    await item.update({ isActive: false });
    
    res.status(200).json({ message: 'Insumo eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'Error al eliminar el insumo.' });
  }
};