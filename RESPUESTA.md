# Configuración para respuesta automática de confirmación de reserva

## 1 Elegir proveedor de email

 Opción rápida: SMTP (Gmail/Outlook) o Mailtrap para pruebas.
 Opción productiva: SendGrid / Amazon SES / Mailgun (mejor entregabilidad y métricas).

## 2 Variables de entorno (`.env`)

- SMTP: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM` ("Nombre correo").
- SendGrid: `SENDGRID_API_KEY`, `MAIL_FROM`.
- SES: `SES_ACCESS_KEY`, `SES_SECRET_KEY`, `SES_REGION`, `MAIL_FROM`.

## 3 Dependencias backend

- Para SMTP/SES: añadir `nodemailer` al proyecto.
- Para SendGrid: añadir `@sendgrid/mail` (o usar `nodemailer` con transport SendGrid).

## 4 Servicio de envío

- Crear un servicio (por ej. `services/mail.service.js`) que exponga `sendBookingConfirmation(payload)`, inicializando el transport según variables de entorno.
- Incluir timeout y manejo de errores; no loggear credenciales.

## 5 Plantilla de correo

- HTML + texto plano.
- Campos: nombre del huésped, propiedad, check-in/check-out, huéspedes, precio estimado, política de cancelación, datos de soporte.
- Idioma: usar locale de la reserva o valor por defecto (es-419).

## 6 Punto de disparo

- En el controlador `createReservation`, después de guardar en DB y antes de responder 201, invocar `sendBookingConfirmation(reserva)`. 
- Si el envío falla: registrar/loggear; no romper la reserva (opcional flag `email_status` en DB).

## 7 Pruebas

- Usar Mailtrap o SMTP de prueba para no enviar correos reales.
- Casos: reserva válida, email inválido (debe fallar suave), timeout del proveedor.

### 8 Observabilidad

- Log de resultado (ok/fallo, timestamp). Opcional: campo `email_status` en la tabla de reservas.

### 9 Documentación

- Añadir al README/ACTIVIDAD.md: variables requeridas, proveedor elegido, cómo probar localmente y qué endpoint dispara el correo.
