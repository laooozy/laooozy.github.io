/**
 * Storage adapter — a port over persistent key/value storage.
 *
 * The site speaks only to `StoragePort`; the composition root decides whether
 * the real `localStorageAdapter` or the in-memory `memoryStorageAdapter` double
 * is injected. A port NEVER throws: if `localStorage` is missing, disabled
 * (private mode / sandboxed iframe) or throws mid-write (quota, SecurityError),
 * the adapter transparently degrades to an in-memory map so callers stay
 * branch-free.
 */

/** Minimal key/value port. All methods are total — none throw. */
export interface StoragePort {
  /** Stored string for `key`, or `null` when absent/unavailable. */
  get(key: string): string | null;
  /** Persist `value` under `key`. Silently falls back to memory on failure. */
  set(key: string, value: string): void;
  /** Delete `key`. A no-op when absent. */
  remove(key: string): void;
}

/**
 * Real adapter backed by `window.localStorage`, degrading to an in-memory map.
 *
 * The backing store is resolved lazily once (accessing `localStorage` itself can
 * throw under a sandboxed origin); every operation is individually guarded so a
 * quota error on `set` cannot escape, and reads fall through to the memory map
 * for values that only ever landed there.
 */
function createLocalStorageAdapter(): StoragePort {
  const fallback = new Map<string, string>();
  let backing: Storage | null | undefined;

  const resolve = (): Storage | null => {
    if (backing !== undefined) return backing;
    try {
      backing =
        typeof globalThis.localStorage === "undefined"
          ? null
          : globalThis.localStorage;
    } catch {
      backing = null;
    }
    return backing;
  };

  return {
    get(key) {
      const store = resolve();
      if (store) {
        try {
          const value = store.getItem(key);
          if (value !== null) return value;
        } catch {
          // Fall through to the memory map.
        }
      }
      return fallback.has(key) ? (fallback.get(key) as string) : null;
    },
    set(key, value) {
      const store = resolve();
      if (store) {
        try {
          store.setItem(key, value);
          return;
        } catch {
          // Fall through to the memory map (e.g. quota exceeded).
        }
      }
      fallback.set(key, value);
    },
    remove(key) {
      const store = resolve();
      if (store) {
        try {
          store.removeItem(key);
        } catch {
          // Ignore — removal is best-effort.
        }
      }
      fallback.delete(key);
    },
  };
}

/** Shared real adapter (backed by `localStorage`, memory fallback). */
export const localStorageAdapter: StoragePort = createLocalStorageAdapter();

/**
 * In-memory test double. A factory so every caller gets isolated state — a
 * module-scope singleton would leak writes across tests.
 */
export function memoryStorageAdapter(): StoragePort {
  const store = new Map<string, string>();
  return {
    get: (key) => (store.has(key) ? (store.get(key) as string) : null),
    set: (key, value) => {
      store.set(key, value);
    },
    remove: (key) => {
      store.delete(key);
    },
  };
}
