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
import { validarIdSala, validarNombreSala } from "../validators/rooms.validator";
import { enBaseDeDatos } from "./users.service";

export type Rol = "anfitrion" | "invitado";
export type SalaConRol = Sala & { rol: Rol };

const salaNoEncontrada = () =>
  new AppError(404, "No encontramos una sala con ese ID. Revísalo e inténtalo de nuevo.", "ROOM_NOT_FOUND");

const noEsAnfitrion = () =>
  new AppError(403, "Solo el anfitrión puede modificar o eliminar esta sala.", "FORBIDDEN");

const conRol = (sala: Sala, uid: string): SalaConRol => ({
  ...sala,
  rol: sala.anfitrionUid === uid ? "anfitrion" : "invitado",
});

/** Busca la sala del :id de la URL (400 si el formato es inválido, 404 si no existe). */
async function salaDeLaUrl(valor: unknown): Promise<Sala> {
  const id = validarIdSala(valor);
  const sala = await enBaseDeDatos("leer sala", () => buscarSala(id));
  if (!sala) throw salaNoEncontrada();
  return sala;
}

/** US-06 · Crea una sala con ID único; quien la crea queda como anfitrión (administrador). */
export async function crearSalaPara(uid: string, body: unknown): Promise<SalaConRol> {
  const nombre = validarNombreSala(body);

  // Solo cuentas con perfil completo (con Google: después de elegir username).
  const perfil = await enBaseDeDatos("leer perfil", () => buscarPerfil(uid));
  if (!perfil) {
    throw new AppError(
      404,
      "Falta elegir tu nombre de usuario para terminar de crear la cuenta.",
      "PROFILE_INCOMPLETE"
    );
  }

  const sala = await enBaseDeDatos("crear sala", () => crearSala(nombre, uid));
  return conRol(sala, uid);
}

/** US-06 · Panel: solo las salas que creó este usuario. */
export async function misSalas(uid: string): Promise<SalaConRol[]> {
  const lista = await enBaseDeDatos("listar salas", () => listarSalasDe(uid));
  return lista.map((sala) => conRol(sala, uid));
}

/** Datos de una sala por su ID (para entrar a ella). Indica si quien pregunta es anfitrión. */
export async function verSala(uid: string, id: unknown): Promise<SalaConRol> {
  return conRol(await salaDeLaUrl(id), uid);
}

/** Cambiar el nombre: solo el anfitrión (otro usuario → 403 y no se modifica nada). */
export async function editarSala(uid: string, id: unknown, body: unknown): Promise<SalaConRol> {
  const sala = await salaDeLaUrl(id);
  if (sala.anfitrionUid !== uid) throw noEsAnfitrion();
  const nombre = validarNombreSala(body);
  await enBaseDeDatos("renombrar sala", () => renombrarSala(sala.id, nombre));
  return conRol({ ...sala, nombre }, uid);
}

/** Eliminar la sala y sus mensajes: solo el anfitrión (otro usuario → 403). */
export async function borrarSala(uid: string, id: unknown): Promise<void> {
  const sala = await salaDeLaUrl(id);
  if (sala.anfitrionUid !== uid) throw noEsAnfitrion();
  await enBaseDeDatos("eliminar sala", () => eliminarSala(sala.id));
}
