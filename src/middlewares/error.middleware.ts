import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

export function notFound(req: Request, res: Response) {
  res.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `La ruta ${req.method} ${req.originalUrl} no existe`,
    },
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
  }

  console.error("Error no controlado:", err);
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" },
  });
}