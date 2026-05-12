import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js'; // <-- Importación con ES Modules

const BusinessConfig = sequelize.define('BusinessConfig', {
  key: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'business_configs',
  timestamps: true
});

export default BusinessConfig; // <-- Exportación correcta para ES Modules