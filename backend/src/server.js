import app from './app.js';
import sequelize from './config/database.js';
import { setupAssociations } from './config/associations.js'; // <-- 1. Importamos la función

const PORT = process.env.PORT || 4000;

async function main() {
  try {
    // 1. Probar la conexión
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida.');
    
    // 2. Ejecutar las relaciones ANTES de sincronizar
    setupAssociations(); // <-- 2. Llamamos a la función aquí
    
    // 3. Sincronizar modelos
    await sequelize.sync({ alter: true });
    console.log('✅ Modelos sincronizados con la base de datos.');

    // 4. Encender el servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ No se pudo conectar a la base de datos:', error);
  }
}

// ¡Esta es la línea que enciende todo!
main();