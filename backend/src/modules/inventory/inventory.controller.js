import { Op } from 'sequelize';
import InventoryItem from './InventoryItem.model.js';
import InventoryTransaction from './InventoryTransaction.model.js';
import InventoryReconciliation from './InventoryReconciliation.model.js';
import InventoryReconciliationDetail from './InventoryReconciliationDetail.model.js';
import sequelize from '../../config/database.js';
import User from '../users/User.model.js';
import { getIO } from '../../config/socket.js';

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

// 3. EL MOTOR CONTABLE: Registrar Entradas o Mermas Individuales
export const registerTransaction = async (req, res) => {
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

    if (type === 'IN') {
      transactionTotalCost = parsedQty * actualUnitCost;
      const currentTotalValue = newStock * currentAvgCost;
      newStock += parsedQty;
      
      if (newStock > 0) {
        newAvgCost = (currentTotalValue + transactionTotalCost) / newStock;
      }
    } 
    else if (type === 'WASTE') {
      if (newStock < parsedQty) throw new Error('Stock insuficiente para registrar esta merma');
      transactionTotalCost = parsedQty * currentAvgCost; 
      actualUnitCost = currentAvgCost;
      newStock -= parsedQty;
    } 
    else {
      throw new Error('Tipo de transacción no soportada desde este endpoint');
    }

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

    await item.update({
      currentStock: newStock,
      averageCost: newAvgCost
    }, { transaction: t });

    await t.commit(); 

    getIO().emit('stock:update', [{
      id: inventoryItemId,
      stock: newStock
    }]);

    res.status(201).json({ 
      message: 'Transacción registrada con éxito', 
      currentStock: newStock, 
      averageCost: newAvgCost 
    });

  } catch (error) {
    await t.rollback();
    console.error('Error en transacción de inventario:', error);
    res.status(400).json({ message: error.message || 'Error al procesar la transacción.' });
  }
};

// 4. Obtener el historial (Kardex) de un insumo
export const getItemHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await InventoryTransaction.findAll({
      where: { inventoryItemId: id },
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'fullName'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ message: 'Error al obtener el historial.' });
  }
};

// 5. Eliminar insumo (Soft Delete)
export const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await InventoryItem.findByPk(id);
    
    if (!item) return res.status(404).json({ message: 'Insumo no encontrado' });

    await item.update({ isActive: false });
    res.status(200).json({ message: 'Insumo eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'Error al eliminar el insumo.' });
  }
};

// =========================================================================
// MOTOR DE ARQUEO / CONCILIACIÓN DE INVENTARIO
// =========================================================================
export const processReconciliation = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { items, notes, userId, date } = req.body;

    if (!items || !items.length) {
      throw new Error('No se enviaron insumos para el arqueo.');
    }

    const realExecutionDate = new Date(); 
    let accountingDate = realExecutionDate; 
    let isRetroactive = false;

    // 🔥 FIX ZONA HORARIA: Obtenemos la fecha local estricta sin usar .toISOString()
    const localYear = realExecutionDate.getFullYear();
    const localMonth = String(realExecutionDate.getMonth() + 1).padStart(2, '0');
    const localDay = String(realExecutionDate.getDate()).padStart(2, '0');
    const todayLocalStr = `${localYear}-${localMonth}-${localDay}`;

    if (date && date !== todayLocalStr) {
      isRetroactive = true;
      // Rompemos el string YYYY-MM-DD para armar la fecha en horario local evitando el UTC Shift
      const [y, m, d] = date.split('-');
      // Meses en JavaScript van de 0 a 11 (por eso m - 1)
      accountingDate = new Date(y, m - 1, d, 23, 59, 59, 999); 
    }

    const baseNote = notes || 'Arqueo periódico';
    const finalNote = isRetroactive 
      ? `[Registrado el: ${realExecutionDate.toLocaleString()}] ${baseNote}` 
      : baseNote;

    const reconciliation = await InventoryReconciliation.create({
      userId: userId || null,
      status: 'COMPLETED',
      totalConsumptionValue: 0, 
      notes: finalNote,
      createdAt: accountingDate 
    }, { transaction: t });

    let totalCOGS = 0;
    const stockUpdates = []; 

    for (const count of items) {
      const { inventoryItemId, physicalStock } = count;
      const parsedPhysical = parseFloat(physicalStock);

      const item = await InventoryItem.findByPk(inventoryItemId, { transaction: t });
      if (!item) continue; 

      const logicalStock = parseFloat(item.currentStock);
      const difference = parsedPhysical - logicalStock;
      const averageCost = parseFloat(item.averageCost);
      const differenceCost = difference * averageCost;

      await InventoryReconciliationDetail.create({
        reconciliationId: reconciliation.id,
        inventoryItemId: item.id,
        logicalStock: logicalStock,
        physicalStock: parsedPhysical,
        difference: difference,
        averageCostAtTime: averageCost,
        totalDifferenceCost: differenceCost,
        createdAt: accountingDate 
      }, { transaction: t });

      if (difference < 0) {
        const consumedQuantity = Math.abs(difference);
        const consumedCost = consumedQuantity * averageCost;
        
        totalCOGS += consumedCost; 

        await InventoryTransaction.create({
          inventoryItemId: item.id,
          userId: userId || null,
          type: 'CONSUMPTION',
          quantity: consumedQuantity,
          unitCost: averageCost,
          totalCost: consumedCost,
          reference: `Arqueo #${reconciliation.id}`,
          notes: isRetroactive ? `[Registrado el: ${realExecutionDate.toLocaleString()}] Ajuste negativo diferido` : (notes ? `Arqueo: ${notes}` : 'Consumo determinado por arqueo'),
          createdAt: accountingDate 
        }, { transaction: t });

      } else if (difference > 0) {
        await InventoryTransaction.create({
          inventoryItemId: item.id,
          userId: userId || null,
          type: 'ADJUSTMENT',
          quantity: difference,
          unitCost: averageCost,
          totalCost: Math.abs(differenceCost),
          reference: `Arqueo #${reconciliation.id}`,
          notes: isRetroactive ? `[Registrado el: ${realExecutionDate.toLocaleString()}] Ajuste positivo diferido` : (notes ? `Ajuste: ${notes}` : 'Ajuste positivo por arqueo'),
          createdAt: accountingDate 
        }, { transaction: t });
      }

      await item.update({ currentStock: parsedPhysical }, { transaction: t });

      stockUpdates.push({
        id: item.id,
        stock: parsedPhysical
      });
    }

    await reconciliation.update({ totalConsumptionValue: totalCOGS }, { transaction: t });

    await t.commit();

    if (stockUpdates.length > 0) {
      getIO().emit('stock:update', stockUpdates);
    }

    res.status(201).json({ 
      message: 'Arqueo procesado con éxito',
      reconciliationId: reconciliation.id,
      cogs: totalCOGS
    });

  } catch (error) {
    await t.rollback(); 
    console.error('Error procesando arqueo:', error);
    res.status(400).json({ message: error.message || 'Error al procesar el arqueo.' });
  }
};

// =========================================================================
// MOTOR DE ANULACIÓN Y PAPELERA (NUEVO)
// =========================================================================

export const cancelTransaction = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const tx = await InventoryTransaction.findByPk(id, { 
      include: [{ model: InventoryItem, as: 'item' }],
      transaction: t 
    });

    if (!tx) throw new Error('Movimiento no encontrado.');
    if (tx.status === 'CANCELLED') throw new Error('Este movimiento ya está anulado.');

    const item = tx.item;
    let newStock = parseFloat(item.currentStock);
    let currentAvgCost = parseFloat(item.averageCost);
    let newAvgCost = currentAvgCost;
    
    const txQty = parseFloat(tx.quantity);
    const txTotalCost = parseFloat(tx.totalCost);

    // MATEMÁTICA INVERSA
    if (['IN', 'ADJUSTMENT'].includes(tx.type)) {
      newStock -= txQty; // Revertir entrada: Quitamos stock
      if (newStock < 0) throw new Error('No se puede anular: El stock del insumo quedaría en negativo.');
      
      if (newStock === 0) {
        newAvgCost = 0;
      } else {
        const currentTotalValue = (parseFloat(item.currentStock) * currentAvgCost);
        const revertedTotalValue = currentTotalValue - txTotalCost;
        newAvgCost = revertedTotalValue > 0 ? revertedTotalValue / newStock : 0;
      }
    } else {
      // Revertir salida (MERMA, CONSUMO, OUT): Devolvemos el stock a la normalidad
      newStock += txQty;
      // El costo promedio histórico no suele recalcularse al devolver mermas, solo recuperamos el stock.
    }

    await item.update({ currentStock: newStock, averageCost: newAvgCost }, { transaction: t });
    
    await tx.update({ 
      status: 'CANCELLED', 
      cancelledAt: new Date(), 
      cancelledBy: req.user?.id || null, 
      cancelReason: reason 
    }, { transaction: t });

    await t.commit();
    getIO().emit('stock:update', [{ id: item.id, stock: newStock }]);

    res.json({ success: true, message: 'Movimiento anulado y stock devuelto.' });
  } catch (error) {
    await t.rollback();
    res.status(400).json({ success: false, message: error.message });
  }
};

export const restoreTransaction = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const tx = await InventoryTransaction.findByPk(id, { 
      include: [{ model: InventoryItem, as: 'item' }],
      transaction: t 
    });

    if (!tx) throw new Error('Movimiento no encontrado.');
    if (tx.status === 'ACTIVE') throw new Error('Este movimiento ya está activo.');

    const item = tx.item;
    let newStock = parseFloat(item.currentStock);
    let currentAvgCost = parseFloat(item.averageCost);
    let newAvgCost = currentAvgCost;
    
    const txQty = parseFloat(tx.quantity);
    const txTotalCost = parseFloat(tx.totalCost);

    // REAPLICAR MATEMÁTICA
    if (['IN', 'ADJUSTMENT'].includes(tx.type)) {
      const currentTotalValue = newStock * currentAvgCost;
      newStock += txQty; // Volvemos a meter el stock
      if (newStock > 0) {
        newAvgCost = (currentTotalValue + txTotalCost) / newStock;
      }
    } else {
      newStock -= txQty; // Volvemos a sacar el stock
      if (newStock < 0) throw new Error('No se puede restaurar: El stock actual no soporta esta salida de nuevo.');
    }

    await item.update({ currentStock: newStock, averageCost: newAvgCost }, { transaction: t });
    
    await tx.update({ 
      status: 'ACTIVE', 
      cancelledAt: null, 
      cancelledBy: null, 
      cancelReason: null 
    }, { transaction: t });

    await t.commit();
    getIO().emit('stock:update', [{ id: item.id, stock: newStock }]);

    res.json({ success: true, message: 'Movimiento restaurado con éxito.' });
  } catch (error) {
    await t.rollback();
    res.status(400).json({ success: false, message: error.message });
  }
};

// 🔥 REEMPLAZA EL getGlobalHistory EXISTENTE POR ESTE (Filtra los KPIs para evitar descuadres):
export const getGlobalHistory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = {};
    
    if (startDate && endDate) {
      const [sy, sm, sd] = startDate.split('-');
      const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0); 
      const [ey, em, ed] = endDate.split('-');
      const end = new Date(ey, em - 1, ed, 23, 59, 59, 999); 
      dateFilter = { createdAt: { [Op.between]: [start, end] } };
    }

    const transactions = await InventoryTransaction.findAll({
      where: dateFilter,
      include: [
        { model: InventoryItem, as: 'item', attributes: ['id', 'name', 'sku', 'unit'] }, 
        { model: User, as: 'user', attributes: ['id', 'username', 'fullName'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // 🔥 KPIs PROTEGIDOS: Solo suman si el status es ACTIVE
    const totalSpent = transactions
      .filter(t => ['IN', 'ADJUSTMENT'].includes(t.type) && t.status === 'ACTIVE')
      .reduce((sum, t) => sum + parseFloat(t.totalCost), 0);

    const totalOut = transactions
      .filter(t => ['WASTE', 'CONSUMPTION'].includes(t.type) && t.status === 'ACTIVE')
      .reduce((sum, t) => sum + parseFloat(t.totalCost), 0);

    res.status(200).json({ transactions, totalSpent, totalOut });
  } catch (error) {
    console.error('Error fetching global history:', error);
    res.status(500).json({ message: 'Error al obtener el Kardex global.' });
  }
};