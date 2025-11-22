/* Archivo: backend-api/routes/index.js */

const express = require('express');
const router = express.Router();

// --- Importa tus archivos de rutas ---
const authRoutes = require('./authRoutes');
const productRoutes = require('./productRoutes');
const userRoutes = require('./userRoutes');
const lookupRoutes = require('./lookupRoutes'); 
const cartRoutes = require('./cartRoutes');// <-- 1. IMPORTA LAS NUEVAS RUTAS

// --- Define las rutas base ---

router.use('/auth', authRoutes);
router.use('/productos', productRoutes);
router.use('/users', userRoutes);
router.use('/cart', cartRoutes);// <-- 2. AÑADE ESTA LÍNEA

// Cualquier petición a "/api/lookups/..." será manejada por 'lookupRoutes'
router.use('/lookups', lookupRoutes); 

module.exports = router;