export const globalErrorHandler = (err, req, res, next) => {
  // 1. Registramos el error en la consola del servidor para poder depurarlo nosotros
  console.error('🔥 Error Global Interceptado:', err);

  // 2. Determinamos el código de estado (500 si es un error fatal de Node/Supabase)
  const statusCode = err.statusCode || 500;
  
  // 3. Limpiamos el mensaje para que el Frontend lo pueda mostrar en su Cápsula Neo-Bento
  let customMessage = 'Error interno del servidor. Por favor, intenta de nuevo.';
  
  if (err.name === 'SequelizeDatabaseError' || err.name === 'SequelizeConnectionError') {
    customMessage = 'Error de conexión con la base de datos.';
  } else if (err.message) {
    customMessage = err.message;
  }

  // 4. Enviamos la respuesta JSON estandarizada
  res.status(statusCode).json({
    success: false,
    message: customMessage,
    isKickout: false // Aseguramos que un error de BD no expulse al usuario de su sesión
  });
};