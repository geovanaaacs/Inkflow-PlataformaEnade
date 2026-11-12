import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

/**
 * Error with an HTTP status and a message safe to show to the user. The front
 * turns `{ message }` + status into its ApiError — same as the mocks did.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** SQL error number 50400–50499 (THROW in the database) → HTTP status 400–499 + message. */
export function sqlBusinessError(error: unknown): { status: number; message: string } | null {
  const candidates = [error, (error as { originalError?: unknown })?.originalError];
  for (const candidate of candidates) {
    const info = candidate as { number?: unknown; code?: unknown; message?: unknown } | undefined;
    const number = Number(info?.number ?? info?.code);
    if (Number.isInteger(number) && number >= 50400 && number <= 50499) {
      // ODBC prefixes the message with "[Microsoft][ODBC Driver 18 for SQL Server][SQL Server]".
      const message = String(info?.message ?? "").replace(/^(\[[^\]]+\])+\s*/, "");
      return { status: number - 50000, message };
    }
  }
  return null;
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ message: "Rota não encontrada." });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({ message: error.issues[0]?.message ?? "Dados inválidos." });
    return;
  }
  // Business rule broken inside a stored procedure or trigger: THROW 50400–50499
  // (database/11_procedures_triggers.sql) → HTTP 400–499 with the same message.
  const sqlError = sqlBusinessError(error);
  if (sqlError) {
    res.status(sqlError.status).json({ message: sqlError.message });
    return;
  }
  // Body that isn't valid JSON (express.json).
  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ message: "JSON inválido no corpo da requisição." });
    return;
  }
  console.error(error);
  res.status(500).json({ message: "Erro interno. Tente novamente em instantes." });
};
