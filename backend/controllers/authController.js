/* Archivo: backend-api/controllers/authController.js */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // <-- 1. IMPORTA JWT
const pool = require('../config/db'); 

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || 10);

/**
 * @desc   Registrar un nuevo usuario
 * @ruta   POST /api/auth/register
 */
const registerUser = async (req, res) => {
  // ... (Tu función de registro que ya funciona) ...
  try {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    const [existingUser] = await pool.query(
      'SELECT id_usuario FROM Usuarios WHERE email = ?',
      [email]
    );
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'El correo electrónico ya está registrado' });
    }
    const salt = await bcrypt.genSalt(saltRounds);
    const password_hash = await bcrypt.hash(password, salt);
    const [result] = await pool.query(
      'INSERT INTO Usuarios (nombre, email, password_hash) VALUES (?, ?, ?)',
      [nombre, email, password_hash]
    );
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      userId: result.insertId,
    });
  } catch (error) {
    console.error('Error en registerUser:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};


/**
 * @desc   Autenticar (login) un usuario
 * @ruta   POST /api/auth/login
 */
// 2. AÑADE ESTA NUEVA FUNCIÓN
const loginUser = async (req, res) => {
  try {
    // 1. Obtener email y password del body
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan email y contraseña' });
    }

    // 2. Buscar al usuario en la BDD por su email
    const [users] = await pool.query(
      'SELECT id_usuario, nombre, password_hash FROM Usuarios WHERE email = ?',
      [email]
    );

    // 3. Verificar si el usuario existe
    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' }); // 401: No autorizado
    }

    const user = users[0];

    // 4. Comparar la contraseña ingresada con la hasheada en la BDD
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // 5. Si todo es correcto, crear un Token (JWT)
    const payload = {
      id: user.id_usuario,
      nombre: user.nombre,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET, // Tu clave secreta del .env
      { expiresIn: process.env.JWT_EXPIRES_IN } // Tiempo de expiración del .env
    );

    // 6. Enviar el token al cliente
    res.status(200).json({
      message: 'Inicio de sesión exitoso',
      token: token,
    });

  } catch (error) {
    console.error('Error en loginUser:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};


// 3. AÑADE 'loginUser' A LAS EXPORTACIONES
module.exports = {
  registerUser,
  loginUser, // <-- AÑÁDELO AQUÍ
};