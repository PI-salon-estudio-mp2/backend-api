import { auth } from "../config/firebase";
import type { UsuarioAutenticado } from "../middlewares/auth.middleware";
import {
  eliminarSala,
  idsSalasDe,
  idsSalasDondeEsInvitado,
  sacarDeSalaYAnonimizar,
} from "../repositories/rooms.repository";
import {
  actualizarPerfil,
  borrarPerfilYUsername,
  buscarPerfil,
  buscarPerfilGuardado,
  crearPerfil,
  Perfil,
  Proveedor,
  usernameExiste,
} from "../repositories/users.repository";
import { AppError } from "../utils/AppError";
import {
  AVATAR_POR_DEFECTO,
  errorDeUsername,
  MAX_NOMBRE,
  MENSAJE_FORMULARIO,
  MENSAJES,
  normalizarUsername,
  validarEdicionPerfil,
  validarRegistro,
  validarUsername,
} from "../validators/users.validator";

const MENSAJE_USERNAME_OCUPADO = "Ese nombre de usuario ya está ocupado. Prueba con otro.";
const MENSAJE_CORREO_OCUPADO = "Ese correo ya tiene una cuenta. Inicia sesión o usa otro correo.";
const MENSAJE_DB =
  "No se pudo conectar con la base de datos. Inténtalo de nuevo en unos segundos.";

const usernameOcupado = () =>
  new AppError(409, MENSAJE_USERNAME_OCUPADO, "USERNAME_TAKEN", {
    username: MENSAJE_USERNAME_OCUPADO,
  });

const correoOcupado = () =>
  new AppError(409, MENSAJE_CORREO_OCUPADO, "EMAIL_TAKEN", { correo: MENSAJE_CORREO_OCUPADO });

const baseDeDatosNoDisponible = () => new AppError(503, MENSAJE_DB, "DB_UNAVAILABLE");

const perfilIncompleto = () =>
  new AppError(
    404,
    "Falta elegir tu nombre de usuario para terminar de crear la cuenta.",
    "PROFILE_INCOMPLETE"
  );

/** Ejecuta una operación de Firestore y convierte cualquier fallo en 503 DB_UNAVAILABLE. */
export async function enBaseDeDatos<T>(operacion: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`Error de Firestore (${operacion}):`, error);
    throw baseDeDatosNoDisponible();
  }
}

function codigoFirebase(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return "";
}

/** Traduce los errores de createUser / updateUser a respuestas claras en español. */
function traducirErrorDeAuth(
  error: unknown,
  mensaje503 = "No pudimos crear la cuenta en este momento. Inténtalo de nuevo en unos segundos."
): AppError {
  switch (codigoFirebase(error)) {
    case "auth/email-already-exists":
      return correoOcupado();
    case "auth/invalid-email":
      return new AppError(400, MENSAJE_FORMULARIO, "VALIDATION_ERROR", {
        correo: MENSAJES.correoInvalido,
      });
    case "auth/invalid-password":
      return new AppError(400, MENSAJE_FORMULARIO, "VALIDATION_ERROR", {
        contrasena: MENSAJES.contrasenaDebil,
      });
    default:
      console.error("Error de Firebase Authentication:", error);
      return new AppError(503, mensaje503, "AUTH_UNAVAILABLE");
  }
}

/** Borra la cuenta de Firebase Auth si el perfil no se pudo guardar (evita cuentas a medias). */
async function deshacerCuenta(uid: string) {
  try {
    await auth.deleteUser(uid);
  } catch (error) {
    console.error(`No se pudo borrar la cuenta ${uid} después de fallar el registro:`, error);
  }
}

/**
 * US-01 · Registro manual.
 * 1) valida los datos, 2) revisa rápido si el username está libre,
 * 3) crea la cuenta en Firebase Auth (el correo es único allí),
 * 4) guarda perfil + username en una transacción; si falla, borra la cuenta del paso 3.
 */
export async function registrarUsuario(body: unknown): Promise<{ uid: string }> {
  const datos = validarRegistro(body);

  const ocupado = await enBaseDeDatos("revisar username", () => usernameExiste(datos.username));
  if (ocupado) throw usernameOcupado();

  let uid: string;
  try {
    const cuenta = await auth.createUser({
      email: datos.correo,
      password: datos.contrasena,
      displayName: `${datos.nombres} ${datos.apellidos}`,
    });
    uid = cuenta.uid;
  } catch (error) {
    throw traducirErrorDeAuth(error);
  }

  const perfil: Perfil = {
    uid,
    nombres: datos.nombres,
    apellidos: datos.apellidos,
    username: datos.username,
    avatar: datos.avatar,
    correo: datos.correo,
  };

  let resultado;
  try {
    resultado = await crearPerfil(perfil, "password");
  } catch (error) {
    console.error("Error de Firestore (crear perfil en el registro):", error);
    await deshacerCuenta(uid);
    throw baseDeDatosNoDisponible();
  }

  if (resultado !== "creado") {
    // Otra persona reservó el mismo username entre el paso 2 y el 4.
    await deshacerCuenta(uid);
    throw usernameOcupado();
  }

  return { uid };
}

/** US-03 · Perfil de quien inició sesión. 404 PROFILE_INCOMPLETE si aún no eligió username. */
export async function obtenerPerfil(uid: string): Promise<Perfil> {
  const perfil = await enBaseDeDatos("leer perfil", () => buscarPerfil(uid));
  if (!perfil) throw perfilIncompleto();
  return perfil;
}

/**
 * Separa el `name` de Google en nombres y apellidos.
 * 4 o más palabras: 2 nombres + el resto apellidos («Daniel Andrés Micolta Góngora»).
 * 2 o 3 palabras: 1 nombre + el resto apellidos. El usuario podrá corregirlo en US-04.
 */
export function separarNombre(nombre: string, correo: string): { nombres: string; apellidos: string } {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) {
    return { nombres: (correo.split("@")[0] || "Estudiante").slice(0, MAX_NOMBRE), apellidos: "" };
  }
  const corte = partes.length >= 4 ? 2 : 1;
  return {
    nombres: partes.slice(0, corte).join(" ").slice(0, MAX_NOMBRE),
    apellidos: partes.slice(corte).join(" ").slice(0, MAX_NOMBRE),
  };
}

/**
 * US-02 · Registro con Google: el usuario ya tiene sesión en Firebase y elige su username.
 * Nombres, apellidos, correo y foto salen de las claims del ID token verificado
 * (name, email, picture); el cliente solo envía el username.
 */
export async function completarPerfilConUsername(
  usuario: UsuarioAutenticado,
  body: unknown
): Promise<Perfil> {
  const username = validarUsername(body);
  const { nombres, apellidos } = separarNombre(usuario.nombre, usuario.correo);

  const perfil: Perfil = {
    uid: usuario.uid,
    nombres,
    apellidos,
    username,
    avatar: /^https:\/\//i.test(usuario.foto) ? usuario.foto : AVATAR_POR_DEFECTO,
    correo: usuario.correo.toLowerCase(),
  };
  const proveedor: Proveedor = usuario.proveedor === "google.com" ? "google" : "password";

  const resultado = await enBaseDeDatos("crear perfil", () => crearPerfil(perfil, proveedor));
  if (resultado === "username-ocupado") throw usernameOcupado();
  if (resultado === "perfil-existe") {
    throw new AppError(409, "Tu cuenta ya tiene un nombre de usuario.", "PROFILE_EXISTS");
  }
  return perfil;
}

/**
 * Consulta si un username está libre. Siempre responde { disponible }:
 * si el formato no es válido, disponible = false y `motivo` explica por qué.
 */
export async function consultarUsername(
  valor: unknown
): Promise<{ username: string; disponible: boolean; motivo?: string }> {
  const username = normalizarUsername(valor);
  const motivo = errorDeUsername(username);
  if (motivo) return { username, disponible: false, motivo };

  const ocupado = await enBaseDeDatos("revisar username", () => usernameExiste(username));
  return ocupado
    ? { username, disponible: false, motivo: MENSAJE_USERNAME_OCUPADO }
    : { username, disponible: true };
}

/**
 * US-04 · Editar perfil. Se valida TODO en el servidor:
 * 1) formato de los campos enviados,
 * 2) username: revisión rápida y luego reserva definitiva en una transacción (libera el anterior),
 * 3) correo (solo cuentas con contraseña): se cambia primero en Firebase Authentication,
 *    que garantiza que sea único; si después falla Firestore, se devuelve el correo anterior.
 */
export async function editarPerfil(usuario: UsuarioAutenticado, body: unknown): Promise<Perfil> {
  const guardado = await enBaseDeDatos("leer perfil", () => buscarPerfilGuardado(usuario.uid));
  if (!guardado) throw perfilIncompleto();

  const cambios = validarEdicionPerfil(body, guardado.avatar);

  const correoNuevo =
    cambios.correo !== undefined && cambios.correo !== guardado.correo ? cambios.correo : undefined;
  if (!correoNuevo) delete cambios.correo;
  if (correoNuevo && guardado.proveedor === "google") {
    throw new AppError(400, MENSAJE_FORMULARIO, "VALIDATION_ERROR", {
      correo: MENSAJES.correoGoogle,
    });
  }

  const usernameNuevo = cambios.username;
  if (usernameNuevo !== undefined && usernameNuevo !== guardado.username) {
    const ocupado = await enBaseDeDatos("revisar username", () => usernameExiste(usernameNuevo));
    if (ocupado) throw usernameOcupado();
  }

  if (correoNuevo) {
    try {
      await auth.updateUser(usuario.uid, { email: correoNuevo });
    } catch (error) {
      throw traducirErrorDeAuth(
        error,
        "No pudimos cambiar tu correo en este momento. Inténtalo de nuevo en unos segundos."
      );
    }
  }

  /** Si Firestore no guardó los cambios, el correo de Auth vuelve a ser el anterior. */
  const revertirCorreo = async () => {
    if (!correoNuevo) return;
    try {
      await auth.updateUser(usuario.uid, { email: guardado.correo });
    } catch (error) {
      console.error(`No se pudo devolver el correo anterior de ${usuario.uid}:`, error);
    }
  };

  let resultado;
  try {
    resultado = await actualizarPerfil(usuario.uid, cambios);
  } catch (error) {
    console.error("Error de Firestore (editar perfil):", error);
    await revertirCorreo();
    throw baseDeDatosNoDisponible();
  }

  if (resultado.resultado === "username-ocupado") {
    await revertirCorreo();
    throw usernameOcupado();
  }
  if (resultado.resultado === "sin-perfil") {
    await revertirCorreo();
    throw perfilIncompleto();
  }
  return resultado.perfil;
}

export interface ResumenEliminacion {
  uid: string;
  usernameLiberado: string | null;
  salasEliminadas: number;
  salasAbandonadas: number;
  mensajesAnonimizados: number;
}

/**
 * US-05 · Eliminar cuenta. Política de datos acordada por el equipo:
 * 1) Las salas que creó el usuario se borran con TODOS sus mensajes.
 * 2) En salas de otros: sale de `miembros` y sus mensajes quedan como «Usuario eliminado».
 * 3) Se borra su perfil (`users/{uid}`) y se libera su username (`usernames/{username}`).
 * 4) Por último se borra la cuenta de Firebase Authentication.
 * Firestore va primero: si algo falla, la cuenta sigue existiendo y el usuario puede
 * reintentar (todos los pasos se pueden repetir sin problema). Así nunca quedan datos
 * huérfanos de una cuenta que ya no existe.
 */
export async function eliminarCuenta(uid: string): Promise<ResumenEliminacion> {
  const propias = await enBaseDeDatos("buscar salas propias", () => idsSalasDe(uid));
  for (const salaId of propias) {
    await enBaseDeDatos("eliminar sala", () => eliminarSala(salaId));
  }

  const ajenas = await enBaseDeDatos("buscar salas como invitado", () => idsSalasDondeEsInvitado(uid));
  let mensajesAnonimizados = 0;
  for (const salaId of ajenas) {
    mensajesAnonimizados += await enBaseDeDatos("anonimizar mensajes", () =>
      sacarDeSalaYAnonimizar(salaId, uid)
    );
  }

  const usernameLiberado = await enBaseDeDatos("borrar perfil", () => borrarPerfilYUsername(uid));

  try {
    await auth.deleteUser(uid);
  } catch (error) {
    // Si la cuenta ya no existía en Authentication, el resultado es el mismo.
    if (codigoFirebase(error) !== "auth/user-not-found") {
      console.error(`No se pudo borrar la cuenta ${uid} de Firebase Authentication:`, error);
      throw new AppError(
        503,
        "Borramos tus datos, pero no pudimos cerrar tu cuenta. Inténtalo de nuevo en unos segundos.",
        "AUTH_UNAVAILABLE"
      );
    }
  }

  console.log(
    `Cuenta eliminada (US-05): ${propias.length} salas borradas, ${ajenas.length} salas abandonadas, ${mensajesAnonimizados} mensajes anonimizados`
  );
  return {
    uid,
    usernameLiberado,
    salasEliminadas: propias.length,
    salasAbandonadas: ajenas.length,
    mensajesAnonimizados,
  };
}
