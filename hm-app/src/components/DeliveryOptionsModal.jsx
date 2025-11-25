import React, { useState, useEffect } from 'react';
import './DeliveryOptionsModal.css';

function DeliveryOptionsModal({ 
  show, 
  onClose, 
  onConfirm, 
  defaultAddress = '', 
  defaultName = '', 
  defaultDNI = '',
  shippingMethod = 'tienda'
}) {
  const [deliveryInfo, setDeliveryInfo] = useState({
    deliveryDate: '',
    deliveryTime: '',
    recipientName: defaultName,
    recipientDNI: defaultDNI,
    deliveryAddress: defaultAddress
  });

  const [suggestedDate, setSuggestedDate] = useState('');
  const [minDate, setMinDate] = useState('');

  useEffect(() => {
    if (show) {
      console.log('🚚 Modal de entrega abierto');
      const suggested = getSuggestedDate(shippingMethod);
      const suggestedFormatted = suggested; // Ya está en formato ISO (YYYY-MM-DD)
      
      setSuggestedDate(suggestedFormatted);
      setMinDate(suggestedFormatted);
      
      // Pre-llenar con datos del usuario
      setDeliveryInfo({
        deliveryDate: suggestedFormatted,
        deliveryTime: '09:00',
        recipientName: defaultName,
        recipientDNI: defaultDNI,
        deliveryAddress: defaultAddress
      });
    }
  }, [show, shippingMethod, defaultName, defaultDNI, defaultAddress]);

  const getSuggestedDate = (method) => {
    const today = new Date();
    const daysToAdd = method === 'tienda' ? 2 : 3;
    
    let businessDays = 0;
    let currentDate = new Date(today);
    
    while (businessDays < daysToAdd) {
      currentDate.setDate(currentDate.getDate() + 1);
      // Saltar fines de semana (0 = Domingo, 6 = Sábado)
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        businessDays++;
      }
    }
    
    return currentDate.toISOString().split('T')[0];
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDeliveryInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('📋 Formulario de entrega enviado:', deliveryInfo);
    
    // Validaciones
    if (!deliveryInfo.deliveryTime) {
      alert('Por favor, seleccione una hora de entrega');
      return;
    }
    
    if (!deliveryInfo.recipientName.trim()) {
      alert('Por favor, ingrese el nombre del receptor');
      return;
    }
    
    if (!deliveryInfo.recipientDNI || deliveryInfo.recipientDNI.length !== 8) {
      alert('Por favor, ingrese un DNI válido de 8 dígitos');
      return;
    }
    
    if (shippingMethod === 'envio' && !deliveryInfo.deliveryAddress.trim()) {
      alert('Por favor, ingrese una dirección de entrega');
      return;
    }
    
    const finalDeliveryInfo = {
      ...deliveryInfo,
      shippingMethod
    };
    console.log('✅ Validaciones pasadas, confirmando entrega:', finalDeliveryInfo);
    onConfirm(finalDeliveryInfo);
  };

  if (!show) return null;

  return (
    <div className="delivery-modal-overlay">
      <div className="delivery-modal-content">
        <h2>Opciones de Entrega</h2>
        
        <form onSubmit={handleSubmit} className="delivery-form">
          {/* Tipo de Entrega */}
          <div className="info-section">
            <p className="delivery-type">
              <strong>Tipo de entrega:</strong> {shippingMethod === 'tienda' ? 'Recojo en Tienda' : 'Envío a Domicilio'}
            </p>
            {shippingMethod === 'tienda' && (
              <p className="delivery-note">
                📍 Podrás recoger tu pedido en nuestra tienda principal
              </p>
            )}
          </div>

          {/* Fecha de Entrega */}
          <div className="form-group">
            <label htmlFor="deliveryDate">
              Fecha estimada de {shippingMethod === 'tienda' ? 'recojo' : 'entrega'} *
            </label>
            <input
              type="date"
              id="deliveryDate"
              name="deliveryDate"
              value={deliveryInfo.deliveryDate}
              min={minDate}
              onChange={handleChange}
              required
            />
            <small className="help-text">
              Fecha mínima de {shippingMethod === 'tienda' ? 'recojo' : 'entrega'}: {new Date(suggestedDate + 'T00:00:00').toLocaleDateString('es-PE', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </small>
          </div>

          {/* Hora de Entrega */}
          <div className="form-group">
            <label htmlFor="deliveryTime">
              Hora de {shippingMethod === 'tienda' ? 'recojo' : 'entrega'} *
            </label>
            <select
              id="deliveryTime"
              name="deliveryTime"
              value={deliveryInfo.deliveryTime}
              onChange={handleChange}
              required
            >
              <option value="">Seleccione una hora</option>
              <option value="09:00">9:00 AM - 11:00 AM</option>
              <option value="11:00">11:00 AM - 1:00 PM</option>
              <option value="13:00">1:00 PM - 3:00 PM</option>
              <option value="15:00">3:00 PM - 5:00 PM</option>
              <option value="17:00">5:00 PM - 7:00 PM</option>
            </select>
            <small className="help-text">
              {shippingMethod === 'tienda' 
                ? 'Horario de atención de tienda: 9:00 AM - 7:00 PM' 
                : 'Seleccione el rango horario preferido para recibir su pedido'}
            </small>
          </div>

          {/* Receptor - Nombre */}
          <div className="form-group">
            <label htmlFor="recipientName">
              Nombre del receptor *
            </label>
            <input
              type="text"
              id="recipientName"
              name="recipientName"
              value={deliveryInfo.recipientName}
              onChange={handleChange}
              placeholder="Nombre completo"
              required
            />
          </div>

          {/* Receptor - DNI */}
          <div className="form-group">
            <label htmlFor="recipientDNI">
              DNI del receptor *
            </label>
            <input
              type="text"
              id="recipientDNI"
              name="recipientDNI"
              value={deliveryInfo.recipientDNI}
              onChange={handleChange}
              placeholder="12345678"
              pattern="[0-9]{8}"
              maxLength="8"
              required
            />
            <small className="help-text">
              Debe presentar DNI al momento de recibir el pedido
            </small>
          </div>

          {/* Dirección (solo para envío a domicilio) */}
          {shippingMethod === 'envio' && (
            <div className="form-group">
              <label htmlFor="deliveryAddress">
                Dirección de entrega *
              </label>
              <textarea
                id="deliveryAddress"
                name="deliveryAddress"
                value={deliveryInfo.deliveryAddress}
                onChange={handleChange}
                placeholder="Ej: Av. Principal 123, Urb. Los Olivos, Lima"
                rows="3"
                required
              />
              <small className="help-text">
                Puede editar la dirección si desea recibir en otra ubicación
              </small>
            </div>
          )}

          {/* Botones */}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancelar
            </button>
            <button type="submit" className="btn-confirm">
              Confirmar Entrega
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DeliveryOptionsModal;
