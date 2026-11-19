import { randomInt } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import { ALFABETO_ID_SALA, LARGO_ID_SALA } from "../validators/rooms.validator";

/**
 * Modelo en Firestore (TS-02):
 *   rooms/{id}                         { id, nombre, anfitrionUid, miembros: [uid], creadoEn, actualizadoEn }
 *   rooms/{id}/messages/{msgId}        { autorUid, autorUsername, texto, creadoEn }   ← lo escribe backend-realtime
 *   roomCreationRequests/{uid_solId}   { anfitrionUid, solicitudId, salaId, nombre, creadoEn }
 *
 * El ID del documento ES el ID de la sala (8 caracteres): la transacción comprueba que no
 * exista antes de crearla, así que es único por construcción.
 * roomCreationRequests hace que crear sea idempotente: si el frontend reintenta la misma
 * solicitud (por ejemplo, tras un timeout), se devuelve la sala ya creada en vez de duplicarla.
 */

export interface Sala {
  id: string;
  nombre: string;
  anfitrionUid: string;
  creadoEn: string; // ISO 8601
}

export type ResultadoCreacionSala =
  | { tipo: "creada"; sala: Sala }
  | { tipo: "existente"; sala: Sala }
  | { tipo: "conflicto" }
  | { tipo: "sin-id" };

const salas = () => db.collection("rooms");
const solicitudes = () => db.collection("roomCreationRequests");

const INTENTOS_ID = 5;

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

/**
 * Crea la sala con un ID único en UNA transacción, junto con el registro de la solicitud.
 * Si la misma solicitud ya se había procesado, devuelve la sala existente (o «conflicto»
 * si el nombre no coincide o la sala ya no existe).
 */
export async function crearSala(
  nombre: string,
  anfitrionUid: string,
  solicitudId: string
): Promise<ResultadoCreacionSala> {
  const refSolicitud = solicitudes().doc(`${anfitrionUid}_${solicitudId}`);

  for (let intento = 1; intento <= INTENTOS_ID; intento++) {
    const id = generarIdSala();
    const refSala = salas().doc(id);

    const resultado = await db.runTransaction(
      async (tx): Promise<ResultadoCreacionSala | { tipo: "id-ocupado" }> => {
        const [snapSolicitud, snapSala] = await tx.getAll(refSolicitud, refSala);

        if (snapSolicitud.exists) {
          const salaId = String(snapSolicitud.get("salaId") ?? "");
          if (snapSolicitud.get("nombre") !== nombre || !salaId) return { tipo: "conflicto" };
          const snapAnterior = await tx.get(salas().doc(salaId));
          if (!snapAnterior.exists) return { tipo: "conflicto" };
          return { tipo: "existente", sala: aSala(snapAnterior.id, snapAnterior.data() ?? {}) };
        }

        if (snapSala.exists) return { tipo: "id-ocupado" };

        const ahora = Timestamp.now();
        tx.create(refSala, {
          id,
          nombre,
          anfitrionUid,
          miembros: [anfitrionUid],
          creadoEn: ahora,
          actualizadoEn: ahora,
        });
        tx.create(refSolicitud, { anfitrionUid, solicitudId, salaId: id, nombre, creadoEn: ahora });
        return { tipo: "creada", sala: { id, nombre, anfitrionUid, creadoEn: ahora.toDate().toISOString() } };
      }
    );

    if (resultado.tipo !== "id-ocupado") return resultado;
    // Ese ID ya estaba tomado (muy poco probable): se intenta con otro.
  }
  return { tipo: "sin-id" };
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

/**
 * US-05 · En una sala ajena: borra los mensajes del usuario y lo saca de `miembros`.
 * La sala y los mensajes de las demás personas se conservan.
 */
export async function sacarDeSalaYBorrarMensajes(salaId: string, uid: string): Promise<number> {
  const refSala = salas().doc(salaId);
  const mensajes = await refSala.collection("messages").where("autorUid", "==", uid).select().get();

  const escritor = db.bulkWriter(); // agrupa las escrituras (más de 500 si hace falta)
  for (const doc of mensajes.docs) escritor.delete(doc.ref);
  escritor.update(refSala, {
    miembros: FieldValue.arrayRemove(uid),
    actualizadoEn: FieldValue.serverTimestamp(),
  });
  await escritor.close();
  return mensajes.size;
}

/** US-05 · Borra los registros de solicitudes de creación de salas del usuario. */
export async function borrarSolicitudesDe(anfitrionUid: string): Promise<number> {
  const snapshot = await solicitudes().where("anfitrionUid", "==", anfitrionUid).select().get();
  const escritor = db.bulkWriter();
  for (const doc of snapshot.docs) escritor.delete(doc.ref);
  await escritor.close();
  return snapshot.size;
}
