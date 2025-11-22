/* Archivo: backend-api/server.js */

// 1. Cargar variables de entorno
require('dotenv').config();

// 2. Importar dependencias
const express = require('express');
const cors = require('cors');
const path = require('path'); // <-- ¡AÑADIR ESTA LÍNEA!

// 3. Importar la conexión a la BDD
require('./config/db');

// --- Importar rutas ---
const allApiRoutes = require('./routes/index');

// 4. Inicializar la aplicación Express
const app = express();
const PORT = process.env.PORT || 3001;

// 5. Middlewares
app.use(cors());
app.use(express.json());

// --- ¡AÑADIR ESTA LÍNEA PARA SERVIR IMÁGENES! ---
// Debe ir ANTES de las rutas de la API
app.use('/imagenes', express.static(path.join(__dirname, 'public/imagenes')));

// 6. Rutas de la API
app.use('/api', allApiRoutes);

// Ruta de prueba (puedes mantenerla o quitarla)
app.get('/api/test', (req, res) => {
  res.json({ message: '¡API de H&M funcionando correctamente!' });
});

// 7. Manejadores de Errores
app.use((req, res, next) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// 8. Iniciar el Servidor
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});