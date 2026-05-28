// backend/src/modules/cash/Transaction.model.js
import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  folio: { // 🔥 NUEVO: Identificador de pago único
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  type: {
    type: DataTypes.ENUM('INCOME', 'EXPENSE'),
    defaultValue: 'INCOME',
  },
  source: {
    type: DataTypes.ENUM('CAFETERIA', 'PASTELERIA', 'MANUAL'),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  referenceId: {
    type: DataTypes.STRING,
    allowNull: true, // ID de la Orden o del Pedido de Pastelería
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'CANCELLED'),
    defaultValue: 'ACTIVE',
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  cancelledBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
  }
}, {
  timestamps: true,
});

export default Transaction;