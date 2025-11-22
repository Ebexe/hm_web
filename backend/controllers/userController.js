/* Archivo: backend-api/controllers/userController.js (FINALIZADO Y DEPURADO) */

const pool = require('../config/db');

/**
 * @desc   Obtener el perfil del usuario (Datos Básicos y Medidas Corporales)
 * @ruta   GET /api/users/profile
 * @acceso Privado
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    
    // CORRECCIÓN: Consulta SQL limpia y estandarizada (sin espacios de indentación)
    const [profileData] = await pool.query(`
SELECT
  u.id_usuario,
  u.email,
  u.nombre,
  p.departamento_preferido,
  p.edad,
  p.altura_cm,
  p.peso_kg,
  p.tono_piel,
  p.tipo_cuerpo,
  m.pecho_cm,
  m.cintura_cm,
  m.cadera_cm,
  m.largo_brazo_cm,
  m.largo_pierna_tiro_cm
FROM Usuarios u
LEFT JOIN PerfilesUsuario p ON u.id_usuario = p.id_usuario
LEFT JOIN MedidasCorporales m ON u.id_usuario = m.id_usuario
WHERE u.id_usuario = ?;
`, [userId]);
    
    if (profileData.length === 0) {
      return res.status(404).json({ error: 'Perfil de usuario no encontrado' });
    }
    res.status(200).json(profileData[0]);
    
  } catch (error) {
    console.error('Error en getProfile:', error);
    res.status(500).json({ 
        error: 'Error interno del servidor al cargar perfil. Revise la conexión a BDD y la sintaxis SQL.',
        details: error.message 
    });
  }
};

/**
 * @desc   Actualizar/Crear el perfil del usuario (Datos Básicos y Medidas Corporales)
 * @ruta   PUT /api/users/profile
 * @acceso Privado
 */
const updateProfile = async (req, res) => {
  try {
    const { id_usuario } = req.user;
    const {
      nombre, 
      departamento_preferido, edad, altura_cm, peso_kg, tono_piel, tipo_cuerpo,
      pecho_cm, cintura_cm, cadera_cm, largo_brazo_cm, largo_pierna_tiro_cm
    } = req.body;
    
    // 1. Actualizar Nombre en la tabla Usuarios
    if (nombre) {
      await pool.query(
        'UPDATE Usuarios SET nombre = ? WHERE id_usuario = ?',
        [nombre, id_usuario]
      );
    }

    // 2. Upsert (Insertar/Actualizar) PerfilesUsuario - ¡LÍNEA ÚNICA!
    const sqlProfile = `
INSERT INTO PerfilesUsuario (id_usuario, departamento_preferido, edad, altura_cm, peso_kg, tono_piel, tipo_cuerpo) 
VALUES (?, ?, ?, ?, ?, ?, ?) 
ON DUPLICATE KEY UPDATE departamento_preferido = VALUES(departamento_preferido), edad = VALUES(edad), altura_cm = VALUES(altura_cm), peso_kg = VALUES(peso_kg), tono_piel = VALUES(tono_piel), tipo_cuerpo = VALUES(tipo_cuerpo);
`;
    await pool.query(sqlProfile, [
      id_usuario, departamento_preferido, edad, altura_cm, peso_kg, tono_piel, tipo_cuerpo
    ]);
    
    // 3. Upsert (Insertar/Actualizar) MedidasCorporales - ¡LÍNEA ÚNICA!
    const sqlMedidas = `
INSERT INTO MedidasCorporales (id_usuario, pecho_cm, cintura_cm, cadera_cm, largo_brazo_cm, largo_pierna_tiro_cm) 
VALUES (?, ?, ?, ?, ?, ?) 
ON DUPLICATE KEY UPDATE pecho_cm = VALUES(pecho_cm), cintura_cm = VALUES(cintura_cm), cadera_cm = VALUES(cadera_cm), largo_brazo_cm = VALUES(largo_brazo_cm), largo_pierna_tiro_cm = VALUES(largo_pierna_tiro_cm);
`;
    await pool.query(sqlMedidas, [id_usuario, pecho_cm, cintura_cm, cadera_cm, largo_brazo_cm, largo_pierna_tiro_cm]);
    
    // 4. Si el frontend envía una `talla_calzado`, la guardamos como una preferencia de ajuste
    //    en PreferenciasAjusteUsuario con id_categoria = 12 (Calzado). Esto evita cambiar el esquema
    //    de PerfilesUsuario y reutiliza la tabla de ajustes ya existente.
    try {
      const { talla_calzado } = req.body;
      if (typeof talla_calzado !== 'undefined' && talla_calzado !== null && String(talla_calzado).trim() !== '') {
        // Eliminamos cualquier registro previo para calzado y lo insertamos como talla habitual
        await pool.query('DELETE FROM PreferenciasAjusteUsuario WHERE id_usuario = ? AND id_categoria = ?', [id_usuario, 12]);
        await pool.query('INSERT INTO PreferenciasAjusteUsuario (id_usuario, id_categoria, talla_habitual, ajuste_preferido) VALUES (?, ?, ?, ?)', [id_usuario, 12, String(talla_calzado).trim(), 'regular']);
      }
    } catch (err) {
      // No queremos fallar toda la actualización de perfil por un problema con la talla de calzado,
      // así que registramos el error y continuamos.
      console.warn('No se pudo guardar talla_calzado en PreferenciasAjusteUsuario:', err.message || err);
    }
    res.status(200).json({ message: 'Perfil actualizado exitosamente' });
  } catch (error) {
    console.error('Error en updateProfile:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};  


/**
 * @desc   Obtener las preferencias de estilo (Colores, Ocasiones, Estilos)
 * @ruta   GET /api/users/preferences
 */
const getPreferences = async (req, res) => {
  try {
    const { id_usuario } = req.user;

    const [estilos] = await pool.query('SELECT id_estilo FROM Usuario_Estilos_Preferidos WHERE id_usuario = ?', [id_usuario]);
    const [ocasiones] = await pool.query('SELECT id_ocasion FROM Usuario_Ocasiones_Preferidas WHERE id_usuario = ?', [id_usuario]);
    const [colores] = await pool.query('SELECT id_color FROM Usuario_Colores_Favoritos WHERE id_usuario = ?', [id_usuario]);

    res.status(200).json({
      estilos: estilos.map(e => e.id_estilo),
      ocasiones: ocasiones.map(o => o.id_ocasion),
      colores: colores.map(c => c.id_color)
    });
    
  } catch (error) {
    console.error('Error en getPreferences:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * @desc   Actualizar/Sincronizar las preferencias de estilo
 * @ruta   PUT /api/users/preferences
 */
const updatePreferences = async (req, res) => {
  const { id_usuario } = req.user;
  const { estilos = [], ocasiones = [], colores = [] } = req.body;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Eliminar y re-insertar (sincronizar)
    await connection.query('DELETE FROM Usuario_Estilos_Preferidos WHERE id_usuario = ?', [id_usuario]);
    await connection.query('DELETE FROM Usuario_Ocasiones_Preferidas WHERE id_usuario = ?', [id_usuario]);
    await connection.query('DELETE FROM Usuario_Colores_Favoritos WHERE id_usuario = ?', [id_usuario]);

    if (estilos.length > 0) {
      const estilosData = estilos.map(id => [id_usuario, id]);
      await connection.query('INSERT INTO Usuario_Estilos_Preferidos (id_usuario, id_estilo) VALUES ?', [estilosData]);
    }
    if (ocasiones.length > 0) {
      const ocasionesData = ocasiones.map(id => [id_usuario, id]);
      await connection.query('INSERT INTO Usuario_Ocasiones_Preferidas (id_usuario, id_ocasion) VALUES ?', [ocasionesData]);
    }
    if (colores.length > 0) {
      const coloresData = colores.map(id => [id_usuario, id]);
      await connection.query('INSERT INTO Usuario_Colores_Favoritos (id_usuario, id_color) VALUES ?', [coloresData]);
    }

    await connection.commit();
    res.status(200).json({ message: 'Preferencias actualizadas exitosamente' });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error en updatePreferences:', error);
    res.status(500).json({ error: 'Error al actualizar las preferencias' });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * @desc   Obtener las preferencias de ajuste por categoría
 * @ruta   GET /api/users/ajustes
 */
const getUserAjustes = async (req, res) => {
  try {
    const { id_usuario } = req.user;
    
    const [ajustes] = await pool.query(`
SELECT 
  pa.id_categoria, 
  pa.talla_habitual, 
  pa.ajuste_preferido,
  c.nombre_categoria
FROM PreferenciasAjusteUsuario pa
JOIN Categorias c ON pa.id_categoria = c.id_categoria
WHERE pa.id_usuario = ?
`, [id_usuario]); // <-- CORRECCIÓN: Eliminados espacios innecesarios

    res.status(200).json(ajustes);
  } catch (error) {
    console.error('Error en getUserAjustes:', error);
    res.status(500).json({ error: 'Error interno del servidor al cargar ajustes' });
  }
};

/**
 * @desc   Actualizar/Sincronizar las preferencias de ajuste por categoría
 * @ruta   PUT /api/users/ajustes
 */
const updateUserAjustes = async (req, res) => {
  const { id_usuario } = req.user;
  const { ajustes = [] } = req.body;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Borrar todas las preferencias antiguas para este usuario
    await connection.query('DELETE FROM PreferenciasAjusteUsuario WHERE id_usuario = ?', [id_usuario]);

    // Insertar las nuevas preferencias
    if (ajustes.length > 0) {
      const ajustesData = ajustes.map(a => [
        id_usuario, 
        a.id_categoria, 
        a.talla_habitual, 
        a.ajuste_preferido
      ]);
      
      await connection.query(
        'INSERT INTO PreferenciasAjusteUsuario (id_usuario, id_categoria, talla_habitual, ajuste_preferido) VALUES ?',
        [ajustesData]
      );
    }

    await connection.commit();
    res.status(200).json({ message: 'Preferencias de ajuste actualizadas exitosamente' });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error en updateUserAjustes:', error);
    res.status(500).json({ error: 'Error al actualizar las preferencias de ajuste' });
  } finally {
    if (connection) connection.release();
  }
};


// --- EXPORTACIONES FINALES ---
module.exports = {
  getProfile,
  updateProfile,
  getPreferences,
  updatePreferences,
  getUserAjustes, 
  updateUserAjustes, 
};