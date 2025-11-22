/* Archivo: src/pages/NinosPage.jsx (Revisado) */

import React, { useState } from "react";
import BannerNinos from "../components/banners/BannerNinos"; 
import BannerNinas from "../components/banners/BannerNinas";
import Novedades from "../components/catalogo/Novedades";
import Tendencias from "../components/catalogo/Tendencias";
import Rebajas from "../components/catalogo/Rebajas";

import "../components/catalogo/catalogo.css"

export default function NinosPage() { 
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('nino'); 

  // Función para manejar el cambio y añadir un log
  const handleToggle = (nuevaCategoria) => {
    console.log("Cambiando categoría a:", nuevaCategoria); // <-- Log para depurar
    setCategoriaSeleccionada(nuevaCategoria);
  };

  return (
    <div> 
      
      {/* 1. Banner (Primero) */}
      {categoriaSeleccionada === 'nino' ? <BannerNinos /> : <BannerNinas />}
      
      {/* 2. Toggle Niño/Niña (Segundo) */}
      <div className="categoria-toggle-container">
        <div className="categoria-toggle">
          <button 
            // Asegúrate que las clases CSS no tengan 'pointer-events: none' accidentalmente
            className={`toggle-btn ${categoriaSeleccionada === 'nino' ? 'active' : ''}`}
            onClick={() => handleToggle('nino')} // Llama a la función con log
          >
            Niño
          </button>
          <button 
            className={`toggle-btn ${categoriaSeleccionada === 'nina' ? 'active' : ''}`}
            onClick={() => handleToggle('nina')} // Llama a la función con log
          >
            Niña
          </button>
        </div>
      </div>

      {/* 3. Catálogo (Después) */}
      <main style={{ padding: "40px 20px" }}> 
        <Novedades categoria={categoriaSeleccionada} /> 
        <Tendencias categoria={categoriaSeleccionada} />
        <Rebajas categoria={categoriaSeleccionada} />
      </main>

      <footer
  style={{
    backgroundColor: "#000",
    borderTop: "1px solid #222",
    padding: "55px 60px",
    fontFamily: "Arial, sans-serif",
    color: "#fff",
    overflow: "hidden"
  }}
>
  <style>
    {`
      @keyframes fadeUp {
        0% { 
          opacity: 0; 
          transform: translateY(15px); 
        }
        100% { 
          opacity: 1; 
          transform: translateY(0); 
        }
      }
      
      @keyframes smoothHover {
        0% { 
          transform: translateX(0);
          opacity: 1;
        }
        100% { 
          transform: translateX(5px);
          opacity: 0.7;
        }
      }

      .footer-section {
        animation: fadeUp 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        opacity: 0;
      }

      .footer-section:nth-child(1) { animation-delay: .1s; }
      .footer-section:nth-child(2) { animation-delay: .2s; }
      .footer-section:nth-child(3) { animation-delay: .3s; }
      .footer-section:nth-child(4) { animation-delay: .4s; }
      .footer-section:nth-child(5) { animation-delay: .5s; }

      .footer-li {
        transition: all 0.3s ease;
        position: relative;
      }

      .footer-li:hover {
        animation: smoothHover 0.3s ease forwards;
        cursor: pointer;
      }
      
      .footer-section:first-child h3 {
        position: relative;
        display: inline-block;
      }
      
      .footer-section:first-child h3::after {
        content: '';
        position: absolute;
        bottom: -8px;
        left: 0;
        width: 0;
        height: 2px;
        background: linear-gradient(90deg, #fff, #ddd, #fff);
        transition: width 0.5s ease;
      }
      
      .footer-section:first-child:hover h3::after {
        width: 100%;
      }
      
      .footer-section:last-child {
        position: relative;
        transition: all 0.4s ease;
      }
      
      .footer-section:last-child:hover {
        transform: translateY(-2px);
      }
      
      .footer-section:last-child::before {
        content: '';
        position: absolute;
        top: 0;
        left: 50%;
        width: 0;
        height: 1px;
        background: #fff;
        transition: all 0.5s ease;
        transform: translateX(-50%);
      }
      
      .footer-section:last-child:hover::before {
        width: 100px;
      }
    `}
  </style>

  <div className="footer-section" style={{ marginBottom: "40px" }}>
    <h3
      style={{
        fontSize: "22px",
        marginBottom: "10px",
        fontWeight: "600",
        color: "#fff"
      }}
    >
      ROPA PARA INFANTES
    </h3>

    <p
      style={{
        fontSize: "15px",
        lineHeight: "1.7",
        maxWidth: "1200px",
        color: "#ddd"
      }}
    >
      Viste fácilmente a tus pequeños con nuestra ropa para niños y niñas de todas las edades. Tenemos una 
      amplia selección de polos en colores llamativos y diseños que se adaptarán a su personalidad. Combina 
      su polera o chompa favorita con nuestros pantalones, leggings, joggers y jeans en una gran variedad 
      de cortes y estilos. ¿Planean aventuras al aire libre? Mantén a tus pequeños alejados del frío y
      abrígalos con nuestras múltiples opciones de casacas y abrigos para niños.
    </p>
  </div>

  <div
    className="footer-section"
    style={{
      display: "flex",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "40px",
      marginBottom: "30px"
    }}
  >
    <div>
      <h4 style={{ marginBottom: "10px", color: "#fff" }}>Colecciones</h4>
      <ul style={{ listStyle: "none", padding: 0, color: "#ddd" }}>
        <li className="footer-li" style={{ marginBottom: "6px" }}>Mujer</li>
        <li className="footer-li" style={{ marginBottom: "6px" }}>Hombre</li>
        <li className="footer-li" style={{ marginBottom: "6px" }}>Infantes</li>
      </ul>
    </div>

    <div>
      <h4 style={{ marginBottom: "10px", color: "#fff" }}>Información Corporativa</h4>
      <ul style={{ listStyle: "none", padding: 0, color: "#ddd" }}>
        <li className="footer-li" style={{ marginBottom: "6px" }}>Trabajar en H&M</li>
        <li className="footer-li" style={{ marginBottom: "6px" }}>Acerca del Grupo H&M</li>
        <li className="footer-li" style={{ marginBottom: "6px" }}>Responsabilidad Social</li>
        <li className="footer-li" style={{ marginBottom: "6px" }}>Prensa</li>
        <li className="footer-li" style={{ marginBottom: "6px" }}>Relación con Inversionistas</li>
        <li className="footer-li" style={{ marginBottom: "6px" }}>Política Empresarial</li>
      </ul>
    </div>

    <div>
      <h4 style={{ marginBottom: "10px", color: "#fff" }}>Ayuda</h4>
      <ul style={{ listStyle: "none", padding: 0, color: "#ddd" }}>
        <li className="footer-li" style={{ marginBottom: "6px" }}>Servicio al Cliente</li>
        <li className="footer-li" style={{ marginBottom: "6px" }}>Mi Cuenta</li>
        <li className="footer-li" style={{ marginBottom: "6px" }}>Nuestras Tiendas</li>
        <li className="footer-li" style={{ marginBottom: "6px" }}>Click & Collect - Retiro en Tienda</li>
        <li className="footer-li" style={{ marginBottom: "6px" }}>Términos y Condiciones</li>
        <li className="footer-li" style={{ marginBottom: "6px" }}>Aviso de Privacidad</li>
        <li className="footer-li" style={{ marginBottom: "6px" }}>Contacto</li>
        <li className="footer-li" style={{ marginBottom: "6px" }}>Gift Card</li>
        <li className="footer-li" style={{ marginBottom: "6px" }}>Aviso de Cookies</li>
      </ul>
    </div>

    <div style={{ maxWidth: "260px" }}>
      <h4 style={{ marginBottom: "10px", color: "#fff" }}>Conviértete en miembro</h4>
      <p style={{ color: "#ddd", fontSize: "15px", lineHeight: "1.6" }}>
        ¡Hazte member y obtén un 15% de descuento en el artículo de mayor valor!
        Recibe beneficios exclusivos y entérate antes de nuestras novedades.
      </p>
    </div>
  </div>

  <div
    className="footer-section"
    style={{
      borderTop: "1px solid #333",
      paddingTop: "15px",
      textAlign: "center",
      fontSize: "14px",
      color: "#bbb"
    }}
  >
    <p>© 2025 H&M. Todos los derechos reservados.</p>
  </div>
</footer>
    </div>
  );
}