import { Request, Response } from "express";
import { usuarioDe } from "../middlewares/auth.middleware";
import {
  completarPerfilConUsername,
  consultarUsername,
  obtenerPerfil,
} from "../services/users.service";

// Express 5 envía al errorHandler los errores de las funciones async,
// por eso estos controladores no necesitan try/catch.

/** GET /api/users/username-disponible?username= (público) */
export async function usernameDisponibleHandler(req: Request, res: Response) {
  const data = await consultarUsername(req.query.username);
  res.json({ data });
}

/** GET /api/users/me (privado) */
export async function miPerfilHandler(req: Request, res: Response) {
  const data = await obtenerPerfil(usuarioDe(req).uid);
  res.json({ data });
}

/** POST /api/users/me/username (privado, US-02) */
export async function elegirUsernameHandler(req: Request, res: Response) {
  const data = await completarPerfilConUsername(usuarioDe(req), req.body);
  res.status(201).json({ data });
}
