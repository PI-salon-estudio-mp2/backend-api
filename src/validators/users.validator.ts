import { AppError } from "../utils/AppError";

/**
 * Validaciones del servidor. Son las MISMAS reglas del frontend
 * (frontend/src/features/auth/validaciones.ts), pero aquí son obligatorias:
 * aunque alguien se salte la pantalla, la API rechaza los datos inválidos.
 */

/** Fotos de perfil del registro manual (frontend/src/features/auth/avatares.ts). */
export const AVATARES = ["azul", "verde", "ocre", "morado", "turquesa", "rosado"] as const;
export const AVATAR_POR_DEFECTO = "azul";

export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_NOMBRE = 60;

const AYUDA_USERNAME =
  "Entre 3 y 20 caracteres: letras minúsculas, números o guion bajo (_). Sin espacios.";
const POLITICA_CONTRASENA = "Mínimo 8 caracteres, con al menos una letra y un número.";

export const MENSAJE_FORMULARIO = "Revisa los datos del formulario e inténtalo de nuevo.";

export const MENSAJES = {
  nombresVacio: "Escribe tus nombres.",
  apellidosVacio: "Escribe tus apellidos.",
  nombreLargo: (etiqueta: string) => `Usa máximo ${MAX_NOMBRE} caracteres en tus ${etiqueta}.`,
  usernameVacio: "Elige un nombre de usuario.",
  usernameInvalido: `Nombre de usuario no válido. ${AYUDA_USERNAME}`,
  correoVacio: "Escribe tu correo.",
  correoInvalido: "Escribe un correo válido, por ejemplo nombre@correo.com.",
  contrasenaVacia: "Escribe una contraseña.",
  contrasenaDebil: `La contraseña no cumple la política. ${POLITICA_CONTRASENA}`,
  avatarVacio: "Elige una foto de perfil.",
  avatarInvalido: "Elige una de las fotos de perfil disponibles.",
} as const;

export interface DatosRegistro {
  nombres: string;
  apellidos: string;
  username: string;
  avatar: string;
  correo: string;
  contrasena: string;
}

type Campos = Record<string, string>;

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

function comoObjeto(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

export function normalizarUsername(valor: unknown): string {
  return texto(valor).trim().toLowerCase();
}

/** Mensaje de error del nombre de usuario, o undefined si es válido. */
export function errorDeUsername(username: string): string | undefined {
  if (!username) return MENSAJES.usernameVacio;
  if (!USERNAME_REGEX.test(username)) return MENSAJES.usernameInvalido;
  return undefined;
}

function errorDeNombre(valor: string, vacio: string, etiqueta: string): string | undefined {
  if (!valor) return vacio;
  if (valor.length > MAX_NOMBRE) return MENSAJES.nombreLargo(etiqueta);
  return undefined;
}

function errorDeCorreo(correo: string): string | undefined {
  if (!correo) return MENSAJES.correoVacio;
  if (!CORREO_REGEX.test(correo)) return MENSAJES.correoInvalido;
  return undefined;
}

function errorDeContrasena(contrasena: string): string | undefined {
  if (!contrasena) return MENSAJES.contrasenaVacia;
  if (contrasena.length < 8 || !/[A-Za-z]/.test(contrasena) || !/\d/.test(contrasena)) {
    return MENSAJES.contrasenaDebil;
  }
  return undefined;
}

function errorDeAvatar(avatar: string): string | undefined {
  if (!avatar) return MENSAJES.avatarVacio;
  if (!(AVATARES as readonly string[]).includes(avatar)) return MENSAJES.avatarInvalido;
  return undefined;
}

function lanzarSiHayErrores(fields: Campos) {
  if (Object.keys(fields).length > 0) {
    throw new AppError(400, MENSAJE_FORMULARIO, "VALIDATION_ERROR", fields);
  }
}

/**
 * Valida el cuerpo de POST /api/auth/registro. Devuelve los datos ya normalizados
 * o lanza 400 VALIDATION_ERROR con TODOS los campos que fallaron a la vez.
 */
export function validarRegistro(body: unknown): DatosRegistro {
  const c = comoObjeto(body);
  const datos: DatosRegistro = {
    nombres: texto(c.nombres).trim(),
    apellidos: texto(c.apellidos).trim(),
    username: normalizarUsername(c.username),
    avatar: texto(c.avatar).trim(),
    correo: texto(c.correo).trim().toLowerCase(),
    contrasena: texto(c.contrasena), // la contraseña no se recorta: los espacios cuentan
  };

  const fields: Campos = {};
  const errores: Array<[keyof DatosRegistro, string | undefined]> = [
    ["nombres", errorDeNombre(datos.nombres, MENSAJES.nombresVacio, "nombres")],
    ["apellidos", errorDeNombre(datos.apellidos, MENSAJES.apellidosVacio, "apellidos")],
    ["username", errorDeUsername(datos.username)],
    ["avatar", errorDeAvatar(datos.avatar)],
    ["correo", errorDeCorreo(datos.correo)],
    ["contrasena", errorDeContrasena(datos.contrasena)],
  ];
  for (const [campo, mensaje] of errores) {
    if (mensaje) fields[campo] = mensaje;
  }
  lanzarSiHayErrores(fields);
  return datos;
}

/** Valida el cuerpo de POST /api/users/me/username y devuelve el username normalizado. */
export function validarUsername(body: unknown): string {
  const username = normalizarUsername(comoObjeto(body).username);
  const mensaje = errorDeUsername(username);
  lanzarSiHayErrores(mensaje ? { username: mensaje } : {});
  return username;
}
