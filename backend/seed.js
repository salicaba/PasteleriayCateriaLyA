// backend/seed.js
import sequelize from './src/config/database.js';
import User from './src/modules/users/User.model.js';

const createFirstUser = async () => {
  try {
    await sequelize.sync(); // Asegura que las tablas existan
    await User.create({
      username: 'admin',
      password: 'admin123', // El modelo lo encriptará solo gracias al hook beforeCreate
      role: 'admin'
    });
    console.log("✅ Usuario creado con éxito: admin / admin123");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error al crear usuario:", err);
    process.exit(1);
  }
};

createFirstUser();