// Script de verificación de columnas en la base de datos
// Ejecutar con: node backend/test-db-columns.js

const pool = require('./config/db');

async function verifyColumns() {
  try {
    console.log('🔍 Verificando columnas en tabla Usuarios...\n');
    
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'hm_chatbot_db'
        AND TABLE_NAME = 'Usuarios'
        AND COLUMN_NAME IN ('direccion', 'dni')
      ORDER BY COLUMN_NAME
    `);
    
    if (columns.length === 0) {
      console.log('❌ Las columnas "direccion" y "dni" NO existen en la tabla Usuarios');
      console.log('\n📋 Solución:');
      console.log('   1. Ejecuta el script SQL:');
      console.log('      mysql -u root -p < backend/migrations/add_direccion_dni.sql');
      console.log('   2. O manualmente:');
      console.log('      ALTER TABLE Usuarios ADD COLUMN direccion TEXT DEFAULT NULL;');
      console.log('      ALTER TABLE Usuarios ADD COLUMN dni VARCHAR(8) DEFAULT NULL;');
    } else {
      console.log('✅ Columnas encontradas:\n');
      columns.forEach(col => {
        console.log(`   - ${col.COLUMN_NAME}`);
        console.log(`     Tipo: ${col.DATA_TYPE}`);
        console.log(`     Nullable: ${col.IS_NULLABLE}`);
        console.log(`     Default: ${col.COLUMN_DEFAULT || 'NULL'}`);
        console.log('');
      });
      
      if (columns.length === 2) {
        console.log('✅ ¡Todas las columnas necesarias están presentes!');
        console.log('   El sistema de gestión de entregas está listo para usar.');
      } else {
        console.log('⚠️  Advertencia: Solo se encontraron', columns.length, 'de 2 columnas esperadas');
      }
    }
    
    // Verificar también la estructura básica de Usuarios
    console.log('\n📊 Estructura actual de tabla Usuarios:');
    const [allColumns] = await pool.query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'hm_chatbot_db'
        AND TABLE_NAME = 'Usuarios'
      ORDER BY ORDINAL_POSITION
    `);
    
    allColumns.forEach(col => {
      const check = (col.COLUMN_NAME === 'direccion' || col.COLUMN_NAME === 'dni') ? '✅' : '  ';
      console.log(`   ${check} ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error al verificar columnas:', error.message);
    process.exit(1);
  }
}

verifyColumns();
