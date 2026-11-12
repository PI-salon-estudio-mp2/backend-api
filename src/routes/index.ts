import { Router } from "express";
import { authRouter } from "./auth.routes";
import { baseTecnicaRouter } from "./base-tecnica.routes";
import { usersRouter } from "./users.routes";

export const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/api/base-tecnica", baseTecnicaRouter);
router.use("/api/auth", authRouter);
router.use("/api/users", usersRouter);
