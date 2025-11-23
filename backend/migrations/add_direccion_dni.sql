-- Script para agregar columnas de dirección y DNI a la tabla Usuarios
-- Ejecutar solo si las columnas no existen

USE hm_chatbot_db;

-- Verificar si las columnas ya existen
SET @dbname = DATABASE();
SET @tablename = 'Usuarios';
SET @columnname_direccion = 'direccion';
SET @columnname_dni = 'dni';

-- Agregar columna 'direccion' si no existe
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
     AND TABLE_NAME = @tablename
     AND COLUMN_NAME = @columnname_direccion
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname_direccion, ' TEXT DEFAULT NULL')
));

PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Agregar columna 'dni' si no existe
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
     AND TABLE_NAME = @tablename
     AND COLUMN_NAME = @columnname_dni
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname_dni, ' VARCHAR(8) DEFAULT NULL')
));

PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Verificar que las columnas se crearon correctamente
SHOW COLUMNS FROM Usuarios LIKE 'direccion';
SHOW COLUMNS FROM Usuarios LIKE 'dni';

SELECT 'Columnas direccion y dni agregadas exitosamente (o ya existían)' AS Resultado;
