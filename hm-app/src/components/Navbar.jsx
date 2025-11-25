// src/components/Navbar.jsx

import React, { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"; 
import useAuth from '../hooks/useAuth'; // Hook de autenticación
import { useCart } from '../context/CartContext'; // <-- 1. IMPORTAR EL HOOK DEL CARRITO
import "../components/Navbar.css";
import logo from "../assets/logo.png";
import LoginPage from "../pages/LoginPage"; 
import { User, UserPlus, LogOut, ShoppingBag } from "lucide-react";

function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { auth, logout } = useAuth(); 
  const { cart } = useCart(); // <-- 2. OBTENER EL ESTADO DEL CARRITO

  const mujerIsActive = pathname === "/" || pathname === "/mujer";
  const [showLogin, setShowLogin] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/'); 
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-logo">
          <Link to="/"> 
            <img src={logo} alt="H&M Logo" className="logo-img" />
          </Link>
        </div>
        <ul className="navbar-links">
          <li>
            <NavLink
              to="/mujer"
              className={({ isActive }) => (isActive || mujerIsActive ? "active" : "")}
            >
              Mujer
            </NavLink>
          </li>
          <li>
            <NavLink to="/hombre" className={({ isActive }) => (isActive ? "active" : "")}>
              Hombre
            </NavLink>
          </li>
          <li>
            <NavLink to="/ninos" className={({ isActive }) => (isActive ? "active" : "")}>
              Infantes
            </NavLink>
          </li>
          {/* Puedes añadir /ninas aquí */}
        </ul>
        <div className="navbar-actions">

          {/* MENSAJE DE BIENVENIDA */}
          {auth.token && (
            <span className="welcome-msg">¡Descubre tu estilo con ayuda inteligente!</span>
          )}


          {/* PERFIL (logueado) / LOGIN (no logueado) */}
          {auth.token ? (
            <Link to="/perfil" className="icon-btn" data-tooltip="Mi perfil">
              <User size={24} strokeWidth={1.7} />
            </Link>
          ) : (
            <button onClick={() => setShowLogin(true)} className="icon-btn" data-tooltip="Iniciar sesión">
              <User size={24} strokeWidth={1.7} />
            </button>
          )}

          {/* REGISTRO si NO está logueado */}
          {!auth.token && (
            <Link to="/registro" className="icon-btn" data-tooltip="Crear cuenta">
              <UserPlus size={24} strokeWidth={1.7} />
            </Link>
          )}

          {/* LOGOUT si está logueado */}
          {auth.token && (
            <button onClick={handleLogout} className="icon-btn" data-tooltip="Cerrar sesión">
              <LogOut size={24} strokeWidth={1.7} />
            </button>
          )}

          {/* --- (MODIFICACIÓN 3) PESTAÑA DEL CARRITO --- */}
          {/* Lo mostramos siempre, pero la insignia solo si está logueado */}
          <NavLink to="/carrito" className="icon-btn cart-wrapper" data-tooltip="Mi carrito">
            <ShoppingBag size={24} strokeWidth={1.7} />
            
            {/* Solo muestra la insignia si:
                1. El usuario está logueado (auth.token)
                2. El carrito tiene items (cart.count > 0)
                3. El carrito no está cargando (!cart.loading)
            */}
            { auth.token && !cart.loading && cart.count > 0 && (
                <span className="cart-badge">{cart.count}</span>
            )}
          </NavLink> 

        </div>
      </nav>

      {!auth.token && showLogin && <LoginPage onClose={() => setShowLogin(false)} />}
    </>
  );
}

export default Navbar;