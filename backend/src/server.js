import app from './app.js';
import sequelize from './config/database.js';
import { setupAssociations } from './config/associations.js'; 
import './modules/menu/GlobalOption.model.js'; 
import './modules/settings/BusinessConfig.model.js';
// 1. IMPORTAMOS EL MODELO DE USUARIOS PARA QUE ACTUALICE EL ENUM (Administrador/Empleado)
import './modules/users/User.model.js'; 

const PORT = process.env.PORT || 4000;

async function main() {
  try {
    // 1. Probar la conexión
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida.');
    
    // 2. Ejecutar las relaciones ANTES de sincronizar
    setupAssociations(); 
    
    // 3. Sincronizar modelos NORMALMENTE (Sin alter: true ni force: true)
    // Esto solo crea las tablas que falten y deja las demás tranquilas.
    await sequelize.sync();
    console.log('✅ Modelos sincronizados con la base de datos.');

    // 4. Encender el servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor de 𝓛𝔂𝓐 corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ No se pudo conectar a la base de datos:', error);
  }
}

// ¡Esta es la línea que enciende todo!
main();