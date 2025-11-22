# 📧 Configuración del Servicio de Email con SendGrid

Este proyecto usa **SendGrid** para enviar correos electrónicos automáticos de forma profesional y confiable.

## ✨ Ventajas de SendGrid

✅ **100 emails/día gratis para siempre** (sin tarjeta de crédito)
✅ No necesitas usar tu email personal
✅ Mejor deliverability (no caen en SPAM)
✅ Dashboard con estadísticas de emails enviados
✅ Verificación profesional de remitente
✅ Escalable si tu app crece

## 🚀 Configuración (5 minutos)

### Paso 1: Crear cuenta en SendGrid

1. Ve a: https://signup.sendgrid.com/
2. Completa el formulario de registro
3. Verifica tu email
4. Completa el onboarding (elige "Web API" cuando pregunte)

### Paso 2: Crear API Key

1. Una vez dentro, ve a: **Settings** → **API Keys**
   - O directamente: https://app.sendgrid.com/settings/api_keys
2. Haz clic en **"Create API Key"**
3. Dale un nombre: `HM Fashion Backend`
4. Selecciona **"Full Access"** o **"Restricted Access"** con permisos de **"Mail Send"**
5. Haz clic en **"Create & View"**
6. 🔴 **IMPORTANTE**: Copia la API Key (no podrás verla de nuevo)
   - Se ve así: `SG.xxxxxxxxxxxxxx.yyyyyyyyyyyyyyyy`

### Paso 3: Verificar Sender Identity (Email Remitente)

SendGrid requiere que verifiques el email desde el cual enviarás correos:

#### Opción A: Single Sender Verification (Recomendado para desarrollo)

1. Ve a: **Settings** → **Sender Authentication** → **Single Sender Verification**
   - O directamente: https://app.sendgrid.com/settings/sender_auth/senders
2. Haz clic en **"Create New Sender"**
3. Completa el formulario:
   - **From Name**: `H&M Fashion Assistant`
   - **From Email Address**: Tu email personal (ej: `tu-email@gmail.com`)
   - **Reply To**: El mismo email
   - **Company Address**: Dirección de prueba
4. Haz clic en **"Create"**
5. **Verifica tu email**: Recibirás un correo de SendGrid, haz clic en el enlace
6. ✅ Una vez verificado, verás un check verde

#### Opción B: Domain Authentication (Para producción con dominio propio)

Solo si tienes un dominio propio (ej: `hmfashion.com`):
1. Ve a: **Settings** → **Sender Authentication** → **Domain Authentication**
2. Sigue el wizard para agregar registros DNS en tu dominio
3. Usa emails como: `noreply@tudominio.com`

### Paso 4: Configurar variables de entorno

Edita el archivo `backend/.env`:

```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxx.yyyyyyyyyyyyyyyy
SENDGRID_FROM_EMAIL=tu-email-verificado@gmail.com
FRONTEND_URL=http://localhost:5173
```

⚠️ **IMPORTANTE**: 
- `SENDGRID_API_KEY`: La API Key que copiaste en el Paso 2
- `SENDGRID_FROM_EMAIL`: El email que verificaste en el Paso 3
- Ambos valores deben coincidir con lo configurado en SendGrid

### Paso 5: Instalar dependencias

```bash
cd backend
npm install
```

Esto instalará `@sendgrid/mail` automáticamente.

## 🧪 Probar el servicio

### 1. Editar el archivo de prueba

Abre `backend/test-email.js` y cambia:

```javascript
const TEST_EMAIL = 'tu-email-de-prueba@gmail.com';
```

### 2. Ejecutar prueba

```bash
node test-email.js
```

Deberías ver:

```
🧪 Iniciando pruebas de email con SendGrid...
📋 Verificando configuración...
   SENDGRID_API_KEY: ✅ Configurado
   SENDGRID_FROM_EMAIL: tu-email@gmail.com
   TEST_EMAIL: prueba@gmail.com 

📧 Test 1: Enviando correo de bienvenida...
✉️ Correo de bienvenida enviado a prueba@gmail.com - Status: 202
✅ Correo de bienvenida enviado exitosamente
   Status Code: 202
   
📧 Test 2: Enviando correo de confirmación de pedido...
✉️ Correo de confirmación de pedido enviado a prueba@gmail.com - Status: 202
✅ Correo de confirmación enviado exitosamente
   Status Code: 202
   
🎉 ¡Todas las pruebas completadas exitosamente!
```

### 3. Verificar en tu email

Revisa tu bandeja de entrada (puede tardar 1-2 segundos). Si no aparece, **revisa SPAM**.

## 📬 Correos que se envían

### 1. Correo de Bienvenida
- **Trigger**: Cuando un usuario se registra (POST `/api/auth/register`)
- **Contenido**: Mensaje de bienvenida con enlace al perfil
- **Función**: `sendWelcomeEmail(email, nombre)`

### 2. Boucher de Confirmación
- **Trigger**: Cuando se completa una compra (POST `/api/cart/checkout`)
- **Contenido**: Detalles de la compra con tabla de productos
- **Función**: `sendOrderConfirmationEmail(email, nombre, orderData)`

## 📊 Monitorear emails enviados

Ve al Dashboard de SendGrid para ver estadísticas:
- https://app.sendgrid.com/stats

Aquí puedes ver:
- ✉️ Emails enviados
- ✅ Emails entregados
- 📭 Emails abiertos
- 🖱️ Clicks en enlaces
- ⚠️ Errores o rebotes

## 🐛 Solución de problemas

### Error: "Forbidden"
- Tu API Key no tiene permisos de "Mail Send"
- Crea una nueva API Key con Full Access o con permisos específicos de Mail Send

### Error: "The from email does not match a verified Sender Identity"
- El email en `SENDGRID_FROM_EMAIL` no está verificado en SendGrid
- Ve a Sender Authentication y verifica tu email
- Asegúrate de que coincida exactamente (incluyendo mayúsculas/minúsculas)

### Error: "Unauthorized"
- Tu API Key es incorrecta o expiró
- Verifica que copiaste toda la API Key completa
- Revisa que no haya espacios al inicio/final en el `.env`

### Los correos llegan a SPAM
- Normal en desarrollo con Single Sender Verification
- Para producción, usa Domain Authentication
- Evita palabras spam en el asunto ("GRATIS", "PROMOCIÓN", etc.)

### No llegan los correos
1. Revisa tu carpeta de SPAM
2. Verifica los logs del servidor: el `console.log` mostrará el status
3. Ve al Dashboard de SendGrid → Activity Feed para ver el estado del email
4. Verifica que el email de destino sea válido

### Status Code 202 pero no llega el email
- Status 202 significa "Accepted" (SendGrid lo recibió)
- Puede tardar unos segundos en procesarse
- Revisa el Activity Feed en SendGrid Dashboard
- Si dice "Delivered", revisa SPAM

## 📝 Logs

El servicio registra en consola:
- ✉️ Email enviado: `✉️ Correo de bienvenida enviado a user@email.com - Status: 202`
- ❌ Error: `❌ Error enviando correo de bienvenida: [error message]`

Status codes:
- **202**: Aceptado (el email está siendo procesado)
- **400**: Bad Request (revisa el formato del email)
- **401**: Unauthorized (API Key inválida)
- **403**: Forbidden (falta verificación del remitente)

## 🔒 Seguridad

✅ **Buenas prácticas**:
- Usa variables de entorno para la API Key
- NO hardcodees la API Key en el código
- En producción, usa Restricted Access con solo permisos necesarios
- Rota tu API Key periódicamente

❌ **NO hagas**:
- Subir `.env` a GitHub
- Compartir tu API Key públicamente
- Usar Full Access en producción (usa Restricted Access)
- Usar un email personal como remitente en producción

## 💰 Límites del plan gratuito

SendGrid plan GRATIS:
- ✅ 100 emails/día (3,000/mes)
- ✅ Sin límite de tiempo
- ✅ Sin tarjeta de crédito requerida
- ✅ Dashboard completo
- ✅ API ilimitadas

Si necesitas más:
- **Essentials**: $19.95/mes → 50,000 emails/mes
- **Pro**: $89.95/mes → 1,500,000 emails/mes

## 🚀 Producción

Para usar en producción:

1. **Domain Authentication** (obligatorio para mejor deliverability)
   - Configura registros DNS (SPF, DKIM, DMARC)
   - Usa emails de tu dominio: `noreply@tudominio.com`

2. **Templates dinámicos** (opcional)
   - Crea templates en SendGrid Dashboard
   - Usa Template IDs en lugar de HTML inline

3. **Webhooks** (opcional)
   - Recibe eventos en tiempo real (opens, clicks, bounces)
   - Útil para analytics avanzados

## 📚 Documentación adicional

- SendGrid Docs: https://docs.sendgrid.com/
- Node.js SDK: https://github.com/sendgrid/sendgrid-nodejs
- Email Templates: https://mc.sendgrid.com/dynamic-templates

## 🆘 Soporte

¿Problemas? Revisa:
1. Este archivo (EMAIL_SETUP.md)
2. Logs en consola del servidor
3. Activity Feed en SendGrid Dashboard
4. Documentación oficial: https://docs.sendgrid.com/
