import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js'; // 🔥 FIX: Importación por defecto sin llaves
import Product from './Product.model.js';

const Promotion = sequelize.define('Promotion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true, // Un producto solo puede tener una promo activa a la vez
    references: {
      model: Product,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  type: {
    type: DataTypes.ENUM('NxM', 'FIXED', 'NTH_FIXED'), // 🔥 ACTUALIZADO
    allowNull: false,
    defaultValue: 'NxM',
  },
  buyQty: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1, // Ej: Lleva 3
  },
  payQty: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1, // Ej: Paga 2
  },
  discountValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00,
  },
  validDays: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    defaultValue: [0, 1, 2, 3, 4, 5, 6], // Días de la semana que aplica (0=Dom, 6=Sab)
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
}, {
  tableName: 'promotions',
  timestamps: true,
});

export default Promotion;