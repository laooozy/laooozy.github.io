/**
 * Search hook — the React binding over the shared search engine.
 *
 * The debounced, race-guarded query loop and the recent-query storage helpers
 * live in `./search-engine` (no React). This module only wires them into the
 * store and exposes the overlay state + actions to the UI.
 */

import { useCallback, useEffect, useRef } from "react";
import { useStore } from "zustand";

import { useClientDeps } from "@/components/shared/ClientDepsContext";
import type { SearchResult, SearchStatus } from "@/lib/domain/search";

import type { ClientDeps } from "./deps";
import {
  clearPersistedRecentSearches,
  createSearchEngine,
  readRecentSearches,
  SEARCH_DEBOUNCE_MS,
  type SearchEngine,
  writeRecentSearches,
} from "./search-engine";

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
