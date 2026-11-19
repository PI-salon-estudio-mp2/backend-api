import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { usuarioDe } from "./auth.middleware";

export const MENSAJE_403_USUARIO =
  "No tienes permiso para ver ni modificar los datos de otro usuario.";

/**
 * Rutas /api/users/:uid — cada usuario solo puede ver o modificar SU propio perfil.
 * Va después de requireAuth: compara el :uid de la URL con el uid del ID token verificado.
 * Si no coinciden responde 403 FORBIDDEN y no se toca nada.
 */
export function soloSuPropioUsuario(req: Request, _res: Response, next: NextFunction) {
  const { uid } = usuarioDe(req);
  if (req.params.uid !== uid) {
    return next(new AppError(403, MENSAJE_403_USUARIO, "FORBIDDEN"));
  }
  return next();
}
