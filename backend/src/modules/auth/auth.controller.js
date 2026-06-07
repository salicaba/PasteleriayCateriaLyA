// src/modules/auth/auth.controller.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize'; // 🔥 Importamos los operadores lógicos de Sequelize
import User from '../users/User.model.js';

// POST: Iniciar sesión
export const login = async (req, res) => {
  try {
    // El frontend sigue enviando el campo como 'username', 
    // pero ahora sabemos que el cajero pudo haber escrito su correo ahí.
    const { username, password } = req.body;

    console.log(`Intento de acceso a 𝓛𝔂𝓐 -> Identificador: "${username}"`);

    // 1. Buscar al usuario en la base de datos (por Usuario O por Correo)
    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { username: username },
          { email: username }
        ]
      } 
    });
    
    // Si no existe o está inactivo, devolvemos el mismo error genérico por seguridad
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
    }

    // 2. Comparar la contraseña enviada con el hash de la base de datos
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
    }

    // 3. Generar el Token (JWT) incluyendo los datos clave
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullName: user.fullName },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Devolvemos la info al frontend
    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email, // Devolvemos también el correo por si el frontend lo necesita
        role: user.role,
        fullName: user.fullName
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

// POST: Registro de prueba
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