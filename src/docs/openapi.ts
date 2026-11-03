export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "API Salón de Estudio Colaborativo",
    version: "0.1.0",
    description: "backend-api — Sprint 0 (TS-00: base técnica end-to-end)",
  },
  servers: [{ url: "/" }],
  paths: {
    "/health": {
      get: {
        summary: "Estado del servicio",
        tags: ["Sistema"],
        responses: {
          "200": {
            description: "El servicio está activo",
            content: {
              "application/json": {
                example: { status: "ok" },
              },
            },
          },
        },
      },
    },
    "/api/base-tecnica": {
      get: {
        summary: "Lee el dato de la base técnica desde Firestore",
        description: "Lee el documento config/base-tecnica y devuelve su campo mensaje.",
        tags: ["Base técnica"],
        responses: {
          "200": {
            description: "Dato leído correctamente",
            content: {
              "application/json": {
                example: { data: { mensaje: "Hola desde Firestore" } },
              },
            },
          },
          "404": {
            description: "El documento no existe",
            content: {
              "application/json": {
                example: { error: { code: "NOT_FOUND", message: "No existe el dato de la base técnica" } },
              },
            },
          },
          "503": {
            description: "Firestore no está disponible",
            content: {
              "application/json": {
                example: { error: { code: "DB_UNAVAILABLE", message: "No se pudo conectar con la base de datos" } },
              },
            },
          },
        },
      },
    },
  },
};