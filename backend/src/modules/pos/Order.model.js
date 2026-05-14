// src/modules/pos/Order.model.js
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
    type: DataTypes.STRING, // Ej: "L-01", null si es SALON
    allowNull: true,
  },
  tableId: {
    type: DataTypes.INTEGER, // CORRECCIÓN: Cambiado a INTEGER para coincidir con Table.model.js
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('OPEN', 'CLOSED', 'CANCELLED'),
    defaultValue: 'OPEN',
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  createdBy: { // Referencia al User (Employee)
    type: DataTypes.UUID,
    allowNull: true, // Permitimos null para pruebas y para que el sistema no explote sin sesión
  }
}, {
  timestamps: true,
});

export default Order;