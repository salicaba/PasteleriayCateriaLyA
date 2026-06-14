// backend/src/modules/pos/Order.model.js
import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  orderType: {
    type: DataTypes.ENUM('SALON', 'LLEVAR'),
    allowNull: false,
  },
  ticketId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  tableId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('OPEN', 'PAID', 'CLOSED', 'CANCELLED'),
    defaultValue: 'OPEN',
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  paidAccounts: {
    type: DataTypes.JSON, 
    allowNull: true,
    defaultValue: []
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  // 🔥 NUEVOS CAMPOS PARA CANCELACIONES DE CUENTA COMPLETA
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  cancelReason: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  cancelledBy: {
    type: DataTypes.UUID,
    allowNull: true,
  }
}, {
  timestamps: true,
});

export default Order;