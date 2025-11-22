/* Archivo: src/components/catalogo/Tendencias.jsx */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import "./Catalogo.css"; 
import { getProductos } from "../../services/productService";

const BACKEND_URL = 'http://localhost:3001';

function Tendencias({ categoria }) {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function cargarTendencias() {
      try {
        setLoading(true);
        setError(null);
        const data = await getProductos(categoria, 'tendencias');
        setProductos(data);
      } catch (err) {
        console.error("Error al cargar tendencias:", err);
        setError("No se pudieron cargar las tendencias. Intenta más tarde.");
        setProductos([]);
      }
      setLoading(false);
    }

    if (categoria) {
      cargarTendencias();
    } else {
      setLoading(false);
      setError("Categoría no especificada.");
      setProductos([]);
    }
  }, [categoria]);

  // --- HELPER PARA IMÁGENES ---
  const resolveImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/300x400?text=Sin+Imagen';
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  // --- RENDERIZADO ---
  if (loading) return <section className="catalogo-seccion"><h2>Tendencias</h2><p>Cargando tendencias...</p></section>;
  if (error) return <section className="catalogo-seccion"><h2>Tendencias</h2><p className="catalogo-error">{error}</p></section>;
  if (productos.length === 0) return <section className="catalogo-seccion"><h2>Tendencias</h2><p className="catalogo-vacio">No hay productos disponibles en Tendencias.</p></section>;

  return (
    <section className="catalogo-seccion">
      <h2>Tendencias</h2>
      
      <div className="catalogo-grid">
        {productos.map((producto) => {
          
          // --- LÓGICA DE COLORES ÚNICOS ---
          // Filtramos las variantes para obtener colores únicos y evitar bolitas repetidas
          const coloresUnicos = [];
          const coloresVistos = new Set();
          
          if (producto.variantes) {
             producto.variantes.forEach(v => {
                 // Usamos el nombre del color como clave
                 if (v.color && !coloresVistos.has(v.color)) {
                     coloresVistos.add(v.color);
                     // Intentamos obtener un hex code si existe, o usamos gris
                     // (Asumiendo que tu backend no devuelve hex, usamos un placeholder)
                     coloresUnicos.push({ 
                         nombre: v.color, 
                         // Aquí podrías integrar tu función getHexCode si la importaras
                         hex: '#ccc' 
                     });
                 }
             });
          }

          // --- IMAGEN ---
          const rawUrl = producto.variantes?.[0]?.url_imagen;
          const finalUrl = resolveImageUrl(rawUrl);

          return (
            <Link
              key={producto.id_producto}
              to={`/producto/${producto.id_producto}`} 
              className="catalogo-item-link"
            >
              <div className="catalogo-item">
                <img
                  src={finalUrl}
                  alt={producto.nombre}
                  style={{ width: '100%', height: '300px', objectFit: 'cover' }}
                />
                <p className="producto-nombre">{producto.nombre}</p>
                
                {producto.precio_desde && (
                  <p className="producto-precio">Desde S/ {producto.precio_desde}</p>
                )}

                {/* --- SECCIÓN DE COLORES --- */}
                {coloresUnicos.length > 0 && (
                  <div className="producto-colores">
                    {coloresUnicos.slice(0, 4).map((col, idx) => (
                      <span
                        key={idx}
                        className="color-circulo"
                        style={{ backgroundColor: col.hex }}
                        title={col.nombre}
                      ></span>
                    ))}
                    {coloresUnicos.length > 4 && <span className="color-mas">+{coloresUnicos.length - 4}</span>}
                  </div>
                )}

              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

Tendencias.propTypes = {
  categoria: PropTypes.string.isRequired,
};

export default Tendencias;