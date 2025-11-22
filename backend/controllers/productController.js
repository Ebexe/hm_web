/* Archivo: backend-api/controllers/productController.js (Corregido) */

const pool = require('../config/db'); // Importa el pool de la BDD

// CACHÉ EN MEMORIA: cargar todos los productos al inicio
let productsCache = [];
let cacheLoaded = false;

async function loadProductsCache() {
  try {
    console.log('[ProductCache] Cargando todos los productos en memoria...');
    const [rows] = await pool.query(`
      SELECT 
        p.id_producto,
        p.nombre AS nombre_producto,
        SUBSTRING(TRIM(p.descripcion), 1, 250) AS short_description,
        p.departamento,
        MIN(v.precio) AS precio_desde,
        GROUP_CONCAT(DISTINCT v.color SEPARATOR ',') AS colores,
        GROUP_CONCAT(DISTINCT v.talla SEPARATOR ',') AS tallas
      FROM Productos p
      JOIN VariantesProducto v ON p.id_producto = v.id_producto
      GROUP BY p.id_producto
    `);
    productsCache = rows.map(r => ({
      id_producto: r.id_producto,
      nombre_producto: r.nombre_producto,
      short_description: r.short_description,
      departamento: r.departamento,
      precio_desde: Number(r.precio_desde) || null,
      colores: r.colores ? r.colores.split(',').filter(Boolean) : [],
      tallas: r.tallas ? r.tallas.split(',').filter(Boolean) : [],
      _searchText: `${r.nombre_producto} ${r.short_description}`.toLowerCase()
    }));
    cacheLoaded = true;
    console.log(`[ProductCache] ✅ Cargados ${productsCache.length} productos en memoria`);
  } catch (error) {
    console.error('[ProductCache] Error cargando caché:', error);
    cacheLoaded = false;
  }
}

// Cargar caché al iniciar el servidor
loadProductsCache();

// DICCIONARIO DE TRADUCCIÓN ES→EN para matching bilingüe
const translationDict = {
  // Ropa superior
  'camisa': ['shirt', 'blouse'],
  'camiseta': ['tshirt', 't-shirt', 'tee', 'top'],
  'blusa': ['blouse', 'top'],
  'polo': ['polo'],
  'sueter': ['sweater', 'jumper'],
  'sudadera': ['hoodie', 'sweatshirt'],
  'chaqueta': ['jacket', 'coat'],
  'abrigo': ['coat', 'overcoat'],
  'chaleco': ['vest', 'waistcoat'],
  'saco': ['blazer', 'jacket', 'suit jacket'],
  'blazer': ['blazer', 'jacket'],
  'terno': ['suit', 'blazer'],
  'boda': ['wedding', 'formal', 'blazer', 'suit'],
  
  // Ropa inferior
  'pantalon': ['pants', 'trousers', 'jeans'],
  'jean': ['jeans', 'denim'],
  'short': ['shorts'],
  'falda': ['skirt'],
  'bermuda': ['bermuda', 'shorts'],
  'jogger': ['jogger', 'joggers'],
  'leggins': ['leggings'],
  
  // Calzado
  'zapato': ['shoe', 'shoes', 'oxford', 'derby', 'loafer'],
  'zapatilla': ['sneaker', 'sneakers', 'trainer', 'trainers'],
  'bota': ['boot', 'boots'],
  'sandalia': ['sandal', 'sandals'],
  'zapato formal': ['oxford', 'derby', 'loafer', 'monk', 'dress shoe'],
  'calzado elegante': ['oxford', 'derby', 'loafer', 'monk', 'dress shoe'],
  
  // Estilos/características
  'deportivo': ['sport', 'athletic', 'sporty', 'gym', 'training'],
  'deportiva': ['sport', 'athletic', 'sporty', 'gym', 'training'],
  'casual': ['casual'],
  'formal': ['formal', 'dress'],
  'elegante': ['elegant', 'formal', 'dressy'],
  'ajustado': ['slim', 'fitted', 'tight'],
  'holgado': ['loose', 'baggy', 'relaxed'],
  'largo': ['long'],
  'corto': ['short'],
  'basico': ['basic'],
  'clasico': ['classic'],
  
  // Ocasiones
  'trabajo': ['work', 'office'],
  'fiesta': ['party'],
  'playa': ['beach'],
  'gimnasio': ['gym'],
  'entrenamiento': ['training', 'workout'],
  'deporte': ['sport', 'athletic'],
  
  // Materiales
  'algodon': ['cotton'],
  'lana': ['wool'],
  'cuero': ['leather'],
  'mezclilla': ['denim'],
  'poliester': ['polyester']
};

// Función para expandir tokens con traducciones
function expandTokensWithTranslations(tokens) {
  const expanded = new Set(tokens);
  tokens.forEach(token => {
    const translations = translationDict[token];
    if (translations) {
      translations.forEach(t => expanded.add(t));
    }
  });
  return Array.from(expanded);
}

/**
 * @desc   Obtener productos filtrados por categoría y sección con sus variantes
 * @ruta   GET /api/productos?categoria=mujer&seccion=novedades
 */
const getProductos = async (req, res) => {
  try {
    const { categoria, seccion } = req.query;
    if (!categoria || !seccion) {
      return res.status(400).json({
        error: 'Faltan parámetros "categoria" (mujer/hombre/...) y "seccion" (novedades/tendencias/...)'
      });
    }

    // Consulta Principal: Obtener los productos base
    const sqlQueryBase = `
      SELECT DISTINCT
        p.id_producto, p.nombre, p.descripcion, p.ajuste_base,
        (SELECT MIN(v.precio) FROM VariantesProducto v WHERE v.id_producto = p.id_producto) as precio_desde
      FROM Productos p
      JOIN Producto_Secciones ps ON p.id_producto = ps.id_producto
      JOIN SeccionesMarketing sm ON ps.id_seccion = sm.id_seccion
      WHERE p.departamento = ? AND sm.nombre_seccion = ?;
    `;
    const [productosBase] = await pool.query(sqlQueryBase, [categoria, seccion]);

    if (productosBase.length === 0) {
      return res.status(200).json([]);
    }

    const productoIds = productosBase.map(p => p.id_producto);

    // Consulta Secundaria: Obtener TODAS las variantes para esos productos
    // --- (CORRECCIÓN) --- Añadimos v.id_variante
    const sqlQueryVariantes = `
      SELECT
        v.id_variante, -- <--- AÑADIDO
        v.id_producto, 
        v.sku, 
        v.color, 
        v.talla, 
        v.precio, 
        v.url_imagen
      FROM VariantesProducto v
      WHERE v.id_producto IN (?);
    `;
    const [variantes] = await pool.query(sqlQueryVariantes, [productoIds]);

    // Agrupar variantes por producto
    const variantesPorProducto = variantes.reduce((acc, variante) => {
      acc[variante.id_producto] = acc[variante.id_producto] || [];
      acc[variante.id_producto].push(variante);
      return acc;
    }, {});

    // Combinar
    const productosCompletos = productosBase.map(producto => ({
      ...producto,
      variantes: variantesPorProducto[producto.id_producto] || []
    }));

    res.status(200).json(productosCompletos);

  } catch (error) {
    console.error('Error en getProductos:', error);
    res.status(500).json({ error: 'Error interno del servidor al cargar productos' });
  }
};

/**
 * @desc   Obtener los detalles completos de un solo producto por ID
 * @ruta   GET /api/productos/:id
 * @acceso Público
 */
const getProductoById = async (req, res) => {
  try {
    // 1. Obtener el ID del producto de los parámetros de la ruta (/:id)
    const { id } = req.params;
    const productId = parseInt(id, 10); // Asegurarse de que sea un número

    if (isNaN(productId)) {
        return res.status(400).json({ error: 'ID de producto inválido.' });
    }

    // 2. Consulta Principal: Obtener los detalles del producto base
    const sqlQueryProducto = `
      SELECT
        p.id_producto, p.nombre, p.descripcion, p.ajuste_base, p.departamento,
        c.nombre_categoria,
        e.nombre_estilo
      FROM Productos p
      LEFT JOIN Categorias c ON p.id_categoria = c.id_categoria
      LEFT JOIN Estilos e ON p.id_estilo = e.id_estilo
      WHERE p.id_producto = ?;
    `;
    const [productoResult] = await pool.query(sqlQueryProducto, [productId]);

    // Verificar si el producto existe
    if (productoResult.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }
    const productoBase = productoResult[0];

    // 3. Consulta Secundaria (¡CORREGIDA!)
    // --- ¡HEMOS AÑADIDO v.id_variante AL SELECT! ---
    const sqlQueryVariantes = `
      SELECT
        v.id_variante, -- <-- ¡AQUÍ ESTÁ LA CORRECCIÓN!
        v.sku, 
        v.color, 
        v.talla, 
        v.precio, 
        v.stock, 
        v.url_imagen
      FROM VariantesProducto v
      WHERE v.id_producto = ?;
    `;
    const [variantes] = await pool.query(sqlQueryVariantes, [productId]);

    // 4. Combinar el producto base con sus variantes
    const productoCompleto = {
      ...productoBase,
      variantes: variantes || [] // Asegura que variantes sea un array
    };

    // 5. Enviar la respuesta
    res.status(200).json(productoCompleto);

  } catch (error) {
    console.error(`Error en getProductoById (ID: ${req.params.id}):`, error);
    res.status(500).json({ error: 'Error interno del servidor al obtener el producto.' });
  }
};


/**
 * --- FUNCIÓN 'searchProducts' MEJORADA (PARA EL CHATBOT RAG) ---
 * @desc   Buscar productos, detectando la ocasión DESDE EL BACKEND
 * y uniéndose a la tabla 'producto_ocasion'.
 * @ruta   GET /api/productos/search?q=...&depto=...
 * @acceso Público
 */
const searchProducts = async (req, res) => {
  const { q, depto } = req.query; 

  // Nota: permitimos ahora llamadas sin 'q' para soportar búsquedas amplias/fallback
  // Si 'q' no está presente, devolveremos productos por departamento (si se provee)
  // o una selección limitada de productos (LIMIT) para que el frontend tenga candidatos.

  try {
    let queryParams = []; 
    // Empezamos con un WHERE siempre verdadero para poder concatenar condiciones opcionales
    let whereClauses = ['1=1']; 

    // Sanitize y normalizar 'q' para evitar que signos de puntuación rompan los tokens
    const rawQ = typeof q === 'string' ? q : '';
    // Reemplaza caracteres que no sean letras/números/espacio/guión por espacios
    const sanitizedQ = rawQ.replace(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ\s\-]/g, ' ').trim();
    const lowerQ = sanitizedQ.toLowerCase();

    // 1. Añadir filtro por departamento (si se provee)
    if (depto && depto !== 'general') {
      whereClauses.push('p.departamento = ?');
      queryParams.push(depto);
    }

    // 2. Lógica de Detección de Ocasión
    const [ocasiones] = await pool.query(`SELECT id_ocasion, nombre_ocasion FROM Ocasiones`);
    let detected_ocasion_id = null;

    for (const oc of ocasiones) {
      const keywords = oc.nombre_ocasion.toLowerCase().split(' ');
      
      // Sinónimos
      if (oc.nombre_ocasion.toLowerCase() === 'trabajo') keywords.push('oficina');
      if (oc.nombre_ocasion.toLowerCase() === 'evento formal') keywords.push('boda', 'fiesta', 'gala');
      if (oc.nombre_ocasion.toLowerCase() === 'actividad deportiva') keywords.push('deporte', 'gym', 'ejercicio');
      if (oc.nombre_ocasion.toLowerCase() === 'fin de semana') keywords.push('finde');

      if (lowerQ && keywords.some(k => lowerQ.includes(k))) {
         detected_ocasion_id = oc.id_ocasion;
         console.log(`[Chatbot Search] Ocasión detectada en backend: ${oc.nombre_ocasion} (ID: ${detected_ocasion_id})`);
         break; 
      }
    }

    if (detected_ocasion_id) {
      whereClauses.push('po.id_ocasion = ?'); 
      queryParams.push(detected_ocasion_id);
    }
    
    // 3. Lógica de Keywords (Búsqueda Inteligente)
    const stopWords = [
      'de', 'la', 'el', 'para', 'dame', 'quiero', 'un', 'una', 'con', 
      'ropa', 'look', 'completo', 'outfit', 'conjunto', 'algo'
    ];
    const tokens = sanitizedQ.split(/\s+/).map(t => t.toLowerCase()).filter(Boolean);
    const keywords = tokens.filter(word => word.length > 2 && !stopWords.includes(word));

    // Construimos cláusulas por token (más flexible) y añadimos también una búsqueda por frase completa
    const tokenClauses = [];
    for (const keyword of keywords) {
      queryParams.push(`%${keyword}%`, `%${keyword}%`);
      tokenClauses.push(`(p.nombre LIKE ? OR p.descripcion LIKE ?)`);
    }

    if (tokenClauses.length > 0) {
      // Añadimos las cláusulas de tokens (OR entre ellas)
      whereClauses.push(`(${tokenClauses.join(' OR ')})`);
      // Además añadimos una búsqueda por frase completa como respaldo
      queryParams.push(`%${sanitizedQ}%`, `%${sanitizedQ}%`);
      whereClauses.push(`(p.nombre LIKE ? OR p.descripcion LIKE ?)`);
    } else if (!detected_ocasion_id && sanitizedQ && sanitizedQ.length > 0) { 
      // Si no hay tokens pero sí una frase, buscar la frase completa
      whereClauses.push('(p.nombre LIKE ? OR p.descripcion LIKE ?)');
      queryParams.push(`%${sanitizedQ}%`, `%${sanitizedQ}%`);
    } else {
      // No keywords and no occasion and no meaningful q: devolvemos un set amplio
      // (filtrado por depto si aplica). No añadimos cláusulas adicionales para que el WHERE siga siendo '1=1' + depto/ocasion.
    }
    
    // 4. Construir la Consulta Final
    const finalQuery = `
      SELECT DISTINCT 
        p.id_producto, 
        p.nombre AS nombre_producto, 
        p.descripcion, 
        v.precio AS precio_venta, 
        v.color, 
        v.talla,
        v.sku
      FROM Productos p
      JOIN VariantesProducto v ON p.id_producto = v.id_producto
      LEFT JOIN producto_ocasion po ON p.id_producto = po.id_producto
      WHERE ${whereClauses.join(' AND ')}
      LIMIT 10
    `;

    console.log(`[Chatbot Search] Query: ${finalQuery}`);
    console.log(`[Chatbot Search] Params: ${JSON.stringify(queryParams)}`);

    // 5. Ejecutar la consulta
    const [rows] = await pool.query(finalQuery, queryParams);

    // 6. Devolver los resultados
    res.status(200).json({ products: rows });

  } catch (error) {
    console.error("Error en searchProducts:", error);
    res.status(500).json({ error: "Error interno del servidor al buscar productos." });
  }
};


/**
 * @desc   Endpoint para que el asistente lea la BDD en páginas y devuelva candidatos compactos
 * @ruta   GET /api/productos/assistant-search?query=...&fuzzy=true&limit=50&page=1&depto=..
 * @acceso Público
 */
const assistantSearch = async (req, res) => {
  try {
    const { query = '', fuzzy = 'true', limit = '50', page = '1', depto } = req.query;
    const lim = Math.max(1, Math.min(500, parseInt(limit, 10) || 50));
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const offset = (pg - 1) * lim;

    // MODO CACHÉ: Si el caché está cargado, buscar en memoria (MUCHO MÁS RÁPIDO)
    if (cacheLoaded && productsCache.length > 0) {
      const rawQ = String(query || '');
      const sanitized = rawQ.replace(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ\s\-]/g, ' ').trim();
      const lowerQ = sanitized.toLowerCase();

      console.log(`[assistantSearch CACHE] query: "${rawQ}" | depto: ${depto} | page: ${pg}`);

      const stopWords = ['de','la','el','para','dame','quiero','un','una','con','ropa','look','completo','outfit','conjunto','algo','y','o','en','los','las'];
      const tokens = sanitized.split(/\s+/).map(t => t.toLowerCase()).filter(t => t && t.length > 2 && !stopWords.includes(t));

      // EXPANDIR TOKENS CON TRADUCCIONES (ES→EN)
      const expandedTokens = expandTokensWithTranslations(tokens);

      console.log(`[assistantSearch CACHE] tokens: [${tokens.join(', ')}]`);
      console.log(`[assistantSearch CACHE] expandedTokens: [${expandedTokens.join(', ')}]`);

      // Filtrar productos en memoria
      let filtered = productsCache;

      // Filtro por departamento
      if (depto && depto !== 'general') {
        filtered = filtered.filter(p => p.departamento === depto);
      }

      // Búsqueda por tokens (si hay criterios)
      if (expandedTokens.length > 0 || (lowerQ && lowerQ.length > 2)) {
        filtered = filtered.filter(p => {
          const text = p._searchText;
          // Match por tokens expandidos (ES + EN) O por frase completa
          const tokenMatch = expandedTokens.length > 0 && expandedTokens.some(tk => text.includes(tk));
          const phraseMatch = lowerQ && lowerQ.length > 2 && text.includes(lowerQ);
          return tokenMatch || phraseMatch;
        });
      }

      // Si no hay matches, devolver productos aleatorios del departamento (fallback)
      if (filtered.length === 0) {
        console.log(`[assistantSearch CACHE] No matches, fallback a productos aleatorios`);
        filtered = productsCache.filter(p => !depto || depto === 'general' || p.departamento === depto);
        // Shuffle aleatorio
        filtered = filtered.sort(() => Math.random() - 0.5);
      } else {
        // Ordenar por relevancia (cuántos tokens matchean) + aleatorio
        filtered = filtered.sort(() => Math.random() - 0.5);
      }

      const total = filtered.length;
      const paginated = filtered.slice(offset, offset + lim);

      console.log(`[assistantSearch CACHE] Total matches: ${total} | Page ${pg}: ${paginated.length} productos`);

      const candidates = paginated.map(p => ({
        id_producto: p.id_producto,
        nombre_producto: p.nombre_producto,
        short_description: p.short_description,
        precio_desde: p.precio_desde,
        colores: p.colores,
        tallas: p.tallas,
        match_source: 'memory_cache'
      }));

      return res.status(200).json({ total, page: pg, limit: lim, candidates });
    }

    // MODO SQL (fallback si caché no está disponible)
    console.log('[assistantSearch] Caché no disponible, usando SQL...');
    const rawQ = String(query || '');
    const sanitized = rawQ.replace(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ\s\-]/g, ' ').trim();
    const lowerQ = sanitized.toLowerCase();

    console.log(`[assistantSearch] rawQ: "${rawQ}" | sanitized: "${sanitized}" | lowerQ: "${lowerQ}" | depto: ${depto} | page: ${pg}`);

    // Tokens útiles (sin stopwords)
    const stopWords = ['de','la','el','para','dame','quiero','un','una','con','ropa','look','completo','outfit','conjunto','algo','y','o','en','los','las'];
    const tokens = sanitized.split(/\s+/).map(t => t.toLowerCase()).filter(t => t && t.length > 2 && !stopWords.includes(t));

    console.log(`[assistantSearch] tokens: [${tokens.join(', ')}]`);

    const where = ['1=1'];
    const params = [];
    if (depto && depto !== 'general') {
      where.push('p.departamento = ?');
      params.push(depto);
    }

    // Si hay tokens, construir cláusulas OR por token para nombre/descripcion
    const tokenClauses = [];
    for (const tk of tokens) {
      tokenClauses.push('(LOWER(p.nombre) LIKE ? OR LOWER(p.descripcion) LIKE ?)');
      params.push(`%${tk}%`, `%${tk}%`);
    }
    if (tokenClauses.length > 0) {
      where.push('(' + tokenClauses.join(' OR ') + ')');
    }

    // Frase completa como respaldo
    if (lowerQ && lowerQ.length > 2) {
      where.push('(LOWER(p.nombre) LIKE ? OR LOWER(p.descripcion) LIKE ?)');
      params.push(`%${lowerQ}%`, `%${lowerQ}%`);
    }

    // FALLBACK: Si no hay tokens válidos ni frase, devolver productos aleatorios del departamento
    const hasSearchCriteria = tokenClauses.length > 0 || (lowerQ && lowerQ.length > 2);
    console.log(`[assistantSearch] hasSearchCriteria: ${hasSearchCriteria}`);

    if (!hasSearchCriteria) {
      // Modo fallback: devolver productos aleatorios del departamento
      console.log(`[assistantSearch] FALLBACK MODE: no search criteria, returning random products`);
      const fallbackWhere = depto && depto !== 'general' ? 'WHERE p.departamento = ?' : 'WHERE 1=1';
      const fallbackParams = depto && depto !== 'general' ? [depto] : [];

      const countQuery = `SELECT COUNT(DISTINCT p.id_producto) AS total FROM Productos p ${fallbackWhere}`;
      const [countRows] = await pool.query(countQuery, fallbackParams);
      const total = (countRows && countRows[0] && countRows[0].total) ? Number(countRows[0].total) : 0;

      const mainQuery = `
        SELECT
          p.id_producto,
          p.nombre AS nombre_producto,
          SUBSTRING(TRIM(p.descripcion), 1, 250) AS short_description,
          MIN(v.precio) AS precio_desde,
          GROUP_CONCAT(DISTINCT v.color SEPARATOR ',') AS colores,
          GROUP_CONCAT(DISTINCT v.talla SEPARATOR ',') AS tallas
        FROM Productos p
        JOIN VariantesProducto v ON p.id_producto = v.id_producto
        ${fallbackWhere}
        GROUP BY p.id_producto
        ORDER BY RAND()
        LIMIT ? OFFSET ?;
      `;

      const paramsForMain = fallbackParams.slice();
      paramsForMain.push(lim, offset);

      const [rows] = await pool.query(mainQuery, paramsForMain);
      console.log(`[assistantSearch] FALLBACK returned ${rows.length} candidates`);

      const candidates = (rows || []).map((r) => ({
        id_producto: r.id_producto,
        nombre_producto: r.nombre_producto,
        short_description: r.short_description,
        precio_desde: Number(r.precio_desde) || null,
        colores: r.colores ? r.colores.split(',').filter(Boolean) : [],
        tallas: r.tallas ? r.tallas.split(',').filter(Boolean) : [],
        match_source: 'random_fallback'
      }));

      return res.status(200).json({ total, page: pg, limit: lim, candidates });
    }

    // Consulta de conteo total
    const countQuery = `SELECT COUNT(DISTINCT p.id_producto) AS total FROM Productos p WHERE ${where.join(' AND ')}`;
    const [countRows] = await pool.query(countQuery, params);
    const total = (countRows && countRows[0] && countRows[0].total) ? Number(countRows[0].total) : 0;

    // Consulta principal: devolver campos compactos + agregaciones
    const mainQuery = `
      SELECT
        p.id_producto,
        p.nombre AS nombre_producto,
        SUBSTRING(TRIM(p.descripcion), 1, 250) AS short_description,
        MIN(v.precio) AS precio_desde,
        GROUP_CONCAT(DISTINCT v.color SEPARATOR ',') AS colores,
        GROUP_CONCAT(DISTINCT v.talla SEPARATOR ',') AS tallas
      FROM Productos p
      JOIN VariantesProducto v ON p.id_producto = v.id_producto
      WHERE ${where.join(' AND ')}
      GROUP BY p.id_producto
      ORDER BY precio_desde ASC
      LIMIT ? OFFSET ?;
    `;

    // paramsForMain: copia de params + limit/offset
    const paramsForMain = params.slice();
    paramsForMain.push(lim, offset);

    const [rows] = await pool.query(mainQuery, paramsForMain);

    console.log(`[assistantSearch] Query returned ${rows.length} candidates (total in DB: ${total})`);

    // FALLBACK SECUNDARIO: Si no encontramos nada con los criterios, devolver aleatorios
    if (rows.length === 0 && total === 0 && hasSearchCriteria) {
      console.log(`[assistantSearch] SECONDARY FALLBACK: no matches found, returning random products`);
      const fallbackWhere = depto && depto !== 'general' ? 'WHERE p.departamento = ?' : 'WHERE 1=1';
      const fallbackParams = depto && depto !== 'general' ? [depto] : [];

      const countQuery = `SELECT COUNT(DISTINCT p.id_producto) AS total FROM Productos p ${fallbackWhere}`;
      const [countRows] = await pool.query(countQuery, fallbackParams);
      const newTotal = (countRows && countRows[0] && countRows[0].total) ? Number(countRows[0].total) : 0;

      const fallbackQuery = `
        SELECT
          p.id_producto,
          p.nombre AS nombre_producto,
          SUBSTRING(TRIM(p.descripcion), 1, 250) AS short_description,
          MIN(v.precio) AS precio_desde,
          GROUP_CONCAT(DISTINCT v.color SEPARATOR ',') AS colores,
          GROUP_CONCAT(DISTINCT v.talla SEPARATOR ',') AS tallas
        FROM Productos p
        JOIN VariantesProducto v ON p.id_producto = v.id_producto
        ${fallbackWhere}
        GROUP BY p.id_producto
        ORDER BY RAND()
        LIMIT ? OFFSET ?;
      `;

      const fallbackParamsForMain = fallbackParams.slice();
      fallbackParamsForMain.push(lim, offset);

      const [fallbackRows] = await pool.query(fallbackQuery, fallbackParamsForMain);
      console.log(`[assistantSearch] SECONDARY FALLBACK returned ${fallbackRows.length} candidates`);

      const candidates = (fallbackRows || []).map((r) => ({
        id_producto: r.id_producto,
        nombre_producto: r.nombre_producto,
        short_description: r.short_description,
        precio_desde: Number(r.precio_desde) || null,
        colores: r.colores ? r.colores.split(',').filter(Boolean) : [],
        tallas: r.tallas ? r.tallas.split(',').filter(Boolean) : [],
        match_source: 'random_fallback'
      }));

      return res.status(200).json({ total: newTotal, page: pg, limit: lim, candidates });
    }

    // Determinar match_source por heurística (phrase | token | fallback)
    const candidates = (rows || []).map((r) => {
      const nameLower = (r.nombre_producto || '').toLowerCase();
      let match_source = 'fallback';
      if (lowerQ && nameLower.includes(lowerQ)) match_source = 'phrase';
      else if (tokens.some(t => nameLower.includes(t))) match_source = 'token';
      return {
        id_producto: r.id_producto,
        nombre_producto: r.nombre_producto,
        short_description: r.short_description,
        precio_desde: Number(r.precio_desde) || null,
        colores: r.colores ? r.colores.split(',').filter(Boolean) : [],
        tallas: r.tallas ? r.tallas.split(',').filter(Boolean) : [],
        match_source
      };
    });

    res.status(200).json({ total, page: pg, limit: lim, candidates });

  } catch (error) {
    console.error('Error en assistantSearch:', error);
    res.status(500).json({ error: 'Error interno procesando assistant-search' });
  }
};


// --- EXPORTACIONES ACTUALIZADAS ---
module.exports = {
  getProductos,
  getProductoById,
  searchProducts,
  assistantSearch,
};