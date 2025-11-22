/* Archivo: src/services/userService.js */

// La URL de tu API de backend
const API_URL = 'http://localhost:3001/api';

/**
 * Obtiene el perfil completo del usuario desde el backend.
 * @param {string} token - El token JWT del usuario.
 */
export const getProfile = async (token) => {
  const response = await fetch(`${API_URL}/users/profile`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('No se pudo cargar el perfil');
  }
  return await response.json();
};

/**
 * Actualiza el perfil del usuario en el backend.
 * @param {object} profileData - Los datos del perfil a actualizar.
 * @param {string} token - El token JWT del usuario.
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

  if (!response.ok) {
    throw new Error('No se pudo actualizar el perfil');
  }
  return await response.json();
};