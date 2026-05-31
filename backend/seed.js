// backend/seed.js
import sequelize from './src/config/database.js';
import User from './src/modules/users/User.model.js';

const createFirstUser = async () => {
  try {
    await sequelize.sync(); 
    await User.create({
      username: 'admin',
      password: 'admin123', 
      role: 'admin'
    });
    console.log("✅ Usuario creado con éxito: admin / admin123");
    // process.exit(0);  <-- COMENTA O BORRA ESTA LÍNEA
  } catch (err) {
    console.error("❌ Error al crear usuario:", err);
    // process.exit(1);  <-- COMENTA O BORRA ESTA LÍNEA
  }
};