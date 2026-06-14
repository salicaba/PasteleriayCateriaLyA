// backend/src/modules/pos/OrderItem.model.js
import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  cuenta: { 
    type: DataTypes.STRING,
    defaultValue: 'General',
  },
  isTakeaway: { 
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  notes: {
    type: DataTypes.TEXT, 
    allowNull: true, 
  },
  kitchenStatus: {
    type: DataTypes.ENUM('PENDING', 'PREPARING', 'READY', 'DELIVERED'),
    defaultValue: 'PENDING',
  },
  // 🔥 NUEVOS CAMPOS PARA CANCELACIONES
  status: {
    type: DataTypes.ENUM('ACTIVE', 'CANCELLED'),
    defaultValue: 'ACTIVE',
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  cancelReason: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  cancelledBy: {
    type: DataTypes.UUID, // ID del cajero/mesero que canceló
    allowNull: true,
  }
}, {
  timestamps: true,
});

export default OrderItem;