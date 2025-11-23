// Script para agregar columnas direccion y dni a la tabla Usuarios
// Ejecutar con: node backend/add-delivery-columns.js

const pool = require('./config/db');

async function addColumns() {
  let connection;
  try {
    console.log('🚀 Iniciando proceso de agregar columnas...\n');
    
    connection = await pool.getConnection();
    
    // Verificar si ya existen
    const [existing] = await connection.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'hm_chatbot_db'
        AND TABLE_NAME = 'Usuarios'
        AND COLUMN_NAME IN ('direccion', 'dni')
    `);
    
    if (existing[0].count === 2) {
      console.log('✅ Las columnas ya existen. No se requiere ninguna acción.');
      connection.release();
      await pool.end();
      return;
    }
    
    console.log('📝 Agregando columnas a la tabla Usuarios...\n');
    
    // Agregar columna direccion si no existe
    try {
      await connection.query(`
        ALTER TABLE Usuarios 
        ADD COLUMN direccion TEXT DEFAULT NULL
      `);
      console.log('✅ Columna "direccion" agregada exitosamente');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Columna "direccion" ya existe');
      } else {
        throw err;
      }
    }
    
    // Agregar columna dni si no existe
    try {
      await connection.query(`
        ALTER TABLE Usuarios 
        ADD COLUMN dni VARCHAR(8) DEFAULT NULL
      `);
      console.log('✅ Columna "dni" agregada exitosamente');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Columna "dni" ya existe');
      } else {
        throw err;
      }
    }
    
    console.log('\n✅ Proceso completado exitosamente\n');
    
    // Verificar resultado final
    const [finalColumns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'hm_chatbot_db'
        AND TABLE_NAME = 'Usuarios'
        AND COLUMN_NAME IN ('direccion', 'dni')
      ORDER BY COLUMN_NAME
    `);
    
    console.log('📊 Columnas verificadas:');
    finalColumns.forEach(col => {
      console.log(`   ✓ ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });
    
    console.log('\n🎉 ¡Sistema de gestión de entregas listo para usar!');
    console.log('   Puedes reiniciar el servidor si está corriendo.');
    
    connection.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error al agregar columnas:', error.message);
    if (connection) connection.release();
    await pool.end();
    process.exit(1);
  }
}

addColumns();
