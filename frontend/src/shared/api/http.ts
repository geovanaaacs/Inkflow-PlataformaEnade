import { ApiError } from "./api-error";

/**
 * HTTP client for the Inkflow API (backend/). Only feature `api.ts` files use it.
 *
 * Every route lives under /api; in development Vite proxies it to the Express
 * server, so the session cookie (httpOnly, same origin) is sent automatically.
 * Error responses come as `{ message }` with the HTTP status and turn into
 * ApiError, so screens show the server's message as they did with the mocks.
 */

const BASE_URL = "/api";

/** Fired when the server says the session is gone, so the app can log out. */
export const SESSION_EXPIRED_EVENT = "inkflow:session-expired";

type QueryValue = string | number | boolean | null | undefined;

/** Builds "?a=1&b=2", skipping empty values. */
export function queryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(BASE_URL + path, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Verifique sua conexão.", 0);
  }

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Not JSON (e.g. the proxy's own error page when the API is down).
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : response.status >= 500
          ? "O servidor não respondeu como esperado. Tente novamente em instantes."
          : "Algo deu errado. Tente novamente.";
    if (response.status === 401 && path !== "/auth/login") {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw new ApiError(message, response.status);
  }
  return data as T;
}

export const http = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T = void>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  put: <T = void>(path: string, body?: unknown) => request<T>("PUT", path, body ?? {}),
  patch: <T = void>(path: string, body?: unknown) => request<T>("PATCH", path, body ?? {}),
  delete: <T = void>(path: string) => request<T>("DELETE", path),
};
