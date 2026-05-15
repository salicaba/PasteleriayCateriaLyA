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
  cuenta: { // 🔥 CRÍTICO: Nueva columna para no perder el Split Bill
    type: DataTypes.STRING,
    defaultValue: 'General',
  },
  notes: {
    type: DataTypes.TEXT, // Aquí guardaremos un JSON stringificado con los detalles exactos
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