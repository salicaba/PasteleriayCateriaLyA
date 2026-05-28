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
  isTakeaway: { // 🔥 NUEVO: Bandera para saber si se empaqueta
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
  }
}, {
  timestamps: true,
});

export default OrderItem;