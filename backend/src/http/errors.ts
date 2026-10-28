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
  // Body that isn't valid JSON (express.json).
  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ message: "JSON inválido no corpo da requisição." });
    return;
  }
  console.error(error);
  res.status(500).json({ message: "Erro interno. Tente novamente em instantes." });
};
