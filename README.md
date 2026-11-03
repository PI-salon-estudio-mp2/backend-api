# backend-api

API principal del Salón de Estudio Colaborativo. Node.js + TypeScript + Express + Firebase Admin (Firestore).

## Requisitos
- Node.js 20 o superior
- Un proyecto de Firebase con Firestore y una cuenta de servicio

## Variables de entorno
Copia `.env.example` a `.env` y llena los valores:

| Variable | Descripción |
|---|---|
| PORT | Puerto del servidor (Render lo define solo) |
| CORS_ORIGINS | Orígenes permitidos, separados por coma |
| FIREBASE_PROJECT_ID | ID del proyecto de Firebase |
| FIREBASE_CLIENT_EMAIL | `client_email` de la cuenta de servicio |
| FIREBASE_PRIVATE_KEY | `private_key` de la cuenta de servicio (con los `\n`) |

Nunca subas `.env` ni el JSON de la cuenta de servicio.

## Ejecutar
```bash
npm install
npm run dev        # desarrollo
npm run build && npm start   # producción
```

Con Docker:
```bash
docker compose up --build
```

## Endpoints
- `GET /health` — estado del servicio
- `GET /api/base-tecnica` — lee `config/base-tecnica` de Firestore
- `GET /docs` — documentación Swagger

Formato de éxito: `{ "data": { ... } }`
Formato de error: `{ "error": { "code": "...", "message": "..." } }`

## Estructura
`routes` → `controllers` → `services` → `repositories` (acceso a Firestore).