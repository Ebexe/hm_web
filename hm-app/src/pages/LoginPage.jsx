/* Archivo: src/pages/LoginPage.jsx */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // useNavigate para redirigir si es necesario
import useAuth from "../hooks/useAuth"; // Importa el hook de autenticación
import "../pages/login.css"; // Tus estilos
import logo from "../assets/logo.png";

// Mantenemos la prop 'onClose' si se usa como modal
export default function LoginPage({ onClose }) { 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // Estado para manejar la carga

  const { login } = useAuth(); // Obtiene la función 'login' del contexto
  const navigate = useNavigate(); // Hook para redirigir

  const handleSubmit = async (e) => { // La función ahora es async
    e.preventDefault();
    setError(""); // Limpia errores previos

    // Validaciones básicas (se mantienen)
    if (!email) return setError("Por favor ingresa tu correo electrónico.");
    if (!password) return setError("Por favor ingresa tu contraseña.");

    setLoading(true); // Empieza la carga

    try {
      // Llama a la función 'login' del AuthContext
      await login(email, password); 
      
      // Si llegamos aquí, el login fue exitoso
      setLoading(false);
      
      // Si existe onClose (es un modal), ciérralo
      if (onClose) {
        onClose();
      } else {
        // Si no es un modal (es una página completa), redirige
        navigate("/"); // O a '/profile' o donde quieras
      }

    } catch (err) {
      // Si login() lanza un error (desde authService o la API), lo atrapamos
      setError(err.message || "Ocurrió un error inesperado.");
      setLoading(false); // Termina la carga
    }
  };

  return (
    // Si onClose existe, asumimos que es un modal y usamos el overlay
    <div 
      className={onClose ? "login-overlay" : "login-page-container"} // Clase diferente si es página
      onClick={onClose} // Clic fuera cierra el modal (si aplica)
    >
      <div
        className="login-box"
        onClick={(e) => e.stopPropagation()} // Evita cierre al dar clic dentro
      >
        {/* Muestra el botón cerrar solo si es un modal */}
        {onClose && (
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        )}

        <div className="login-header">
          <img src={logo} alt="H&M" className="login-brand" />
          <p>Inicia sesión en tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              required
              disabled={loading} // Deshabilita durante la carga
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
                disabled={loading} // Deshabilita durante la carga
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="toggle-password"
                disabled={loading} // Deshabilita durante la carga
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          <div className="form-options">
            {/* Lógica para "Recordarme" (requiere más implementación) */}
            {/* <label>
              <input type="checkbox" disabled={loading} /> Recordarme
            </label> */}
            <a href="#" className="forgot-link">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          {/* Muestra el mensaje de error de la API */}
          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Iniciando..." : "Iniciar sesión"} {/* Texto dinámico */}
          </button>

          <p className="register-text">
            ¿No tienes cuenta?{" "}
            <Link to="/registro" className="register-link" onClick={onClose}> {/* Cierra modal al ir a registro */}
              Registrarse
            </Link>
          </p>
        </form>

        <div className="login-footer">
          Al iniciar sesión aceptas las políticas de la marca.
        </div>
      </div>
    </div>
  );
}