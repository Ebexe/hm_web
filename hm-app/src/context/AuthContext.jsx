/* Archivo: src/context/AuthContext.jsx */

import React, { createContext, useState, useEffect } from 'react';
// Importa tu servicio de API de autenticación
import { login as apiLogin, register as apiRegister } from '../services/authService';

// 1. Crear el Contexto
const AuthContext = createContext(null);

// 2. Crear el Proveedor (Provider)
export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({ token: null, user: null });
  const [loading, setLoading] = useState(true); // Para saber si estamos verificando el token

  // Efecto para cargar el token desde localStorage al iniciar la app
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');

    if (storedToken) {
      // (Aquí podrías añadir lógica para verificar el token con la BDD)
      // Por ahora, solo lo cargamos
      setAuth({ token: storedToken, user: null }); // (Idealmente, también guardas el 'user')
    }
    setLoading(false);
  }, []);

  // Función de Login
  const login = async (email, password) => {
    try {
      const data = await apiLogin(email, password); // Llama al servicio de API
      setAuth({ token: data.token, user: null }); // (Idealmente, el API devuelve el 'user')
      localStorage.setItem('authToken', data.token); // Guarda el token
    } catch (error) {
      console.error("Error en login (Context):", error);
      throw error; // Lanza el error para que el LoginPage lo maneje
    }
  };

  // Función de Registro
  const register = async (nombre, email, password) => {
    try {
      const data = await apiRegister(nombre, email, password);
      
      // Auto-login después de registrar exitosamente
      await login(email, password);
      
      return data; // Devuelve el mensaje de éxito
    } catch (error) {
      console.error("Error en register (Context):", error);
      throw error;
    }
  };

  // Función de Logout
  const logout = () => {
    setAuth({ token: null, user: null });
    localStorage.removeItem('authToken');
  };

  // 3. Valor que se comparte con toda la app
  const value = {
    auth,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// 4. Exportar el contexto para que el hook lo use
export default AuthContext;