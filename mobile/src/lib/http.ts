import { API_URL } from "./config";
import { readToken } from "./token-storage";

/**
 * HTTP client for the Inkflow API — the mobile twin of frontend/src/shared/api/http.ts.
 *
 * The session token goes as `Authorization: Bearer <token>`. Errors come from
 * the server as `{ message }` + status and become ApiError, so screens show
 * the server's message as they do on the web.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type QueryValue = string | number | boolean | null | undefined;

/** Builds "?a=1&b=2", skipping empty values. */
export function queryString(params: Record<string, QueryValue>): string {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

/** Called when the server says the session is gone (set by AuthProvider). */
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

/** Routes that answer 401 for wrong credentials, not for an expired session. */
const PUBLIC_AUTH_PATHS = ["/auth/mobile/login", "/auth/mobile/register"];

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await readToken();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(API_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "Não foi possível conectar ao servidor. Confira se a API está rodando e se o celular está na mesma rede do computador.",
      0
    );
  }

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Not JSON (e.g. an HTML error page from a proxy).
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : response.status >= 500
          ? "O servidor não respondeu como esperado. Tente novamente em instantes."
          : "Algo deu errado. Tente novamente.";
    if (response.status === 401 && token && !PUBLIC_AUTH_PATHS.includes(path)) onSessionExpired?.();
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export const http = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T = void>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T = void>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T = void>(path: string) => request<T>("DELETE", path),
};
