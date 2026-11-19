import { Router } from "express";
import {
  crearSalaHandler,
  editarSalaHandler,
  eliminarSalaHandler,
  misSalasHandler,
  verSalaHandler,
} from "../controllers/rooms.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export const roomsRouter = Router();

// Todas las rutas de salas son privadas (sin sesión → 401).
roomsRouter.use(requireAuth);

roomsRouter.post("/", crearSalaHandler);
roomsRouter.get("/", misSalasHandler);
roomsRouter.get("/:id", verSalaHandler);
// Solo el anfitrión (otro usuario → 403 FORBIDDEN)
roomsRouter.patch("/:id", editarSalaHandler);
roomsRouter.delete("/:id", eliminarSalaHandler);
