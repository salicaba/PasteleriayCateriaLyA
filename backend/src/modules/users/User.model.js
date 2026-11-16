// backend/src/modules/users/User.model.js
import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('Administrador', 'Empleado'),
    allowNull: false,
    defaultValue: 'Empleado',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  // 🔥 Control de sesión única por dispositivo/equipo
  currentDeviceId: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  },
  // 🔥 Control centralizado de intentos fallidos en BD (Anticipa borrado de caché)
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  blockUntil: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  timestamps: true,
  tableName: 'Users'
});

export default User;