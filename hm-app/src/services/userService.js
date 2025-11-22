/* Archivo: hm-app/src/services/userService.js */

const API_URL = 'http://localhost:3001/api';

/**
 * Obtiene el perfil básico y las medidas corporales.
 */
export const getProfile = async (token) => {
  const response = await fetch(`${API_URL}/users/profile`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('No se pudo cargar el perfil');
  return await response.json();
};

/**
 * Actualiza el perfil básico y las medidas corporales.
 */
export const updateProfile = async (profileData, token) => {
  const response = await fetch(`${API_URL}/users/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });
  if (!response.ok) throw new Error('No se pudo actualizar el perfil');
  return await response.json();
};

/**
 * Obtiene las preferencias de estilo (IDs).
 */
export const getPreferences = async (token) => {
  const response = await fetch(`${API_URL}/users/preferences`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('No se pudieron cargar las preferencias');
  return await response.json();
};

/**
 * Actualiza las preferencias de estilo.
 */
export const updatePreferences = async (prefsData, token) => {
  const response = await fetch(`${API_URL}/users/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(prefsData),
  });
  if (!response.ok) throw new Error('No se pudieron actualizar las preferencias');
  return await response.json();
};

/**
 * @desc Obtiene la talla habitual y el ajuste preferido por categoría (AJUSTES).
 */
export const getUserAjustes = async (token) => {
  const response = await fetch(`${API_URL}/users/ajustes`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('No se pudieron cargar los ajustes.');
  return await response.json();
};

/**
 * @desc Sincroniza las preferencias de talla/ajuste (AJUSTES).
 */
export const updateUserAjustes = async (ajustesPayload, token) => {
  const response = await fetch(`${API_URL}/users/ajustes`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(ajustesPayload),
  });
  if (!response.ok) throw new Error('No se pudieron actualizar los ajustes.');
  return await response.json();
};