import { Router } from "express";
import { registrarHandler } from "../controllers/auth.controller";

export const authRouter = Router();

// Pública: todavía no hay sesión (la cuenta se crea aquí).
authRouter.post("/registro", registrarHandler);
