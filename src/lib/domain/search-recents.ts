/**
 * Recent-search list — the pure, persistable contract shared by the store, the
 * search hook and the storage-backed persistence helpers.
 *
 * The persisted shape is a JSON string array under ONE key. Parsing is
 * deliberately defensive (anything that is not an array of strings is dropped)
 * and every writer normalises + caps the list, so a hand-edited or corrupted
 * entry can never grow the store or the payload without bound.
 */

/** Storage key for the recent-query list. Single source of truth. */
export const RECENT_SEARCH_STORAGE_KEY = "search:recent";

/** Maximum number of remembered queries (newest first). */
export const RECENT_SEARCH_LIMIT = 5;

/**
 * Normalise an unknown value into a sanitised, de-duplicated, capped list.
 * Entries are trimmed, empty strings and duplicates are dropped, and order is
 * preserved (newest first). Never throws.
 */
export function normalizeRecentSearches(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (trimmed === "" || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= RECENT_SEARCH_LIMIT) break;
  }
  return out;
}

/** Parse a persisted JSON payload into a sanitised list. Never throws. */
export function parseRecentSearches(raw: string | null): string[] {
  if (!raw) return [];
  try {
    return normalizeRecentSearches(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

/** Serialise a list for persistence, normalised and capped. */
export function serializeRecentSearches(list: readonly string[]): string {
  return JSON.stringify(normalizeRecentSearches(list));
}

/** Move `query` to the front, de-duplicated and capped. */
export function pushRecentSearch(
  list: readonly string[],
  query: string,
): string[] {
  const value = query.trim();
  const current = normalizeRecentSearches(list);
  if (value === "") return current;
  if (current[0] === value) return current;
  return normalizeRecentSearches([
    value,
    ...current.filter((entry) => entry !== value),
  ]);
}
