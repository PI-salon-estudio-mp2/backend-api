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
