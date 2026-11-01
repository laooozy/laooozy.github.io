/**
 * Unit tests for the extracted search loop (`createSearchEngine`).
 *
 * The loop is driven directly — no React renderer. It runs against the real
 * `appStore` and deterministic adapter doubles. `debounceMs = 0` keeps the
 * tests fast while still exercising the one-macrotask defer.
 *
 * Contracts pinned here: `searching` -> `results`; empty query -> `idle`; no
 * hits -> `empty`; an adapter rejection surfaces as `error` and never throws;
 * and the monotonic sequence guard drops a stale in-flight response.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { noopDomAdapter } from "@/adapters/dom";
import { fixedLocaleSource } from "@/adapters/locale-source";
import { fakeMusic } from "@/adapters/music";
import type { PagefindPort } from "@/adapters/pagefind";
import { fakePagefind } from "@/adapters/pagefind";
import { memoryStorageAdapter } from "@/adapters/storage";
import type { ClientDeps } from "@/hooks/deps";
import {
  clearPersistedRecentSearches,
  createSearchEngine,
  readRecentSearches,
  writeRecentSearches,
} from "@/hooks/useSearch";
import type { MusicPayload } from "@/lib/domain/music";
import type { SearchResult } from "@/lib/domain/search";
import { appStore } from "@/store/app-store";

const musicPayload: MusicPayload = {
  version: 1,
  generatedAt: "2026-10-31T00:00:00.000Z",
  playlist: {
    id: "PLtestFixture",
    title: "Night loop",
    url: "https://www.youtube.com/playlist?list=PLtestFixture",
  },
  organisations: {},
  songs: [
    {
      id: "song-1",
      title: "Lunar drift",
      artist: "Kaika",
      artistId: "kaika",
      org: null,
      thumb: "https://i.ytimg.com/vi/song-1/hqdefault.jpg",
      url: "https://www.youtube.com/watch?v=song-1",
    },
  ],
};

function makeDeps(pagefind: PagefindPort): ClientDeps {
  return {
    store: appStore,
    adapters: {
      storage: memoryStorageAdapter(),
      localeSource: fixedLocaleSource("en-US"),
      dom: noopDomAdapter,
      pagefind,
      music: fakeMusic(musicPayload),
    },
  };
}

const searchState = () => appStore.getState().search;

beforeEach(() => {
  appStore.setState({
    locale: "zh-hant",
    headerHidden: false,
    search: {
      open: false,
      query: "",
      status: "idle",
      results: [],
      recent: [],
      epoch: 0,
    },
  });
});

describe("createSearchEngine", () => {
  it("moves searching -> results for a matching query", async () => {
    const hits: SearchResult[] = [{ url: "/blog/alpha/", title: "Alpha" }];
    const engine = createSearchEngine(makeDeps(fakePagefind(hits)), 0);

    engine.run("alpha");
    expect(searchState().status).toBe("searching");

    await vi.waitFor(() => expect(searchState().status).toBe("results"));
    expect(searchState().results).toEqual(hits);
  });

  it("clears to idle on an empty or whitespace-only query", () => {
    const engine = createSearchEngine(makeDeps(fakePagefind([])), 0);

    engine.run("   ");

    expect(searchState().status).toBe("idle");
    expect(searchState().results).toEqual([]);
  });

  it("reports empty when a query yields no hits", async () => {
    const engine = createSearchEngine(makeDeps(fakePagefind([])), 0);

    engine.run("nothing");

    await vi.waitFor(() => expect(searchState().status).toBe("empty"));
    expect(searchState().results).toEqual([]);
  });

  it("surfaces an adapter rejection as error without throwing", async () => {
    const rejecting: PagefindPort = {
      load: () => Promise.reject(new Error("load failed")),
      search: () => Promise.reject(new Error("search failed")),
    };
    const engine = createSearchEngine(makeDeps(rejecting), 0);

    expect(() => engine.run("alpha")).not.toThrow();

    await vi.waitFor(() => expect(searchState().status).toBe("error"));
    expect(searchState().results).toEqual([]);
  });

  it("never lets a stale earlier query overwrite a newer one", async () => {
    let resolveSlow!: (value: SearchResult[]) => void;
    const slow = new Promise<SearchResult[]>((resolve) => {
      resolveSlow = resolve;
    });
    const calls: string[] = [];
    const pagefind: PagefindPort = {
      load: () => Promise.resolve({ search: async () => ({ results: [] }) }),
      search: (query) => {
        calls.push(query);
        if (query === "slow") return slow;
        return Promise.resolve([{ url: "/blog/fast/", title: "Fast" }]);
      },
    };
    const engine = createSearchEngine(makeDeps(pagefind), 0);

    // Start the slow query and let its debounced execute begin in-flight.
    engine.run("slow");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toContain("slow");

    // A newer query supersedes it and resolves first.
    engine.run("fast");
    await vi.waitFor(() => expect(searchState().status).toBe("results"));
    expect(searchState().results).toEqual([
      { url: "/blog/fast/", title: "Fast" },
    ]);

    // The stale response arriving late must be dropped.
    resolveSlow([{ url: "/blog/slow/", title: "Slow" }]);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(searchState().status).toBe("results");
    expect(searchState().results).toEqual([
      { url: "/blog/fast/", title: "Fast" },
    ]);
  });

  it("drops an in-flight response that resolves after the palette closes", async () => {
    let resolveSlow!: (value: SearchResult[]) => void;
    const slow = new Promise<SearchResult[]>((resolve) => {
      resolveSlow = resolve;
    });
    const pagefind: PagefindPort = {
      load: () => Promise.resolve({ search: async () => ({ results: [] }) }),
      search: () => slow,
    };
    const engine = createSearchEngine(makeDeps(pagefind), 0);

    engine.run("slow");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(searchState().status).toBe("searching");

    appStore.getState().closeSearch();
    expect(searchState()).toMatchObject({
      open: false,
      query: "",
      status: "idle",
      results: [],
    });

    resolveSlow([{ url: "/blog/slow/", title: "Slow" }]);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(searchState()).toMatchObject({
      open: false,
      query: "",
      status: "idle",
      results: [],
    });
  });

  it("drops a response from a session closed and reopened before it resolves", async () => {
    let resolveSlow!: (value: SearchResult[]) => void;
    const slow = new Promise<SearchResult[]>((resolve) => {
      resolveSlow = resolve;
    });
    const pagefind: PagefindPort = {
      load: () => Promise.resolve({ search: async () => ({ results: [] }) }),
      search: () => slow,
    };
    const engine = createSearchEngine(makeDeps(pagefind), 0);

    engine.run("slow");
    await new Promise((resolve) => setTimeout(resolve, 0));
    appStore.getState().closeSearch();
    appStore.getState().openSearch();

    resolveSlow([{ url: "/blog/stale/", title: "Stale" }]);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(searchState()).toMatchObject({
      open: true,
      query: "",
      status: "idle",
      results: [],
    });
  });
});

describe("recent search persistence", () => {
  it("reads, sanitises and clears through the injected storage port", () => {
    const storage = memoryStorageAdapter();

    writeRecentSearches(storage, ["  alpha  ", "alpha", "beta", ""]);
    expect(readRecentSearches(storage)).toEqual(["alpha", "beta"]);

    clearPersistedRecentSearches(storage);
    expect(readRecentSearches(storage)).toEqual([]);
  });
});
