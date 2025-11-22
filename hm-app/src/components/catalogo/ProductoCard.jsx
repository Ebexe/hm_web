import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; 
import './ProductoCard.css'; 

function ProductoCard({ producto }) {
  const [varianteSeleccionada, setVarianteSeleccionada] = useState(null);

  useEffect(() => {
    if (producto && producto.variantes && producto.variantes.length > 0) {
      setVarianteSeleccionada(producto.variantes[0]);
    } else {
      setVarianteSeleccionada(null);
    }
  }, [producto]); 

  
  // --- INICIO: LÓGICA DE COLORES ÚNICOS ---
  // 1. Creamos un Map para guardar solo la primera variante de cada color.
  //    Usamos el 'color' (nombre) como clave, ya que tu código se basa en él.
  const variantesPorColor = new Map();
  if (producto && producto.variantes) {
    for (const variante of producto.variantes) {
      // Si el color no está en el Map, lo añadimos.
      // (Asumimos que 'variante.color' es el nombre, ej: "Rojo")
      if (variante.color && !variantesPorColor.has(variante.color)) {
        variantesPorColor.set(variante.color, variante);
      }
    }
  }
  // 2. Convertimos el Map de vuelta a un array solo con las variantes únicas
  const coloresUnicos = [...variantesPorColor.values()];
  // --- FIN: LÓGICA DE COLORES ÚNICOS ---


  if (!producto || !varianteSeleccionada) {
    return <div className="producto-card-placeholder"></div>; 
  }

  const handleColorSelect = (variante) => {
    setVarianteSeleccionada(variante);
  };

  const BACKEND_URL = 'http://localhost:3001';

  return (
    <Link to={`/producto/${producto.id_producto}`} className="producto-card-link">
      <div className="producto-card">
        <div className="producto-imagen-container">
          <img 
            src={`${BACKEND_URL}${varianteSeleccionada.url_imagen}` || 'https://via.placeholder.com/300x400'} 
            alt={`${producto.nombre} - ${varianteSeleccionada.color}`} 
            className="producto-imagen-principal"
          />
        </div>
        <div className="producto-info">
          <p className="producto-nombre">{producto.nombre}</p>
          <p className="producto-precio">
            S/ {varianteSeleccionada.precio || producto.precio_desde}
          </p>
          
          {/* --- SECCIÓN DE SWATCHES CORREGIDA --- */}
          {/* Ahora iteramos sobre 'coloresUnicos' en lugar de 'producto.variantes' */}
          {coloresUnicos && coloresUnicos.length > 1 && ( 
            <div className="producto-colores">
              {coloresUnicos.map((varianteUnica) => ( // <-- USAMOS LA VARIANTE ÚNICA
                <button
                  // Usamos el 'color' (nombre) para la key, ya que es único
                  key={varianteUnica.color} 
                  type="button"
                  className={`color-swatch ${
                    varianteSeleccionada.color === varianteUnica.color ? 'selected' : ''
                  }`}
                  style={{ backgroundColor: getHexCode(varianteUnica.color) }} 
                  onClick={(e) => {
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    handleColorSelect(varianteUnica); // <-- Pasamos la variante única
                  }}
                  aria-label={`Color ${varianteUnica.color}`}
                  title={varianteUnica.color} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}


// --- INICIO: FUNCIONES HELPER (Sin cambios) ---
// (Tu código de getHexCode y colorMap va aquí)

const colorMap = {
  'Negro': '#000000',
  'Blanco': '#FFFFFF',
  'Gris Oscuro': '#333333',
  'Gris Medio': '#808080',
  'Gris Claro': '#D3D3D3',
  'Beige': '#F5F5DC',
  'Crema': '#FFFDD0',
  'Caqui': '#C3B091',
  'Marrón': '#A0522D',
  'Azul Marino': '#000080',
  'Azul Rey': '#4169E1',
  'Azul Celeste': '#ADD8E6',
  'Verde Oliva': '#808000',
  'Verde Esmeralda': '#2ECC71',
  'Verde Menta': '#98FF98',
  'Rojo': '#FF0000',
  'Vino / Borgoña': '#800000',
  'Rosa Palo': '#FADADD',
  'Fucsia': '#FF00FF',
  'Amarillo Mostaza': '#FFDB58',
  'Naranja': '#FFA500',
  'Morado': '#800080',
  'Plateado': '#C0C0C0',
  'Dorado': '#FFD700',
  'Azul': '#0000FF',
  'Rosa': '#FFC0CB',
  'Verde': '#008000',
  'Gris': '#808080',
  'Lila': '#E6E6FA',
  'Plomo': '#808080',
  'Guinda': '#800000',
  'Celeste': '#ADD8E6',
  'Violeta': '#EE82EE',
  'Azul Claro': '#ADD8E6'
};

function getHexCode(colorName) {
  if (!colorName) return '#CCCCCC'; 

  const normalizedColorName = colorName.toLowerCase()
                                      .replace(/á/g, 'a').replace(/é/g, 'e')
                                      .replace(/í/g, 'i').replace(/ó/g, 'o')
                                      .replace(/ú/g, 'u');

  const key = Object.keys(colorMap).find(k => k.toLowerCase()
                                            .replace(/á/g, 'a').replace(/é/g, 'e')
                                            .replace(/í/g, 'i').replace(/ó/g, 'o')
                                            .replace(/ú/g, 'u') 
                                            === normalizedColorName);
                                            
  return key ? colorMap[key] : '#CCCCCC';
}

export default ProductoCard;