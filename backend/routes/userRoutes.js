/* Archivo: backend-api/routes/userRoutes.js (FINALIZADO) */

const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

/* * ======================================================
 * RUTAS DE PERFIL Y PREFERENCIAS (PROTEGIDAS)
 * ======================================================
 */

/* --- Rutas de Perfil Físico y Datos Básicos --- */

// GET /api/users/profile
// Lee datos básicos y medidas corporales
router.get('/profile', protect, userController.getProfile);

// PUT /api/users/profile
// Actualiza datos básicos y medidas corporales
router.put('/profile', protect, userController.updateProfile);


/* --- Rutas de Preferencias de Estilo (Colores, Estilos, Ocasiones) --- */

// GET /api/users/preferences
// Lee los IDs de estilos, ocasiones y colores favoritos
router.get('/preferences', protect, userController.getPreferences);

// PUT /api/users/preferences
// Sincroniza los IDs de estilos, ocasiones y colores favoritos
router.put('/preferences', protect, userController.updatePreferences);


/* --- Rutas de Ajuste por Categoría (Talla y Fit) --- */

// GET /api/users/ajustes
// Lee la talla habitual y el ajuste preferido por categoría de prenda
router.get('/ajustes', protect, userController.getUserAjustes);

// PUT /api/users/ajustes
// Sincroniza las preferencias de talla/ajuste por categoría
router.put('/ajustes', protect, userController.updateUserAjustes);


module.exports = router;