/**
 * Search domain contracts — PURE.
 *
 * The store, the Pagefind adapter and the palette view all speak this shape, so
 * it lives here once instead of being redeclared by each layer. No React, no
 * DOM, no runtime imports: the adapter produces it, the store holds it and the
 * view renders it.
 */

/** A single search hit, minimal on purpose so it stays serialisable. */
export interface SearchResult {
  url: string;
  title: string;
  excerpt?: string;
}

/** Lifecycle of the search overlay. */
export type SearchStatus = "idle" | "searching" | "results" | "empty" | "error";
