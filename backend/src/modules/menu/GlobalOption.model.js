import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const GlobalOption = sequelize.define('GlobalOption', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tipo: {
    type: DataTypes.STRING, // Aquí guardaremos si es 'tamanos', 'leches' o 'extras'
    allowNull: false,
  },
  nombre: {
    type: DataTypes.STRING, // Ej: "Leche de Almendra"
    allowNull: false,
  },
  precioAdicional: {
    type: DataTypes.DECIMAL(10, 2), // Ej: 15.00
    defaultValue: 0,
  }
}, {
  timestamps: false,
});

export default GlobalOption;