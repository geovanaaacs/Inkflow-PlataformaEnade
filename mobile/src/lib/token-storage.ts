import * as SecureStore from "expo-secure-store";

/*
 * Session token from /auth/mobile/login, kept in the device's secure storage
 * (Keychain on iOS, Keystore on Android). Logging out = deleting it.
 */

const TOKEN_KEY = "inkflow.session-token";

export function readToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export function saveToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(TOKEN_KEY, token);
}

export function clearToken(): Promise<void> {
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}
