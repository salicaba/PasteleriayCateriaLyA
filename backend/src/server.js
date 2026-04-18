import app from './app.js';
import sequelize from './config/database.js';
import './config/associations.js'; // Importante para las relaciones

const PORT = process.env.PORT || 4000;

async function main() {
  try {
    // 1. Probar la conexión
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida.');
    
    // 2. Sincronizar modelos
    await sequelize.sync({ force: false });
    console.log('✅ Modelos sincronizados con la base de datos.');

    // 3. Encender el servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ No se pudo conectar a la base de datos:', error);
  }
}

// ¡Esta es la línea que enciende todo!
main();