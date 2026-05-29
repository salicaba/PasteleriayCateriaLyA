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
    unique: true,
    allowNull: true,
    comment: 'Código único interno o código de barras',
  },
  unit: {
    type: DataTypes.ENUM('kg', 'g', 'l', 'ml', 'pza', 'caja'),
    allowNull: false,
    defaultValue: 'pza',
    comment: 'Unidad de medida base para las recetas',
  },
  currentStock: {
    type: DataTypes.DECIMAL(10, 3), // Soporta hasta 3 decimales (ej. 1.500 kg)
    allowNull: false,
    defaultValue: 0,
  },
  minimumStock: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    defaultValue: 0,
    comment: 'Punto de reorden para alertas del dashboard',
  },
  averageCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Costo Promedio Ponderado para fines contables',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
}, {
  tableName: 'inventory_items',
  timestamps: true,
});

export default InventoryItem; // <-- La clave mágica de ES Modules