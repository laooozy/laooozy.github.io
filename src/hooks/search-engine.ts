/**
 * Non-React search core: a debounced, race-guarded query loop over the injected
 * Pagefind port, plus the recent-query storage helpers.
 *
 * The loop is extracted from the `useSearch` React binding (no React) so it can
 * be driven directly in tests. Behaviour:
 *  - debounce ~160 ms, so a fast typist issues one query;
 *  - a monotonic sequence number, so a slow earlier query can never overwrite a
 *    newer one (stale results are dropped);
 *  - the store's search `epoch` is captured with each run, so a result that
 *    resolves after the palette closed (or reopened) is dropped;
 *  - status moves `searching` -> `results` / `empty`, and an adapter rejection
 *    is caught and surfaced as `error` — never thrown into render;
 *  - recent queries live in the store and are persisted here through the
 *    injected `StoragePort`.
 */

import type { StoragePort } from "@/adapters/storage";
import type { ClientDeps } from "@/hooks/deps";
import {
  parseRecentSearches,
  RECENT_SEARCH_STORAGE_KEY,
  serializeRecentSearches,
} from "@/lib/domain/search-recents";

/** Query debounce, in milliseconds. */
export const SEARCH_DEBOUNCE_MS = 160;

/** Read the persisted recent-query list through the injected storage port. */
export function readRecentSearches(storage: StoragePort): string[] {
  try {
    return parseRecentSearches(storage.get(RECENT_SEARCH_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function writeRecentSearches(
  storage: StoragePort,
  list: readonly string[],
): void {
  try {
    storage.set(RECENT_SEARCH_STORAGE_KEY, serializeRecentSearches(list));
  } catch {
    // Storage is best-effort; the in-memory list still drives this session.
  }
}

export function clearPersistedRecentSearches(storage: StoragePort): void {
  try {
    storage.remove(RECENT_SEARCH_STORAGE_KEY);
  } catch {
    // Storage is best-effort; removal changes nothing when it fails.
  }
}

/** Imperative query loop; safe to call outside React. */
export interface SearchEngine {
  /** Schedule a (debounced) search for `query`; `""` clears to `idle`. */
  run(query: string): void;
  /** Cancel any pending run and invalidate in-flight results. */
  dispose(): void;
}

export function createSearchEngine(
  deps: ClientDeps,
  debounceMs: number = SEARCH_DEBOUNCE_MS,
): SearchEngine {
  const { store, adapters } = deps;
  let seq = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const isCurrent = (mySeq: number, myEpoch: number): boolean => {
    const search = store.getState().search;
    return mySeq === seq && search.epoch === myEpoch;
  };

  const execute = async (
    query: string,
    mySeq: number,
    myEpoch: number,
  ): Promise<void> => {
    if (!isCurrent(mySeq, myEpoch)) return;
    try {
      const results = await adapters.pagefind.search(query);
      if (!isCurrent(mySeq, myEpoch)) return;
      store.getState().setSearchResults(results);
      store
        .getState()
        .setSearchStatus(results.length > 0 ? "results" : "empty");
    } catch {
      if (!isCurrent(mySeq, myEpoch)) return;
      store.getState().setSearchResults([]);
      store.getState().setSearchStatus("error");
    }
  };

  const run = (query: string): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    const trimmed = query.trim();
    const mySeq = ++seq;
    const myEpoch = store.getState().search.epoch;
    if (trimmed === "") {
      store.getState().setSearchResults([]);
      store.getState().setSearchStatus("idle");
      return;
    }
    store.getState().setSearchStatus("searching");
    timer = setTimeout(() => {
      timer = null;
      void execute(trimmed, mySeq, myEpoch);
    }, debounceMs);
  };

  const dispose = (): void => {
    seq += 1;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return { run, dispose };
}
