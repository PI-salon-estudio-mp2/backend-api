import { getBaseTecnica, BaseTecnicaDoc } from "../repositories/config.repository";
import { AppError } from "../utils/AppError";

export async function obtenerBaseTecnica(): Promise<{ mensaje: string }> {
  let doc: BaseTecnicaDoc | null;

  try {
    doc = await getBaseTecnica();
  } catch (error) {
    console.error("Error leyendo Firestore:", error);
    throw new AppError(503, "No se pudo conectar con la base de datos", "DB_UNAVAILABLE");
  }

  if (!doc) {
    throw new AppError(404, "No existe el dato de la base técnica", "NOT_FOUND");
  }
  if (typeof doc.mensaje !== "string") {
    throw new AppError(500, "El dato de la base técnica es inválido", "INVALID_DATA");
  }

  return { mensaje: doc.mensaje };
}