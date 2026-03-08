# Airbnb Clone (Staylo)

Aplicación web tipo Airbnb para gestión y visualización de propiedades, con panel administrativo, autenticación básica y asistente conversacional (Lia).

## Estado actual del proyecto

Actualmente la aplicación se encuentra **funcional** en su flujo principal:

- Navegación por secciones desde header (Inicio, Sobre nosotros, Contacto, Pagos, Admin).
- Listado de propiedades en Inicio.
- Panel Admin operativo:
  - Login / logout.
  - Listado de reservas.
  - Listado de clientes registrados.
  - Eliminación de reservas.
  - Exportación de reservas (CSV / Excel) y usuarios (CSV).
- Base de datos SQLite en `stylo.sqlite`.
- Stylo-Bot integrado en frontend.

> Nota: se dejó pendiente endurecer seguridad admin (JWT robusto, expiración avanzada, revocación persistente, etc.) para una siguiente fase controlada.

---

## Tecnologías

### Frontend

- HTML5
- CSS3 (arquitectura por componentes)
- JavaScript (ES Modules)

### Backend

- Node.js
- Express
- SQLite (sqlite3)

---

## Estructura del proyecto (resumen)

```text
AIRBNB-CLONE/
├─ client/
│  ├─ index.html
│  ├─ css/
│  │  └─ components/
│  ├─ js/
│  │  ├─ main.js
│  │  └─ api.js
│  └─ assets/
├─ server/
│  ├─ app.js
│  ├─ controllers/
│  ├─ routes/
│  ├─ middleware/
│  ├─ models/
│  │  └─ db.js
│  ├─ scripts/
│  │  └─ reseedPlaceholders.js
│  └─ database/
│     └─ stylo.sqlite
├─ .env
├─ package.json
└─ README.md
```

---

## Variables de entorno

Configurar `.env` en la raíz del proyecto:

```env
PORT=3000
JWT_SECRET=dev-secret
JWT_EXPIRES_IN=12h

ADMIN_USER=admin
ADMIN_USER_1=admin-1
ADMIN_USER_2=admin-2
ADMIN_PASS=43482613
# ADMIN_PASS_1=
# ADMIN_PASS_2=
```

---

## Instalación y ejecución

1. Instalar dependencias:

```bash
npm install
```

2. Ejecutar en desarrollo:

```bash
npm run dev
```

3. Abrir en navegador:

- `http://localhost:3000`

> Si el puerto está ocupado (`EADDRINUSE`), cambia `PORT` en `.env` o libera el puerto.

---

## Scripts útiles

- `npm run dev` → inicia servidor con recarga.
- `npm run reseed` → vuelve a sembrar placeholders de propiedades (si está configurado en `package.json`).

---

## Módulos funcionales actuales

## 1) Navegación y vistas

- Sistema de vistas por secciones con IDs tipo `view-*`.
- Header con enlaces para navegación principal.

## 2) Propiedades

- Renderizado de propiedades en la vista de inicio.
- Consumo de datos desde API backend.

## 3) Panel Admin

- Inicio de sesión admin.
- Visualización de reservas y usuarios.
- Eliminación de reservas.
- Exportaciones:
  - Reservas: CSV / Excel.
  - Usuarios: CSV.

## 4) Lia

- Bot de asistencia integrado en frontend.
- Flujo operativo básico.

---

## Base de datos

- Motor: SQLite.
- Archivo actual: `server/database/stylo.sqlite`.
- Conexión definida en: `server/models/db.js`.

---

## Estado de seguridad (pendiente)

Pendiente de implementación en próxima fase:

- Hardening de autenticación admin:
  - JWT admin separado.
  - Expiración y refresco robusto.
  - Revocación persistente.
  - Protección adicional de endpoints.
- Revisión de rate-limit y manejo centralizado de errores.

---

## Roadmap corto (siguiente iteración)

1. Endurecer seguridad de Admin.
2. Agregar sección “Mi cuenta” de usuario:
   - Ver reservas del usuario autenticado.
   - Acceso/edición de datos personales.
3. Integración de destino real de correo en contacto.
4. Integración de número de WhatsApp configurable.
5. Revisión final de UX responsive y accesibilidad.

---

## Notas de trabajo

- Mantener cambios incrementales y testeables.
- Evitar cambios masivos en header/nav sin validación inmediata.
- Confirmar siempre consistencia entre IDs de HTML y selectores de `main.js`.

---

## Autor / Equipo

Proyecto en evolución para práctica y consolidación de arquitectura fullstack tipo alquiler temporal.
