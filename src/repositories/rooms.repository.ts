import { randomInt } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import { ALFABETO_ID_SALA, LARGO_ID_SALA } from "../validators/rooms.validator";

/**
 * Modelo en Firestore (TS-02):
 *   rooms/{id}                     { id, nombre, anfitrionUid, miembros: [uid], creadoEn, actualizadoEn }
 *   rooms/{id}/messages/{msgId}    { autorUid, autorUsername, texto, creadoEn }   ← lo escribe backend-realtime
 *
 * El ID del documento ES el ID de la sala (8 caracteres), así es único por construcción:
 * se crea con create(), que falla si el documento ya existe, y se reintenta con otro ID.
 */

export interface Sala {
  id: string;
  nombre: string;
  anfitrionUid: string;
  creadoEn: string; // ISO 8601
}

const salas = () => db.collection("rooms");

const INTENTOS_ID = 5;
/** Código gRPC ALREADY_EXISTS que devuelve create() si el documento ya existe. */
const YA_EXISTE = 6;

export function generarIdSala(): string {
  let id = "";
  for (let i = 0; i < LARGO_ID_SALA; i++) id += ALFABETO_ID_SALA[randomInt(ALFABETO_ID_SALA.length)];
  return id;
}

function aIso(valor: unknown): string {
  return valor instanceof Timestamp ? valor.toDate().toISOString() : "";
}

function aSala(id: string, data: Record<string, unknown>): Sala {
  return {
    id,
    nombre: typeof data.nombre === "string" ? data.nombre : "",
    anfitrionUid: typeof data.anfitrionUid === "string" ? data.anfitrionUid : "",
    creadoEn: aIso(data.creadoEn),
  };
}

function esYaExiste(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === YA_EXISTE;
}

/** Crea la sala con un ID único. El anfitrión queda como primer miembro. */
export async function crearSala(nombre: string, anfitrionUid: string): Promise<Sala> {
  for (let intento = 1; intento <= INTENTOS_ID; intento++) {
    const id = generarIdSala();
    const ahora = Timestamp.now();
    try {
      await salas().doc(id).create({
        id,
        nombre,
        anfitrionUid,
        miembros: [anfitrionUid],
        creadoEn: ahora,
        actualizadoEn: ahora,
      });
      return { id, nombre, anfitrionUid, creadoEn: ahora.toDate().toISOString() };
    } catch (error) {
      if (!esYaExiste(error)) throw error;
      // Ese ID ya estaba tomado (muy poco probable): se intenta con otro.
    }
  }
  throw new Error(`No se encontró un ID libre para la sala tras ${INTENTOS_ID} intentos`);
}

/** Solo las salas que creó este usuario, de la más nueva a la más vieja. */
export async function listarSalasDe(anfitrionUid: string): Promise<Sala[]> {
  // Se ordena en memoria para no necesitar un índice compuesto en Firestore.
  const snapshot = await salas().where("anfitrionUid", "==", anfitrionUid).get();
  return snapshot.docs
    .map((doc) => aSala(doc.id, doc.data()))
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

export async function buscarSala(id: string): Promise<Sala | null> {
  const snapshot = await salas().doc(id).get();
  if (!snapshot.exists) return null;
  return aSala(snapshot.id, snapshot.data() ?? {});
}

export async function renombrarSala(id: string, nombre: string): Promise<void> {
  await salas().doc(id).update({ nombre, actualizadoEn: FieldValue.serverTimestamp() });
}

/** Borra la sala y TODOS sus mensajes (subcolección), para no dejar datos huérfanos. */
export async function eliminarSala(id: string): Promise<void> {
  await db.recursiveDelete(salas().doc(id));
}

/** US-05 · IDs de las salas que creó el usuario. */
export async function idsSalasDe(anfitrionUid: string): Promise<string[]> {
  const snapshot = await salas().where("anfitrionUid", "==", anfitrionUid).select().get();
  return snapshot.docs.map((doc) => doc.id);
}

/** US-05 · IDs de las salas de otros en las que el usuario es miembro. */
export async function idsSalasDondeEsInvitado(uid: string): Promise<string[]> {
  const snapshot = await salas().where("miembros", "array-contains", uid).select("anfitrionUid").get();
  return snapshot.docs.filter((doc) => doc.get("anfitrionUid") !== uid).map((doc) => doc.id);
}

export const AUTOR_ELIMINADO = "Usuario eliminado";

/**
 * US-05 · En una sala ajena: saca al usuario de `miembros` y deja sus mensajes como
 * «Usuario eliminado» (sin uid). La conversación de los demás se conserva y no quedan
 * referencias a una cuenta que ya no existe.
 */
export async function sacarDeSalaYAnonimizar(salaId: string, uid: string): Promise<number> {
  const refSala = salas().doc(salaId);
  const mensajes = await refSala.collection("messages").where("autorUid", "==", uid).get();

  const escritor = db.bulkWriter(); // agrupa las escrituras (más de 500 si hace falta)
  for (const doc of mensajes.docs) {
    escritor.update(doc.ref, { autorUid: null, autorUsername: AUTOR_ELIMINADO, autorEliminado: true });
  }
  escritor.update(refSala, {
    miembros: FieldValue.arrayRemove(uid),
    actualizadoEn: FieldValue.serverTimestamp(),
  });
  await escritor.close();
  return mensajes.size;
}
