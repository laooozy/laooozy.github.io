/**
 * Search hook — a debounced, race-guarded query loop over the injected Pagefind
 * port, with all overlay state living in the store.
 *
 * The loop is extracted into `createSearchEngine` (no React) so it can be
 * driven directly in tests. Behaviour:
 *  - debounce ~160 ms, so a fast typist issues one query;
 *  - a monotonic sequence number, so a slow earlier query can never overwrite a
 *    newer one (stale results are dropped);
 *  - the store's search `epoch` is captured with each run, so a result that
 *    resolves after the palette closed (or reopened) is dropped;
 *  - status moves `searching` -> `results` / `empty`, and an adapter rejection
 *    is caught and surfaced as `error` — never thrown into render;
 *  - recent queries live in the store and are hydrated/persisted here through
 *    the injected `StoragePort`.
 */

import { useCallback, useEffect, useRef } from "react";
import { useStore } from "zustand";

import type { StoragePort } from "@/adapters/storage";
import { useClientDeps } from "@/components/shared/ClientDepsContext";
import type { SearchResult, SearchStatus } from "@/lib/domain/search";
import {
  parseRecentSearches,
  RECENT_SEARCH_STORAGE_KEY,
  serializeRecentSearches,
} from "@/lib/domain/search-recents";

import type { ClientDeps } from "./deps";

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

/** What `useSearch` returns: overlay state + actions. */
export interface SearchController {
  open: boolean;
  query: string;
  status: SearchStatus;
  results: SearchResult[];
  recent: string[];
  openSearch: () => void;
  closeSearch: () => void;
  setQuery: (query: string) => void;
  recordRecent: (query: string) => void;
  clearRecent: () => void;
}

interface EngineRef {
  deps: ClientDeps;
  engine: SearchEngine;
}

export function useSearch(
  debounceMs: number = SEARCH_DEBOUNCE_MS,
): SearchController {
  const deps = useClientDeps();
  const open = useStore(deps.store, (state) => state.search.open);
  const query = useStore(deps.store, (state) => state.search.query);
  const status = useStore(deps.store, (state) => state.search.status);
  const results = useStore(deps.store, (state) => state.search.results);
  const recent = useStore(deps.store, (state) => state.search.recent);

  const engineRef = useRef<EngineRef | null>(null);
  if (engineRef.current === null || engineRef.current.deps !== deps) {
    engineRef.current = { deps, engine: createSearchEngine(deps, debounceMs) };
  }
  const engine = engineRef.current.engine;

  useEffect(() => {
    engine.run(query);
  }, [engine, query]);

  useEffect(() => {
    if (!open) return;
    deps.store
      .getState()
      .setRecentSearches(readRecentSearches(deps.adapters.storage));
  }, [deps, open]);

  useEffect(() => () => engine.dispose(), [engine]);

  const openSearch = useCallback(() => {
    deps.store.getState().openSearch();
  }, [deps]);

  const closeSearch = useCallback(() => {
    deps.store.getState().closeSearch();
  }, [deps]);

  const setQuery = useCallback(
    (next: string) => deps.store.getState().setSearchQuery(next),
    [deps],
  );

  const recordRecent = useCallback(
    (value: string) => {
      deps.store.getState().addRecentSearch(value);
      writeRecentSearches(
        deps.adapters.storage,
        deps.store.getState().search.recent,
      );
    },
    [deps],
  );

  const clearRecent = useCallback(() => {
    deps.store.getState().clearRecentSearches();
    clearPersistedRecentSearches(deps.adapters.storage);
  }, [deps]);

  return {
    open,
    query,
    status,
    results,
    recent,
    openSearch,
    closeSearch,
    setQuery,
    recordRecent,
    clearRecent,
  };
}
