import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const InventoryTransaction = sequelize.define('InventoryTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  type: {
    type: DataTypes.ENUM('IN', 'OUT', 'WASTE', 'ADJUSTMENT'),
    allowNull: false,
    comment: 'IN (Compra), OUT (Venta/Uso), WASTE (Merma), ADJUSTMENT (Ajuste de inventario)',
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    comment: 'Cantidad afectada (siempre positiva, el type define si suma o resta)',
  },
  unitCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Costo unitario al momento de la transacción',
  },
  totalCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'quantity * unitCost',
  },
  reference: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Ej: ID del Ticket POS, Número de Factura del Proveedor, etc.',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  tableName: 'inventory_transactions',
  timestamps: true,
});

export default InventoryTransaction;