// src/modules/menu/Variant.model.js
import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const Variant = sequelize.define('Variant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING, // ej: "Leche de Almendra", "Tamaño Grande"
    allowNull: false,
  },
  extraPrice: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  }
}, {
  timestamps: false,
});

export default Variant;