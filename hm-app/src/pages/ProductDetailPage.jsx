/* Archivo: src/pages/ProductDetailPage.jsx (CORREGIDO FINAL) */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom'; 
import { getProductoById } from '../services/productService'; 
import { getProfile, getUserAjustes } from '../services/userService';
import useAuth from '../hooks/useAuth'; 
import { useCart } from '../context/CartContext'; 

import './ProductDetailPage.css'; 

const API_BASE_URL = 'http://localhost:3001';

// --- Helpers para detectar categoría del producto y tamaño preferido ---
const productCategoryKeywords = {
  upper: ['top','shirt','camisa','blusa','tee','t-shirt','polo','sweater','jersey','chaqueta','coat','cardigan','sudadera','camiseta'],
  lower: ['pant','pantal','jean','jeans','short','bermuda','skirt','falda','trouser','pants'],
  shoes: ['shoe','zapato','sneaker','zapatilla','boot','bota','calzado']
};

const detectProductCategory = (producto) => {
  if (!producto) return null;
  const text = ((producto.categoria || '') + ' ' + (producto.tipo || '') + ' ' + (producto.nombre || '') + ' ' + (producto.descripcion || '')).toLowerCase();
  for (const k of productCategoryKeywords.upper) if (text.includes(k)) return 'upper';
  for (const k of productCategoryKeywords.lower) if (text.includes(k)) return 'lower';
  for (const k of productCategoryKeywords.shoes) if (text.includes(k)) return 'shoes';
  return null;
};

const getPreferredSizeForCategory = (profileData, category) => {
  try {
    if (!profileData || !Array.isArray(profileData.ajustes)) return null;
    const ajustes = profileData.ajustes;
    const lowerKeys = ['inferior','pantal','waist','cintura','pants','jean','jeans','falda','short','bermuda'];
    const upperKeys = ['superior','camisa','blusa','shirt','top','polo','camiseta','sudadera','jersey','chaqueta'];
    const shoeKeys = ['calzado','zapato','shoe','zapatilla','bota','boot'];

    const matches = (keys) => ajustes.find(a => a.nombre_categoria && keys.some(k => String(a.nombre_categoria).toLowerCase().includes(k)));

    if (category === 'upper') {
      const m = matches(upperKeys);
      return m ? (m.talla_habitual || m.talla) : null;
    }
    if (category === 'lower') {
      const m = matches(lowerKeys);
      return m ? (m.talla_habitual || m.talla) : null;
    }
    if (category === 'shoes') {
      const m = matches(shoeKeys);
      return m ? (m.talla_habitual || m.talla) : null;
    }

    // fallback: return first ajuste talla
    const first = ajustes[0];
    return first ? (first.talla_habitual || first.talla) : null;
  } catch (e) {
    return null;
  }
};

function ProductDetailPage() {
  const { productId } = useParams(); 
  const navigate = useNavigate();
  const { auth } = useAuth(); 
  const { addItem } = useCart(); 

  // Leer ?sku= desde la URL
  const { search } = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const defaultSku = queryParams.get('sku');

  // Estados
  const [producto, setProducto] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- ESTADOS UNIFICADOS: Solo guardamos la variante seleccionada ---
  // Esto simplifica todo: si hay variante seleccionada, tenemos su color y su talla
  const [selectedVariante, setSelectedVariante] = useState(null);

  // --- 1. Cargar producto y preseleccionar variante ---
  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (auth?.token) {
          const profile = await getProfile(auth.token);
          const ajustes = await getUserAjustes(auth.token);
          setProfileData({ ...profile, ajustes });
        } else {
          setProfileData(null);
        }
      } catch (err) {
        console.error('Error cargando perfil en ProductDetailPage:', err);
        setProfileData(null);
      }
    };

    loadProfile();

    const fetchProductData = async () => {
      try {
        setLoading(true);
        setError(null);
        setSelectedVariante(null); // Reset

        const data = await getProductoById(productId); 
        setProducto(data);

        if (data.variantes && data.variantes.length > 0) {
          let varianteToSelect = null;

          // 1. Prioridad: SKU de la URL
          if (defaultSku) {
            varianteToSelect = data.variantes.find(v => v.sku === defaultSku);
            if (varianteToSelect) {
              console.log("Variante preseleccionada por SKU:", varianteToSelect);
            } else {
              console.warn("SKU no encontrado en variantes:", defaultSku);
            }
          }

          // 2. Fallback: primera variante disponible
          if (!varianteToSelect) {
            varianteToSelect = data.variantes[0];
            console.log("Usando variante por defecto:", varianteToSelect);
          }

          setSelectedVariante(varianteToSelect);
        }

      } catch (err) {
        console.error(`Error al cargar producto ${productId}:`, err);
        setError(err.message || "No se pudo cargar el producto."); 
      } finally {
        setLoading(false);
      }
    };

    if (productId && !isNaN(productId)) { 
      fetchProductData();
    } else {
      setError("ID de producto inválido.");
      setLoading(false);
    }
  }, [productId, defaultSku]); // <-- Depende del SKU en URL

  // --- 2. Colores y tallas disponibles (basado en selectedVariante) ---
  const coloresDisponibles = useMemo(() => {
    if (!producto) return [];
    return [...new Set(producto.variantes.map(v => v.color))];
  }, [producto]);

  const tallasDisponibles = useMemo(() => {
    if (!producto || !selectedVariante) return [];
    // Mostramos las tallas disponibles PARA EL COLOR seleccionado actualmente
    const base = producto.variantes
      .filter(v => v.color === selectedVariante.color)
      .map(v => ({ talla: v.talla, stock: v.stock, sku: v.sku, id_variante: v.id_variante }));

    // Si tenemos perfil, añadimos SOLO la talla preferida correspondiente a la categoría del producto
    try {
      const productCat = detectProductCategory(producto);
      const preferred = getPreferredSizeForCategory(profileData, productCat);
      if (preferred && !base.find(b => String(b.talla) === String(preferred))) {
        base.push({ talla: preferred, stock: selectedVariante.stock || 1, sku: selectedVariante.sku, _simulated: true });
      }
    } catch (e) {
      // ignore
    }

    return base;
  }, [producto, selectedVariante, profileData]);

  // --- 3. Handlers ---

  const handleSelectColor = (color) => {
    // Al cambiar color, buscamos la primera variante de ese color (o mantenemos talla si existe)
    // Estrategia simple: buscar la primera variante de ese color
    const nuevaVariante = producto.variantes.find(v => v.color === color);
    if (nuevaVariante) {
      setSelectedVariante(nuevaVariante);
      // Actualizar URL (opcional, para reflejar el cambio)
      const newUrl = `${window.location.pathname}?sku=${nuevaVariante.sku}`;
      window.history.replaceState(null, "", newUrl);
    }
  };

  const handleSelectTalla = (talla) => {
    // Al cambiar talla, buscamos la variante con el MISMO color y la NUEVA talla
    const nuevaVariante = producto.variantes.find(
      v => v.color === selectedVariante.color && v.talla === talla
    );
    if (nuevaVariante) {
      setSelectedVariante(nuevaVariante);
      // Actualizar URL
      const newUrl = `${window.location.pathname}?sku=${nuevaVariante.sku}`;
      window.history.replaceState(null, "", newUrl);
    }
    else {
      // Si no existe una variante real con esa talla, simulamos una selección basada en la variante actual
      const simulated = { ...selectedVariante, talla, _simulated: true };
      setSelectedVariante(simulated);
      // Mantener SKU en la URL (no hay SKU real para la talla simulada)
      const newUrl = `${window.location.pathname}?sku=${selectedVariante.sku}`;
      window.history.replaceState(null, "", newUrl);
    }
  };

  const handleAddToCart = () => {
    if (!auth.token) {
      navigate('/login'); 
      return;
    }
    
    // Intentamos resolver una variante real con el color+talla seleccionados
    const realVariant = producto.variantes.find(v => v.color === selectedVariante.color && v.talla === selectedVariante.talla);
    const variantToAdd = realVariant || selectedVariante;

    if (variantToAdd && (variantToAdd.stock === undefined || variantToAdd.stock > 0)) {
      const idToAdd = variantToAdd.id_variante || producto.variantes?.[0]?.id_variante || selectedVariante.id_variante;
      addItem(idToAdd, 1)
        .then(() => {
          alert(`¡${producto.nombre} (${variantToAdd.color || selectedVariante.color} - ${variantToAdd.talla || selectedVariante.talla}) añadido!`);
        })
        .catch((err) => {
          alert(`Error: ${err.message}`);
        });
    } else {
      alert("Selecciona una talla disponible.");
    }
  };

  // --- 4. Render ---
  if (loading) return <div className="detail-page-container center-text">Cargando...</div>;
  if (error) return <div className="detail-page-container center-text error-text">Error: {error}</div>; 
  if (!producto || !selectedVariante) return <div className="detail-page-container center-text">Producto no disponible.</div>;

  // Imagen
  const imagenRelativa = selectedVariante.url_imagen;
  const fullImageUrl = imagenRelativa 
    ? (imagenRelativa.startsWith('http') ? imagenRelativa : `${API_BASE_URL}${imagenRelativa}`) 
    : 'https://via.placeholder.com/600x800.png?text=Sin+imagen';

  return (
    <div className="product-detail-container">
      <div className="product-image-section">
        <img src={fullImageUrl} alt={producto.nombre} className="product-detail-image" />
      </div>
      
      <div className="product-details-section">
        <h1>{producto.nombre}</h1>
        
        <p className="product-price">
          S/ {selectedVariante.precio || '0.00'}
        </p>
        
        <div className="product-description">
          <p>{producto.descripcion}</p>
        </div>

        {/* Color */}
        <div className="selector-container">
          <label>Color: <strong>{selectedVariante.color}</strong></label>
          <div className="options-grid">
            {coloresDisponibles.map(color => (
              <button 
                key={color}
                className={`option-btn color-btn ${selectedVariante.color === color ? 'selected' : ''}`}
                onClick={() => handleSelectColor(color)}
              >
                {color}
              </button>
            ))}
          </div>
        </div>

        {/* Talla */}
        <div className="selector-container">
          <label>Talla:</label>
          <div className="options-grid">
            {tallasDisponibles.map(({ talla, stock }) => (
              <button 
                key={talla}
                className={`option-btn talla-btn ${selectedVariante.talla === talla ? 'selected' : ''} ${stock === 0 ? 'disabled' : ''}`}
                onClick={() => handleSelectTalla(talla)}
                disabled={stock === 0}
                title={stock === 0 ? 'Agotado' : `Talla ${talla}`}
              >
                {talla}
              </button>
            ))}
          </div>
        </div>

        <button 
          className="add-to-cart-btn"
          onClick={handleAddToCart}
          disabled={selectedVariante.stock === 0}
        >
          {selectedVariante.stock === 0 ? 'Agotado' : 'Añadir al Carrito'}
        </button>

      </div>
    </div>
  );
}

export default ProductDetailPage;