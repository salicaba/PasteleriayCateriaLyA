// src/modules/users/user.controller.js
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import User from './User.model.js';

// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER, 
    pass: process.env.MAIL_PASS  
  }
});

// GET: Obtener todos los usuarios
export const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'fullName', 'username', 'email', 'role', 'isActive', 'createdAt']
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
  }
};

// POST: Crear un nuevo usuario
export const createUser = async (req, res) => {
  try {
    const { fullName, username, email, password, role } = req.body;

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'El nombre de usuario ya está en uso.' });
    }

    // ENVIAR CORREO ANTES DE HASHEAR LA CONTRASEÑA
    if (email && process.env.MAIL_USER) {
      const mailOptions = {
        from: `"Punto de Venta LyA" <${process.env.MAIL_USER}>`,
        to: email,
        subject: '¡Bienvenido al equipo de LyA! - Tus credenciales de acceso',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #ea580c; text-align: center;">¡Hola, ${fullName}!</h2>
            <p style="font-size: 14px; color: #475569; line-height: 1.5;">
              Se ha creado tu cuenta en el Sistema de Punto de Venta de <b>Pastelería y Cafetería LyA</b>. Estas son tus credenciales de acceso:
            </p>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0; font-size: 14px;"><b>Usuario:</b> ${username}</p>
              <p style="margin: 5px 0; font-size: 14px;"><b>Contraseña:</b> <span style="font-family: monospace; font-size: 16px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${password}</span></p>
              <p style="margin: 5px 0; font-size: 14px;"><b>Rol Asignado:</b> ${role || 'Empleado'}</p>
            </div>
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 30px;">
              * Conserve este correo en un lugar seguro.
            </p>
          </div>
        `
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`Correo enviado exitosamente a ${email}`);
      } catch (mailError) {
        console.error("Error al enviar el correo:", mailError);
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      fullName,
      username,
      email,
      password: hashedPassword,
      role: role || 'Empleado'
    });

    res.status(201).json({
      message: 'Usuario creado exitosamente. Se enviaron las credenciales por correo.',
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear usuario', error: error.message });
  }
};

// PUT: Actualizar un usuario existente y notificar por correo
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, username, email, password, role, isActive } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    let passwordChanged = false;
    let changesMade = false;

    // 🔥 CORRECCIÓN: Convertimos el string vacío a null para evitar errores de validación en la BD
    const parsedEmail = email === '' ? null : email;

    // Detectamos si algo realmente cambió comparando con el nuevo parsedEmail
    if (fullName && fullName !== user.fullName) { user.fullName = fullName; changesMade = true; }
    if (username && username !== user.username) { user.username = username; changesMade = true; }
    if (parsedEmail !== undefined && parsedEmail !== user.email) { user.email = parsedEmail; changesMade = true; }
    if (role && role !== user.role) { user.role = role; changesMade = true; }
    if (isActive !== undefined && isActive !== user.isActive) { user.isActive = isActive; changesMade = true; }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      passwordChanged = true;
      changesMade = true;
    }

    // Si no detectó ningún cambio, cortamos la ejecución aquí (ahora sí funcionará perfecto)
    if (!changesMade) {
      return res.json({ 
        changed: false, 
        message: 'No se detectaron cambios. No se envió ninguna notificación.',
        user: { id: user.id, fullName: user.fullName, username: user.username, email: user.email, role: user.role, isActive: user.isActive }
      });
    }

    // Si sí hubo cambios, guardamos en la base de datos
    await user.save();

    // ENVIAR CORREO DE ACTUALIZACIÓN (usando el parsedEmail)
    const targetEmail = parsedEmail || user.email; 
    if (changesMade && targetEmail && process.env.MAIL_USER) {
      const mailOptions = {
        from: `"Punto de Venta LyA" <${process.env.MAIL_USER}>`,
        to: targetEmail,
        subject: 'Actualización de tu cuenta en LyA',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #ea580c; text-align: center;">¡Hola, ${user.fullName}!</h2>
            <p style="font-size: 14px; color: #475569; line-height: 1.5;">
              El administrador ha actualizado la información de tu cuenta en el Sistema de <b>Pastelería y Cafetería LyA</b>. Aquí están tus datos vigentes:
            </p>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0; font-size: 14px;"><b>Usuario / Login:</b> ${user.username}</p>
              ${passwordChanged ? `<p style="margin: 5px 0; font-size: 14px;"><b>Nueva Contraseña:</b> <span style="font-family: monospace; font-size: 16px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${password}</span></p>` : `<p style="margin: 5px 0; font-size: 14px; color: #64748b;"><i>La contraseña no fue modificada.</i></p>`}
              <p style="margin: 5px 0; font-size: 14px;"><b>Rol Asignado:</b> ${user.role}</p>
              <p style="margin: 5px 0; font-size: 14px;"><b>Estado de la Cuenta:</b> ${user.isActive ? '<span style="color: #10b981; font-weight: bold;">Activo</span>' : '<span style="color: #ef4444; font-weight: bold;">Suspendido</span>'}</p>
            </div>
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 30px;">
              * Si no reconoces estos cambios o tienes problemas para entrar a tu turno, acércate al administrador.
            </p>
          </div>
        `
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`Correo de actualización enviado a ${targetEmail}`);
      } catch (mailError) {
        console.error("Error al enviar el correo de actualización:", mailError);
      }
    }

    res.json({
      changed: true,
      message: 'Usuario actualizado exitosamente. Se notificó al empleado.',
      user: { id: user.id, fullName: user.fullName, username: user.username, email: user.email, role: user.role, isActive: user.isActive }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar usuario', error: error.message });
  }
};

// DELETE: Eliminación lógica (¡La que faltaba!)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    user.isActive = false;
    await user.save();

    res.json({ message: 'Usuario desactivado correctamente', user: { id: user.id, isActive: user.isActive } });
  } catch (error) {
    res.status(500).json({ message: 'Error al desactivar el usuario', error: error.message });
  }
};