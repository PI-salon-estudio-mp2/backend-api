# backend-api

API principal del **Salón de Estudio Colaborativo en Tiempo Real** (Mini-proyecto 2). Se encarga de los datos del producto: verifica la sesión del usuario con Firebase Authentication y lee y escribe en Firestore. El frontend nunca consulta Firestore directamente: solo usa Firebase Authentication para iniciar sesión y todo dato pasa por esta API.

**Estado actual (Sprint 1):**
- TS-00: base técnica end-to-end (Sprint 0).
- TS-01: Firebase Authentication (correo y Google), verificación del ID token en cada petición privada y perfiles en Firestore.
- US-01, US-02 y US-03: registro manual, registro con Google con nombre de usuario obligatorio y perfil de quien inició sesión.

## Producción

| Recurso | URL |
|---|---|
| API (Render) | https://backend-api-7xa7.onrender.com/ |
| Swagger | https://backend-api-7xa7.onrender.com/docs/ |
| Health check | https://backend-api-7xa7.onrender.com/health/ |

## Tecnologías

Node.js 20+, TypeScript, Express 5, Firebase Admin SDK (Authentication y Firestore), Swagger UI, Docker.

## Estructura del proyecto

```
src/
├── config/          Variables de entorno y conexión a Firebase (db y auth)
├── routes/          Definición de rutas
├── controllers/     Reciben la petición y devuelven la respuesta
├── services/        Lógica de negocio (registro, perfil, username)
├── validators/      Validación de los datos que llegan (mismas reglas que el frontend)
├── repositories/    Acceso a Firestore (incluye la transacción del username)
├── middlewares/     Verificación de sesión (requireAuth), errores y rutas no encontradas
├── utils/           Utilidades (AppError)
├── docs/            Especificación OpenAPI (Swagger)
├── app.ts           Configuración de Express
└── index.ts         Punto de entrada
firestore.rules      Reglas de Firestore: niegan todo acceso desde clientes
```

Flujo de una petición: `routes → (requireAuth) → controllers → services → validators / repositories → Firestore`.

## Requisitos

- Node.js 20 o superior
- Docker
- Un proyecto de Firebase con Authentication, Firestore y una cuenta de servicio

## Configuración

1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Copia el archivo de ejemplo y llénalo:
   ```bash
   cp .env.example .env
   ```
3. Obtén las credenciales en la consola de Firebase: *Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada*. Del JSON descargado copia `client_email` y `private_key` a tu `.env`. Luego guarda el JSON fuera del repositorio.
4. Crea en Firestore el documento de prueba: colección `config`, documento `base-tecnica`, campo `mensaje` (string).
5. En *Authentication → Método de acceso* activa **Correo electrónico/contraseña** y **Google**.
6. En *Authentication → Configuración → Dominios autorizados* agrega el dominio de Vercel (sin `https://`).
7. En *Firestore Database → Reglas* pega el contenido de [`firestore.rules`](firestore.rules) y publica.

### Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `PORT` | No | Puerto del servidor. Por defecto 3000 (Render lo define solo) |
| `NODE_ENV` | No | `development` o `production` |
| `CORS_ORIGINS` | No | Orígenes permitidos, separados por coma y sin barra final. Por defecto `http://localhost:5173` |
| `FIREBASE_PROJECT_ID` | Sí | ID del proyecto de Firebase (el mismo `VITE_FIREBASE_PROJECT_ID` del frontend) |
| `FIREBASE_CLIENT_EMAIL` | Sí | `client_email` de la cuenta de servicio |
| `FIREBASE_PRIVATE_KEY` | Sí | `private_key` de la cuenta de servicio, con los `\n` literales |

> Si `FIREBASE_PROJECT_ID` no es el mismo proyecto del frontend, todos los tokens se rechazan con 401.

## Ejecución

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor en desarrollo con recarga automática |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Ejecuta la versión compilada |

### Con Docker

Solo este servicio:

```bash
docker compose up --build
```

La API queda en `http://localhost:3000`. Para levantar **todo el sistema** (frontend + backend-api) usa el `docker-compose.yml` del repositorio `frontend`, con ambos repositorios clonados uno al lado del otro.

## Endpoints

La documentación interactiva está en `/docs` (Swagger). Las rutas privadas usan el botón **Authorize** con el ID token de Firebase.

| Método | Ruta | Sesión | Descripción |
|---|---|---|---|
| GET | `/health` | No | Estado del servicio |
| GET | `/api/base-tecnica` | No | Lee `config/base-tecnica` de Firestore (TS-00) |
| POST | `/api/auth/registro` | No | Registro manual: crea la cuenta en Firebase Auth y el perfil (US-01) |
| GET | `/api/users/username-disponible?username=` | No | Indica si un nombre de usuario está libre |
| GET | `/api/users/me` | **Sí** | Perfil de quien inició sesión (US-03) |
| POST | `/api/users/me/username` | **Sí** | Elige el username tras entrar con Google y crea el perfil (US-02) |

### Sesión (rutas privadas)

El frontend envía `Authorization: Bearer <ID token de Firebase>`. El middleware `requireAuth` lo verifica con `verifyIdToken` del Admin SDK. Si falta, es inválido o expiró, responde **401 `UNAUTHORIZED`**. Las respuestas privadas llevan `Cache-Control: no-store`.

### Registro manual (US-01)

Cuerpo de `POST /api/auth/registro`:

```json
{
  "nombres": "Daniel Andrés",
  "apellidos": "Micolta Góngora",
  "username": "daniel_mg",
  "avatar": "verde",
  "correo": "daniel@correo.com",
  "contrasena": "Estudio2026"
}
```

Pasos en el servidor:
1. Valida todos los campos y devuelve todos los errores juntos en `fields`.
2. Revisa si el username está libre (respuesta rápida).
3. Crea la cuenta en Firebase Authentication. Allí el correo es único.
4. Guarda el perfil y reserva el username en **una transacción** de Firestore.
5. Si el paso 4 falla, borra la cuenta del paso 3 para no dejar cuentas a medias.

Después, el frontend inicia sesión con Firebase usando el mismo correo y contraseña.

### Registro con Google (US-02)

El usuario entra con Google en el frontend. `GET /api/users/me` responde **404 `PROFILE_INCOMPLETE`** hasta que elige su username con `POST /api/users/me/username` (`{ "username": "..." }`). Nombres, apellidos, correo y foto se toman de las claims del token verificado (`name`, `email`, `picture`). El cliente solo envía el username. Se puede hacer una sola vez (si no, 409 `PROFILE_EXISTS`).

### Validaciones (las mismas del frontend)

| Campo | Regla |
|---|---|
| `nombres`, `apellidos` | Obligatorios, máximo 60 caracteres |
| `username` | Se guarda en minúsculas; `^[a-z0-9_]{3,20}$`; único en la plataforma |
| `avatar` | `azul`, `verde`, `ocre`, `morado`, `turquesa` o `rosado` (en Google: URL `https` de la foto) |
| `correo` | Formato `nombre@dominio.ext`; único (lo garantiza Firebase Authentication) |
| `contrasena` | Mínimo 8 caracteres, con al menos una letra y un número |

### Modelo en Firestore

| Colección | Documento | Campos |
|---|---|---|
| `users` | `{uid}` | `uid, nombres, apellidos, username, avatar, correo, proveedor ("password" \| "google"), creadoEn, actualizadoEn` |
| `usernames` | `{username}` | `uid, creadoEn`. Su existencia reserva el nombre de usuario |
| `config` | `base-tecnica` | `mensaje` (TS-00) |

Las reglas de [`firestore.rules`](firestore.rules) niegan todo acceso desde clientes. El Admin SDK de esta API no está sujeto a ellas.

### Formato de respuestas

Éxito:
```json
{ "data": { "uid": "...", "nombres": "...", "apellidos": "...", "username": "...", "avatar": "...", "correo": "..." } }
```

Error (`fields` solo en errores de formulario):
```json
{ "error": { "code": "USERNAME_TAKEN", "message": "Ese nombre de usuario ya está ocupado. Prueba con otro.", "fields": { "username": "Ese nombre de usuario ya está ocupado. Prueba con otro." } } }
```

### Códigos de error

| HTTP | `code` | Cuándo ocurre |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Faltan datos, tienen un formato inválido o el JSON está mal formado |
| 401 | `UNAUTHORIZED` | Ruta privada sin token, con token inválido o expirado |
| 404 | `NOT_FOUND` | El documento `config/base-tecnica` no existe |
| 404 | `PROFILE_INCOMPLETE` | La cuenta (Google) aún no eligió nombre de usuario |
| 404 | `ROUTE_NOT_FOUND` | La ruta solicitada no existe |
| 409 | `USERNAME_TAKEN` | El nombre de usuario ya está ocupado |
| 409 | `EMAIL_TAKEN` | El correo ya tiene una cuenta |
| 409 | `PROFILE_EXISTS` | La cuenta ya tenía perfil y nombre de usuario |
| 413 | `PAYLOAD_TOO_LARGE` | El cuerpo supera 10 KB |
| 500 | `INVALID_DATA` | El documento de la base técnica no tiene un `mensaje` válido |
| 500 | `INTERNAL_ERROR` | Error inesperado del servidor |
| 503 | `DB_UNAVAILABLE` | No se pudo conectar con Firestore |
| 503 | `AUTH_UNAVAILABLE` | Firebase Authentication no respondió |

Los errores 4xx son respuestas esperadas y no se registran como errores en los logs. Solo los 5xx se escriben con `console.error`.

## Despliegue

El servicio corre en **Render** como Web Service con Docker, desplegado desde la rama `main`.

- Las variables de entorno se configuran en el panel de Render (en `FIREBASE_PRIVATE_KEY` va el valor sin comillas).
- Health check path: `/health`.
- El frontend está en Vercel; su URL debe estar en `CORS_ORIGINS`.
- El plan gratuito "duerme" el servicio: antes de una revisión abre `/health` para despertarlo (tarda cerca de un minuto).

## Flujo de trabajo

- Una rama por historia, por ejemplo `feature/TS-01-auth-api`.
- Commits que nombran la historia: `feat: verificar el token de Firebase (TS-01)`.
- Un pull request por historia, con descripción y capturas. Nada se programa directo en `main`.
- Si se usa IA, se declara en la descripción del PR.
