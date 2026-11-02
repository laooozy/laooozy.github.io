// @vitest-environment happy-dom
/**
 * States of the lazy command palette: quick links for a blank query, grouped
 * results, the empty and loading states, and the error's retry. Pagefind is
 * always the injected fake, so no test reaches the generated index or the
 * network.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PagefindPort } from "@/adapters/pagefind";
import { fakePagefind } from "@/adapters/pagefind";
import { ClientDepsProvider } from "@/components/shared/ClientDepsContext";
import type { SearchResult } from "@/lib/domain/search";
import { createFakeDeps } from "@/test/client-deps";

import SearchCommandDialog from "./SearchCommandDialog";

const RESULTS: SearchResult[] = [
  {
    url: "/blog/2026-01-01_reasoning/",
    title: "Reasoning one book",
    excerpt: "A <mark>reasoning</mark> note",
  },
  { url: "/music/", title: "Music result" },
  { url: "/links/", title: "Links result" },
];

function renderDialog(
  pagefind: PagefindPort,
  options: Parameters<typeof createFakeDeps>[0] = {},
) {
  const fake = createFakeDeps({ ...options, pagefind });
  const view = render(
    <ClientDepsProvider deps={fake.deps}>
      <SearchCommandDialog open />
    </ClientDepsProvider>,
  );
  return { ...fake, ...view };
}

function quickLinkHrefs(container: HTMLElement): string[] {
  return Array.from(
    container.ownerDocument.querySelectorAll<HTMLAnchorElement>(
      "a[data-search-navigation-target]",
    ),
  ).map((anchor) => anchor.getAttribute("href") ?? "");
}

describe("SearchCommandDialog quick links", () => {
  it("shows the four quick links and never Photography", () => {
    const { container } = renderDialog(fakePagefind([]));

    expect(screen.getByText("快速前往")).not.toBeNull();
    expect(quickLinkHrefs(container)).toEqual([
      "/#about",
      "/blog/",
      "/music/",
      "/links/",
    ]);
    expect(container.querySelector('a[href="/photographer"]')).toBeNull();
    expect(container.querySelector('a[href="/photographer/"]')).toBeNull();
    expect(screen.queryByText("攝影")).toBeNull();
  });

  it("renders recent queries from the store and clears them", async () => {
    const { store, storage } = renderDialog(fakePagefind([]), {
      search: { recent: ["alpha", "beta"] },
    });

    expect(screen.getByText("最近搜尋")).not.toBeNull();
    expect(screen.getByText("alpha")).not.toBeNull();

    fireEvent.click(screen.getByText("清除最近搜尋"));

    await waitFor(() => expect(store.getState().search.recent).toEqual([]));
    expect(storage.get("search:recent")).toBeNull();
  });
});

describe("SearchCommandDialog query states", () => {
  it("groups results into posts, music and pages", async () => {
    renderDialog(fakePagefind(RESULTS));

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "reasoning" },
    });

    expect(await screen.findByText("Reasoning one book")).not.toBeNull();
    expect(screen.getByText("Music result")).not.toBeNull();
    expect(screen.getByText("Links result")).not.toBeNull();
    expect(screen.getByText("找到 3 筆結果")).not.toBeNull();
    expect(screen.getByText("文章")).not.toBeNull();
    expect(screen.getByText("頁面")).not.toBeNull();
    expect(screen.queryByText("快速前往")).toBeNull();
    expect(screen.queryByText("關於")).toBeNull();
  });

  it("removes the previous rows and navigation target as soon as the query changes", async () => {
    let resolveBeta!: (value: SearchResult[]) => void;
    let betaCalls = 0;
    const pagefind: PagefindPort = {
      load: () => Promise.resolve({ search: async () => ({ results: [] }) }),
      search: (query) => {
        if (query === "alpha") {
          return Promise.resolve([
            { url: "/blog/alpha/", title: "Alpha result" },
          ]);
        }
        betaCalls += 1;
        return new Promise<SearchResult[]>((resolve) => {
          resolveBeta = resolve;
        });
      },
    };
    const { store, container } = renderDialog(pagefind, {
      search: { open: true },
    });
    const input = screen.getByRole("combobox");
    const alphaAnchor = () =>
      container.ownerDocument.querySelector<HTMLAnchorElement>(
        'a[data-search-navigation-target][href="/blog/alpha/"]',
      );

    fireEvent.change(input, { target: { value: "alpha" } });
    expect(await screen.findByText("Alpha result")).not.toBeNull();
    expect(alphaAnchor()).not.toBeNull();

    fireEvent.change(input, { target: { value: "beta" } });

    expect(store.getState().search.status).toBe("searching");
    expect(store.getState().search.results).toEqual([]);
    expect(screen.queryByText("Alpha result")).toBeNull();
    expect(alphaAnchor()).toBeNull();

    await waitFor(() => expect(betaCalls).toBe(1));

    // Enter during beta's debounce must not follow the removed alpha row.
    fireEvent.keyDown(input, { key: "Enter" });
    expect(store.getState().search.open).toBe(true);
    expect(store.getState().search.recent).toEqual([]);
    expect(alphaAnchor()).toBeNull();

    resolveBeta([{ url: "/blog/beta/", title: "Beta result" }]);
    expect(await screen.findByText("Beta result")).not.toBeNull();
    expect(store.getState().search.results).toEqual([
      { url: "/blog/beta/", title: "Beta result" },
    ]);
  });

  it("shows the empty state when Pagefind has no matches", async () => {
    renderDialog(fakePagefind([]));

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "nothing matches" },
    });

    expect(await screen.findByText("沒有找到結果。")).not.toBeNull();
  });

  it("shows the searching state while the port is pending", async () => {
    const pending: PagefindPort = {
      load: () =>
        Promise.resolve({
          search: () => new Promise(() => {}),
        }),
      search: () => new Promise(() => {}),
    };
    renderDialog(pending);

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "slow" },
    });

    expect(await screen.findByText("搜尋中…")).not.toBeNull();
  });

  it("surfaces an adapter failure and recovers through retry", async () => {
    let calls = 0;
    const flaky: PagefindPort = {
      load: () => Promise.resolve({ search: async () => ({ results: [] }) }),
      search: async () => {
        calls += 1;
        if (calls === 1) throw new Error("pagefind unavailable");
        return RESULTS;
      },
    };
    renderDialog(flaky);

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "reasoning" },
    });

    expect(
      await screen.findByText("搜尋暫時無法使用，請再試一次。"),
    ).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "重試" }));

    expect(await screen.findByText("Reasoning one book")).not.toBeNull();
    expect(calls).toBe(2);
  });
});
