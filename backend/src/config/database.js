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
      },
      // 🔥 NUEVO: Configuración especial del Pool para Supabase
      pool: {
        max: 20,         // Aumentamos el máximo de conexiones simultáneas
        min: 0,
        acquire: 60000,  // 60 segundos de tolerancia para evitar el "Timeout"
        idle: 10000      // Cierra conexiones inactivas después de 10s
      }
    })
  : new Sequelize(
      process.env.DB_NAME || 'lyapos_db',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || '', 
      {
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: 'postgres',
        port: process.env.DB_PORT || 5432, 
        logging: false,
        // 🔥 Replicamos el pool por si algún día lo corres en local
        pool: {
          max: 20,
          min: 0,
          acquire: 60000,
          idle: 10000
        }
      }
    );

export default sequelize;