import { Router } from "express";
import {
  elegirUsernameHandler,
  miPerfilHandler,
  usernameDisponibleHandler,
} from "../controllers/users.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export const usersRouter = Router();

// Pública
usersRouter.get("/username-disponible", usernameDisponibleHandler);

// Privadas: requireAuth verifica el ID token de Firebase (sin sesión → 401)
usersRouter.get("/me", requireAuth, miPerfilHandler);
usersRouter.post("/me/username", requireAuth, elegirUsernameHandler);
