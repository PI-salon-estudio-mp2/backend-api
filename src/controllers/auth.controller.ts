import { Request, Response } from "express";
import { registrarUsuario } from "../services/users.service";

// Express 5 envía al errorHandler los errores de las funciones async,
// por eso estos controladores no necesitan try/catch.

/** POST /api/auth/registro (US-01) */
export async function registrarHandler(req: Request, res: Response) {
  const data = await registrarUsuario(req.body);
  res.status(201).json({ data });
}
