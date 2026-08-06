// backend/src/modules/auth/auth.controller.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import User from '../users/User.model.js';
import DeviceSecurityService from './deviceSecurity.service.js';

// POST: Iniciar sesión
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const deviceId = req.headers['x-device-id'];

    console.log(`Intento de acceso a 𝓛𝔂𝓪 -> Identificador: "${username}"`);

    // 🔥 BLINDAJE: Verificar si el dispositivo envió su huella
    if (!deviceId) {
      return res.status(400).json({ message: 'Device ID es requerido para autenticación.' });
    }

    // 🔥 BLINDAJE: Verificar si el dispositivo ya está bloqueado antes de tocar la BD
    const blockStatus = DeviceSecurityService.checkBlock(deviceId);
    if (blockStatus.isBlocked) {
      return res.status(429).json({
        message: 'Demasiados intentos. Equipo bloqueado temporalmente.',
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
    
    // Resolvemos la contraseña de manera segura para evitar ataques de timing
    const isMatch = user ? await bcrypt.compare(password, user.password) : false;

    // Si no existe, está inactivo, o la contraseña no coincide
    if (!user || !user.isActive || !isMatch) {
      // 🔥 BLINDAJE: Registrar el fallo en el dispositivo
      const secStatus = DeviceSecurityService.registerFailure(deviceId);

      if (secStatus.blockedUntil) {
        return res.status(429).json({
          message: 'Límite de intentos excedido. Equipo bloqueado por seguridad.',
          blockedUntil: secStatus.blockedUntil
        });
      }

      // Devolvemos error genérico pero avisamos cuántos intentos le quedan
      return res.status(401).json({ 
        message: `Usuario o contraseña incorrectos. Intentos restantes: ${5 - secStatus.attempts}` 
      });
    }

    // 🔥 BLINDAJE: Si el login es exitoso, reseteamos el contador de ese dispositivo
    DeviceSecurityService.resetDevice(deviceId);

    // 3. Generar el Token (JWT)
    // FIX: Vida útil estática de 24h. El frontend se encarga del cierre exacto a medianoche.
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