import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import User from '../users/User.model.js';
import IpSecurityService from './ipSecurity.service.js';

// POST: Iniciar sesión
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 🔥 Capturamos la IP del cliente automáticamente
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    console.log(`Intento de acceso a 𝓛𝔂𝓪 -> Identificador: "${username}" | IP: ${clientIp}`);

    // 🔥 Verificar si la IP ya está bloqueada antes de tocar la BD
    const blockStatus = IpSecurityService.checkBlock(clientIp);
    if (blockStatus.isBlocked) {
      return res.status(429).json({
        message: 'Demasiados intentos. Red bloqueada temporalmente.',
        blockedUntil: blockStatus.blockedUntil
      });
    }

    // 1. Buscar al usuario en la base de datos (por Usuario O por Correo)
    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { username: username },
          { email: username }
        ]
      } 
    });
    
    // Resolvemos la contraseña de manera segura
    const isMatch = user ? await bcrypt.compare(password, user.password) : false;

    // Si no existe, está inactivo, o la contraseña no coincide
    if (!user || !user.isActive || !isMatch) {
      // 🔥 Registrar el fallo a esa IP específica
      const secStatus = IpSecurityService.registerFailure(clientIp);

      if (secStatus.blockedUntil) {
        return res.status(429).json({
          message: 'Límite de intentos excedido. IP bloqueada por seguridad.',
          blockedUntil: secStatus.blockedUntil
        });
      }

      // Devolvemos error genérico pero avisamos cuántos intentos le quedan
      return res.status(401).json({ 
        message: `Usuario o contraseña incorrectos. Intentos restantes: ${5 - secStatus.attempts}` 
      });
    }

    // 🔥 Si el login es exitoso, reseteamos el contador de esa IP
    IpSecurityService.resetIp(clientIp);

    // 3. Generar el Token (JWT)
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullName: user.fullName },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } 
    );

    // Devolvemos la info al frontend
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

// POST: Registro de prueba (Oculto/Temporal)
export const registerTestUser = async (req, res) => {
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