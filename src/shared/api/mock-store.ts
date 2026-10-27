/**
 * Mock persistence layer — stands in for the backend while there is no API.
 *
 * Each collection is seeded from a feature's `data.ts` and persisted in
 * localStorage, so anything created while using the app (an account, a note,
 * a teacher's time slot) survives reloads and is visible when logging in as
 * another mock user in the same browser.
 *
 * Only feature `api.ts` files talk to this module. When the real API exists,
 * those files switch to HTTP calls and this module can be deleted.
 */

const PREFIX = "inkflow:mock:";

/** Simulated network latency so screens handle loading states like they will with a real API. */
export function mockDelay(ms = 250): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readCollection<T>(key: string, seed: () => T[]): T[] {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw) return JSON.parse(raw) as T[];
  } catch {
    // Corrupted or unavailable storage: fall back to the seed data.
  }
  const initial = seed();
  writeCollection(key, initial);
  return initial;
}

export function writeCollection<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(items));
  } catch {
    // Storage full or blocked (private mode): changes live only in memory.
  }
}

export function updateCollection<T>(
  key: string,
  seed: () => T[],
  updater: (items: T[]) => T[]
): T[] {
  const next = updater(readCollection(key, seed));
  writeCollection(key, next);
  return next;
}

export function readValue<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeValue<T>(key: string, value: T | null): void {
  try {
    if (value === null) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Ignore storage failures in the mock.
  }
}

/** Wipes every mock collection (and the mock session) back to the seed data. */
export function resetMockData(): void {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Nothing to reset.
  }
}
