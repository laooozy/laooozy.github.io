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
import { fakePagefind } from "@/adapters/pagefind";
import type { PagefindPort, SearchResult } from "@/adapters/pagefind";
import { memoryStorageAdapter } from "@/adapters/storage";
import type { ClientDeps } from "@/hooks/deps";
import { createSearchEngine } from "@/hooks/useSearch";
import { appStore } from "@/store/app-store";

function makeDeps(pagefind: PagefindPort): ClientDeps {
  return {
    store: appStore,
    adapters: {
      storage: memoryStorageAdapter(),
      localeSource: fixedLocaleSource("en-US"),
      dom: noopDomAdapter,
      pagefind,
    },
  };
}

const searchState = () => appStore.getState().search;

beforeEach(() => {
  appStore.setState({
    locale: "zh-hant",
    headerHidden: false,
    search: { open: false, query: "", status: "idle", results: [] },
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
});
