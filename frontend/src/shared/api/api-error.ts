/**
 * Error thrown by feature `api.ts` functions. Mirrors an HTTP error response
 * (message + status) so UI code handles mock and real API failures the same way.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function errorMessage(error: unknown, fallback = "Algo deu errado. Tente novamente."): string {
  return error instanceof ApiError ? error.message : fallback;
}
