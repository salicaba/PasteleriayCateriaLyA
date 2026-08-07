import jwt from 'jsonwebtoken';
// 🔥 Importamos el modelo de Usuario para verificar su estado en tiempo real
import User from '../modules/users/User.model.js';

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 1. Verificación matemática (¿El token fue alterado o expiró?)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 2. 🔥 INTERCEPCIÓN EN TIEMPO REAL: Buscamos al usuario en la BD
    // Asumimos que al firmar el token guardaste el ID como "id" (lo estándar)
    const user = await User.findByPk(decoded.id);

    // 3. 🔥 KILL-SWITCH: Si el usuario fue borrado o desactivado, lo botamos
    if (!user || !user.isActive) {
      return res.status(403).json({ 
        message: 'Tu cuenta ha sido desactivada por el Administrador. Sesión revocada.' 
      });
    }

    // 4. Guardamos los datos frescos en la request para la ruta destino
    // Es más seguro inyectar la data fresca de la BD que la que venía en el token
    req.user = {
      id: user.id,
      role: user.role,
      username: user.username,
      fullName: user.fullName
    }; 
    
    next();
  } catch (error) {
    // Si el JWT expiró naturalmente o está mal formado, cae aquí
    return res.status(403).json({ message: 'Token inválido o expirado.' });
  }
};