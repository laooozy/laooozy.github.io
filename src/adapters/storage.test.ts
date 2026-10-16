/**
 * Unit tests for the storage port and its in-memory double.
 *
 * `localStorageAdapter` is a module-scope singleton that resolves its backing
 * store lazily and caches the result, so each scenario re-imports the module via
 * `vi.resetModules()` to start from an unresolved backing. `localStorage` is
 * stubbed per case and the original global is restored afterwards.
 *
 * The contract under test: the port NEVER throws. When `localStorage` is
 * missing, inaccessible, or its methods throw, every operation degrades to an
 * in-memory map so callers stay branch-free.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { memoryStorageAdapter } from "@/adapters/storage";
import type { StoragePort } from "@/adapters/storage";

const originalLocalStorage = Object.getOwnPropertyDescriptor(
  globalThis,
  "localStorage",
);

function restoreLocalStorage(): void {
  if (originalLocalStorage) {
    Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
  } else {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  }
}

/** Fresh adapter instance whose cached backing resolution starts from scratch. */
async function freshLocalStorageAdapter(): Promise<StoragePort> {
  vi.resetModules();
  const mod = await import("@/adapters/storage");
  return mod.localStorageAdapter;
}

function defineLocalStorage(descriptor: PropertyDescriptor): void {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    ...descriptor,
  });
}

/** A `Storage` whose every method/getter throws, mimicking a locked-down origin. */
function throwingStorage(): Storage {
  return {
    getItem() {
      throw new Error("SecurityError");
    },
    setItem() {
      throw new Error("QuotaExceededError");
    },
    removeItem() {
      throw new Error("SecurityError");
    },
    clear() {
      throw new Error("SecurityError");
    },
    key() {
      throw new Error("SecurityError");
    },
    get length(): number {
      throw new Error("SecurityError");
    },
  } as unknown as Storage;
}

/** A minimal working `Storage` backed by a Map. */
function mapStorage(): { storage: Storage; map: Map<string, string> } {
  const map = new Map<string, string>();
  const storage: Storage = {
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
    key: (index) => Array.from(map.keys())[index] ?? null,
    get length(): number {
      return map.size;
    },
  };
  return { storage, map };
}

afterEach(() => {
  restoreLocalStorage();
  vi.restoreAllMocks();
});

describe("memoryStorageAdapter", () => {
  it("round-trips a value and removes it", () => {
    const storage = memoryStorageAdapter();

    expect(storage.get("k")).toBeNull();
    storage.set("k", "v");
    expect(storage.get("k")).toBe("v");
    storage.remove("k");
    expect(storage.get("k")).toBeNull();
  });

  it("isolates state between instances", () => {
    const a = memoryStorageAdapter();
    const b = memoryStorageAdapter();

    a.set("k", "v");

    expect(a.get("k")).toBe("v");
    expect(b.get("k")).toBeNull();
  });
});

describe("localStorageAdapter", () => {
  it("delegates to a working localStorage when available", async () => {
    const { storage, map } = mapStorage();
    defineLocalStorage({ value: storage });
    const adapter = await freshLocalStorageAdapter();

    adapter.set("k", "v");
    expect(adapter.get("k")).toBe("v");
    expect(map.get("k")).toBe("v");

    adapter.remove("k");
    expect(adapter.get("k")).toBeNull();
    expect(map.has("k")).toBe(false);
  });

  it("degrades to memory and never throws when localStorage methods throw", async () => {
    defineLocalStorage({ value: throwingStorage() });
    const adapter = await freshLocalStorageAdapter();

    expect(() => adapter.set("k", "v")).not.toThrow();
    expect(adapter.get("k")).toBe("v");
    expect(() => adapter.remove("k")).not.toThrow();
    expect(adapter.get("k")).toBeNull();
    expect(adapter.get("absent")).toBeNull();
  });

  it("degrades to memory when reading localStorage itself throws", async () => {
    defineLocalStorage({
      get() {
        throw new Error("SecurityError");
      },
    });
    const adapter = await freshLocalStorageAdapter();

    expect(() => adapter.set("k", "v")).not.toThrow();
    expect(adapter.get("k")).toBe("v");
    expect(adapter.get("absent")).toBeNull();
  });

  it("degrades to memory when localStorage is undefined", async () => {
    defineLocalStorage({ value: undefined });
    const adapter = await freshLocalStorageAdapter();

    expect(() => adapter.set("k", "v")).not.toThrow();
    expect(adapter.get("k")).toBe("v");
  });
});
