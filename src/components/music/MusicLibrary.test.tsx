// @vitest-environment happy-dom
/**
 * Data-boundary contract for the `/music/` island.
 *
 * The playlist link must come from the validated payload's `playlist.url`,
 * never from the build-time playlist file, and a missing/failed payload must
 * not leave a stale link behind.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { StoreApi } from "zustand/vanilla";
import { createStore } from "zustand/vanilla";

import { noopDomAdapter } from "@/adapters/dom";
import { fixedLocaleSource } from "@/adapters/locale-source";
import { fakeMusic, fakeMusicError, type MusicPort } from "@/adapters/music";
import { fakePagefind } from "@/adapters/pagefind";
import { memoryStorageAdapter } from "@/adapters/storage";
import { ClientDepsProvider } from "@/components/shared/ClientDepsContext";
import type { ClientDeps } from "@/hooks/deps";
import type { MusicPayload } from "@/lib/domain/music";
import { appStore } from "@/store/app-store";
import type { AppStore } from "@/store/types";

import MusicLibrary from "./MusicLibrary";

const PLAYLIST_URL = "https://www.youtube.com/playlist?list=PLpayloadOnly";

const EMPTY_PAYLOAD: MusicPayload = {
  version: 1,
  generatedAt: "2026-01-01T00:00:00.000Z",
  playlist: {
    id: "PLpayloadOnly",
    title: "Payload playlist",
    url: PLAYLIST_URL,
  },
  organisations: {},
  songs: [],
};

const LINK_NAME = /在 YouTube 開啟歌單/;

function makeStore(): StoreApi<AppStore> {
  return createStore<AppStore>()((set) => ({
    ...appStore.getInitialState(),
    locale: "zh-hant",
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

function makeDeps(music: MusicPort): ClientDeps {
  return {
    store: makeStore(),
    adapters: {
      storage: memoryStorageAdapter(),
      localeSource: fixedLocaleSource("zh-TW"),
      dom: noopDomAdapter,
      pagefind: fakePagefind([]),
      music,
    },
  };
}

function renderLibrary(music: MusicPort) {
  return render(
    <ClientDepsProvider deps={makeDeps(music)}>
      <MusicLibrary />
    </ClientDepsProvider>,
  );
}

describe("MusicLibrary playlist link", () => {
  it("renders the link from the payload after an empty payload loads", async () => {
    renderLibrary(fakeMusic(EMPTY_PAYLOAD));

    const link = await screen.findByRole("link", { name: LINK_NAME });

    expect(link.getAttribute("href")).toBe(PLAYLIST_URL);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.getByText("歌單暫時沒有歌曲。")).not.toBeNull();
  });

  it("shows the loading state with no playlist link", () => {
    const neverResolves: MusicPort = {
      load: () => new Promise<MusicPayload>(() => {}),
    };

    renderLibrary(neverResolves);

    expect(screen.getByText("載入中…")).not.toBeNull();
    expect(screen.queryByRole("link", { name: LINK_NAME })).toBeNull();
  });

  it("shows the error state with retry and no stale playlist link", async () => {
    renderLibrary(fakeMusicError());

    expect(
      await screen.findByText("歌單暫時無法載入，請再試一次。"),
    ).not.toBeNull();
    expect(screen.queryByRole("link", { name: LINK_NAME })).toBeNull();
    expect(screen.getByRole("button", { name: "重試" })).not.toBeNull();
  });
});
