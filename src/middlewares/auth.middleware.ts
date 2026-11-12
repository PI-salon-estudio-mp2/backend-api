import { NextFunction, Request, Response } from "express";
import { auth } from "../config/firebase";
import { AppError } from "../utils/AppError";

/** Datos del usuario que vienen dentro del ID token de Firebase ya verificado. */
export interface UsuarioAutenticado {
  uid: string;
  correo: string;
  /** Claim `name` (en Google: nombre completo de la cuenta). */
  nombre: string;
  /** Claim `picture` (en Google: URL https de la foto). */
  foto: string;
  /** `password` o `google.com`. */
  proveedor: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}

const MENSAJE_401 = "Tu sesión no es válida o expiró. Inicia sesión de nuevo.";

/** Errores del Admin SDK que significan «no pude verificar» y NO «el token es inválido». */
const ERRORES_DE_SERVICIO = new Set(["app/network-error", "auth/internal-error"]);

function codigoDe(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return "";
}

/**
 * Protege las rutas privadas: exige «Authorization: Bearer <ID token de Firebase>»
 * y lo verifica con el Admin SDK. Sin sesión válida responde 401 UNAUTHORIZED.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Las respuestas con datos privados no se guardan en la caché del navegador.
  res.setHeader("Cache-Control", "no-store");

  const token = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? "")?.[1]?.trim();
  if (!token) {
    return next(new AppError(401, MENSAJE_401, "UNAUTHORIZED"));
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    req.usuario = {
      uid: decoded.uid,
      correo: decoded.email ?? "",
      nombre: typeof decoded.name === "string" ? decoded.name : "",
      foto: decoded.picture ?? "",
      proveedor: decoded.firebase?.sign_in_provider ?? "",
    };
    return next();
  } catch (error) {
    if (ERRORES_DE_SERVICIO.has(codigoDe(error))) {
      console.error("No se pudo verificar el token con Firebase:", error);
      return next(
        new AppError(
          503,
          "No pudimos verificar tu sesión en este momento. Inténtalo de nuevo en unos segundos.",
          "AUTH_UNAVAILABLE"
        )
      );
    }
    return next(new AppError(401, MENSAJE_401, "UNAUTHORIZED"));
  }
}

/** Devuelve el usuario que dejó requireAuth (o 401 si la ruta no lo usó). */
export function usuarioDe(req: Request): UsuarioAutenticado {
  if (!req.usuario) throw new AppError(401, MENSAJE_401, "UNAUTHORIZED");
  return req.usuario;
}
