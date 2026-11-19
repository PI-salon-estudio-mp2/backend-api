import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebase";

/**
 * Modelo en Firestore:
 *   users/{uid}            { uid, nombres, apellidos, username, avatar, correo, proveedor, creadoEn, actualizadoEn }
 *   usernames/{username}   { uid, creadoEn }   ← garantiza que el nombre de usuario sea único
 */

export interface Perfil {
  uid: string;
  nombres: string;
  apellidos: string;
  username: string;
  avatar: string;
  correo: string;
}

export type Proveedor = "password" | "google";

export type ResultadoCreacion = "creado" | "username-ocupado" | "perfil-existe";

/** Perfil con el proveedor de la cuenta (uso interno: nunca se envía tal cual al cliente). */
export interface PerfilGuardado extends Perfil {
  proveedor: Proveedor;
}

export type CambiosGuardables = Partial<Omit<Perfil, "uid">>;

export type ResultadoEdicion =
  | { resultado: "actualizado"; perfil: Perfil }
  | { resultado: "username-ocupado" }
  | { resultado: "sin-perfil" };

const usuarios = () => db.collection("users");
const usernames = () => db.collection("usernames");

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

/** Solo se devuelven los campos públicos del perfil (nunca proveedor ni fechas internas). */
function aPerfil(uid: string, data: Record<string, unknown>): Perfil {
  return {
    uid,
    nombres: texto(data.nombres),
    apellidos: texto(data.apellidos),
    username: texto(data.username),
    avatar: texto(data.avatar),
    correo: texto(data.correo),
  };
}

export async function buscarPerfil(uid: string): Promise<Perfil | null> {
  const snapshot = await usuarios().doc(uid).get();
  if (!snapshot.exists) return null;
  return aPerfil(snapshot.id, snapshot.data() ?? {});
}

/** Perfil con su proveedor ("password" o "google"); null si no existe. */
export async function buscarPerfilGuardado(uid: string): Promise<PerfilGuardado | null> {
  const snapshot = await usuarios().doc(uid).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() ?? {};
  return {
    ...aPerfil(snapshot.id, data),
    proveedor: data.proveedor === "google" ? "google" : "password",
  };
}

export async function usernameExiste(username: string): Promise<boolean> {
  const snapshot = await usernames().doc(username).get();
  return snapshot.exists;
}

/**
 * Crea el perfil y reserva el username en UNA transacción.
 * Si dos personas piden el mismo username al mismo tiempo, Firestore repite
 * la transacción de la segunda: verá el username ya reservado y fallará con
 * «username-ocupado». Así la unicidad no depende de la pantalla.
 */
export async function crearPerfil(perfil: Perfil, proveedor: Proveedor): Promise<ResultadoCreacion> {
  const refUsuario = usuarios().doc(perfil.uid);
  const refUsername = usernames().doc(perfil.username);

  return db.runTransaction(async (tx): Promise<ResultadoCreacion> => {
    const [snapUsuario, snapUsername] = await tx.getAll(refUsuario, refUsername);
    if (snapUsuario.exists) return "perfil-existe";
    if (snapUsername.exists) return "username-ocupado";

    const ahora = FieldValue.serverTimestamp();
    tx.create(refUsername, { uid: perfil.uid, creadoEn: ahora });
    tx.create(refUsuario, { ...perfil, proveedor, creadoEn: ahora, actualizadoEn: ahora });
    return "creado";
  });
}

/**
 * US-04 · Actualiza el perfil en UNA transacción.
 * Si cambia el username: comprueba que el nuevo esté libre, lo reserva en `usernames/{nuevo}`
 * y libera el anterior (`usernames/{viejo}`). Si otra persona lo reservó al mismo tiempo,
 * Firestore repite la transacción, la verá ocupada y devolverá «username-ocupado».
 */
export async function actualizarPerfil(
  uid: string,
  cambios: CambiosGuardables
): Promise<ResultadoEdicion> {
  const refUsuario = usuarios().doc(uid);

  return db.runTransaction(async (tx): Promise<ResultadoEdicion> => {
    const snapUsuario = await tx.get(refUsuario);
    if (!snapUsuario.exists) return { resultado: "sin-perfil" };
    const actual = aPerfil(uid, snapUsuario.data() ?? {});

    // En una transacción todas las lecturas van antes de las escrituras.
    const nuevo = cambios.username;
    if (nuevo !== undefined && nuevo !== actual.username) {
      const refNuevo = usernames().doc(nuevo);
      const snapNuevo = await tx.get(refNuevo);
      if (snapNuevo.exists && snapNuevo.get("uid") !== uid) return { resultado: "username-ocupado" };

      if (actual.username) {
        const refViejo = usernames().doc(actual.username);
        const snapViejo = await tx.get(refViejo);
        // Solo se libera si de verdad era de este usuario.
        if (snapViejo.exists && snapViejo.get("uid") === uid) tx.delete(refViejo);
      }
      if (!snapNuevo.exists) {
        tx.create(refNuevo, { uid, creadoEn: FieldValue.serverTimestamp() });
      }
    }

    tx.update(refUsuario, { ...cambios, actualizadoEn: FieldValue.serverTimestamp() });
    return { resultado: "actualizado", perfil: { ...actual, ...cambios } };
  });
}

/**
 * US-05 · Borra el perfil y libera el nombre de usuario en UNA transacción.
 * Solo borra `usernames/{username}` si de verdad pertenece a este uid.
 * Devuelve el username liberado (o null si no tenía perfil).
 */
export async function borrarPerfilYUsername(uid: string): Promise<string | null> {
  const refUsuario = usuarios().doc(uid);
  return db.runTransaction(async (tx): Promise<string | null> => {
    const snapUsuario = await tx.get(refUsuario);
    if (!snapUsuario.exists) return null;
    const username = texto(snapUsuario.get("username"));

    let liberar = false;
    const refUsername = username ? usernames().doc(username) : null;
    if (refUsername) {
      const snapUsername = await tx.get(refUsername);
      liberar = snapUsername.exists && snapUsername.get("uid") === uid;
    }

    if (refUsername && liberar) tx.delete(refUsername);
    tx.delete(refUsuario);
    return username || null;
  });
}
