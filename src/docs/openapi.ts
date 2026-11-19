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

const salaEjemplo = {
  id: "K7P2QX9M",
  nombre: "Cálculo II · parcial 2",
  anfitrionUid: "Xy12AbC34dEf56",
  creadoEn: "2026-11-18T21:30:00.000Z",
  rol: "administrador",
};

const errorSala = {
  "400": {
    description: "El ID no tiene el formato válido (8 caracteres: letras y números)",
    content: json(
      errorEjemplo("VALIDATION_ERROR", "El ID de la sala tiene 8 caracteres: letras y números, sin espacios.", {
        id: "El ID de la sala tiene 8 caracteres: letras y números, sin espacios.",
      }),
      "#/components/schemas/Error"
    ),
  },
  "403": {
    description: "Quien llama no es el anfitrión de la sala: no se modifica nada",
    content: json(
      errorEjemplo("FORBIDDEN", "Solo el anfitrión puede modificar o eliminar esta sala."),
      "#/components/schemas/Error"
    ),
  },
  "404": {
    description: "No existe una sala con ese ID",
    content: json(
      errorEjemplo("ROOM_NOT_FOUND", "La sala no existe o no está en tu panel."),
      "#/components/schemas/Error"
    ),
  },
};

const errorNombreSala = {
  description: "Nombre vacío, de menos de 3 o de más de 40 caracteres, o solicitudId inválido",
  content: json(
    errorEjemplo("VALIDATION_ERROR", "Revisa los datos del formulario e inténtalo de nuevo.", {
      nombre: "Escribe un nombre de entre 3 y 40 caracteres.",
    }),
    "#/components/schemas/Error"
  ),
};

const parametroIdSala = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string", pattern: "^[A-HJKMNP-Z2-9]{8}$" },
  example: "K7P2QX9M",
  description: "ID de la sala. Se recortan los espacios y se pasa a mayúsculas",
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
      "Si la cuenta fue eliminada, su token deja de servir (401).",
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
    { name: "Usuarios", description: "TS-01 · US-02 · US-03 (Sprint 1) · US-04 · US-05 (Sprint 2)" },
    {
      name: "Salas",
      description:
        "US-06 · TS-02 (Sprint 2). El ID de la sala es único: 8 caracteres en mayúsculas y números, sin 0, O, 1, I ni L.",
    },
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
              "azul, verde, ocre, morado, turquesa, rosado o \"\" (avatar por defecto con iniciales). En cuentas de Google también se acepta la foto actual",
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
      Sala: {
        type: "object",
        required: ["id", "nombre", "anfitrionUid", "creadoEn", "rol"],
        properties: {
          id: { type: "string", example: "K7P2QX9M", description: "Único. Es también el ID del documento en `rooms`" },
          nombre: { type: "string", minLength: 3, maxLength: 40 },
          anfitrionUid: { type: "string", description: "uid de quien creó la sala (administrador)" },
          creadoEn: { type: "string", format: "date-time" },
          rol: {
            type: "string",
            enum: ["administrador"],
            description: "En el panel siempre es «administrador»: solo se listan y se ven las salas propias",
          },
        },
      },
      SalaEntrada: {
        type: "object",
        required: ["nombre", "solicitudId"],
        properties: {
          nombre: {
            type: "string",
            minLength: 3,
            maxLength: 40,
            description: "Se recortan los espacios del inicio y del final y se unen los repetidos",
            example: "Cálculo II · parcial 2",
          },
          solicitudId: {
            type: "string",
            format: "uuid",
            description:
              "UUID del intento de creación (crypto.randomUUID()). Si se reintenta la misma solicitud, se devuelve la misma sala en vez de crear otra",
            example: "3f2b8c1e-7a4d-4e9b-9c2f-1d5e6a7b8c9d",
          },
        },
      },
      SalaRenombrar: {
        type: "object",
        required: ["nombre"],
        properties: {
          nombre: { type: "string", minLength: 3, maxLength: 40, example: "Cálculo II · final" },
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
      delete: {
        summary: "Eliminar mi cuenta (US-05)",
        description: [
          "Borra la cuenta definitivamente aplicando la **política de datos** del equipo:",
          "1) las salas que creó el usuario se borran con todos sus mensajes;",
          "2) en salas de otros se borran SUS mensajes y sale de `miembros` (la sala y los mensajes de los demás se conservan);",
          "3) se borran sus registros de `roomCreationRequests`;",
          "4) se borra `users/{uid}` y se libera `usernames/{username}` en una transacción;",
          "5) se borra la cuenta de Firebase Authentication.",
          "Responde 204 sin cuerpo solo cuando terminó todo.",
          "Firestore va primero: si algo falla, la cuenta sigue existiendo y se puede reintentar.",
          "Después, el frontend cierra la sesión (`signOut`) y redirige al Login. El token anterior deja de servir (401).",
        ].join(" "),
        tags: ["Usuarios"],
        security: [{ bearerAuth: [] }],
        responses: {
          "204": { description: "Cuenta eliminada por completo (sin cuerpo)" },
          "401": R.error401,
          "503": {
            description: "Firestore o Authentication no respondieron (se puede reintentar)",
            content: json(
              errorEjemplo(
                "AUTH_UNAVAILABLE",
                "No pudimos terminar de eliminar tu cuenta. Inténtalo de nuevo en unos segundos."
              ),
              "#/components/schemas/Error"
            ),
          },
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
      delete: {
        summary: "Eliminar cuenta por uid (solo la propia)",
        description:
          "Igual que DELETE /api/users/me. Si el uid no es el del token, responde 403 FORBIDDEN y no se borra nada.",
        tags: ["Usuarios"],
        security: [{ bearerAuth: [] }],
        responses: {
          "204": { description: "Cuenta eliminada por completo (sin cuerpo)" },
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
    "/api/rooms": {
      post: {
        summary: "Crear sala con ID único (US-06)",
        description:
          "Genera un ID único de 8 caracteres: en una transacción se comprueba que `rooms/{id}` no exista y, si existe, se prueba con otro. Quien la crea queda como administrador (anfitrión) y primer miembro. Es idempotente por `solicitudId` (se guarda en `roomCreationRequests`): un reintento de la misma solicitud responde 200 con la misma sala. Después, el frontend redirige a `/salas/{id}`.",
        tags: ["Salas"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/SalaEntrada" } } },
        },
        responses: {
          "201": { description: "Sala creada", content: json({ data: salaEjemplo }) },
          "200": { description: "Reintento de la misma solicitud: la sala que ya se había creado", content: json({ data: salaEjemplo }) },
          "400": errorNombreSala,
          "401": R.error401,
          "404": {
            description: "La cuenta aún no tiene perfil (Google sin username)",
            content: json(
              errorEjemplo("PROFILE_INCOMPLETE", "Falta elegir tu nombre de usuario para terminar de crear la cuenta."),
              "#/components/schemas/Error"
            ),
          },
          "409": {
            description: "Se reutilizó un solicitudId con otro nombre",
            content: json(
              errorEjemplo("ROOM_REQUEST_CONFLICT", "No pudimos reutilizar la solicitud de creación."),
              "#/components/schemas/Error"
            ),
          },
          "503": {
            description: "Firestore no respondió (DB_UNAVAILABLE) o no se encontró un ID libre (ROOM_CODE_UNAVAILABLE)",
            content: json(
              errorEjemplo("ROOM_CODE_UNAVAILABLE", "No encontramos un código disponible. Inténtalo de nuevo."),
              "#/components/schemas/Error"
            ),
          },
        },
      },
      get: {
        summary: "Listar mis salas (US-06)",
        description:
          "Devuelve SOLO las salas que creó quien inició sesión, de la más nueva a la más vieja. Si no tiene salas responde una lista vacía (el panel muestra el mensaje amigable).",
        tags: ["Salas"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Salas del usuario (puede ser [])",
            content: {
              "application/json": {
                examples: {
                  conSalas: {
                    value: {
                      data: [
                        salaEjemplo,
                        { ...salaEjemplo, id: "B4WZ8HNT", nombre: "Física I", creadoEn: "2026-11-17T15:02:11.000Z" },
                      ],
                    },
                  },
                  vacio: { value: { data: [] } },
                },
              },
            },
          },
          "401": R.error401,
          "503": R.error503,
        },
      },
    },
    "/api/rooms/{id}": {
      parameters: [parametroIdSala],
      get: {
        summary: "Ver una sala por su ID",
        description:
          "Datos de una sala del panel. Solo la ve su anfitrión: si la sala es de otra persona responde 404, igual que si no existiera. (Los invitados entrarán por el servidor de tiempo real en el Sprint 3.)",
        tags: ["Salas"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Datos de la sala", content: json({ data: salaEjemplo }) },
          "400": errorSala["400"],
          "401": R.error401,
          "404": errorSala["404"],
          "503": R.error503,
        },
      },
      patch: {
        summary: "Cambiar el nombre de la sala (solo anfitrión)",
        description: "Si quien llama no es el anfitrión responde 403 FORBIDDEN y no se modifica nada.",
        tags: ["Salas"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/SalaRenombrar" } } },
        },
        responses: {
          "200": {
            description: "Sala actualizada",
            content: json({ data: { ...salaEjemplo, nombre: "Cálculo II · final" } }),
          },
          "400": errorNombreSala,
          "401": R.error401,
          "403": errorSala["403"],
          "404": errorSala["404"],
          "503": R.error503,
        },
      },
      delete: {
        summary: "Eliminar la sala y sus mensajes (solo anfitrión)",
        description:
          "Borra `rooms/{id}` y toda su subcolección `messages` (sin datos huérfanos). Si quien llama no es el anfitrión responde 403 FORBIDDEN y no se borra nada.",
        tags: ["Salas"],
        security: [{ bearerAuth: [] }],
        responses: {
          "204": { description: "Sala eliminada (sin cuerpo)" },
          "400": errorSala["400"],
          "401": R.error401,
          "403": errorSala["403"],
          "404": errorSala["404"],
          "503": R.error503,
        },
      },
    },
  },
};
