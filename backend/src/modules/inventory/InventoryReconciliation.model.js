import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const InventoryReconciliation = sequelize.define('InventoryReconciliation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'COMPLETED'),
    allowNull: false,
    defaultValue: 'DRAFT',
    comment: 'DRAFT: En proceso de conteo. COMPLETED: Arqueo cerrado y aplicado al Kardex.',
  },
  totalConsumptionValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Suma del valor financiero de todo el insumo consumido (COGS)',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  tableName: 'inventory_reconciliations',
  timestamps: true,
});

export default InventoryReconciliation;