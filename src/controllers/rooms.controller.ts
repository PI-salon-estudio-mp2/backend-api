import { Request, Response } from "express";
import { usuarioDe } from "../middlewares/auth.middleware";
import { borrarSala, crearSalaPara, editarSala, misSalas, verSala } from "../services/rooms.service";

// Express 5 envía al errorHandler los errores de las funciones async.

/** POST /api/rooms (US-06) */
export async function crearSalaHandler(req: Request, res: Response) {
  const { sala, nueva } = await crearSalaPara(usuarioDe(req).uid, req.body);
  // 201 si se creó ahora; 200 si era un reintento de la misma solicitud (misma sala).
  res.status(nueva ? 201 : 200).json({ data: sala });
}

/** GET /api/rooms (US-06): solo las salas del usuario */
export async function misSalasHandler(req: Request, res: Response) {
  const data = await misSalas(usuarioDe(req).uid);
  res.json({ data });
}

/** GET /api/rooms/:id */
export async function verSalaHandler(req: Request, res: Response) {
  const data = await verSala(usuarioDe(req).uid, req.params.id);
  res.json({ data });
}

/** PATCH /api/rooms/:id (solo anfitrión) */
export async function editarSalaHandler(req: Request, res: Response) {
  const data = await editarSala(usuarioDe(req).uid, req.params.id, req.body);
  res.json({ data });
}

/** DELETE /api/rooms/:id (solo anfitrión) */
export async function eliminarSalaHandler(req: Request, res: Response) {
  await borrarSala(usuarioDe(req).uid, req.params.id);
  res.status(204).end();
}
