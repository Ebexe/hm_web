import React from "react";
import PropTypes from "prop-types";
import "./Catalogo.css"; // Importa los mismos estilos

const PLACEHOLDER_IMAGE = "https://via.placeholder.com/300x400?text=Producto";

/**
 * Componente (tarjeta) para mostrar un producto en el catálogo.
 * Ya no maneja estado de cantidad ni botones.
 * @param {object} props
 * @param {object} props.producto - El objeto del producto a mostrar.
 */
function ProductoItem({ producto }) {
  const { nombre, precio_desde, variaciones } = producto;

  // --- LÓGICA DE IMAGEN (La misma de antes) ---
  // 1. Intenta obtener la imagen de la PRIMERA variación.
  // 2. Si no, busca una 'url_imagen' principal del producto.
  // 3. Si no, usa el placeholder.
  const imagenPrincipal = 
    variaciones?.[0]?.url_imagen ?? // Opción 1
    producto.url_imagen ??         // Opción 2
    PLACEHOLDER_IMAGE;             // Opción 3

  return (
    <div className="producto-card">
      
      <img
        src={imagenPrincipal}
        alt={nombre}
        className="producto-imagen-mediana"
      />
      
      <div className="producto-info">
        <p className="producto-nombre">{nombre}</p>

        {precio_desde && (
          <p className="producto-precio">Desde S/ {precio_desde}</p>
        )}

        {/* --- Sección de Colores --- */}
        {variaciones && variaciones.length > 0 && (
          <div className="producto-colores">
            {variaciones.map((variacion) => (
              <span
                key={`${producto.id_producto}-${variacion.color_hex || variacion.color_nombre}`}
                className="color-circulo"
                style={{ backgroundColor: variacion.color_hex }}
                title={variacion.color_nombre}
              ></span>
            ))}
          </div>
        )}

        {/* --- SECCIÓN DE ACCIONES ELIMINADA --- 
          (El input de cantidad y el botón "Agregar" se han quitado)
        */}
      </div>
    </div>
  );
}

// Validación de PropTypes
ProductoItem.propTypes = {
  producto: PropTypes.shape({
    id_producto: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    nombre: PropTypes.string.isRequired,
    url_imagen: PropTypes.string, // URL principal (fallback)
    precio_desde: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    variaciones: PropTypes.arrayOf(PropTypes.shape({
      color_nombre: PropTypes.string,
      color_hex: PropTypes.string,
      url_imagen: PropTypes.string, // URL de la imagen por variación
    })),
  }).isRequired,
};

export default ProductoItem;