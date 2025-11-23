/* Archivo: src/pages/RegisterPage.jsx (FINALIZADO con Modal Integrado) */

import React, { useState } from "react";
// Link para los términos, useNavigate para redirigir al éxito
import { Link, useNavigate } from "react-router-dom"; 
import useAuth from "../hooks/useAuth"; 
import LoginPage from "./LoginPage"; // Importa el componente modal LoginPage
import "../pages/register.css"; // Tus estilos

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth(); // Obtiene la función 'register' del AuthContext

  // Estado simplificado para el formulario de registro
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    password: "",
    passwordConfirm: "",
    aceptaTerminos: false,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Estado para controlar el modal de Login
  const [showLogin, setShowLogin] = useState(false); 

  // Manejador genérico para inputs
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Validación Client-Side
  const validate = () => {
    if (!formData.nombre.trim()) return "El nombre es obligatorio.";
    if (!formData.email.trim()) return "El correo electrónico es obligatorio.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return "El formato del correo no es válido.";
    if (!formData.password) return "La contraseña es obligatoria.";
    if (formData.password.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
    if (formData.password !== formData.passwordConfirm) return "Las contraseñas no coinciden.";
    if (!formData.aceptaTerminos) return "Debes aceptar los términos y condiciones.";
    return ""; // No hay errores
  };

  // Envío del formulario a la API
  const handleSubmit = async (e) => { 
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      // Llama a la función 'register' del AuthContext (que llama a la API)
      const result = await register(
        formData.nombre, 
        formData.email, 
        formData.password
      );


      setSuccess(result.message + " Redirigiendo a tu perfil..."); 
      setLoading(false);
      
      // Redirige directamente al perfil después del registro exitoso
      setTimeout(() => {
        navigate('/perfil');
      }, 1500); 

    } catch (err) {
      // Atrapa errores de la API (ej. "Email ya existe")
      setError(err.message || "Ocurrió un error inesperado durante el registro.");
      setLoading(false);
    }
  };

  return (
    // Aplica la clase 'modal-open' si el modal de login está activo
    <div className={`registro-page ${showLogin ? 'modal-open' : ''}`}> 
      <div className="registro-card" style={{ maxWidth: '500px' }}>
        <header className="registro-header">
          <h2>Crear cuenta</h2>
        </header>

        <form className="registro-form" onSubmit={handleSubmit} noValidate>
          {/* Inputs simplificados */}
          <label>
            Nombre o apodo *
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </label>

          <label>
            Correo electrónico *
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </label>

          <label>
            Contraseña * (mínimo 6 caracteres)
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </label>

          <label>
            Confirmar Contraseña *
            <input
              type="password"
              name="passwordConfirm"
              value={formData.passwordConfirm}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </label>

          {/* Checkbox de términos */}
          <label className="check small">
            <input
              type="checkbox"
              name="aceptaTerminos"
              checked={formData.aceptaTerminos}
              onChange={handleChange}
              required
              disabled={loading}
            />
            Acepto los <Link to="/terminos" target="_blank" className="register-link">términos y políticas de privacidad</Link> * </label>

          {/* Mensajes de error/éxito */}
          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}

          {/* Botones de acción */}
          <div className="actions" style={{ marginTop: '30px' }}>
            <button type="submit" className="btn-primario" disabled={loading}>
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
            
            <button 
              type="button" 
              className="btn-secundario" 
              onClick={() => setShowLogin(true)} // Abre el modal de login
              disabled={loading} // Deshabilita si está registrando
            >
              Ya tengo cuenta
            </button>
          </div>
        </form>
      </div>

      {/* Renderiza el modal LoginPage si showLogin es true */}
      {showLogin && <LoginPage onClose={() => setShowLogin(false)} />} 
      
    </div>
  );
}