import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Configuración unificada para Supabase (PostgreSQL)
const sequelize = process.env.DB_URL 
  ? new Sequelize(process.env.DB_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    })
  : new Sequelize(
      process.env.DB_NAME || 'lyapos_db',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || '', 
      {
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: 'postgres', // <-- CAMBIO CLAVE
        port: process.env.DB_PORT || 5432, // <-- PUERTO POR DEFECTO DE POSTGRES
        logging: false,
      }
    );

export default sequelize;