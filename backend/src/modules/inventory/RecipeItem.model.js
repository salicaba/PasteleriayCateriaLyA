import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const RecipeItem = sequelize.define('RecipeItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    comment: 'Cantidad de insumo requerida para crear 1 unidad del producto',
  }
}, {
  tableName: 'recipe_items',
  timestamps: false, // No necesitamos created_at aquí
});

export default RecipeItem;