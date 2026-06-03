import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const InventoryItem = sequelize.define('InventoryItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sku: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  unit: {
    type: DataTypes.ENUM('kg', 'g', 'l', 'ml', 'pza', 'caja'),
    allowNull: false,
    defaultValue: 'pza'
  },
  currentStock: {
    type: DataTypes.DECIMAL(10, 3), 
    allowNull: false,
    defaultValue: 0,
  },
  minimumStock: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    defaultValue: 0
  },
  averageCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
}, {
  tableName: 'inventory_items',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['sku']
    }
  ]
});

export default InventoryItem;