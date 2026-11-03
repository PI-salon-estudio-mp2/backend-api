# backend-api

API principal del **Salón de Estudio Colaborativo en Tiempo Real** (Mini-proyecto 2). Se encarga de los datos del producto: valida la sesión del usuario y lee y escribe en Firestore. El frontend nunca consulta Firestore directamente, todo pasa por esta API.

**Estado actual (Sprint 0):** historia TS-00, base técnica end-to-end. Un endpoint lee un dato de Firestore y lo entrega al frontend.

## Producción

| Recurso | URL |
|---|---|
| API (Render) | https://TU-URL.onrender.com |
| Swagger | https://TU-URL.onrender.com/docs |
| Health check | https://TU-URL.onrender.com/health |

> El plan gratuito de Render duerme el servicio tras 15 minutos sin tráfico. La primera petición puede tardar cerca de un minuto.

## Tecnologías

Node.js 20+, TypeScript, Express 5, Firebase Admin SDK (Firestore), Swagger UI, Docker.

## Estructura del proyecto

```
src/
├── config/          Variables de entorno y conexión a Firebase
├── routes/          Definición de rutas
├── controllers/     Reciben la petición y devuelven la respuesta
├── services/        Lógica de negocio y manejo de errores
├── repositories/    Acceso a Firestore
├── middlewares/     Manejo de errores y rutas no encontradas
├── utils/           Utilidades (AppError)
├── docs/            Especificación OpenAPI (Swagger)
├── app.ts           Configuración de Express
└── index.ts         Punto de entrada
```

Flujo de una petición: `routes → controllers → services → repositories → Firestore`.

## Requisitos

- Node.js 20 o superior
- Docker (opcional, para ejecutar con contenedor)
- Un proyecto de Firebase con Firestore y una cuenta de servicio

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

### Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `PORT` | No | Puerto del servidor. Por defecto 3000 (Render lo define solo) |
| `NODE_ENV` | No | `development` o `production` |
| `CORS_ORIGINS` | No | Orígenes permitidos, separados por coma. Por defecto `http://localhost:5173` |
| `FIREBASE_PROJECT_ID` | Sí | ID del proyecto de Firebase |
| `FIREBASE_CLIENT_EMAIL` | Sí | `client_email` de la cuenta de servicio |
| `FIREBASE_PRIVATE_KEY` | Sí | `private_key` de la cuenta de servicio, con los `\n` literales |

Nunca subas `.env` ni el JSON de la cuenta de servicio al repositorio.

## Ejecución

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor en desarrollo con recarga automática |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Ejecuta la versión compilada |

### Con Docker

```bash
docker compose up --build
```

La API queda en `http://localhost:3000`.

## Endpoints

La documentación interactiva está en `/docs` (Swagger).

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servicio |
| GET | `/api/base-tecnica` | Lee `config/base-tecnica` de Firestore |

### Formato de respuestas

Éxito:
```json
{ "data": { "mensaje": "Hola desde Firestore" } }
```

Error:
```json
{ "error": { "code": "DB_UNAVAILABLE", "message": "No se pudo conectar con la base de datos" } }
```

### Códigos de error

| HTTP | `code` | Cuándo ocurre |
|---|---|---|
| 404 | `NOT_FOUND` | El documento `config/base-tecnica` no existe |
| 404 | `ROUTE_NOT_FOUND` | La ruta solicitada no existe |
| 500 | `INVALID_DATA` | El documento existe pero no tiene un `mensaje` válido |
| 500 | `INTERNAL_ERROR` | Error inesperado del servidor |
| 503 | `DB_UNAVAILABLE` | No se pudo conectar con Firestore |

## Despliegue

El servicio corre en **Render** como Web Service con Docker, desplegado desde la rama `main`.

- Las variables de entorno se configuran en el panel de Render (en `FIREBASE_PRIVATE_KEY` va el valor sin comillas).
- Health check path: `/health`.
- El frontend está en Vercel; su URL debe estar en `CORS_ORIGINS`.

## Flujo de trabajo

- Una rama por historia, por ejemplo `feature/TS-00-api`.
- Commits que nombran la historia: `feat: endpoint base técnica (TS-00)`.
- Un pull request por historia, con descripción y capturas. Nada se programa directo en `main`.
- Si se usa IA, se declara en la descripción del PR.
