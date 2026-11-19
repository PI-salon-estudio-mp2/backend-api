import { AppError } from "../utils/AppError";
import { MENSAJE_FORMULARIO } from "./users.validator";

/**
 * Validaciones de salas (US-06). Son las MISMAS reglas del frontend
 * (frontend/src/features/salas/api.ts), pero aquí son obligatorias.
 */

export const MIN_NOMBRE_SALA = 3;
export const MAX_NOMBRE_SALA = 40;

/** Alfabeto del ID: mayúsculas y números sin los que se confunden (0/O, 1/I/L). */
export const ALFABETO_ID_SALA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const LARGO_ID_SALA = 8;
const ID_SALA_REGEX = new RegExp(`^[${ALFABETO_ID_SALA}]{${LARGO_ID_SALA}}$`);

/** solicitudId: UUID que genera el frontend con crypto.randomUUID() en cada intento de creación. */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const MENSAJES_SALA = {
  nombreVacio: "Escribe un nombre para la sala.",
  nombreLargo: `Escribe un nombre de entre ${MIN_NOMBRE_SALA} y ${MAX_NOMBRE_SALA} caracteres.`,
  solicitudInvalida: "La solicitud de creación no es válida.",
  idVacio: "Escribe el ID de la sala.",
  idInvalido: `El ID de la sala tiene ${LARGO_ID_SALA} caracteres: letras y números, sin espacios.`,
} as const;

function comoObjeto(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

/** Recorta y une espacios repetidos: «  Cálculo   II » → «Cálculo II». */
function limpiarNombre(valor: unknown): string {
  return typeof valor === "string" ? valor.trim().replace(/\s+/g, " ") : "";
}

/** Valida { nombre } (entre 3 y 40 caracteres). Lanza 400 VALIDATION_ERROR. */
export function validarNombreSala(body: unknown): string {
  const nombre = limpiarNombre(comoObjeto(body).nombre);
  let mensaje: string | undefined;
  if (!nombre) mensaje = MENSAJES_SALA.nombreVacio;
  else if (nombre.length < MIN_NOMBRE_SALA || nombre.length > MAX_NOMBRE_SALA) {
    mensaje = MENSAJES_SALA.nombreLargo;
  }
  if (mensaje) throw new AppError(400, MENSAJE_FORMULARIO, "VALIDATION_ERROR", { nombre: mensaje });
  return nombre;
}

/** Valida el cuerpo de POST /api/rooms: { nombre, solicitudId }. */
export function validarCreacionSala(body: unknown): { nombre: string; solicitudId: string } {
  const nombre = validarNombreSala(body);
  const solicitudId = comoObjeto(body).solicitudId;
  if (typeof solicitudId !== "string" || !UUID_REGEX.test(solicitudId)) {
    throw new AppError(400, MENSAJES_SALA.solicitudInvalida, "VALIDATION_ERROR");
  }
  return { nombre, solicitudId: solicitudId.toLowerCase() };
}

/** Normaliza el ID que llega en la URL (recorta espacios y pasa a mayúsculas) y lo valida. */
export function validarIdSala(valor: unknown): string {
  const id = typeof valor === "string" ? valor.trim().toUpperCase() : "";
  const mensaje = !id ? MENSAJES_SALA.idVacio : !ID_SALA_REGEX.test(id) ? MENSAJES_SALA.idInvalido : undefined;
  if (mensaje) throw new AppError(400, mensaje, "VALIDATION_ERROR", { id: mensaje });
  return id;
}
