/* Archivo: hm-app/src/pages/OrderSuccessPage.jsx (NUEVO) */

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import './OrderSuccessPage.css'; // Crearemos este CSS

function OrderSuccessPage() {
    const { orderId } = useParams(); // Obtenemos el ID de la orden desde la URL

    return (
        <div className="order-success-container">
            <div className="success-icon">✓</div>
            <h1>¡Gracias por tu compra, mi rey!</h1>
            <p>Tu pedido ha sido confirmado exitosamente.</p>
            <p className="order-number">
                N° de Pedido: <strong>{orderId}</strong>
            </p>
            <p>Hemos enviado un correo de confirmación con los detalles de tu compra.</p>
            
            <Link to="/hombre" className="continue-shopping-btn">
                Seguir Comprando
            </Link>
        </div>
    );
}

export default OrderSuccessPage;