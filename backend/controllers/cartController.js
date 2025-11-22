// Archivo: backend/controllers/cartController.js

const pool = require('../config/db'); // Importa tu conexión a la BDD

// ... (Las funciones getOrCreateCart, getCart, addCartItem, updateCartItem, removeCartItem no cambian) ...
// ... (Pega esas funciones aquí si las borraste) ...

/**
 * Función helper para obtener el ID del carrito de un usuario.
 */
const getOrCreateCart = async (id_usuario) => {
    let [rows] = await pool.query('SELECT id_carrito FROM carritos WHERE id_usuario = ?', [id_usuario]);
    if (rows.length > 0) {
        return rows[0].id_carrito;
    } else {
        const [result] = await pool.query('INSERT INTO carritos (id_usuario) VALUES (?)', [id_usuario]);
        return result.insertId;
    }
};

/**
 * @desc   Obtener el carrito completo del usuario
 * @ruta   GET /api/cart
 */
const getCart = async (req, res) => {
    try {
        const id_usuario = req.user.id_usuario;
        const id_carrito = await getOrCreateCart(id_usuario);
        const sql = `
            SELECT 
                ci.id_variante, ci.cantidad, ci.precio_en_carrito,
                v.sku, v.color, v.talla, v.url_imagen, v.stock, -- Añadimos stock
                p.nombre AS nombre_producto, p.id_producto
            FROM carrito_items ci
            JOIN variantesproducto v ON ci.id_variante = v.id_variante
            JOIN productos p ON v.id_producto = p.id_producto
            WHERE ci.id_carrito = ?;
        `;
        const [items] = await pool.query(sql, [id_carrito]);
        const total = items.reduce((sum, item) => sum + (item.precio_en_carrito * item.cantidad), 0);
        res.json({ items: items, total: total.toFixed(2) });
    } catch (error) {
        console.error('Error en getCart:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

/**
 * @desc   Añadir un item al carrito
 * @ruta   POST /api/cart/add
 */
const addCartItem = async (req, res) => {
    const { id_variante, cantidad } = req.body;
    const id_usuario = req.user.id_usuario;
    if (!id_variante || !cantidad || cantidad < 1) {
        return res.status(400).json({ error: 'Faltan id_variante o cantidad válida.' });
    }
    try {
        const id_carrito = await getOrCreateCart(id_usuario);
        const [varianteRows] = await pool.query('SELECT precio, stock FROM variantesproducto WHERE id_variante = ?', [id_variante]);
        if (varianteRows.length === 0) {
            return res.status(404).json({ error: 'Variante de producto no encontrada.' });
        }
        const { precio, stock } = varianteRows[0];
        // Revisar stock antes de añadir
        const [cartRows] = await pool.query('SELECT cantidad FROM carrito_items WHERE id_carrito = ? AND id_variante = ?', [id_carrito, id_variante]);
        const cantidadEnCarrito = cartRows.length > 0 ? cartRows[0].cantidad : 0;
        if ((cantidad + cantidadEnCarrito) > stock) {
            return res.status(400).json({ error: `Stock insuficiente. Solo quedan ${stock} unidades.` });
        }
        const sql = `
            INSERT INTO carrito_items (id_carrito, id_variante, cantidad, precio_en_carrito)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            cantidad = cantidad + VALUES(cantidad),
            precio_en_carrito = VALUES(precio_en_carrito);
        `;
        await pool.query(sql, [id_carrito, id_variante, cantidad, precio]);
        return getCart(req, res);
    } catch (error) {
        console.error('Error en addCartItem:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

/**
 * @desc   Actualizar cantidad de un item
 * @ruta   PUT /api/cart/update/:id_variante
 */
const updateCartItem = async (req, res) => {
    const { id_variante } = req.params;
    const { cantidad } = req.body;
    const id_usuario = req.user.id_usuario;
    if (cantidad < 0) {
        return res.status(400).json({ error: 'Cantidad no puede ser negativa.' });
    }
    if (cantidad === 0) {
        return removeCartItem(req, res);
    }
    try {
        const [varianteRows] = await pool.query('SELECT stock FROM variantesproducto WHERE id_variante = ?', [id_variante]);
        if (varianteRows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }
        if (cantidad > varianteRows[0].stock) {
            return res.status(400).json({ error: `Stock insuficiente. Solo quedan ${varianteRows[0].stock} unidades.` });
        }
        const sql = `
            UPDATE carrito_items ci
            JOIN carritos c ON ci.id_carrito = c.id_carrito
            SET ci.cantidad = ?
            WHERE c.id_usuario = ? AND ci.id_variante = ?;
        `;
        const [result] = await pool.query(sql, [cantidad, id_usuario, id_variante]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Item no encontrado en el carrito.' });
        }
        return getCart(req, res);
    } catch (error) {
        console.error('Error en updateCartItem:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

/**
 * @desc   Eliminar un item del carrito
 * @ruta   DELETE /api/cart/remove/:id_variante
 */
const removeCartItem = async (req, res) => {
    const { id_variante } = req.params;
    const id_usuario = req.user.id_usuario;
    try {
        const sql = `
            DELETE ci FROM carrito_items ci
            JOIN carritos c ON ci.id_carrito = c.id_carrito
            WHERE c.id_usuario = ? AND ci.id_variante = ?;
        `;
        const [result] = await pool.query(sql, [id_usuario, id_variante]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Item no encontrado en el carrito.' });
        }
        return getCart(req, res);
    } catch (error) {
        console.error('Error en removeCartItem:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};


// --- (NUEVA FUNCIÓN AÑADIDA) ---
/**
 * @desc   Procesa el checkout, convierte carrito en compra
 * @ruta   POST /api/cart/checkout
 */
const checkout = async (req, res) => {
    const id_usuario = req.user.id_usuario;
    // Recibimos los costos calculados por el frontend
    const { shippingCost, total } = req.body; 
    
    // Obtenemos una conexión del pool para manejar la transacción
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction(); // <-- INICIA TRANSACCIÓN

        // 1. Obtener el id_carrito
        const [cartRows] = await connection.query('SELECT id_carrito FROM carritos WHERE id_usuario = ?', [id_usuario]);
        if (cartRows.length === 0) {
            throw new Error('No se encontró carrito para este usuario.');
        }
        const id_carrito = cartRows[0].id_carrito;

        // 2. Obtener items del carrito y BLOQUEAR las filas de variantes para verificar stock
        const sqlGetItems = `
            SELECT 
                ci.id_variante, ci.cantidad, ci.precio_en_carrito,
                v.stock
            FROM carrito_items ci
            JOIN variantesproducto v ON ci.id_variante = v.id_variante
            WHERE ci.id_carrito = ?
            FOR UPDATE; -- <-- Bloquea estas filas en 'variantesproducto'
        `;
        const [items] = await connection.query(sqlGetItems, [id_carrito]);
        
        if (items.length === 0) {
            throw new Error('El carrito está vacío.');
        }

        // 3. Verificar Stock y Calcular Total (VERIFICACIÓN DEL LADO DEL SERVIDOR)
        let calculatedSubtotal = 0;
        for (const item of items) {
            if (item.cantidad > item.stock) {
                // Si no hay stock, revierte todo
                throw new Error(`Stock insuficiente para el producto ID: ${item.id_variante}. Solo quedan ${item.stock}.`);
            }
            calculatedSubtotal += item.precio_en_carrito * item.cantidad;
        }

        // 4. Calcular Total Final (verificando el costo de envío)
        // (Aquí simulamos que el costo de envío es correcto, pero podrías tener una tabla de costos)
        const calculatedTotal = calculatedSubtotal + parseFloat(shippingCost || 0);
        
        // Opcional: Compara con el total del frontend.
        if (Math.abs(calculatedTotal - parseFloat(total)) > 0.01) {
             // Si hay discrepancia, podríamos rechazarlo o simplemente usar el total del backend
             console.warn(`Discrepancia de total. Frontend: ${total}, Backend: ${calculatedTotal}`);
        }

        // 5. Crear la Compra en la tabla 'compras'
        const sqlInsertCompra = 'INSERT INTO compras (id_usuario, total) VALUES (?, ?)';
        const [compraResult] = await connection.query(sqlInsertCompra, [id_usuario, calculatedTotal.toFixed(2)]);
        const newCompraId = compraResult.insertId; // <-- Obtenemos el ID de la nueva compra

        // 6. Mover los items de 'carrito_items' a 'itemscompra'
        const sqlInsertItems = `
            INSERT INTO itemscompra (id_compra, id_variante, cantidad, precio_unitario, estado_devolucion)
            SELECT ?, id_variante, cantidad, precio_en_carrito, 'ninguno'
            FROM carrito_items
            WHERE id_carrito = ?;
        `;
        await connection.query(sqlInsertItems, [newCompraId, id_carrito]);

        // 7. Actualizar el Stock en 'variantesproducto' (¡MUY IMPORTANTE!)
        // Preparamos las actualizaciones de stock
        const stockUpdates = items.map(item => 
            connection.query('UPDATE variantesproducto SET stock = stock - ? WHERE id_variante = ?', [item.cantidad, item.id_variante])
        );
        await Promise.all(stockUpdates); // Ejecuta todas las actualizaciones

        // 8. Vaciar el carrito
        await connection.query('DELETE FROM carrito_items WHERE id_carrito = ?', [id_carrito]);

        // 9. ¡ÉXITO! Confirmar la transacción
        await connection.commit();

        // 10. Devolver el ID de la nueva compra
        res.status(201).json({ success: true, newOrderId: newCompraId });

    } catch (error) {
        // --- ¡ERROR! Revertir la transacción ---
        if (connection) {
            await connection.rollback();
        }
        console.error('Error en checkout:', error);
        // Devuelve el mensaje de error específico (ej. "Stock insuficiente...")
        res.status(400).json({ error: error.message || 'Error interno del servidor durante el checkout.' });
    } finally {
        // Siempre liberar la conexión al pool
        if (connection) {
            connection.release();
        }
    }
};

// --- (ACTUALIZA TUS EXPORTACIONES) ---
module.exports = {
    getCart,
    addCartItem,
    updateCartItem,
    removeCartItem,
    checkout // <-- AÑADE LA NUEVA FUNCIÓN
};