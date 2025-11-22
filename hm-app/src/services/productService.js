/* Archivo: src/services/productService.js (ACTUALIZADO) */

// Define la URL de tu API de backend
const API_URL = 'http://localhost:3001/api';

/**
 * Obtiene productos filtrados por categoría y sección.
 * @param {string} categoria - Ej. "mujer", "hombre".
 * @param {string} seccion - Ej. "novedades", "tendencias".
 * @returns {Promise<Array>} Lista de productos con sus variantes.
 */
export async function getProductos(categoria, seccion) {
  try {
    const response = await fetch(
      `${API_URL}/productos?categoria=${encodeURIComponent(categoria)}&seccion=${encodeURIComponent(seccion)}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${response.status} de la API al obtener lista`);
    }

    return await response.json();

  } catch (error) {
    console.error("Error en productService (getProductos):", error);
    throw error;
  }
}

/**
 * Obtiene los detalles completos de un solo producto por su ID.
 * @param {string|number} productId - El ID del producto.
 * @returns {Promise<object>} Objeto del producto con sus variantes.
 */
export async function getProductoById(productId) {
  try {
    // Construye la URL para el producto específico
    const response = await fetch(`${API_URL}/productos/${productId}`);

    // Verifica si la respuesta de la API fue exitosa
    if (!response.ok) {
      // Si el producto no se encuentra (404) o hay otro error
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${response.status} de la API al obtener producto`);
    }

    // Devuelve los datos JSON del producto específico
    return await response.json();

  } catch (error) {
    console.error(`Error en productService (getProductoById ${productId}):`, error);
    // Lanza el error para que el componente ProductDetailPage lo atrape
    throw error;
  }
}

/**
 * --- NUEVA FUNCIÓN AÑADIDA (PARA EL CHATBOT RAG) ---
 * Busca productos en la BDD a través de la API.
 * @param {string} query - El término de búsqueda del usuario (ej. "ropa oficina")
 * @param {string} departamento - El departamento para filtrar (ej. "hombre", "mujer")
 * @returns {Promise<Array>} - Una promesa que resuelve a un array de productos.
 */
export const searchProducts = async (query, departamento) => {
  // Construye los parámetros de la URL de forma segura
  const params = new URLSearchParams();
  // Añade 'q' solo si viene definido (evita enviar q=undefined)
  if (typeof query !== 'undefined' && query !== null) params.append('q', String(query));
  // Añade el departamento solo si no es 'general' o nulo
  if (departamento && departamento !== 'general') {
    params.append('depto', departamento);
  }

  try {
    // Llama al nuevo endpoint del backend que debes crear
    // (Asumiendo que sigue la misma estructura: /api/productos/search)
    const response = await fetch(`${API_URL}/productos/search?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${response.status} de la API al buscar productos`);
    }

    const data = await response.json();
    
    // Asegura que siempre devolvamos un array
    // (Asumimos que tu API devuelve { products: [...] })
    return data.products || []; 

  } catch (error) {
    console.error("Error en productService (searchProducts):", error);
    // Devuelve un array vacío en caso de error para no romper el chat
    return []; 
  }
};

/**
 * Llama al endpoint assistant-search del backend para obtener candidatos paginados
 * @param {string} query
 * @param {string|null} departamento
 * @param {number} limit
 * @param {number} page
 * @returns {Promise<{total:number,page:number,limit:number,candidates:array}>}
 */
export const assistantSearch = async (query, departamento = null, limit = 50, page = 1) => {
  const params = new URLSearchParams();
  if (typeof query !== 'undefined' && query !== null) params.append('query', String(query));
  if (departamento && departamento !== 'general') params.append('depto', departamento);
  params.append('limit', String(limit));
  params.append('page', String(page));

  try {
    const response = await fetch(`${API_URL}/productos/assistant-search?${params.toString()}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error en productService (assistantSearch):', error);
    return { total: 0, page: Number(page), limit: Number(limit), candidates: [] };
  }
};