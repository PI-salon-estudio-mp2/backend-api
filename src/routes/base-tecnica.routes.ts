import { Router } from "express";
import { getBaseTecnicaHandler } from "../controllers/base-tecnica.controller";

export const baseTecnicaRouter = Router();

baseTecnicaRouter.get("/", getBaseTecnicaHandler);