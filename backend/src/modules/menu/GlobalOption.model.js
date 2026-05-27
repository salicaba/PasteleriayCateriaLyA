import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const GlobalOption = sequelize.define('GlobalOption', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tipo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  nombre: {
    type: DataTypes.STRING, 
    allowNull: false,
  },
  precioAdicional: {
    type: DataTypes.DECIMAL(10, 2), 
    defaultValue: 0,
  },
  order: { // 🔥 NUEVO: Campo para guardar el orden
    type: DataTypes.INTEGER,
    defaultValue: 0,
  }
}, {
  timestamps: false,
});

export default GlobalOption;