import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const Table = sequelize.define('Table', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  number: {
    type: DataTypes.STRING,
    allowNull: false // <-- Corregido: allowNull
    // Eliminamos unique: true para evitar problemas con las mesas inhabilitadas
  },
  zone: {
    type: DataTypes.ENUM('salon', 'llevar'),
    defaultValue: 'salon'
  },
  qrToken: {
    type: DataTypes.STRING,
    allowNull: true // <-- Corregido: allowNull
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
}, {
  tableName: 'tables',
  timestamps: true
});

export default Table;