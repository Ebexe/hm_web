/* Archivo: backend-api/routes/productRoutes.js (ACTUALIZADO) */

const express = require('express');
const router = express.Router();

// 1. Importa el controlador de productos
const productController = require('../controllers/productController');

/*
 * @ruta   GET /api/productos
 * @desc   Obtener productos filtrados por categoría y/o sección
 * @query  ?categoria=mujer&seccion=novedades
 * @acceso Público
 */
// Ruta existente para obtener la lista de productos
router.get('/', productController.getProductos);


/*
 * --- NUEVA RUTA AÑADIDA PARA CHATBOT (RAG) ---
 * @ruta   GET /api/productos/search
 * @desc   Buscar productos para el chatbot por query y departamento
 * @query  ?q=camisa&depto=hombre
 * @acceso Público
 */
// Esta ruta DEBE ir ANTES de '/:id' para que 'search' no sea tomado como un ':id'
router.get('/search', productController.searchProducts); 
// Ruta para que el asistente lea la BDD en páginas
router.get('/assistant-search', productController.assistantSearch);


/*
 * @ruta   GET /api/productos/:id
 * @desc   Obtener los detalles de un solo producto por su ID
 * @param  id: El ID numérico del producto
 * @acceso Público
 */
// Ruta existente para obtener un producto por ID
router.get('/:id', productController.getProductoById); 


module.exports = router;