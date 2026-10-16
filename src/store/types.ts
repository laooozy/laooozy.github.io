/**
 * Client store types — pure, framework-free.
 *
 * These describe the ONE module-scope state tree (locale + UI flags + search
 * state) that every island and vanilla client shares. No React, no DOM, no
 * browser globals: adapters hydrate values into the store, the store never
 * reaches out.
 */

import type { Locale } from "@/i18n";

/** A single search hit, minimal on purpose so it stays serialisable. */
export interface SearchResult {
  url: string;
  title: string;
  excerpt?: string;
}

/** Lifecycle of the search overlay. */
export type SearchStatus = "idle" | "searching" | "results" | "empty" | "error";

/** Search slice of the store. */
export interface SearchState {
  /** Whether the search overlay is mounted/open. */
  open: boolean;
  /** Current raw query string. */
  query: string;
  /** Derived lifecycle status of the current query. */
  status: SearchStatus;
  /** Results for the current query. */
  results: SearchResult[];
}

/** The full application state tree. */
export interface AppState {
  /** Active UI locale; hydrated by the pre-paint boot from storage/`navigator`. */
  locale: Locale;
  /** Whether the site header is currently hidden (scroll direction). */
  headerHidden: boolean;
  /** Search overlay state. */
  search: SearchState;
}

/** Typed, immutable state transitions. */
export interface AppActions {
  setLocale(locale: Locale): void;
  setHeaderHidden(hidden: boolean): void;
  openSearch(): void;
  closeSearch(): void;
  setSearchQuery(query: string): void;
  setSearchStatus(status: SearchStatus): void;
  setSearchResults(results: SearchResult[]): void;
}

/** Store shape consumed by `createStore`: state + actions. */
export type AppStore = AppState & AppActions;
