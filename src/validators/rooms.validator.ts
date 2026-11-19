import { AppError } from "../utils/AppError";
import { MENSAJE_FORMULARIO } from "./users.validator";

/**
 * Validaciones de salas (US-06). El frontend usa las mismas reglas,
 * pero aquí son obligatorias: la API rechaza los datos inválidos aunque se salte la pantalla.
 */

export const MAX_NOMBRE_SALA = 50;

/** Alfabeto del ID: mayúsculas y números sin los que se confunden (0/O, 1/I/L). */
export const ALFABETO_ID_SALA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const LARGO_ID_SALA = 8;
const ID_SALA_REGEX = new RegExp(`^[${ALFABETO_ID_SALA}]{${LARGO_ID_SALA}}$`);

export const MENSAJES_SALA = {
  nombreVacio: "Escribe un nombre para la sala.",
  nombreLargo: `Usa máximo ${MAX_NOMBRE_SALA} caracteres en el nombre de la sala.`,
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

/** Valida { nombre } de POST /api/rooms y PATCH /api/rooms/:id. Lanza 400 VALIDATION_ERROR. */
export function validarNombreSala(body: unknown): string {
  const nombre = limpiarNombre(comoObjeto(body).nombre);
  let mensaje: string | undefined;
  if (!nombre) mensaje = MENSAJES_SALA.nombreVacio;
  else if (nombre.length > MAX_NOMBRE_SALA) mensaje = MENSAJES_SALA.nombreLargo;
  if (mensaje) throw new AppError(400, MENSAJE_FORMULARIO, "VALIDATION_ERROR", { nombre: mensaje });
  return nombre;
}

/** Normaliza el ID que llega en la URL (recorta espacios y pasa a mayúsculas) y lo valida. */
export function validarIdSala(valor: unknown): string {
  const id = typeof valor === "string" ? valor.trim().toUpperCase() : "";
  const mensaje = !id ? MENSAJES_SALA.idVacio : !ID_SALA_REGEX.test(id) ? MENSAJES_SALA.idInvalido : undefined;
  if (mensaje) throw new AppError(400, mensaje, "VALIDATION_ERROR", { id: mensaje });
  return id;
}
