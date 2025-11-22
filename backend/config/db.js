/* Archivo: backend-api/config/db.js */

const mysql = require('mysql2/promise');
require('dotenv').config(); // Carga las variables del archivo .env

// Configuración del "pool" de conexiones
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Crea el "pool" de conexiones a la base de datos
// Un pool es mucho más eficiente que crear una conexión nueva por cada consulta
const pool = mysql.createPool(dbConfig);

// Función de prueba para verificar la conexión
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Base de datos conectada exitosamente (ID:', connection.threadId + ')');
    connection.release(); // Libera la conexión de vuelta al pool
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error.message);
  }
}

// Llama a la función de prueba al iniciar
testConnection();

// Exporta el pool para que otros archivos (controladores) puedan usarlo
module.exports = pool;