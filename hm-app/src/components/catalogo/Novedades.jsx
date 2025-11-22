// src/components/catalogo/Novedades.jsx

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom"; 
import "./Catalogo.css"; 
import { getProductos } from "../../services/productService";

const BACKEND_URL = 'http://localhost:3001';

function Novedades({ categoria }) {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function cargarNovedades() {
      try {
        setLoading(true);
        setError(null);
        const data = await getProductos(categoria, 'novedades');
        setProductos(data);
      } catch (err) {
        console.error("Error al cargar novedades:", err);
        setError("No se pudieron cargar las novedades. Intenta más tarde.");
        setProductos([]);
      }
      setLoading(false);
    }
    cargarNovedades();
  }, [categoria]);

  // --- FUNCIÓN HELPER PARA IMÁGENES ---
  const resolveImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/300x400?text=Sin+Imagen';
    
    // Si la URL ya empieza con http (es de internet), la usamos tal cual
    if (url.startsWith('http')) {
        return url;
    }
    
    // Si no, es una imagen local -> Le pegamos la URL del backend
    return `${BACKEND_URL}${url}`;
  };

  return (
    <section className="catalogo-seccion">
      <h2>Novedades</h2>

      {loading && <p>Cargando novedades...</p>}
      {error && <p className="catalogo-error">{error}</p>}
      {!loading && !error && productos.length === 0 && (
        <p className="catalogo-vacio">
          No hay productos disponibles en Novedades por el momento.
        </p>
      )}

      {!loading && !error && productos.length > 0 && (
        <div className="catalogo-grid">
          {productos.map((producto) => {
             // Obtenemos la URL cruda de la primera variante
             const rawUrl = producto.variantes?.[0]?.url_imagen;
             // Usamos el helper para arreglarla
             const finalUrl = resolveImageUrl(rawUrl);

             return (
                <Link
                  key={producto.id_producto}
                  to={`/producto/${producto.id_producto}`} 
                  className="catalogo-item-link" 
                >
                  <div className="catalogo-item">
                    <img
                      src={finalUrl} // <-- Usamos la URL procesada
                      alt={producto.nombre}
                      // Añadimos un estilo para que las imágenes se vean uniformes
                      style={{ width: '100%', height: '300px', objectFit: 'cover' }}
                    />
                    <p className="producto-nombre">{producto.nombre}</p>
                    {producto.precio_desde && <p className="producto-precio">Desde S/ {producto.precio_desde}</p>}
                  </div>
                </Link>
             );
          })}
        </div>
      )}
    </section>
  );
}

export default Novedades;