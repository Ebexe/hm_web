/* Archivo: backend-api/middleware/authMiddleware.js */

const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * @desc   Middleware para proteger rutas.
 * Verifica el token JWT y adjunta el usuario a 'req'.
 */
const protect = async (req, res, next) => {
  let token;

  // 1. Leer el token del header 'Authorization'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 2. Obtener el token (formato: "Bearer <token>")
      token = req.headers.authorization.split(' ')[1];

      // 3. Verificar el token con la clave secreta
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 4. Obtener el usuario de la BDD usando el ID del token
      //    (Seleccionamos todo excepto la contraseña)
      const [users] = await pool.query(
        'SELECT id_usuario, nombre, email, fecha_registro FROM Usuarios WHERE id_usuario = ?',
        [decoded.id]
      );

      if (users.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      // 5. ¡ÉXITO! Adjuntar el objeto 'user' a 'req'
      //    Ahora, cualquier ruta protegida que use este middleware
      //    tendrá acceso a 'req.user'
      req.user = users[0];
      
      next(); // Pasa a la siguiente función (el controlador)

    } catch (error) {
      console.error('Error de autenticación:', error.message);
      res.status(401).json({ error: 'No autorizado, token fallido' });
    }
  }

  // Si no hay token en el header
  if (!token) {
    res.status(401).json({ error: 'No autorizado, sin token' });
  }
};


module.exports = {
  protect,
};