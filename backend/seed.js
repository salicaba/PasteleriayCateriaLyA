// backend/seed.js
import sequelize from './src/config/database.js';
import User from './src/modules/users/User.model.js';
import bcrypt from 'bcryptjs';

const createFirstUser = async () => {
  try {
    await sequelize.sync(); 
    
    // 1. Borramos el intento anterior que no estaba encriptado
    await User.destroy({ where: { username: 'admin@lya.com' } });

    // 2. Encriptamos la contraseña de forma segura
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    // 3. Creamos al usuario VIP
    await User.create({
      fullName: 'Emmanuel Salinas Caballero',
      username: 'admin@lya.com',
      password: hashedPassword, // ¡Ahora sí está encriptada!
      role: 'Administrador' // ⚠️ RECUERDA PONER LA PALABRA EXACTA DEL ENUM QUE TE FUNCIONÓ
    });
    
    console.log("✅ Administrador blindado y creado con éxito: admin@lya.com / admin123");
    process.exit(0); 
  } catch (err) {
    console.error("❌ Error al crear usuario:", err);
    process.exit(1); 
  }
};

createFirstUser();