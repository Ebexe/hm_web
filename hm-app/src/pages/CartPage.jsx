/* Archivo: hm-app/src/pages/CartPage.jsx (ACTUALIZADO PARA IMÁGENES IA) */

import React, { useState, useMemo, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import DeliveryOptionsModal from '../components/DeliveryOptionsModal';

import './CartPage.css';

const API_BASE_URL = 'http://localhost:3001';
const COSTO_ENVIO = 10.50;
const COSTO_RECOJO = 0.00;

function CartPage() {
    const { cart, updateItem, removeItem, checkout } = useCart();
    const navigate = useNavigate();
    
    const [shippingMethod, setShippingMethod] = useState('tienda'); 
    const [isProcessing, setIsProcessing] = useState(false);
    const [checkoutError, setCheckoutError] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [paymentData, setPaymentData] = useState({
        cardNumber: '',
        cardName: '',
        expiryDate: '',
        cvv: ''
    });
    const [deliveryInfo, setDeliveryInfo] = useState(null);
    const [userProfile, setUserProfile] = useState(null);

    // Cargar datos del perfil del usuario
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                
                const response = await fetch('http://localhost:3001/api/users/profile', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setUserProfile(data);
                }
            } catch (error) {
                console.error('Error al cargar perfil:', error);
            }
        };
        
        fetchUserProfile();
    }, []);

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

    // --- HANDLER PARA ABRIR EL MODAL DE PAGO ---
    const handleProceedToPayment = () => {
        setShowPaymentModal(true);
    };

    // --- HANDLER PARA CAMBIOS EN EL FORMULARIO DE PAGO ---
    const handlePaymentChange = (e) => {
        const { name, value } = e.target;
        let formattedValue = value;

        // Formatear número de tarjeta (grupos de 4 dígitos)
        if (name === 'cardNumber') {
            formattedValue = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
            if (formattedValue.length > 19) return; // 16 dígitos + 3 espacios
        }

        // Formatear fecha de expiración (MM/YY)
        if (name === 'expiryDate') {
            formattedValue = value.replace(/\D/g, '');
            if (formattedValue.length >= 2) {
                formattedValue = formattedValue.slice(0, 2) + '/' + formattedValue.slice(2, 4);
            }
            if (formattedValue.length > 5) return;
        }

        // Limitar CVV a 3-4 dígitos
        if (name === 'cvv') {
            formattedValue = value.replace(/\D/g, '').slice(0, 4);
        }

        setPaymentData(prev => ({ ...prev, [name]: formattedValue }));
    };

    // --- HANDLER PARA CONFIRMAR EL PAGO (simulación) ---
    const handleConfirmPayment = async (e) => {
        e.preventDefault();
        
        // Validaciones básicas
        const cardNumberDigits = paymentData.cardNumber.replace(/\s/g, '');
        if (cardNumberDigits.length < 16) {
            setCheckoutError('Número de tarjeta inválido');
            return;
        }
        if (!paymentData.cardName.trim()) {
            setCheckoutError('Nombre del titular requerido');
            return;
        }
        if (paymentData.expiryDate.length !== 5) {
            setCheckoutError('Fecha de expiración inválida');
            return;
        }
        if (paymentData.cvv.length < 3) {
            setCheckoutError('CVV inválido');
            return;
        }

        // Simular delay de procesamiento de pago
        setIsProcessing(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsProcessing(false);
        
        // Cerrar modal de pago y abrir modal de entrega
        setShowPaymentModal(false);
        setShowDeliveryModal(true);
    };

    // Handler para confirmar opciones de entrega
    const handleDeliveryConfirm = async (delivery) => {
        setDeliveryInfo(delivery);
        setShowDeliveryModal(false);
        setIsProcessing(true);
        setCheckoutError(null);
        
        try {
            // Extraer últimos 4 dígitos de la tarjeta
            const cardNumberDigits = paymentData.cardNumber.replace(/\s/g, '');
            const lastFourDigits = cardNumberDigits.slice(-4);
            
            // Llamar al checkout con información completa
            const data = await checkout({
                shippingCost: shippingCost,
                total: grandTotal,
                paymentMethod: `Tarjeta ****${lastFourDigits}`,
                deliveryInfo: delivery
            });
            
            console.log("Compra exitosa, ID de orden:", data.newOrderId);
            navigate(`/pedido-exitoso/${data.newOrderId}`);
            
        } catch (error) {
            console.error("Error al procesar el checkout:", error);
            setCheckoutError(error.message);
            setIsProcessing(false);
            setShowDeliveryModal(true); // Volver a abrir el modal
        }
    };

    // --- HANDLER PARA CANCELAR EL PAGO ---
    const handleCancelPayment = () => {
        setShowPaymentModal(false);
        setPaymentData({ cardNumber: '', cardName: '', expiryDate: '', cvv: '' });
        setCheckoutError(null);
    };

    // --- HANDLER PARA CANCELAR OPCIONES DE ENTREGA ---
    const handleCancelDelivery = () => {
        setShowDeliveryModal(false);
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
                        onClick={handleProceedToPayment}
                        disabled={isProcessing}
                    >
                        Proceder al Pago
                    </button>
                    
                    {/* Muestra errores de checkout (ej. Sin Stock) */}
                    {checkoutError && (
                        <div className="checkout-error">
                            Error: {checkoutError}
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODAL DE PAGO --- */}
            {showPaymentModal && (
                <div className="payment-modal-overlay" onClick={handleCancelPayment}>
                    <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="payment-modal-header">
                            <h2>💳 Información de Pago</h2>
                            <button className="modal-close-btn" onClick={handleCancelPayment}>✕</button>
                        </div>

                        <form onSubmit={handleConfirmPayment} className="payment-form">
                            <div className="form-group">
                                <label htmlFor="cardNumber">Número de Tarjeta</label>
                                <input
                                    type="text"
                                    id="cardNumber"
                                    name="cardNumber"
                                    value={paymentData.cardNumber}
                                    onChange={handlePaymentChange}
                                    placeholder="1234 5678 9012 3456"
                                    required
                                    autoComplete="off"
                                />
                                <small className="hint">Tarjeta de prueba: 4532 1234 5678 9010</small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="cardName">Nombre del Titular</label>
                                <input
                                    type="text"
                                    id="cardName"
                                    name="cardName"
                                    value={paymentData.cardName}
                                    onChange={handlePaymentChange}
                                    placeholder="JUAN PEREZ"
                                    required
                                    style={{ textTransform: 'uppercase' }}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="expiryDate">Fecha de Expiración</label>
                                    <input
                                        type="text"
                                        id="expiryDate"
                                        name="expiryDate"
                                        value={paymentData.expiryDate}
                                        onChange={handlePaymentChange}
                                        placeholder="MM/YY"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="cvv">CVV</label>
                                    <input
                                        type="text"
                                        id="cvv"
                                        name="cvv"
                                        value={paymentData.cvv}
                                        onChange={handlePaymentChange}
                                        placeholder="123"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="payment-summary">
                                <div className="summary-line">
                                    <span>Subtotal:</span>
                                    <span>S/ {cart.total.toFixed(2)}</span>
                                </div>
                                <div className="summary-line">
                                    <span>Envío:</span>
                                    <span>S/ {shippingCost.toFixed(2)}</span>
                                </div>
                                <div className="summary-line total">
                                    <span>Total a pagar:</span>
                                    <span>S/ {grandTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            {checkoutError && (
                                <div className="payment-error">
                                    {checkoutError}
                                </div>
                            )}

                            <div className="payment-actions">
                                <button 
                                    type="submit" 
                                    className="btn-confirm-payment"
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? 'Procesando...' : 'Confirmar Pago'}
                                </button>
                                <button 
                                    type="button" 
                                    className="btn-cancel-payment"
                                    onClick={handleCancelPayment}
                                    disabled={isProcessing}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Opciones de Entrega */}
            <DeliveryOptionsModal
                show={showDeliveryModal}
                onClose={handleCancelDelivery}
                onConfirm={handleDeliveryConfirm}
                defaultAddress={userProfile?.direccion || ''}
                defaultName={userProfile?.nombre || ''}
                defaultDNI={userProfile?.dni || ''}
                shippingMethod={shippingMethod}
            />
        </div>
    );
}

export default CartPage;