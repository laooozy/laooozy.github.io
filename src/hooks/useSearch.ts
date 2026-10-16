/**
 * Search hook — a debounced, race-guarded query loop over the injected Pagefind
 * port, with all overlay state living in the store.
 *
 * The loop is extracted into `createSearchEngine` (no React) so it can be
 * driven directly in tests. Behaviour:
 *  - debounce ~160 ms, so a fast typist issues one query;
 *  - a monotonic sequence number, so a slow earlier query can never overwrite a
 *    newer one (stale results are dropped);
 *  - status moves `searching` -> `results` / `empty`, and an adapter rejection
 *    is caught and surfaced as `error` — never thrown into render.
 */

import { useCallback, useEffect, useRef } from "react";
import { useStore } from "zustand";

import type { SearchResult, SearchStatus } from "@/store/types";

import type { ClientDeps } from "./deps";

/** Query debounce, in milliseconds. */
export const SEARCH_DEBOUNCE_MS = 160;

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

  const execute = async (query: string, mySeq: number): Promise<void> => {
    try {
      const results = await adapters.pagefind.search(query);
      if (mySeq !== seq) return;
      store.getState().setSearchResults(results);
      store
        .getState()
        .setSearchStatus(results.length > 0 ? "results" : "empty");
    } catch {
      if (mySeq !== seq) return;
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
    if (trimmed === "") {
      store.getState().setSearchResults([]);
      store.getState().setSearchStatus("idle");
      return;
    }
    store.getState().setSearchStatus("searching");
    timer = setTimeout(() => {
      timer = null;
      void execute(trimmed, mySeq);
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
  openSearch: () => void;
  closeSearch: () => void;
  setQuery: (query: string) => void;
}

interface EngineRef {
  deps: ClientDeps;
  engine: SearchEngine;
}

export function useSearch(
  deps: ClientDeps,
  debounceMs: number = SEARCH_DEBOUNCE_MS,
): SearchController {
  const open = useStore(deps.store, (state) => state.search.open);
  const query = useStore(deps.store, (state) => state.search.query);
  const status = useStore(deps.store, (state) => state.search.status);
  const results = useStore(deps.store, (state) => state.search.results);

  const engineRef = useRef<EngineRef | null>(null);
  if (engineRef.current === null || engineRef.current.deps !== deps) {
    engineRef.current = { deps, engine: createSearchEngine(deps, debounceMs) };
  }
  const engine = engineRef.current.engine;

  useEffect(() => {
    engine.run(query);
  }, [engine, query]);

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

  return { open, query, status, results, openSearch, closeSearch, setQuery };
}
