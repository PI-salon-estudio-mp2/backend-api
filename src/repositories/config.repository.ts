import { db } from "../config/firebase";

export interface BaseTecnicaDoc {
  mensaje?: unknown;
}

export async function getBaseTecnica(): Promise<BaseTecnicaDoc | null> {
  const snapshot = await db.collection("config").doc("base-tecnica").get();
  if (!snapshot.exists) return null;
  return snapshot.data() as BaseTecnicaDoc;
}