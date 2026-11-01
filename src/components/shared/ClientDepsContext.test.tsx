/**
 * Component tests for the ClientDeps context seam.
 *
 * The probe components are rendered to static markup. That is enough to pin
 * the contract: a
 * `ClientDepsProvider` overrides the composition-root singleton with an injected
 * bundle, and a tree with no provider falls back to the singleton.
 *
 * Static SSR reads each store's INITIAL snapshot (`useSyncExternalStore`'s
 * server snapshot), so every case builds a fresh bundle with the state it wants
 * rather than mutating one after construction.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand/vanilla";
import { createStore } from "zustand/vanilla";

import { noopDomAdapter } from "@/adapters/dom";
import { fixedLocaleSource } from "@/adapters/locale-source";
import { fakeMusic } from "@/adapters/music";
import { fakePagefind } from "@/adapters/pagefind";
import { memoryStorageAdapter } from "@/adapters/storage";
import {
  ClientDepsProvider,
  useClientDeps,
} from "@/components/shared/ClientDepsContext";
import type { ClientDeps } from "@/hooks/deps";
import { useHydrationSafeT } from "@/hooks/useHydrationSafeT";
import { useLocale } from "@/hooks/useLocale";
import { useSearch } from "@/hooks/useSearch";
import type { Locale } from "@/i18n";
import type { MusicPayload } from "@/lib/domain/music";
import { appStore } from "@/store/app-store";
import type { AppStore } from "@/store/types";

/** A tiny valid payload so the music double satisfies the port. */
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

/**
 * An isolated store for the injected bundle. Starts from the app store's state
 * shape so the actions exist, then rebinds `setLocale` to THIS store (the real
 * actions close over the singleton) and no-ops the rest.
 */
function makeStore(locale: Locale, searchOpen = false): StoreApi<AppStore> {
  return createStore<AppStore>()((set) => ({
    ...appStore.getInitialState(),
    locale,
    search: {
      open: searchOpen,
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

function makeDeps(locale: Locale, searchOpen = false): ClientDeps {
  return {
    store: makeStore(locale, searchOpen),
    adapters: {
      storage: memoryStorageAdapter(),
      localeSource: fixedLocaleSource("en-US"),
      dom: noopDomAdapter,
      pagefind: fakePagefind([]),
      music: fakeMusic(musicPayload),
    },
  };
}

/** Renders the context locale, the store locale and a translated label. */
function LocaleProbe() {
  const deps = useClientDeps();
  const { locale } = useLocale();
  const { t } = useHydrationSafeT();
  return (
    <span data-locale={locale} data-store-locale={deps.store.getState().locale}>
      {t("nav.about")}
    </span>
  );
}

/** Renders the store-backed search overlay state via the zero-arg hook. */
function SearchProbe() {
  const deps = useClientDeps();
  const { open, status } = useSearch(0);
  return (
    <span data-search-open={String(open)} data-search-status={status}>
      {deps.store.getState().locale}
    </span>
  );
}

beforeEach(() => {
  appStore.setState({ locale: "zh-hant" });
});

afterEach(() => {
  appStore.setState({ locale: "zh-hant" });
});

describe("ClientDepsProvider", () => {
  it("uses the injected bundle instead of the singleton", () => {
    const deps = makeDeps("en");

    const html = renderToStaticMarkup(
      <ClientDepsProvider deps={deps}>
        <LocaleProbe />
      </ClientDepsProvider>,
    );

    expect(html).toContain('data-locale="en"');
    expect(html).toContain('data-store-locale="en"');
    // Static SSR has no mount effect, so the hydration-safe hook pins the
    // build locale; the injected store is proven by the data attributes.
    expect(html).toContain("關於");
  });

  it("honours a non-default injected locale", () => {
    const deps = makeDeps("zh-hans");

    const html = renderToStaticMarkup(
      <ClientDepsProvider deps={deps}>
        <LocaleProbe />
      </ClientDepsProvider>,
    );

    expect(html).toContain('data-locale="zh-hans"');
    expect(html).toContain('data-store-locale="zh-hans"');
    // Build-locale copy on the server; the store proves the injected bundle.
    expect(html).toContain("關於");
  });

  it("drives useSearch from the injected store", () => {
    const deps = makeDeps("zh-hant", true);

    const html = renderToStaticMarkup(
      <ClientDepsProvider deps={deps}>
        <SearchProbe />
      </ClientDepsProvider>,
    );

    expect(html).toContain('data-search-open="true"');
    expect(html).toContain('data-search-status="idle"');
  });

  it("defaults to the composition-root singleton when deps is omitted", () => {
    const html = renderToStaticMarkup(
      <ClientDepsProvider>
        <LocaleProbe />
      </ClientDepsProvider>,
    );

    expect(html).toContain('data-locale="zh-hant"');
    expect(html).toContain('data-store-locale="zh-hant"');
    expect(html).toContain("關於");
  });
});

describe("useClientDeps without a provider", () => {
  it("falls back to the singleton and ignores an unused injected bundle", () => {
    // A fake bundle exists but is never mounted: the fallback must not see it.
    makeDeps("en");

    const html = renderToStaticMarkup(<LocaleProbe />);

    expect(html).toContain('data-locale="zh-hant"');
    expect(html).toContain("關於");
  });
});
