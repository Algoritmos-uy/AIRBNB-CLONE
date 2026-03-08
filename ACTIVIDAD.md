# Sprint Review – Airbnb Clone

## Qué logramos en este sprint

- **Catálogo y detalle de propiedades**: listado con filtros (búsqueda y rango de precios), tarjetas con precios formateados en USD y páginas de detalle con galería e inserción de video. Header fijo y navegación entre vistas (Inicio, Sobre, Contacto, Registro).
- **UX responsive y tema**: tipografías con `clamp`, menú hamburguesa en móviles, toggle de tema claro/oscuro persistente, footer responsivo y botones de contacto estilizados. Ajustamos `scroll-margin-top` y padding del body para el header fijo ampliado.
- **Autenticación básica**: formularios de registro/login conectados a backend (SQLite), validaciones de payload y hash de contraseñas con scrypt.
- **Reservas**: botón de reservar desde el detalle hacia `reserve.html`; validación de fechas y envío a `/api/reservations`. Backend guarda reservas y ahora exige usuario logueado (token en frontend, middleware `requireUser`). Aviso si no hay sesión.
- **Panel de administrador**: vista Admin (solo desktop) con modal de acceso; tabla de reservas con refresco manual, stats, eliminación y logout. Se corrigió tema oscuro en tablas/stats/modales/botones.
- **Exportación**: CSV de reservas con `sep=;` para Excel y exportación Excel (CSV renombrado) desde el panel.
- **Branding/UI**: logo navbar con variantes light/dark retina, padding por header fijo y assets en `/assets/`. Se corrigió la carga intermitente del logo y el swap a `logo-dark` en modo oscuro.
- **Stylo-Bot (asistente)**: Bot flotante con DeepSeek, i18n (es-419/en-US/pt-BR), lectura de FAQs, presupuesto por noches, detección de idioma del navegador y confirmación de idioma antes de responder.
- **Listado de clientes para admin**: API protegida `/api/admin/users`, vista en Admin con tabla de usuarios registrados (nombre, contacto, ubicación, username, fecha) y exportación CSV de clientes.

## Decisiones y ajustes recientes

- Ocultamos link/vista Admin en pantallas menores a ~1280px para simplificar el layout en móviles/tablets pequeñas.
- Se revirtió un `clamp()` en columnas del panel (desbordes) y se mantuvo `minmax` con colapso a 2 columnas.
- Hover para botones fantasma y modal accesible (backdrop/Escape).
- Seguridad: `requireUser` en reservas; tokens de usuario en frontend; admin sigue con token en memoria.
- Tema oscuro afinado en tablas/stats/modales/botones. Swap de logo a variante dark con rutas absolutas y control JS+CSS para evitar parpadeos o carga incompleta.
- Se añadió Stylo-Bot (UI flotante + backend DeepSeek) con i18n, FAQs, presupuestos y confirmación de idioma.
- Se incorporó `node-fetch` en backend del bot para evitar errores de `fetch` no definido.
- Se agregó vista y exportación de clientes registrados para admin, vía nuevo endpoint protegido.
- `DEEPSEEK_API_KEY` ya previsto en `.env` (requiere valor real en despliegue).

## Pendientes / riesgos

- **Puerto 3000 ocupado (EADDRINUSE)**: configurar `PORT` en `.env` o liberar el puerto antes de correr `npm run dev`.
- **Seguridad Admin**: credenciales/rol admin aún client-side; migrar a auth real (backend + JWT/expiración) y mover credenciales a server.
- **Mobile panel**: si se requiere, rediseñar tablas de reservas/clientes para móviles (stacked labels + scroll controlado).
- **Branding**: verificar presencia de `logo-light/logo-dark` (y @2x) en producción; agregar fallback textual si falta el asset.
- **Clave de IA**: asegurar `DEEPSEEK_API_KEY` cargada en `.env` y variable accesible en el entorno de despliegue.
- **Validación de emails duplicados**: ya existe en register; revisar mensajes al admin si se importan usuarios.

## Próximos pasos sugeridos

- Migrar autenticación de admin al backend (rol admin, sesión/JWT, expiración, logout server-side) y ocultar credenciales del cliente.
- Añadir etiquetas por campo y truncado en tablas móviles (reservas y clientes) para mejor legibilidad.
- Dashboard ligero: métricas de reservas y clientes (por propiedad, por país) y filtros en el panel admin.
- Robustecer Stylo-Bot: manejo de timeouts/reintentos, logging básico y fallback si DeepSeek no responde.
- Resolver puerto configurable (`PORT`) en scripts de arranque y documentarlo en README.
- Añadir fallback textual del logo si falla la carga y prueba visual de dark mode en navbar/panel tras cambios.
