import { NextFunction, Request, Response } from "express";
import { obtenerBaseTecnica } from "../services/base-tecnica.service";

export async function getBaseTecnicaHandler(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await obtenerBaseTecnica();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}