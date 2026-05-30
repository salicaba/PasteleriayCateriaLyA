import InventoryItem from './InventoryItem.model.js';
import InventoryTransaction from './InventoryTransaction.model.js';
// 🔥 NUEVOS MODELOS PARA EL ARQUEO
import InventoryReconciliation from './InventoryReconciliation.model.js';
import InventoryReconciliationDetail from './InventoryReconciliationDetail.model.js';
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
// 🔥 NUEVO: MOTOR DE ARQUEO / CONCILIACIÓN DE INVENTARIO (INVENTARIO PERIÓDICO)
// =========================================================================
export const processReconciliation = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    // items será un arreglo: [{ inventoryItemId: 1, physicalStock: 10.5 }, ...]
    const { items, notes, userId } = req.body;

    if (!items || !items.length) {
      throw new Error('No se enviaron insumos para el arqueo.');
    }

    // 1. Crear la cabecera del Arqueo
    const reconciliation = await InventoryReconciliation.create({
      userId: userId || null,
      status: 'COMPLETED',
      totalConsumptionValue: 0, // Se actualizará al final
      notes: notes || 'Arqueo periódico',
    }, { transaction: t });

    let totalCOGS = 0; // Costo de Ventas (Cost of Goods Sold)

    // 2. Iterar sobre lo que el usuario contó físicamente
    for (const count of items) {
      const { inventoryItemId, physicalStock } = count;
      const parsedPhysical = parseFloat(physicalStock);

      const item = await InventoryItem.findByPk(inventoryItemId, { transaction: t });
      if (!item) continue; 

      const logicalStock = parseFloat(item.currentStock);
      const difference = parsedPhysical - logicalStock;
      const averageCost = parseFloat(item.averageCost);
      const differenceCost = difference * averageCost;

      // 2.1 Guardar el detalle de la conciliación
      await InventoryReconciliationDetail.create({
        reconciliationId: reconciliation.id,
        inventoryItemId: item.id,
        logicalStock: logicalStock,
        physicalStock: parsedPhysical,
        difference: difference,
        averageCostAtTime: averageCost,
        totalDifferenceCost: differenceCost 
      }, { transaction: t });

      // 2.2 Evaluar si hubo consumo o sobrante para afectar el Kardex
      if (difference < 0) {
        // FALTAN INSUMOS = SE CONSUMIERON EN VENTAS O PRODUCCIÓN
        const consumedQuantity = Math.abs(difference);
        const consumedCost = consumedQuantity * averageCost;
        
        totalCOGS += consumedCost; // Acumulamos el valor para las métricas financieras

        await InventoryTransaction.create({
          inventoryItemId: item.id,
          userId: userId || null,
          type: 'CONSUMPTION',
          quantity: consumedQuantity,
          unitCost: averageCost,
          totalCost: consumedCost,
          reference: `Arqueo #${reconciliation.id}`,
          notes: 'Consumo determinado por arqueo'
        }, { transaction: t });

      } else if (difference > 0) {
        // SOBRAN INSUMOS = SE ENCONTRÓ MERCANCÍA (Ajuste positivo)
        await InventoryTransaction.create({
          inventoryItemId: item.id,
          userId: userId || null,
          type: 'ADJUSTMENT',
          quantity: difference,
          unitCost: averageCost,
          totalCost: Math.abs(differenceCost),
          reference: `Arqueo #${reconciliation.id}`,
          notes: 'Ajuste positivo por arqueo'
        }, { transaction: t });
      }

      // 2.3 Ajustar el stock maestro al conteo físico real
      await item.update({ currentStock: parsedPhysical }, { transaction: t });
    }

    // 3. Guardar el Costo de Ventas total en la cabecera
    await reconciliation.update({ totalConsumptionValue: totalCOGS }, { transaction: t });

    // 4. Todo salió perfecto, confirmamos a la base de datos
    await t.commit();

    res.status(201).json({ 
      message: 'Arqueo procesado con éxito',
      reconciliationId: reconciliation.id,
      cogs: totalCOGS
    });

  } catch (error) {
    await t.rollback(); // Deshacemos todo si hay un error
    console.error('Error procesando arqueo:', error);
    res.status(400).json({ message: error.message || 'Error al procesar el arqueo.' });
  }
};