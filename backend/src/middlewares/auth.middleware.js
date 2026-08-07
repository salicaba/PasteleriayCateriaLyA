import jwt from 'jsonwebtoken';
import User from '../modules/users/User.model.js';

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 🔥 INTERCEPCIÓN EN TIEMPO REAL
    const user = await User.findByPk(decoded.id);

    // 🔥 KILL-SWITCH PERFECTO: Mandamos isKickout en true
    if (!user || !user.isActive) {
      return res.status(403).json({ 
        message: 'Tu cuenta ha sido desactivada por el Administrador. Sesión revocada.',
        isKickout: true 
      });
    }

    req.user = {
      id: user.id,
      role: user.role,
      username: user.username,
      fullName: user.fullName
    }; 
    
    next();
  } catch (error) {
    return res.status(401).json({ 
      message: 'Token inválido o expirado.',
      isKickout: false 
    });
  }
};