/**
 * Client store types — pure, framework-free.
 *
 * These describe the ONE module-scope state tree (locale + UI flags + search
 * state) that every island and vanilla client shares. No React, no DOM, no
 * browser globals: adapters hydrate values into the store, the store never
 * reaches out.
 */

import type { Locale } from "@/i18n";
import type { SearchResult, SearchStatus } from "@/lib/domain/search";

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
  /** Recent queries, newest first; persisted through the injected storage port. */
  recent: string[];
  /**
   * Monotonic search session id, bumped by open/close. The query loop captures
   * it when a search starts, so a response that resolves after the palette was
   * closed (or reopened) is dropped instead of mutating the store.
   */
  epoch: number;
}

/** The full application state tree. */
export interface AppState {
  /** Active UI locale; hydrated by the pre-paint boot from storage/`navigator`. */
  locale: Locale;
  /** Whether the site header is currently hidden (scroll direction). */
  headerHidden: boolean;
  /**
   * Whether the compact header's disclosure panel is open. The scroll-header
   * guard reads it so the bar never hides while the menu is in use.
   */
  headerMenuOpen: boolean;
  /** Search overlay state. */
  search: SearchState;
}

/** Typed, immutable state transitions. */
export interface AppActions {
  setLocale(locale: Locale): void;
  setHeaderHidden(hidden: boolean): void;
  setHeaderMenuOpen(open: boolean): void;
  openSearch(): void;
  closeSearch(): void;
  setSearchQuery(query: string): void;
  setSearchStatus(status: SearchStatus): void;
  setSearchResults(results: SearchResult[]): void;
  /** Replace the recent-query list (normalised and capped by the store). */
  setRecentSearches(recent: string[]): void;
  /** Record `query` at the front of the recent list, de-duplicated and capped. */
  addRecentSearch(query: string): void;
  /** Drop every recent query. */
  clearRecentSearches(): void;
}

/** Store shape consumed by `createStore`: state + actions. */
export type AppStore = AppState & AppActions;
