import { describe, expect, it } from "vitest";

import {
  normalizeRecentSearches,
  parseRecentSearches,
  pushRecentSearch,
  RECENT_SEARCH_LIMIT,
  serializeRecentSearches,
} from "./search-recents";

describe("recent search payload", () => {
  it("drops non-strings, empty entries and duplicates", () => {
    expect(
      normalizeRecentSearches(["  alpha  ", "alpha", "", "beta", 42, null]),
    ).toEqual(["alpha", "beta"]);
  });

  it("caps the list at the shared limit", () => {
    const list = Array.from({ length: RECENT_SEARCH_LIMIT + 3 }, (_, i) =>
      String(i),
    );
    expect(normalizeRecentSearches(list)).toHaveLength(RECENT_SEARCH_LIMIT);
  });

  it("returns an empty list for malformed persisted data", () => {
    expect(parseRecentSearches(null)).toEqual([]);
    expect(parseRecentSearches("not json")).toEqual([]);
    expect(parseRecentSearches('{"query":"alpha"}')).toEqual([]);
    expect(parseRecentSearches('["alpha", 42]')).toEqual(["alpha"]);
  });

  it("serialises the sanitised list", () => {
    expect(serializeRecentSearches([" alpha ", "alpha", "beta"])).toBe(
      '["alpha","beta"]',
    );
  });

  it("moves a repeated query to the front", () => {
    expect(pushRecentSearch(["alpha", "beta"], "beta")).toEqual([
      "beta",
      "alpha",
    ]);
    expect(pushRecentSearch(["alpha", "beta"], "gamma")).toEqual([
      "gamma",
      "alpha",
      "beta",
    ]);
    expect(pushRecentSearch(["alpha"], "   ")).toEqual(["alpha"]);
  });
});
