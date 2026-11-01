/**
 * The single client state manager.
 *
 * A module-scope Zustand store built with `createStore` from `zustand/vanilla`
 * — deliberately NOT the React `create` — so it is usable OUTSIDE React (vanilla
 * client code, event handlers, pre-paint boot) and carries no React dependency.
 * Islands read/write the same singleton through `appStore`.
 *
 * The store is pure state: it NEVER touches `window`, `document`,
 * `localStorage`, or `navigator`. Adapters do that and push values in via the
 * actions, so the store stays deterministic and testable without a DOM.
 */

import { createStore, type StoreApi } from "zustand/vanilla";

import { DEFAULT_LOCALE } from "@/i18n";
import {
  normalizeRecentSearches,
  pushRecentSearch,
} from "@/lib/domain/search-recents";

import type { AppStore, SearchState } from "./types";

export type { AppActions, AppState, AppStore, SearchState } from "./types";

/**
 * Create an isolated store with the production state machine.
 *
 * The app has exactly one shared singleton (`appStore` below), but tests need
 * independent instances so one suite's locale or search state cannot leak into
 * another. The initializer is identical either way, so the factory stays the
 * single definition of the transitions.
 */
export function createAppStore(): StoreApi<AppStore> {
  return createStore<AppStore>()((set) => ({
    // The pre-paint boot and bootstrap seed this from storage/navigator;
    // the store itself only owns the default.
    locale: DEFAULT_LOCALE,
    headerHidden: false,
    headerMenuOpen: false,
    search: {
      open: false,
      query: "",
      status: "idle",
      results: [],
      recent: [],
      epoch: 0,
    },

    setLocale: (locale) => set({ locale }),

    setHeaderHidden: (hidden) => set({ headerHidden: hidden }),

    setHeaderMenuOpen: (open) => set({ headerMenuOpen: open }),

    openSearch: () =>
      set((state) => ({ search: resetSearch(state.search, true) })),

    closeSearch: () =>
      set((state) => ({ search: resetSearch(state.search, false) })),

    setSearchQuery: (query) =>
      set((state) => ({ search: { ...state.search, query } })),

    setSearchStatus: (status) =>
      set((state) => ({ search: { ...state.search, status } })),

    setSearchResults: (results) =>
      set((state) => ({ search: { ...state.search, results } })),

    setRecentSearches: (recent) =>
      set((state) => ({
        search: { ...state.search, recent: normalizeRecentSearches(recent) },
      })),

    addRecentSearch: (query) =>
      set((state) => ({
        search: {
          ...state.search,
          recent: pushRecentSearch(state.search.recent, query),
        },
      })),

    clearRecentSearches: () =>
      set((state) => ({ search: { ...state.search, recent: [] } })),
  }));
}

/** Reactive store singleton shared by every island and vanilla consumer. */
export const appStore = createAppStore();

function resetSearch(state: SearchState, open: boolean): SearchState {
  return {
    ...state,
    open,
    query: "",
    status: "idle",
    results: [],
    epoch: state.epoch + 1,
  };
}
