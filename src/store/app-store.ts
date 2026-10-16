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

import { createStore } from "zustand/vanilla";

import { defaultLang } from "@/i18n";

import type { AppStore } from "./types";

export type {
  AppActions,
  AppState,
  AppStore,
  SearchResult,
  SearchState,
  SearchStatus,
} from "./types";

/** Reactive store singleton shared by every island and vanilla consumer. */
export const appStore = createStore<AppStore>()((set) => ({
  // The pre-paint boot (a later task) hydrates this from storage/navigator;
  // the store itself only owns the default.
  locale: defaultLang,
  headerHidden: false,
  search: {
    open: false,
    query: "",
    status: "idle",
    results: [],
  },

  setLocale: (locale) => set({ locale }),

  setHeaderHidden: (hidden) => set({ headerHidden: hidden }),

  openSearch: () =>
    set((state) => ({ search: { ...state.search, open: true } })),

  closeSearch: () =>
    set((state) => ({ search: { ...state.search, open: false } })),

  setSearchQuery: (query) =>
    set((state) => ({ search: { ...state.search, query } })),

  setSearchStatus: (status) =>
    set((state) => ({ search: { ...state.search, status } })),

  setSearchResults: (results) =>
    set((state) => ({ search: { ...state.search, results } })),
}));
