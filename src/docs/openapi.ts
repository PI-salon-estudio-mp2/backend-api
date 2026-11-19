/**
 * Especificación OpenAPI que se publica en /docs (Swagger UI).
 * Se actualiza en cada sprint con los endpoints nuevos.
 */

const json = (example: unknown, schemaRef?: string) => ({
  "application/json": {
    ...(schemaRef ? { schema: { $ref: schemaRef } } : {}),
    example,
  },
});

const errorEjemplo = (code: string, message: string, fields?: Record<string, string>) => ({
  error: { code, message, ...(fields ? { fields } : {}) },
});

const R = {
  error401: {
    description: "Sin sesión, token inválido o expirado",
    content: json(
      errorEjemplo("UNAUTHORIZED", "Tu sesión no es válida o expiró. Inicia sesión de nuevo."),
      "#/components/schemas/Error"
    ),
  },
  error403: {
    description: "El :uid de la URL no es el de quien inició sesión: no se modifica nada",
    content: json(
      errorEjemplo("FORBIDDEN", "No tienes permiso para ver ni modificar los datos de otro usuario."),
      "#/components/schemas/Error"
    ),
  },
  error503: {
    description: "Firestore no está disponible",
    content: json(
      errorEjemplo(
        "DB_UNAVAILABLE",
        "No se pudo conectar con la base de datos. Inténtalo de nuevo en unos segundos."
      ),
      "#/components/schemas/Error"
    ),
  },
};

const perfilEjemplo = {
  uid: "Xy12AbC34dEf56",
  nombres: "Daniel Andrés",
  apellidos: "Micolta Góngora",
  username: "daniel_mg",
  avatar: "verde",
  correo: "daniel@correo.com",
};

const usernameOcupado = errorEjemplo(
  "USERNAME_TAKEN",
  "Ese nombre de usuario ya está ocupado. Prueba con otro.",
  { username: "Ese nombre de usuario ya está ocupado. Prueba con otro." }
);

export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "API Salón de Estudio Colaborativo",
    version: "1.0.0",
    description: [
      "backend-api — Sprint 0 (TS-00), Sprint 1 (TS-01, US-01, US-02, US-03) y Sprint 2 (US-04, US-05, US-06).",
      "",
      "**Rutas privadas:** envían el ID token de Firebase en `Authorization: Bearer <token>`.",
      "Para probarlas aquí: inicia sesión en la aplicación publicada, abre DevTools → Red,",
      "selecciona la petición a `/api/users/me`, copia el valor del encabezado `Authorization`",
      "sin la palabra `Bearer` y pégalo en **Authorize**. El token dura 1 hora.",
      "",
      "**Formato:** éxito `{ \"data\": ... }` · error `{ \"error\": { \"code\", \"message\", \"fields\"? } }`.",
    ].join("\n"),
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Sistema" },
    { name: "Base técnica", description: "TS-00 (Sprint 0)" },
    { name: "Autenticación", description: "TS-01 · US-01 (Sprint 1)" },
    { name: "Usuarios", description: "TS-01 · US-02 · US-03 (Sprint 1) · US-04 (Sprint 2)" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "Firebase ID token (JWT)",
        description: "ID token de Firebase Authentication del usuario que inició sesión.",
      },
    },
    schemas: {
      Perfil: {
        type: "object",
        required: ["uid", "nombres", "apellidos", "username", "avatar", "correo"],
        properties: {
          uid: { type: "string", description: "UID de Firebase Authentication" },
          nombres: { type: "string", maxLength: 60 },
          apellidos: { type: "string", maxLength: 60, description: "Puede venir vacío en cuentas de Google" },
          username: { type: "string", pattern: "^[a-z0-9_]{3,20}$", description: "Único en toda la plataforma" },
          avatar: {
            type: "string",
            description:
              "Id de la foto de perfil (azul, verde, ocre, morado, turquesa, rosado) o URL https de la foto de Google",
          },
          correo: { type: "string", format: "email" },
        },
      },
      RegistroEntrada: {
        type: "object",
        required: ["nombres", "apellidos", "username", "avatar", "correo", "contrasena"],
        properties: {
          nombres: { type: "string", maxLength: 60, example: "Daniel Andrés" },
          apellidos: { type: "string", maxLength: 60, example: "Micolta Góngora" },
          username: {
            type: "string",
            pattern: "^[a-z0-9_]{3,20}$",
            description: "Se guarda en minúsculas y sin espacios al inicio o al final",
            example: "daniel_mg",
          },
          avatar: {
            type: "string",
            enum: ["azul", "verde", "ocre", "morado", "turquesa", "rosado"],
            example: "verde",
          },
          correo: { type: "string", format: "email", example: "daniel@correo.com" },
          contrasena: {
            type: "string",
            format: "password",
            minLength: 8,
            description: "Mínimo 8 caracteres, con al menos una letra y un número",
            example: "Estudio2026",
          },
        },
      },
      PerfilEdicion: {
        type: "object",
        description:
          "Envía solo los campos que cambian (al menos uno). Los que no se envían quedan como están.",
        properties: {
          nombres: { type: "string", maxLength: 60, example: "Daniel Andrés" },
          apellidos: { type: "string", maxLength: 60, example: "Micolta Góngora" },
          username: {
            type: "string",
            pattern: "^[a-z0-9_]{3,20}$",
            description: "Único. Al cambiarlo se libera el anterior",
            example: "daniel_mg2",
          },
          avatar: {
            type: "string",
            description:
              "azul, verde, ocre, morado, turquesa o rosado. En cuentas de Google también se acepta la foto actual",
            example: "morado",
          },
          correo: {
            type: "string",
            format: "email",
            description:
              "Único. Solo en cuentas con correo y contraseña (en Google responde 400). Tras cambiarlo, el frontend debe refrescar el token",
            example: "daniel.nuevo@correo.com",
          },
        },
      },
      UsernameEntrada: {
        type: "object",
        required: ["username"],
        properties: {
          username: { type: "string", pattern: "^[a-z0-9_]{3,20}$", example: "daniel_mg" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              fields: {
                type: "object",
                additionalProperties: { type: "string" },
                description: "Mensaje por campo (solo en errores de formulario)",
              },
            },
          },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        summary: "Estado del servicio",
        tags: ["Sistema"],
        responses: {
          "200": { description: "El servicio está activo", content: json({ status: "ok" }) },
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
            content: json({ data: { mensaje: "Hola desde Firestore" } }),
          },
          "404": {
            description: "El documento no existe",
            content: json(errorEjemplo("NOT_FOUND", "No existe el dato de la base técnica")),
          },
          "503": {
            description: "Firestore no está disponible",
            content: json(errorEjemplo("DB_UNAVAILABLE", "No se pudo conectar con la base de datos")),
          },
        },
      },
    },
    "/api/auth/registro": {
      post: {
        summary: "Registro manual (US-01)",
        description: [
          "Crea la cuenta en Firebase Authentication y el perfil en Firestore (`users/{uid}`),",
          "y reserva el nombre de usuario (`usernames/{username}`) en una transacción.",
          "Si el perfil no se puede guardar, la cuenta recién creada se borra para no dejar cuentas a medias.",
          "Después, el frontend inicia sesión con Firebase usando el mismo correo y contraseña.",
        ].join(" "),
        tags: ["Autenticación"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RegistroEntrada" } } },
        },
        responses: {
          "201": {
            description: "Cuenta y perfil creados",
            content: json({ data: { uid: "Xy12AbC34dEf56" } }),
          },
          "400": {
            description: "Datos inválidos: se devuelven todos los campos que fallaron",
            content: json(
              errorEjemplo("VALIDATION_ERROR", "Revisa los datos del formulario e inténtalo de nuevo.", {
                nombres: "Escribe tus nombres.",
                correo: "Escribe un correo válido, por ejemplo nombre@correo.com.",
                contrasena:
                  "La contraseña no cumple la política. Mínimo 8 caracteres, con al menos una letra y un número.",
              }),
              "#/components/schemas/Error"
            ),
          },
          "409": {
            description: "Nombre de usuario ocupado (USERNAME_TAKEN) o correo ya registrado (EMAIL_TAKEN)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                examples: {
                  USERNAME_TAKEN: { value: usernameOcupado },
                  EMAIL_TAKEN: {
                    value: errorEjemplo(
                      "EMAIL_TAKEN",
                      "Ese correo ya tiene una cuenta. Inicia sesión o usa otro correo.",
                      { correo: "Ese correo ya tiene una cuenta. Inicia sesión o usa otro correo." }
                    ),
                  },
                },
              },
            },
          },
          "503": R.error503,
        },
      },
    },
    "/api/users/username-disponible": {
      get: {
        summary: "¿El nombre de usuario está libre?",
        description:
          "Pública. Siempre responde `{ data: { disponible } }`; si el formato no es válido o ya está ocupado, `disponible` es false y `motivo` explica por qué. La unicidad definitiva se garantiza al crear el perfil (transacción).",
        tags: ["Usuarios"],
        parameters: [
          {
            name: "username",
            in: "query",
            required: true,
            schema: { type: "string" },
            example: "daniel_mg",
          },
        ],
        responses: {
          "200": {
            description: "Resultado de la consulta",
            content: {
              "application/json": {
                examples: {
                  libre: { value: { data: { username: "daniel_mg", disponible: true } } },
                  ocupado: {
                    value: {
                      data: {
                        username: "admin",
                        disponible: false,
                        motivo: "Ese nombre de usuario ya está ocupado. Prueba con otro.",
                      },
                    },
                  },
                  formatoInvalido: {
                    value: {
                      data: {
                        username: "a b",
                        disponible: false,
                        motivo:
                          "Nombre de usuario no válido. Entre 3 y 20 caracteres: letras minúsculas, números o guion bajo (_). Sin espacios.",
                      },
                    },
                  },
                },
              },
            },
          },
          "503": R.error503,
        },
      },
    },
    "/api/users/me": {
      get: {
        summary: "Perfil de quien inició sesión (US-03)",
        description:
          "Verifica el ID token y devuelve el perfil guardado en Firestore. Si la cuenta es de Google y aún no eligió nombre de usuario, responde 404 PROFILE_INCOMPLETE.",
        tags: ["Usuarios"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Perfil del usuario",
            content: json({ data: perfilEjemplo }),
          },
          "401": R.error401,
          "404": {
            description: "Falta elegir el nombre de usuario (registro con Google)",
            content: json(
              errorEjemplo(
                "PROFILE_INCOMPLETE",
                "Falta elegir tu nombre de usuario para terminar de crear la cuenta."
              ),
              "#/components/schemas/Error"
            ),
          },
          "503": R.error503,
        },
      },
      patch: {
        summary: "Editar el perfil propio (US-04)",
        description: [
          "Actualiza nombres, apellidos, avatar, username y/o correo. Todo se valida en el servidor.",
          "**Username:** se reserva el nuevo y se libera el anterior en una transacción de Firestore; si ya lo usa otra persona responde 409 USERNAME_TAKEN.",
          "**Correo:** se cambia en Firebase Authentication, que garantiza que sea único; si ya existe responde 409 EMAIL_TAKEN.",
          "Si Firestore falla después de cambiar el correo, el correo anterior se restaura.",
        ].join(" "),
        tags: ["Usuarios"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PerfilEdicion" } } },
        },
        responses: {
          "200": {
            description: "Perfil actualizado (devuelve el perfil completo)",
            content: json({ data: { ...perfilEjemplo, username: "daniel_mg2", avatar: "morado" } }),
          },
          "400": {
            description: "Datos inválidos, ningún dato para cambiar o correo de una cuenta de Google",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                examples: {
                  VALIDATION_ERROR: {
                    value: errorEjemplo("VALIDATION_ERROR", "Revisa los datos del formulario e inténtalo de nuevo.", {
                      nombres: "Escribe tus nombres.",
                      username:
                        "Nombre de usuario no válido. Entre 3 y 20 caracteres: letras minúsculas, números o guion bajo (_). Sin espacios.",
                    }),
                  },
                  SIN_CAMBIOS: {
                    value: errorEjemplo(
                      "VALIDATION_ERROR",
                      "Envía al menos un dato para actualizar: nombres, apellidos, username, avatar o correo."
                    ),
                  },
                  CORREO_GOOGLE: {
                    value: errorEjemplo("VALIDATION_ERROR", "Revisa los datos del formulario e inténtalo de nuevo.", {
                      correo:
                        "El correo de una cuenta de Google no se puede cambiar aquí: se administra desde tu cuenta de Google.",
                    }),
                  },
                },
              },
            },
          },
          "401": R.error401,
          "404": {
            description: "La cuenta aún no tiene perfil (Google sin username)",
            content: json(
              errorEjemplo(
                "PROFILE_INCOMPLETE",
                "Falta elegir tu nombre de usuario para terminar de crear la cuenta."
              ),
              "#/components/schemas/Error"
            ),
          },
          "409": {
            description: "Username (USERNAME_TAKEN) o correo (EMAIL_TAKEN) ya usados por otra persona",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                examples: {
                  USERNAME_TAKEN: { value: usernameOcupado },
                  EMAIL_TAKEN: {
                    value: errorEjemplo(
                      "EMAIL_TAKEN",
                      "Ese correo ya tiene una cuenta. Inicia sesión o usa otro correo.",
                      { correo: "Ese correo ya tiene una cuenta. Inicia sesión o usa otro correo." }
                    ),
                  },
                },
              },
            },
          },
          "503": R.error503,
        },
      },
    },
    "/api/users/{uid}": {
      parameters: [
        {
          name: "uid",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Debe ser el uid de quien inició sesión; otro uid responde 403",
        },
      ],
      get: {
        summary: "Perfil por uid (solo el propio)",
        description:
          "Igual que GET /api/users/me, pero con el uid en la URL. Sirve para comprobar que nadie puede leer el perfil de otro usuario: si el uid no es el del token, responde 403 FORBIDDEN.",
        tags: ["Usuarios"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Perfil del usuario", content: json({ data: perfilEjemplo }) },
          "401": R.error401,
          "403": R.error403,
          "503": R.error503,
        },
      },
      patch: {
        summary: "Editar perfil por uid (solo el propio)",
        description:
          "Igual que PATCH /api/users/me. Si el uid no es el del token, responde 403 FORBIDDEN y no se modifica nada.",
        tags: ["Usuarios"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PerfilEdicion" } } },
        },
        responses: {
          "200": { description: "Perfil actualizado", content: json({ data: perfilEjemplo }) },
          "401": R.error401,
          "403": R.error403,
        },
      },
    },
    "/api/users/me/username": {
      post: {
        summary: "Elegir nombre de usuario tras entrar con Google (US-02)",
        description:
          "Crea el perfil con el username elegido. Nombres, apellidos, correo y foto se toman de las claims del ID token verificado (`name`, `email`, `picture`); el cliente solo envía el username. Solo se puede hacer una vez.",
        tags: ["Usuarios"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UsernameEntrada" } } },
        },
        responses: {
          "201": {
            description: "Perfil creado",
            content: json({
              data: {
                ...perfilEjemplo,
                avatar: "https://lh3.googleusercontent.com/a/ejemplo",
              },
            }),
          },
          "400": {
            description: "Username con formato inválido",
            content: json(
              errorEjemplo("VALIDATION_ERROR", "Revisa los datos del formulario e inténtalo de nuevo.", {
                username:
                  "Nombre de usuario no válido. Entre 3 y 20 caracteres: letras minúsculas, números o guion bajo (_). Sin espacios.",
              }),
              "#/components/schemas/Error"
            ),
          },
          "401": R.error401,
          "409": {
            description: "Username ocupado (USERNAME_TAKEN) o la cuenta ya tenía perfil (PROFILE_EXISTS)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                examples: {
                  USERNAME_TAKEN: { value: usernameOcupado },
                  PROFILE_EXISTS: {
                    value: errorEjemplo("PROFILE_EXISTS", "Tu cuenta ya tiene un nombre de usuario."),
                  },
                },
              },
            },
          },
          "503": R.error503,
        },
      },
    },
  },
};
