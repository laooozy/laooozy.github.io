// @vitest-environment happy-dom
/**
 * Contract for the hydration-safe translation hook.
 *
 * The build emits the default locale, while the pre-paint boot can seed the
 * store with a different locale before React's first client render. The hook
 * must therefore render the BUILD locale until the mount effect flips
 * `isHydrated`, then adopt the store locale — exactly the sequence pinned by
 * the render log below.
 */
import { act, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand/vanilla";
import { createStore } from "zustand/vanilla";

import { noopDomAdapter } from "@/adapters/dom";
import { fixedLocaleSource } from "@/adapters/locale-source";
import { fakeMusic } from "@/adapters/music";
import { fakePagefind } from "@/adapters/pagefind";
import { memoryStorageAdapter } from "@/adapters/storage";
import { ClientDepsProvider } from "@/components/shared/ClientDepsContext";
import type { ClientDeps } from "@/hooks/deps";
import type { Locale } from "@/i18n";
import type { MusicPayload } from "@/lib/domain/music";
import { appStore } from "@/store/app-store";
import type { AppStore } from "@/store/types";

import {
  type HydrationSafeTranslation,
  useHydrationSafeT,
} from "./useHydrationSafeT";

const musicPayload: MusicPayload = {
  version: 1,
  generatedAt: "2026-10-31T00:00:00.000Z",
  playlist: {
    id: "PLtestFixture",
    title: "Night loop",
    url: "https://www.youtube.com/playlist?list=PLtestFixture",
  },
  organisations: {},
  songs: [],
};

function makeStore(locale: Locale): StoreApi<AppStore> {
  return createStore<AppStore>()((set) => ({
    ...appStore.getInitialState(),
    locale,
    search: {
      open: false,
      query: "",
      status: "idle",
      results: [],
      recent: [],
      epoch: 0,
    },
    setLocale: (next) => set({ locale: next }),
    setHeaderHidden: () => {},
    setHeaderMenuOpen: () => {},
    openSearch: () => {},
    closeSearch: () => {},
    setSearchQuery: () => {},
    setSearchStatus: () => {},
    setSearchResults: () => {},
    setRecentSearches: () => {},
    addRecentSearch: () => {},
    clearRecentSearches: () => {},
  }));
}

function makeDeps(locale: Locale): ClientDeps {
  return {
    store: makeStore(locale),
    adapters: {
      storage: memoryStorageAdapter(),
      localeSource: fixedLocaleSource("en-US"),
      dom: noopDomAdapter,
      pagefind: fakePagefind([]),
      music: fakeMusic(musicPayload),
    },
  };
}

interface RenderRecord {
  locale: HydrationSafeTranslation["locale"];
  isHydrated: boolean;
  label: string;
}

const records: RenderRecord[] = [];

function Probe() {
  const { t, locale, isHydrated } = useHydrationSafeT();
  const label = t("nav.about");
  records.push({ locale, isHydrated, label });
  return (
    <span data-locale={locale} data-hydrated={String(isHydrated)}>
      {label}
    </span>
  );
}

beforeEach(() => {
  records.length = 0;
  appStore.setState({ locale: "zh-hant" });
});

describe("useHydrationSafeT", () => {
  it("renders the build locale on the server even when the store holds another", () => {
    const html = renderToStaticMarkup(
      <ClientDepsProvider deps={makeDeps("en")}>
        <Probe />
      </ClientDepsProvider>,
    );

    expect(html).toContain('data-locale="zh-hant"');
    expect(html).toContain('data-hydrated="false"');
    expect(html).toContain("關於");
    expect(html).not.toContain("About");
  });

  it("adopts a non-default injected store locale after mount", () => {
    const deps = makeDeps("en");

    const { container } = render(
      <ClientDepsProvider deps={deps}>
        <Probe />
      </ClientDepsProvider>,
    );

    // First client render is byte-identical to the SSR output ...
    expect(records[0]).toEqual({
      locale: "zh-hant",
      isHydrated: false,
      label: "關於",
    });
    // ... then the store locale is adopted without a reload.
    const last = records.at(-1);
    expect(last).toEqual({ locale: "en", isHydrated: true, label: "About" });
    expect(
      container.querySelector("[data-locale]")?.getAttribute("data-locale"),
    ).toBe("en");
    expect(screen.getByText("About")).not.toBeNull();

    // A later switch re-renders in place; `isHydrated` never flips back.
    act(() => deps.store.getState().setLocale("zh-hans"));
    expect(screen.getByText("关于")).not.toBeNull();
    expect(records.at(-1)).toMatchObject({
      locale: "zh-hans",
      isHydrated: true,
    });
  });

  it("flips isHydrated from false to true exactly once", () => {
    render(
      <ClientDepsProvider deps={makeDeps("zh-hant")}>
        <Probe />
      </ClientDepsProvider>,
    );

    const flags = records.map((record) => record.isHydrated);
    expect(flags[0]).toBe(false);
    expect(flags.slice(1).every(Boolean)).toBe(true);
    // One transition only: every record after the first already hydrated.
    expect(flags.filter((flag) => !flag)).toHaveLength(1);
  });
});
