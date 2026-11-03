import { Router } from "express";
import { baseTecnicaRouter } from "./base-tecnica.routes";

export const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/api/base-tecnica", baseTecnicaRouter);