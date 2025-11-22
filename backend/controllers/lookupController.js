/* Archivo: backend-api/controllers/lookupController.js */

const pool = require('../config/db');

// Función genérica para obtener datos de una tabla lookup
const getLookupTable = (tableName) => async (req, res) => {
  try {
    // Usamos 'pool.query' directamente ya que la tabla es de confianza
    const [rows] = await pool.query(`SELECT * FROM ??`, [tableName]);
    res.status(200).json(rows);
  } catch (error) {
    console.error(`Error en getLookupTable (${tableName}):`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Creamos una función específica para cada ruta
const getEstilos = getLookupTable('Estilos');
const getOcasiones = getLookupTable('Ocasiones');
const getColores = getLookupTable('Colores');

module.exports = {
  getEstilos,
  getOcasiones,
  getColores,
};