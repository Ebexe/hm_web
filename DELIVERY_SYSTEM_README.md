# Sistema de Gestión de Entregas - H&M

## 📦 Características Implementadas

### 1. Perfil de Usuario
- ✅ Campo de **dirección completa** (textarea)
- ✅ Campo de **DNI** (8 dígitos, numérico)
- ✅ Reorganización del perfil en 7 secciones
- ✅ Toast de confirmación al actualizar

### 2. Modal de Opciones de Entrega
- ✅ Selección automática basada en método de envío
- ✅ Cálculo de fechas estimadas:
  - **Recojo en tienda**: +2 días hábiles
  - **Envío a domicilio**: +3 días hábiles
- ✅ Campos pre-llenados con datos del perfil:
  - Nombre del receptor
  - DNI del receptor
  - Dirección de entrega (solo envío a domicilio)
- ✅ Opción de editar todos los campos antes de confirmar
- ✅ Validaciones completas (DNI 8 dígitos, campos requeridos)

### 3. Backend Actualizado
- ✅ Controlador de usuario (`userController.js`) actualizado para manejar dirección/DNI
- ✅ Controlador de carrito (`cartController.js`) recibe información de entrega
- ✅ Servicio de email (`emailService.js`) incluye detalles de entrega

### 4. Email de Confirmación
- ✅ Muestra tipo de entrega (Recojo/Envío)
- ✅ Fecha estimada de entrega/recojo
- ✅ Nombre y DNI del receptor
- ✅ Dirección de entrega (solo si es envío a domicilio)
- ✅ Diseño rojo H&M consistente

## 🚀 Pasos para Completar la Configuración

### Paso 1: Actualizar la Base de Datos

**Opción A - Ejecutar script SQL:**

```bash
# Desde la raíz del proyecto backend
mysql -u root -p < migrations/add_direccion_dni.sql
```

**Opción B - Ejecutar manualmente:**

```sql
USE hm_chatbot_db;

-- Agregar columna direccion si no existe
ALTER TABLE Usuarios ADD COLUMN direccion TEXT DEFAULT NULL;

-- Agregar columna dni si no existe
ALTER TABLE Usuarios ADD COLUMN dni VARCHAR(8) DEFAULT NULL;

-- Verificar
SHOW COLUMNS FROM Usuarios LIKE 'direccion';
SHOW COLUMNS FROM Usuarios LIKE 'dni';
```

### Paso 2: Reiniciar el Servidor Backend

Si el servidor está corriendo, debería reiniciarse automáticamente con `nodemon`. Si no:

```bash
cd backend
npm start
```

### Paso 3: Probar el Flujo Completo

1. **Actualizar Perfil:**
   - Ir a `/perfil`
   - Completar los campos de DNI y Dirección en la Sección 3
   - Guardar → Debería aparecer Toast verde de confirmación

2. **Agregar Productos al Carrito:**
   - Navegar a cualquier categoría
   - Agregar productos → Toast verde "Añadido al carrito"

3. **Proceso de Checkout:**
   - Ir a `/carrito`
   - Elegir método de envío (Tienda o Domicilio)
   - Click en "Proceder al Pago"
   - Completar datos de tarjeta (cualquier 16 dígitos)
   - Click en "Confirmar Pago"
   - **Modal de Entrega se abrirá automáticamente** con:
     - Fecha sugerida (editable)
     - Nombre pre-llenado del perfil (editable)
     - DNI pre-llenado del perfil (editable)
     - Dirección pre-llenada si es envío (editable)
   - Confirmar entrega
   - Redirige a página de éxito

4. **Verificar Email:**
   - Revisar bandeja de entrada
   - Email debe incluir:
     - Número de pedido
     - Método de pago (últimos 4 dígitos)
     - **Información de Entrega:** tipo, fecha, receptor, DNI, dirección

## 📋 Validaciones Implementadas

### Frontend
- DNI: exactamente 8 dígitos numéricos
- Dirección: mínimo 10 caracteres (en textarea)
- Nombre del receptor: requerido
- Fecha de entrega: no puede ser anterior a la fecha sugerida
- Dirección de entrega: requerida solo si es envío a domicilio

### Backend
- Método de pago: formato "Tarjeta ****1234"
- Información de entrega: objeto completo con todos los campos
- Stock: verificación antes de confirmar compra
- Total: recalculado en servidor para evitar manipulación

## 🎨 Diseño

- **Colores H&M:** Rojo #E50010, blanco, negro
- **Componentes:**
  - `Toast.jsx`: Notificaciones flotantes
  - `DeliveryOptionsModal.jsx`: Modal de opciones de entrega
- **Estilos:** Diseño moderno con animaciones suaves
- **Responsive:** Adapta a móviles y tablets

## 📁 Archivos Modificados

### Frontend (hm-app/src/)
```
✅ components/Toast.jsx                    (CREADO)
✅ components/Toast.css                    (CREADO)
✅ components/DeliveryOptionsModal.jsx     (CREADO)
✅ components/DeliveryOptionsModal.css     (CREADO)
✅ pages/ProfilePage.jsx                   (ACTUALIZADO - 7 secciones)
✅ pages/ProductDetailPage.jsx             (ACTUALIZADO - Toast)
✅ pages/RegisterPage.jsx                  (ACTUALIZADO - Redirección)
✅ pages/CartPage.jsx                      (ACTUALIZADO - Modal entrega)
```

### Backend (backend/)
```
✅ controllers/userController.js           (ACTUALIZADO - direccion/dni)
✅ controllers/cartController.js           (ACTUALIZADO - deliveryInfo)
✅ service/emailService.js                 (ACTUALIZADO - info entrega)
✅ migrations/add_direccion_dni.sql        (CREADO)
```

## 🔧 Solución de Problemas

### El modal no aparece
- Verificar que el perfil del usuario tenga datos cargados
- Revisar consola del navegador para errores
- Asegurarse de que `showDeliveryModal` cambie a `true`

### Email no incluye información de entrega
- Verificar que `deliveryInfo` se envíe desde el frontend
- Revisar logs del backend: `console.log(deliveryInfo)`
- Confirmar que el objeto tenga todas las propiedades requeridas

### Error al guardar dirección/DNI
- Ejecutar script SQL para crear columnas
- Verificar con: `SHOW COLUMNS FROM Usuarios;`
- Revisar logs del servidor backend

### Fechas incorrectas
- El cálculo de días hábiles salta fines de semana
- Fecha mínima es la fecha sugerida
- Se puede seleccionar cualquier fecha posterior

## 📊 Estructura de Datos

### deliveryInfo Object
```javascript
{
  shippingMethod: 'tienda' | 'envio',      // Tipo de entrega
  deliveryDate: '2025-01-15',              // Fecha ISO string
  recipientName: 'Juan Pérez',             // Nombre completo
  recipientDNI: '12345678',                // 8 dígitos
  deliveryAddress: 'Av. Principal 123...' // Solo si es envío
}
```

### userProfile Object
```javascript
{
  id_usuario: 1,
  nombre: 'Juan Pérez',
  email: 'juan@example.com',
  direccion: 'Av. Principal 123, Lima',   // NUEVO
  dni: '12345678',                        // NUEVO
  // ... otros campos del perfil
}
```

## ✅ Checklist de Pruebas

- [ ] Columnas direccion y dni creadas en BD
- [ ] Servidor backend reiniciado
- [ ] Perfil actualizado con dirección y DNI
- [ ] Toast aparece al agregar producto al carrito
- [ ] Toast aparece al actualizar perfil
- [ ] Registro redirige a /perfil
- [ ] Modal de pago funciona correctamente
- [ ] Modal de entrega se abre después del pago
- [ ] Campos pre-llenados con datos del perfil
- [ ] Validaciones funcionan (DNI, fecha, dirección)
- [ ] Checkout completo procesa correctamente
- [ ] Email recibido con toda la información
- [ ] Email muestra información de entrega
- [ ] Diseño responsive en móviles

## 🎯 Próximos Pasos (Opcional)

- [ ] Agregar selección de tienda física (dropdown con ubicaciones)
- [ ] Implementar tracking de pedidos
- [ ] Permitir cambio de dirección en pedidos existentes
- [ ] Agregar múltiples direcciones guardadas
- [ ] Validación de DNI con API de RENIEC
- [ ] Notificaciones push cuando cambie estado del pedido
- [ ] Historial de direcciones usadas

## 📞 Soporte

Si encuentras algún problema:
1. Revisa la consola del navegador (F12)
2. Revisa logs del servidor backend
3. Verifica que las columnas existan en la BD
4. Confirma que todos los archivos estén guardados

---

**Desarrollado con ❤️ para H&M**
