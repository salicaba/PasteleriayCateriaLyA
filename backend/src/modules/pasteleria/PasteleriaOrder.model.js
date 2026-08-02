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
    // 🔥 EL FIX: Volvemos a STRING para no hacer enojar a PostgreSQL, 
    // pero usamos interceptores para que el Frontend siga viendo un Array.
    type: DataTypes.STRING,
    defaultValue: 'Pastel',
    get() {
      const rawValue = this.getDataValue('categoria');
      try {
        // Intentamos parsearlo por si ya está guardado como '["Pastel","Boda"]'
        const parsed = JSON.parse(rawValue);
        return Array.isArray(parsed) ? parsed : [rawValue];
      } catch (e) {
        // Si falla, es un pedido viejo con texto normal como "Pastel". Lo volvemos lista.
        return rawValue ? [rawValue] : [];
      }
    },
    set(val) {
      // Cuando el frontend mande el array, lo guardamos como texto stringificado
      this.setDataValue('categoria', Array.isArray(val) ? JSON.stringify(val) : String(val));
    }
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
  imagenesReferencia: {
    type: DataTypes.JSON,
    defaultValue: [],
  }
}, {
  timestamps: true,
});

export default PasteleriaOrder;