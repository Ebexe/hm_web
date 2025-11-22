/* Archivo de prueba para el servicio de email con SendGrid */
require('dotenv').config();
const { sendWelcomeEmail, sendOrderConfirmationEmail } = require('./service/emailService');

// Cambia este email por uno de prueba donde quieras recibir los correos
const TEST_EMAIL = 'tu-email-de-prueba@gmail.com';

console.log('🧪 Iniciando pruebas de email con SendGrid...\n');
console.log('📋 Verificando configuración...');
console.log('   SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅ Configurado' : '❌ NO configurado');
console.log('   SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL || '❌ NO configurado');
console.log('   TEST_EMAIL:', TEST_EMAIL, '\n');

if (!process.env.SENDGRID_API_KEY) {
  console.error('❌ Error: SENDGRID_API_KEY no está configurado en .env');
  console.error('   Por favor, configura tu API Key de SendGrid primero.\n');
  process.exit(1);
}

// Test 1: Correo de bienvenida
console.log('📧 Test 1: Enviando correo de bienvenida...');
sendWelcomeEmail(TEST_EMAIL, 'Usuario de Prueba')
  .then((result) => {
    console.log('✅ Correo de bienvenida enviado exitosamente');
    console.log('   Status Code:', result.statusCode);
    console.log('   Revisa tu bandeja de entrada en:', TEST_EMAIL, '\n');
    
    // Test 2: Correo de confirmación de pedido
    console.log('📧 Test 2: Enviando correo de confirmación de pedido...');
    
    const orderDataExample = {
      orderId: 12345,
      items: [
        {
          nombre_producto: 'Camisa Oxford Clásica',
          color: 'Azul',
          talla: 'M',
          cantidad: 2,
          precio_unitario: 89.90
        },
        {
          nombre_producto: 'Pantalón Chino Slim Fit',
          color: 'Beige',
          talla: '32',
          cantidad: 1,
          precio_unitario: 129.90
        },
        {
          nombre_producto: 'Zapatos Derby Formales',
          color: 'Negro',
          talla: '42',
          cantidad: 1,
          precio_unitario: 199.90
        }
      ],
      subtotal: 509.60,
      shippingCost: 15.00,
      total: 524.60,
      fecha: new Date().toLocaleDateString('es-PE', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    
    return sendOrderConfirmationEmail(TEST_EMAIL, 'Usuario de Prueba', orderDataExample);
  })
  .then((result) => {
    console.log('✅ Correo de confirmación enviado exitosamente');
    console.log('   Status Code:', result.statusCode);
    console.log('   Revisa tu bandeja de entrada en:', TEST_EMAIL, '\n');
    console.log('🎉 ¡Todas las pruebas completadas exitosamente!');
    console.log('\n📝 Notas:');
    console.log('   - Si no ves los correos, revisa tu carpeta de SPAM');
    console.log('   - Los correos pueden tardar algunos segundos en llegar');
    console.log('   - Verifica que tu email remitente esté verificado en SendGrid\n');
  })
  .catch((error) => {
    console.error('\n❌ Error durante las pruebas:', error);
    console.error('\n🔧 Posibles soluciones:');
    console.error('   1. Verifica que SENDGRID_API_KEY esté configurado en .env');
    console.error('   2. Asegúrate de que tu API Key tenga permisos de "Mail Send"');
    console.error('   3. Verifica que SENDGRID_FROM_EMAIL esté verificado en SendGrid');
    console.error('   4. Revisa el archivo EMAIL_SETUP.md para más detalles\n');
    process.exit(1);
  });
