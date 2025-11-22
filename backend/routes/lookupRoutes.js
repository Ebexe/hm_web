/* Archivo: backend-api/routes/lookupRoutes.js */

const express = require('express');
const router = express.Router();
const lookupController = require('../controllers/lookupController');

/*
 * @ruta   GET /api/lookups/estilos
 * @desc   Obtener todos los estilos disponibles
 * @acceso Público
 */
router.get('/estilos', lookupController.getEstilos);

/*
 * @ruta   GET /api/lookups/ocasiones
 * @desc   Obtener todas las ocasiones disponibles
 * @acceso Público
 */
router.get('/ocasiones', lookupController.getOcasiones);

/*
 * @ruta   GET /api/lookups/colores
 * @desc   Obtener todos los colores disponibles
 * @acceso Público
 */
router.get('/colores', lookupController.getColores);


module.exports = router;