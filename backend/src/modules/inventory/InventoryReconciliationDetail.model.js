import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const InventoryReconciliationDetail = sequelize.define('InventoryReconciliationDetail', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  logicalStock: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false
  },
  physicalStock: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false
  },
  difference: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false
  },
  averageCostAtTime: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  totalDifferenceCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'inventory_reconciliation_details',
  timestamps: true,
});

export default InventoryReconciliationDetail;