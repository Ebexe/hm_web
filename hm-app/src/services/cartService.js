/* Archivo: hm-app/src/services/cartService.js */

// Define la URL de tu API de backend (la misma que en otros servicios)
const API_URL = 'http://localhost:3001/api';

/**
 * Obtiene el carrito completo del usuario desde el backend.
 * Requiere el token de autenticación.
 */
export const getCartAPI = async (token) => {
    try {
        const response = await fetch(`${API_URL}/cart`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error('Error al obtener el carrito');
        }
        return await response.json(); // Devuelve { items: [...], total: "..." }
    } catch (error) {
        console.error("Error en cartService (getCartAPI):", error);
        throw error;
    }
};

/**
 * Añade un producto (variante) al carrito del usuario.
 * Requiere token, id_variante y cantidad.
 */
export const addItemToCartAPI = async (token, id_variante, cantidad) => {
    try {
        const response = await fetch(`${API_URL}/cart/add`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id_variante, cantidad })
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Error al añadir item');
        }
        return await response.json(); // Devuelve el carrito actualizado
    } catch (error) {
        console.error("Error en cartService (addItemToCartAPI):", error);
        throw error;
    }
};

/**
 * Actualiza la cantidad de un producto en el carrito.
 * Requiere token, id_variante y la nueva cantidad.
 */
export const updateItemQuantityAPI = async (token, id_variante, cantidad) => {
    try {
        const response = await fetch(`${API_URL}/cart/update/${id_variante}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cantidad })
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Error al actualizar item');
        }
        return await response.json(); // Devuelve el carrito actualizado
    } catch (error) {
        console.error("Error en cartService (updateItemQuantityAPI):", error);
        throw error;
    }
};

/**
 * Elimina un producto (variante) del carrito.
 * Requiere token y id_variante.
 */
export const removeItemFromCartAPI = async (token, id_variante) => {
    try {
        const response = await fetch(`${API_URL}/cart/remove/${id_variante}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Error al eliminar item');
        }
        return await response.json(); // Devuelve el carrito actualizado
    } catch (error) {
        console.error("Error en cartService (removeItemFromCartAPI):", error);
        throw error;
    }
};

// --- (NUEVA FUNCIÓN AÑADIDA AL FINAL) ---
/**
 * Procesa el checkout en el backend.
 * Requiere token y los detalles del costo, método de pago e información de entrega.
 */
export const checkoutAPI = async (token, { shippingCost, total, paymentMethod, deliveryInfo }) => {
    try {
        const response = await fetch(`${API_URL}/cart/checkout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ shippingCost, total, paymentMethod, deliveryInfo })
        });
        
        const data = await response.json(); // Lee la respuesta (éxito o error)
        
        if (!response.ok) {
            // Lanza el error que viene del backend (ej. "Stock insuficiente")
            throw new Error(data.error || 'Error al procesar el pago');
        }
        
        return data; // Devuelve { success: true, newOrderId: ... }
    } catch (error) {
        console.error("Error en cartService (checkoutAPI):", error);
        throw error;
    }
};