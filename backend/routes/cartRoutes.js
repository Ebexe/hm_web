// Archivo: backend/routes/cartRoutes.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); 
const cartController = require('../controllers/cartController');

// --- (Rutas existentes) ---
router.get('/', protect, cartController.getCart);
router.post('/add', protect, cartController.addCartItem);
router.put('/update/:id_variante', protect, cartController.updateCartItem);
router.delete('/remove/:id_variante', protect, cartController.removeCartItem);

// --- (NUEVA RUTA AÑADIDA) ---
/*
 * @ruta   POST /api/cart/checkout
 * @desc   Procesa el pago y convierte el carrito en una compra
 * @acceso Privado
 */
router.post('/checkout', protect, cartController.checkout); // <-- AÑADIR ESTA LÍNEA

module.exports = router;