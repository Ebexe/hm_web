/* Archivo: backend/service/emailService.js */

const sgMail = require('@sendgrid/mail');

// Configurar SendGrid con tu API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Email verificado en SendGrid (el que aparecerá como remitente)
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@hmfashion.com';
const FROM_NAME = 'H&M Fashion Assistant';

/**
 * Enviar correo de bienvenida al registrarse
 * @param {string} email - Correo del usuario
 * @param {string} nombre - Nombre del usuario
 */
const sendWelcomeEmail = async (email, nombre) => {
  try {
    const msg = {
      to: email,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      subject: '¡Bienvenido a H&M Fashion Assistant! 👋',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container {
              background: white;
              margin: 20px auto;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .header {
              background: #E50010;
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: normal;
            }
            .content {
              padding: 40px 30px;
              background: white;
            }
            .content h2 {
              color: #E50010;
              font-size: 22px;
              margin-top: 0;
            }
            .content ul {
              list-style: none;
              padding: 0;
              margin: 20px 0;
            }
            .content ul li {
              padding: 8px 0;
              border-bottom: 1px solid #f0f0f0;
            }
            .footer {
              background: #f9f9f9;
              text-align: center;
              padding: 20px;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #e0e0e0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>¡Bienvenido a H&M!</h1>
            </div>
            <div class="content">
              <h2>Hola ${nombre},</h2>
              <p>¡Gracias por registrarte en H&M Fashion Assistant! 🎉</p>
              <p>Estamos emocionados de tenerte con nosotros. Ahora puedes disfrutar de:</p>
              <ul>
                <li>✨ Asesor de moda con Inteligencia Artificial</li>
                <li>👗 Recomendaciones personalizadas según tu estilo</li>
                <li>🛍️ Acceso a nuestro catálogo completo</li>
                <li>🎁 Ofertas exclusivas y promociones</li>
              </ul>
              <p>Completa tu perfil para recibir recomendaciones más precisas de nuestro asistente IA.</p>
              <p style="margin-top: 30px; color: #666;">¡Feliz shopping!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} H&M Fashion Assistant. Todos los derechos reservados.</p>
              <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const response = await sgMail.send(msg);
    console.log(`✉️ Correo de bienvenida enviado a ${email} - Status: ${response[0].statusCode}`);
    return { success: true, statusCode: response[0].statusCode };
  } catch (error) {
    console.error('❌ Error enviando correo de bienvenida:', error);
    if (error.response) {
      console.error('SendGrid Error:', error.response.body);
    }
    throw error;
  }
};

/**
 * Enviar boucher de confirmación de compra
 * @param {string} email - Correo del usuario
 * @param {string} nombre - Nombre del usuario
 * @param {object} orderData - Datos de la compra
 */
const sendOrderConfirmationEmail = async (email, nombre, orderData) => {
  try {
    const { orderId, items, subtotal, shippingCost, total, fecha } = orderData;

    // Generar HTML para los items
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">
          ${item.nombre_producto || 'Producto'}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">
          ${item.color || '-'} / ${item.talla || '-'}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">
          ${item.cantidad}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">
          S/ ${parseFloat(item.precio_unitario || 0).toFixed(2)}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">
          S/ ${(parseFloat(item.precio_unitario || 0) * parseInt(item.cantidad || 0)).toFixed(2)}
        </td>
      </tr>
    `).join('');

    const msg = {
      to: email,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      subject: `Confirmación de tu pedido #${orderId} - H&M`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 700px;
              margin: 0 auto;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container {
              background: white;
              margin: 20px auto;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .header {
              background: #E50010;
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0 0 10px 0;
              font-size: 28px;
              font-weight: normal;
            }
            .header p {
              margin: 0;
              font-size: 16px;
              opacity: 0.9;
            }
            .content {
              padding: 40px 30px;
              background: white;
            }
            .content h2 {
              color: #E50010;
              font-size: 22px;
              margin-top: 0;
            }
            .order-info {
              background: #fafafa;
              padding: 25px;
              border-radius: 8px;
              margin: 25px 0;
              border-left: 4px solid #E50010;
            }
            .order-info h3 {
              color: #E50010;
              margin-top: 0;
              font-size: 18px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              background: white;
            }
            th {
              background: #E50010;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: normal;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #e0e0e0;
            }
            .totals {
              margin-top: 20px;
              text-align: right;
              padding: 15px 0;
            }
            .totals div {
              padding: 8px 0;
              font-size: 15px;
            }
            .total-final {
              font-size: 22px;
              font-weight: bold;
              color: #E50010;
              padding-top: 15px;
              border-top: 2px solid #E50010;
              margin-top: 10px;
            }
            .footer {
              background: #f9f9f9;
              text-align: center;
              padding: 25px;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #e0e0e0;
            }
            .footer p {
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ ¡Pedido Confirmado!</h1>
              <p>Pedido #${orderId}</p>
            </div>
            <div class="content">
              <h2>Hola ${nombre},</h2>
              <p>Gracias por tu compra en H&M. Tu pedido ha sido confirmado y está siendo procesado.</p>
              
              <div class="order-info">
                <h3>Detalles del Pedido</h3>
                <p><strong>Número de Pedido:</strong> #${orderId}</p>
                <p><strong>Fecha:</strong> ${fecha || new Date().toLocaleDateString('es-PE')}</p>
                
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th style="text-align: center;">Color/Talla</th>
                      <th style="text-align: center;">Cantidad</th>
                      <th style="text-align: right;">Precio Unit.</th>
                      <th style="text-align: right;">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>
                
                <div class="totals">
                  <div>
                    <strong>Subtotal:</strong> S/ ${parseFloat(subtotal || 0).toFixed(2)}
                  </div>
                  <div>
                    <strong>Envío:</strong> S/ ${parseFloat(shippingCost || 0).toFixed(2)}
                  </div>
                  <div class="total-final">
                    <strong>TOTAL:</strong> S/ ${parseFloat(total || 0).toFixed(2)}
                  </div>
                </div>
              </div>
              
              <p style="margin-top: 25px;">Recibirás un correo adicional cuando tu pedido sea enviado.</p>
              <p style="color: #666; margin-top: 20px;">¡Gracias por confiar en H&M!</p>
            </div>
            <div class="footer">
              <p>Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos.</p>
              <p>© ${new Date().getFullYear()} H&M Fashion Assistant. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const response = await sgMail.send(msg);
    console.log(`✉️ Correo de confirmación de pedido enviado a ${email} - Status: ${response[0].statusCode}`);
    return { success: true, statusCode: response[0].statusCode };
  } catch (error) {
    console.error('❌ Error enviando correo de confirmación:', error);
    if (error.response) {
      console.error('SendGrid Error:', error.response.body);
    }
    throw error;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendOrderConfirmationEmail
};
