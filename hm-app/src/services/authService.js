/* Archivo: src/services/authService.js */

// La URL de tu API de backend
const API_URL = 'http://localhost:3001/api';

/**
 * Llama al endpoint de login del backend.
 * @param {string} email - El email del usuario.
 * @param {string} password - La contraseña del usuario.
 */
export const login = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    // Si la API devuelve un error (ej. 401 Credenciales inválidas),
    // lanza un error para que el AuthContext lo atrape.
    throw new Error(data.error || 'Error al iniciar sesión');
  }

  // Devuelve los datos (ej. { message: '...', token: '...' })
  return data;
};

/**
 * Llama al endpoint de registro del backend.
 * @param {string} nombre - El nombre del usuario.
 * @param {string} email - El email del usuario.
 * @param {string} password - La contraseña del usuario.
 */
export const register = async (nombre, email, password) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nombre, email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    // Si la API devuelve un error (ej. 409 El correo ya existe)
    throw new Error(data.error || 'Error al registrar el usuario');
  }

  // Devuelve los datos (ej. { message: '...', userId: 1 })
  return data;
};