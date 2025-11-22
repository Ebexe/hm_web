/* Archivo: src/hooks/useAuth.js */

import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

/**
 * Hook personalizado para acceder al AuthContext
 * @returns {object} El valor del contexto: { auth, loading, login, register, logout }
 */
const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }

  return context;
};

export default useAuth;