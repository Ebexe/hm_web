/* Archivo: hm-app/src/pages/CartPage.jsx (ACTUALIZADO PARA IMÁGENES IA) */

import React, { useState, useMemo } from 'react';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';

import './CartPage.css';

const API_BASE_URL = 'http://localhost:3001';
const COSTO_ENVIO = 10.50;
const COSTO_RECOJO = 0.00;

function CartPage() {
    const { cart, updateItem, removeItem, checkout } = useCart();
    const navigate = useNavigate();
    
    const [shippingMethod, setShippingMethod] = useState('tienda'); 
    const [isProcessing, setIsProcessing] = useState(false); // Estado para deshabilitar el botón
    const [checkoutError, setCheckoutError] = useState(null); // Para mostrar errores (ej. "Sin stock")

    const shippingCost = useMemo(() => {
      return shippingMethod === 'envio' ? COSTO_ENVIO : COSTO_RECOJO;
    }, [shippingMethod]);

    const grandTotal = useMemo(() => {
      return cart.total + shippingCost;
    }, [cart.total, shippingCost]);

    
    // --- Handlers (actualizados para manejar errores) ---
    const handleQuantityChange = async (id_variante, nuevaCantidad) => {
        const cantidadNum = parseInt(nuevaCantidad, 10);
        if (cantidadNum > 0) {
            try {
                await updateItem(id_variante, cantidadNum); // Llama a la API
            } catch (error) {
                // Muestra el error de stock que viene de la API
                alert(error.message); 
            }
        }
    };

    const handleRemoveItem = (id_variante) => {
        if (window.confirm("¿Estás seguro de que quieres eliminar este producto?")) {
            removeItem(id_variante);
        }
    };

    // --- HANDLER PARA EL BOTÓN DE PAGO ---
    const handleCheckout = async () => {
        setIsProcessing(true); // Deshabilita el botón
        setCheckoutError(null);
        
        try {
            // Llama a la función del context
            const data = await checkout({
                shippingCost: shippingCost,
                total: grandTotal
            });
            
            // ¡ÉXITO!
            console.log("Compra exitosa, ID de orden:", data.newOrderId);
            // Redirigimos a una página de "Gracias"
            navigate(`/pedido-exitoso/${data.newOrderId}`);
            
        } catch (error) {
            // Si el backend lanza un error (ej. Stock insuficiente), lo mostramos
            console.error("Error al procesar el pago:", error);
            setCheckoutError(error.message);
            setIsProcessing(false); // Vuelve a habilitar el botón
        }
    };


    // --- Renderizado ---

    if (cart.loading) {
        return <div className="cart-page-container center-text">Cargando tu carrito...</div>;
    }

    if (!cart.items || cart.items.length === 0) {
        return (
            <div className="cart-page-container center-text">
                <h2>Tu carrito está vacío</h2>
                <p>¿No sabes qué comprar? ¡Miles de productos te esperan!</p>
                <Link to="/hombre" className="checkout-btn">Ver productos</Link>
            </div>
        );
    }

    return (
        <div className="cart-page-container">
            <h1>Mi Carrito ({cart.count} {cart.count === 1 ? 'item' : 'items'})</h1>
            
            <div className="cart-layout">
                {/* --- Columna Izquierda: Lista de Items --- */}
                <div className="cart-items-list">
                    {cart.items.map(item => {
                        // --- ACTUALIZACIÓN PARA IMÁGENES IA ---
                        // Verificamos si la imagen es una URL absoluta (http/https) o base64 (data:image)
                        const isExternalOrAI = item.url_imagen && (item.url_imagen.startsWith('http') || item.url_imagen.startsWith('data:'));

                        const imageUrl = item.url_imagen 
                            ? (isExternalOrAI ? item.url_imagen : `${API_BASE_URL}${item.url_imagen}`)
                            : 'https://via.placeholder.com/150';

                        return (
                            <div className="cart-item" key={item.id_variante}>
                                <img src={imageUrl} alt={item.nombre_producto} className="cart-item-image" />
                                
                                <div className="cart-item-details">
                                    <Link to={`/producto/${item.id_producto}`} className="item-name">
                                        {item.nombre_producto}
                                    </Link>
                                    <span className="item-info">Color: {item.color}</span>
                                    <span className="item-info">Talla: {item.talla}</span>
                                    <span className="item-price-unit">
                                        Precio unitario: S/ {item.precio_en_carrito}
                                    </span>
                                </div>
                                
                                <div className="cart-item-actions">
                                    <label htmlFor={`qty-${item.id_variante}`}>Cant:</label>
                                    <input
                                        id={`qty-${item.id_variante}`}
                                        type="number"
                                        className="item-quantity-input"
                                        min="1"
                                        // Usamos el stock real que viene de la API
                                        max={item.stock} 
                                        value={item.cantidad}
                                        onChange={(e) => handleQuantityChange(item.id_variante, e.target.value)}
                                    />
                                    <button 
                                        className="item-remove-btn"
                                        onClick={() => handleRemoveItem(item.id_variante)}
                                    >
                                        Quitar
                                    </button>
                                </div>

                                <div className="cart-item-subtotal">
                                    <span>S/ {(item.precio_en_carrito * item.cantidad).toFixed(2)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* --- Columna Derecha: Resumen --- */}
                <div className="cart-summary">
                    <h3>Resumen del Pedido</h3>
                    
                    <div className="summary-row">
                        <span>Subtotal ({cart.count} items)</span>
                        <span>S/ {cart.total.toFixed(2)}</span>
                    </div>

                    <div className="shipping-options">
                        <label className="shipping-label">Opciones de Envío</label>
                        <div className="shipping-option">
                            <input
                                type="radio"
                                id="recojo_tienda"
                                name="shipping"
                                value="tienda"
                                checked={shippingMethod === 'tienda'}
                                onChange={() => setShippingMethod('tienda')}
                            />
                            <label htmlFor="recojo_tienda">
                                Recojo en Tienda <span>Gratis</span>
                            </label>
                        </div>
                        <div className="shipping-option">
                            <input
                                type="radio"
                                id="envio_domicilio"
                                name="shipping"
                                value="envio"
                                checked={shippingMethod === 'envio'}
                                onChange={() => setShippingMethod('envio')}
                            />
                            <label htmlFor="envio_domicilio">
                                Envío a Domicilio <span>S/ {COSTO_ENVIO.toFixed(2)}</span>
                            </label>
                        </div>
                    </div>
                    
                    <div className="summary-total">
                        <span>Total</span>
                        <span>S/ {grandTotal.toFixed(2)}</span>
                    </div>

                    {/* --- BOTÓN DE PAGO --- */}
                    <button 
                        className="checkout-btn"
                        onClick={handleCheckout}
                        disabled={isProcessing} // Se deshabilita al procesar
                    >
                        {isProcessing ? 'Procesando...' : 'Proceder al Pago'}
                    </button>
                    
                    {/* Muestra errores de checkout (ej. Sin Stock) */}
                    {checkoutError && (
                        <div className="checkout-error">
                            Error: {checkoutError}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CartPage;