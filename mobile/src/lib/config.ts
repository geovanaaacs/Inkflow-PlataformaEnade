import Constants from "expo-constants";

/** Port of the Express API (API_PORT in backend/.env). */
const API_PORT = 3333;

/**
 * Base URL of the Inkflow API.
 *
 * 1. EXPO_PUBLIC_API_URL (mobile/.env) wins, e.g. "http://192.168.0.10:3333/api"
 *    or the address of a deployed server.
 * 2. In development, the phone reaches the PC through the same IP Expo uses to
 *    serve the app (hostUri = "192.168.0.10:8081"), so the API is assumed to be
 *    on that machine, port 3333.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return `http://${host ?? "localhost"}:${API_PORT}/api`;
}

export const API_URL = resolveApiUrl();
