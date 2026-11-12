/**
 * Error controlado de la API. El errorHandler lo convierte en:
 *   { "error": { "code", "message", "fields"? } }
 * `fields` lleva un mensaje por campo cuando se rechaza un formulario
 * (el frontend lo muestra junto a cada campo).
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = "ERROR",
    public fields?: Record<string, string>
  ) {
    super(message);
    this.name = "AppError";
  }
}
