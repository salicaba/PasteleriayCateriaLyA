import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../users/User.model.js';

// POST: Iniciar sesión
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log(`Llegó desde React -> Usuario: "${username}" | Contraseña: "${password}"`);

    // 1. Buscar al usuario en la base de datos
    const user = await User.findOne({ where: { username } });
    
    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'Usuario no encontrado o inactivo.' });
    }

    // 2. Comparar la contraseña enviada con el hash de la base de datos
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    // 3. Generar el Token (JWT) con los datos del usuario y el rol
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '12h' } // El token expira en 12 horas
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

// POST: Registro de prueba (Solo para desarrollo)
export const registerTestUser = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Cifrar la contraseña antes de guardarla
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      username,
      password: hashedPassword,
      role: role || 'Employee'
    });

    res.status(201).json({
      message: 'Usuario de prueba creado con éxito',
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role
      }
    });
  } catch (error) {
    res.status(400).json({ message: 'Error al crear usuario', error: error.message });
  }
};