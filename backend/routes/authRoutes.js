/* Archivo: backend-api/routes/authRoutes.js */

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

/*
 * @ruta   POST /api/auth/register
 */
router.post('/register', authController.registerUser);

/*
 * @ruta   POST /api/auth/login
 */
// 4. REEMPLAZA LA FUNCIÓN DE PRUEBA
router.post('/login', authController.loginUser); // <-- ACTUALIZA ESTA LÍNEA

module.exports = router;