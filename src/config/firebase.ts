import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { env } from "./env";

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: env.firebase.projectId,
      clientEmail: env.firebase.clientEmail,
      privateKey: env.firebase.privateKey,
    }),
  });
}

/** Firestore con el Admin SDK (no está sujeto a las reglas de seguridad). */
export const db = getFirestore();

/** Firebase Authentication con el Admin SDK: verifica tokens y crea cuentas. */
export const auth = getAuth();
