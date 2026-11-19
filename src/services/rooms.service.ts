import { buscarPerfil } from "../repositories/users.repository";
import {
  buscarSala,
  crearSala,
  eliminarSala,
  listarSalasDe,
  renombrarSala,
  Sala,
} from "../repositories/rooms.repository";
import { AppError } from "../utils/AppError";
import { validarCreacionSala, validarIdSala, validarNombreSala } from "../validators/rooms.validator";
import { enBaseDeDatos } from "./users.service";

/** El frontend espera rol «administrador» en las salas de su panel (US-06). */
export type SalaDelPanel = Sala & { rol: "administrador" };

const salaNoEncontrada = () =>
  new AppError(404, "La sala no existe o no está en tu panel.", "ROOM_NOT_FOUND");

const noEsAnfitrion = () =>
  new AppError(403, "Solo el anfitrión puede modificar o eliminar esta sala.", "FORBIDDEN");

const comoAdministrador = (sala: Sala): SalaDelPanel => ({ ...sala, rol: "administrador" });

/** Busca la sala del :id de la URL (400 si el formato es inválido, 404 si no existe). */
async function salaDeLaUrl(valor: unknown): Promise<Sala> {
  const id = validarIdSala(valor);
  const sala = await enBaseDeDatos("leer sala", () => buscarSala(id));
  if (!sala) throw salaNoEncontrada();
  return sala;
}

/**
 * US-06 · Crea una sala con ID único; quien la crea queda como administrador (anfitrión).
 * Es idempotente por solicitudId: un reintento de la misma solicitud devuelve la misma sala.
 */
export async function crearSalaPara(
  uid: string,
  body: unknown
): Promise<{ sala: SalaDelPanel; nueva: boolean }> {
  const { nombre, solicitudId } = validarCreacionSala(body);

  // Solo cuentas con perfil completo (con Google: después de elegir username).
  const perfil = await enBaseDeDatos("leer perfil", () => buscarPerfil(uid));
  if (!perfil) {
    throw new AppError(
      404,
      "Falta elegir tu nombre de usuario para terminar de crear la cuenta.",
      "PROFILE_INCOMPLETE"
    );
  }

  const resultado = await enBaseDeDatos("crear sala", () => crearSala(nombre, uid, solicitudId));
  switch (resultado.tipo) {
    case "creada":
      return { sala: comoAdministrador(resultado.sala), nueva: true };
    case "existente":
      return { sala: comoAdministrador(resultado.sala), nueva: false };
    case "conflicto":
      throw new AppError(409, "No pudimos reutilizar la solicitud de creación.", "ROOM_REQUEST_CONFLICT");
    case "sin-id":
      console.error("No se encontró un ID libre para la sala tras varios intentos");
      throw new AppError(503, "No encontramos un código disponible. Inténtalo de nuevo.", "ROOM_CODE_UNAVAILABLE");
  }
}

/** US-06 · Panel: solo las salas que creó este usuario. */
export async function misSalas(uid: string): Promise<SalaDelPanel[]> {
  const lista = await enBaseDeDatos("listar salas", () => listarSalasDe(uid));
  return lista.map(comoAdministrador);
}

/**
 * Una sala del panel por su ID. En el Sprint 2 solo la ve su anfitrión: si es de otra
 * persona responde 404, igual que si no existiera (no se revela nada de salas ajenas).
 * En el Sprint 3 (US-08) los invitados entrarán por el servidor de tiempo real.
 */
export async function verSala(uid: string, id: unknown): Promise<SalaDelPanel> {
  const sala = await salaDeLaUrl(id);
  if (sala.anfitrionUid !== uid) throw salaNoEncontrada();
  return comoAdministrador(sala);
}

/** Cambiar el nombre: solo el anfitrión (otro usuario → 403 y no se modifica nada). */
export async function editarSala(uid: string, id: unknown, body: unknown): Promise<SalaDelPanel> {
  const sala = await salaDeLaUrl(id);
  if (sala.anfitrionUid !== uid) throw noEsAnfitrion();
  const nombre = validarNombreSala(body);
  await enBaseDeDatos("renombrar sala", () => renombrarSala(sala.id, nombre));
  return comoAdministrador({ ...sala, nombre });
}

/** Eliminar la sala y sus mensajes: solo el anfitrión (otro usuario → 403). */
export async function borrarSala(uid: string, id: unknown): Promise<void> {
  const sala = await salaDeLaUrl(id);
  if (sala.anfitrionUid !== uid) throw noEsAnfitrion();
  await enBaseDeDatos("eliminar sala", () => eliminarSala(sala.id));
}
