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

/** Tipo de error que lanza express.json() cuando el cuerpo no se puede leer. */
function tipoErrorDelCuerpo(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const tipo = (err as { type?: unknown }).type;
  return typeof tipo === "string" ? tipo : undefined;
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    // Los 4xx (401, 404, 409, 400...) son respuestas esperadas: no se registran como error
    // para que los logs de Render queden limpios durante la revisión.
    if (err.statusCode >= 500) {
      console.error(`[${req.method} ${req.originalUrl}] ${err.code}: ${err.message}`);
    }
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.fields ? { fields: err.fields } : {}),
      },
    });
  }

  const tipo = tipoErrorDelCuerpo(err);
  if (tipo === "entity.parse.failed") {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "El cuerpo de la petición no es un JSON válido.",
      },
    });
  }
  if (tipo === "entity.too.large") {
    return res.status(413).json({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Los datos enviados son demasiado grandes.",
      },
    });
  }

  console.error("Error no controlado:", err);
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" },
  });
}
