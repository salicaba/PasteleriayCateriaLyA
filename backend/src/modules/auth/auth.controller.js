// backend/src/modules/auth/auth.controller.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import User from '../users/User.model.js';
import AuthSecurityService from './authSecurity.service.js';

export const login = async (req, res) => {
  try {
    const { username, password, deviceId } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ message: 'Device ID es requerido para seguridad.' });
    }

    const normalizedUsername = (username || '').toLowerCase().trim();
    const securityKey = `${deviceId}:${normalizedUsername}`;

    // 1. Buscar al usuario en la base de datos (por username o email)
    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { username: username },
          { email: username }
        ]
      } 
    });

    // 2. 🔥 Verificar si el usuario está bloqueado globalmente en la BD por intentos fallidos
    if (user && user.blockUntil && new Date(user.blockUntil) > new Date()) {
      const remainingMs = new Date(user.blockUntil).getTime() - Date.now();
      return res.status(429).json({
        message: 'Demasiados intentos fallidos. Cuenta bloqueada temporalmente por seguridad.',
        remainingMs
      });
    }

    // Limpiar bloqueo expirado si ya pasó el tiempo
    if (user && user.blockUntil && new Date(user.blockUntil) <= new Date()) {
      user.blockUntil = null;
      user.loginAttempts = 0;
      await user.save();
    }
    
    const isMatch = user ? await bcrypt.compare(password, user.password) : false;

    // 3. Si falla la validación
    if (!user || !user.isActive || !isMatch) {
      if (user) {
        user.loginAttempts += 1;
        
        // Si llega a 5 intentos, bloqueamos por 30 minutos directamente en la BD
        if (user.loginAttempts >= 5) {
          user.blockUntil = new Date(Date.now() + 30 * 60 * 1000);
          user.loginAttempts = 0; 
          await user.save();
          
          return res.status(429).json({
            message: 'Límite de intentos excedido. Cuenta bloqueada por seguridad.',
            remainingMs: 30 * 60 * 1000
          });
        }
        await user.save();
        
        const intentosRestantes = Math.max(0, 5 - user.loginAttempts);
        return res.status(401).json({ 
          message: `Usuario o contraseña incorrectos. Intentos restantes: ${intentosRestantes}` 
        });
      }

      // Si el usuario ni siquiera existe
      const secStatus = AuthSecurityService.registerFailure(securityKey);
      return res.status(401).json({ 
        message: 'Usuario o contraseña incorrectos.' 
      });
    }

    // 🔥 4. VALIDACIÓN DE SESIÓN ÚNICA (CONCURRENCIA)
    // Si ya tiene un dispositivo registrado distinto y activo
    if (user.currentDeviceId && user.currentDeviceId !== deviceId) {
      return res.status(409).json({
        message: 'Ya hay una sesión activa con este usuario en otro equipo o navegador. Debes cerrar sesión en el otro equipo antes de ingresar aquí.',
        isConcurrentSession: true
      });
    }

    // 5. Login exitoso -> Reseteamos contadores de fallos y asignamos el dispositivo actual
    user.loginAttempts = 0;
    user.blockUntil = null;
    user.currentDeviceId = deviceId;
    await user.save();

    AuthSecurityService.reset(securityKey);

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

// Endpoint para cerrar sesión explícitamente y liberar el dispositivo en la BD
export const logout = async (req, res) => {
  try {
    const { userId, deviceId } = req.body;
    
    if (userId) {
      const user = await User.findByPk(userId);
      if (user) {
        if (!deviceId || user.currentDeviceId === deviceId) {
          user.currentDeviceId = null;
          await user.save();
        }
      }
    }
    
    return res.json({ message: 'Sesión cerrada correctamente.' });
  } catch (error) {
    console.error("Error en logout:", error);
    res.status(500).json({ message: 'Error al cerrar sesión', error: error.message });
  }
};

export const registerTestUser = async (req, res) => {
  try {
    const { fullName, username, password, role } = req.body;
    if (!fullName) return res.status(400).json({ message: 'El nombre completo es requerido.' });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = await User.create({ fullName, username, password: hashedPassword, role: role || 'Empleado' });
    res.status(201).json({ message: 'Usuario creado', user: { id: newUser.id, fullName: newUser.fullName, username: newUser.username, role: newUser.role } });
  } catch (error) {
    res.status(400).json({ message: 'Error al crear usuario', error: error.message });
  }
};