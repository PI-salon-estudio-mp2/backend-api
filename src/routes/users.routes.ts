import { Router } from "express";
import {
  editarPerfilHandler,
  eliminarCuentaHandler,
  elegirUsernameHandler,
  miPerfilHandler,
  usernameDisponibleHandler,
} from "../controllers/users.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { soloSuPropioUsuario } from "../middlewares/ownership.middleware";

export const usersRouter = Router();

// Pública
usersRouter.get("/username-disponible", usernameDisponibleHandler);

// Privadas: requireAuth verifica el ID token de Firebase (sin sesión → 401)
usersRouter.get("/me", requireAuth, miPerfilHandler);
usersRouter.patch("/me", requireAuth, editarPerfilHandler);
usersRouter.delete("/me", requireAuth, eliminarCuentaHandler);
usersRouter.post("/me/username", requireAuth, elegirUsernameHandler);

// Por uid: solo el dueño del perfil (otro uid → 403 FORBIDDEN). Van después de /me.
usersRouter.get("/:uid", requireAuth, soloSuPropioUsuario, miPerfilHandler);
usersRouter.patch("/:uid", requireAuth, soloSuPropioUsuario, editarPerfilHandler);
usersRouter.delete("/:uid", requireAuth, soloSuPropioUsuario, eliminarCuentaHandler);
