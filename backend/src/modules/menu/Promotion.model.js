import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';
import Product from './Product.model.js';

const Promotion = sequelize.define('Promotion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // 🔥 AHORA OPCIONAL: Si es null, es una promoción global/general
  productId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Product,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  // 🔥 NUEVOS CAMPOS: Arreglos para combos y volumen general
  applyToProducts: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: true,
    defaultValue: [], // Productos que activan la promo (Ej: Frappé Moka, Frappé Vainilla)
  },
  rewardProducts: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: true,
    defaultValue: [], // Productos que se dan de regalo o con descuento (Ej: Rebanada de Pastel)
  },
  // 🔥 TIPOS ACTUALIZADOS: Agregamos 'BOGO' al final
  type: {
    type: DataTypes.ENUM('NxM', 'FIXED', 'NTH_FIXED', 'COMBO', 'TICKET_DISCOUNT', 'BOGO'),
    allowNull: false,
    defaultValue: 'NxM',
  },
  buyQty: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1, 
  },
  payQty: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1, 
  },
  discountValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00,
  },
  // 🔥 NUEVO CAMPO: Para la promo de Regalo/Descuento por Monto de Ticket
  minTicketAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00,
  },
  // 🔥 NUEVO CAMPO: Límite de stock agregado
  minStockThreshold: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  validDays: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    defaultValue: [0, 1, 2, 3, 4, 5, 6], 
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  // 🔥 NUEVO CAMPO: Para darle un nombre descriptivo a la promoción en el Gestor Central (Ej: "Lunes de Frappés")
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  tableName: 'promotions',
  timestamps: true,
});

export default Promotion;