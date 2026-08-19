import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const InventoryTransaction = sequelize.define('InventoryTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  type: {
    type: DataTypes.ENUM('IN', 'OUT', 'WASTE', 'ADJUSTMENT', 'CONSUMPTION'),
    allowNull: false
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false
  },
  unitCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  totalCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  reference: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // 🔥 NUEVOS CAMPOS DE ANULACIÓN
  status: {
    type: DataTypes.ENUM('ACTIVE', 'CANCELLED'),
    defaultValue: 'ACTIVE',
  },
  cancelReason: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  cancelledBy: {
    type: DataTypes.UUID,
    allowNull: true,
  }
}, {
  tableName: 'inventory_transactions',
  timestamps: true,
});

export default InventoryTransaction;