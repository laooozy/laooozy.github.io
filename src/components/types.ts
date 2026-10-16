/**
 * Shared prop shapes for reusable UI.
 *
 * These interfaces are the single source of truth for the prop objects that
 * were previously re-declared in each component. Keeping them in one place
 * means a consumer that builds a filter list, a chip row, or a paginator can
 * type-check against the exact shape its component expects.
 */

/** A control-style link (filter chip, pagination atom). `href` is required. */
export interface FilterLink {
  label: string;
  href: string;
  active?: boolean;
}

/** A chip entry; `href` is optional so the same row serves labels and links. */
export interface ChipItem {
  label: string;
  href?: string;
  active?: boolean;
}

/** Build-time paginator state for a listing. */
export interface Pagination {
  currentPage: number;
  lastPage: number;
  url: { prev?: string; next?: string };
}
