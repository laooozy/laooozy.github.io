/**
 * Unit tests for the Pagefind port's deterministic double.
 *
 * The real adapter is a lazy dynamic import of a post-build asset and is
 * intentionally not exercised here; these tests pin the `fakePagefind` contract
 * that the hook tests (and callers) rely on: canned hits for any query, and
 * copies so a caller mutating the returned array/objects cannot corrupt the
 * shared fixture.
 */
import { describe, expect, it } from "vitest";

import { fakePagefind } from "@/adapters/pagefind";
import type { SearchResult } from "@/adapters/pagefind";

const canned: SearchResult[] = [
  { url: "/blog/alpha/", title: "Alpha", excerpt: "the alpha post" },
  { url: "/blog/beta/", title: "Beta" },
];

describe("fakePagefind", () => {
  it("returns the canned results for any query", async () => {
    const port = fakePagefind(canned);

    await expect(port.search("anything")).resolves.toEqual(canned);
  });

  it("returns copies so callers cannot mutate the fixture", async () => {
    const port = fakePagefind(canned);

    const first = await port.search("q");
    const firstHit = first[0] as SearchResult;
    firstHit.title = "MUTATED";
    first.push({ url: "/blog/injected/", title: "Injected" });

    expect(canned).toHaveLength(2);
    expect(canned[0]?.title).toBe("Alpha");

    const second = await port.search("q");
    expect(second).toEqual(canned);
  });

  it("returns an empty array when the fixture is empty", async () => {
    await expect(fakePagefind([]).search("q")).resolves.toEqual([]);
  });

  it("loads a module whose search resolves the same fixtures", async () => {
    const port = fakePagefind(canned);

    const module = await port.load();
    const { results } = await module.search("q");
    const data = await Promise.all(results.map((item) => item.data()));

    expect(data.map((entry) => entry.url)).toEqual(
      canned.map((hit) => hit.url),
    );
  });
});
