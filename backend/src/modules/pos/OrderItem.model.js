// src/modules/pos/OrderItem.model.js
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
  variantId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  kitchenStatus: {
    type: DataTypes.ENUM('PENDING', 'PREPARING', 'READY', 'DELIVERED'),
    defaultValue: 'PENDING',
  },
  notes: {
    type: DataTypes.STRING, // Ej: "Sin cebolla", "Bien caliente"
    allowNull: true,
  }
}, {
  timestamps: true,
});

export default OrderItem;