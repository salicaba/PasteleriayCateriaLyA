// backend/src/modules/auth/auth.controller.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import User from '../users/User.model.js';
import IpSecurityService from './ipSecurity.service.js';

const getCleanIp = (req) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
  if (ip) {
    ip = ip.split(',')[0].trim();
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }
  }
  return ip || 'unknown-ip';
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const clientIp = getCleanIp(req);

    console.log(`Intento de acceso a 𝓛𝔂𝓪 -> Identificador: "${username}" | IP: ${clientIp}`);

    const blockStatus = IpSecurityService.checkBlock(clientIp);
    if (blockStatus.isBlocked) {
      return res.status(429).json({
        message: 'Demasiados intentos. Red bloqueada temporalmente.',
        remainingMs: blockStatus.remainingMs // 🔥 Enviamos milisegundos relativos
      });
    }

    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { username: username },
          { email: username }
        ]
      } 
    });
    
    const isMatch = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !user.isActive || !isMatch) {
      const secStatus = IpSecurityService.registerFailure(clientIp);

      if (secStatus.blockedUntil) {
        return res.status(429).json({
          message: 'Límite de intentos excedido. IP bloqueada por seguridad.',
          remainingMs: secStatus.blockedUntil - Date.now() // 🔥 Calculamos lo que falta
        });
      }

      return res.status(401).json({ 
        message: `Usuario o contraseña incorrectos. Intentos restantes: ${5 - secStatus.attempts}` 
      });
    }

    IpSecurityService.resetIp(clientIp);

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullName: user.fullName },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } 
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName
      }
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

export const registerTestUser = async (req, res) => {
  // ... tu código exacto de registro (no se modificó nada aquí)
  try {
    const { fullName, username, password, role } = req.body;

    if (!fullName) {
      return res.status(400).json({ message: 'El nombre completo es requerido.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      fullName,
      username,
      password: hashedPassword,
      role: role || 'Empleado'
    });

    res.status(201).json({
      message: 'Usuario maestro/prueba creado con éxito',
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        username: newUser.username,
        role: newUser.role
      }
    });
  } catch (error) {
    res.status(400).json({ message: 'Error al crear usuario', error: error.message });
  }
};