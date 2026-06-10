// backend/src/modules/pasteleria/PasteleriaOrder.model.js
import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const PasteleriaOrder = sequelize.define('PasteleriaOrder', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  cliente: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  categoria: { 
    type: DataTypes.STRING,
    defaultValue: 'Pastel',
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  fechaEntrega: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  costoTotal: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'produccion', 'listo', 'entregado', 'cancelado'),
    defaultValue: 'pendiente',
  },
  porciones: {
    type: DataTypes.JSON, 
    defaultValue: [],
  },
  saborPan: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  tipoEntrega: {
    type: DataTypes.ENUM('sucursal', 'domicilio'),
    defaultValue: 'sucursal',
  },
  direccion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  abonos: {
    type: DataTypes.JSON, 
    defaultValue: [],
  },
  imagenesReferencia: { // 🔥 CAMPO ACTUALIZADO A JSON ARRAY
    type: DataTypes.JSON,
    defaultValue: [],
  }
}, {
  timestamps: true,
});

export default PasteleriaOrder;