// backend/src/modules/menu/Product.model.js
import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  basePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  imageUrl: {
    type: DataTypes.STRING, 
    allowNull: true,
  },
  controlarStock: {
    type: DataTypes.BOOLEAN,
    defaultValue: false, 
  },
  stockQuantity: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  // 🔥 NUEVO CAMPO: Pausa manual (Agotado)
  isAgotado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  departamento: {
    type: DataTypes.ENUM('cafeteria', 'pasteleria'),
    allowNull: false,
    defaultValue: 'cafeteria',
  },
  requiereCocina: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  opciones: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: { tamanos: [], leches: [], extras: [] }
  }
}, {
  timestamps: true,
});

export default Product;