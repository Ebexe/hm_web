/* Archivo: src/services/lookupService.js */

const API_URL = 'http://localhost:3001/api';

// Función genérica para simplificar las llamadas
async function fetchLookup(type) {
  try {
    const response = await fetch(`${API_URL}/lookups/${type}`);
    if (!response.ok) {
      throw new Error(`Error al cargar ${type}`);
    }
    return await response.json();
  } catch (error) {
    console.error(error);
    return []; // Devuelve vacío en caso de error
  }
}

export const getEstilos = () => fetchLookup('estilos');
export const getOcasiones = () => fetchLookup('ocasiones');
export const getColores = () => fetchLookup('colores');

/**
 * Carga todos los lookups a la vez (más eficiente)
 */
export const getAllLookups = async () => {
  try {
    const [estilos, ocasiones, colores] = await Promise.all([
      getEstilos(),
      getOcasiones(),
      getColores()
    ]);
    return { estilos, ocasiones, colores };
  } catch (error) {
    return { estilos: [], ocasiones: [], colores: [] };
  }
};