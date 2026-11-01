/**
 * Deterministic `ClientDeps` for component tests.
 *
 * Production wires the real adapters once in `src/client/bootstrap.ts`. Tests
 * need the opposite: an isolated store, in-memory storage, a fixed locale
 * source, and fake DOM/Pagefind/music ports, so nothing touches the network or
 * leaks state between suites. `createFakeDeps` assembles that bundle and also
 * exposes the fake DOM's event seams so a test can drive the `⌘K` shortcut or
 * route-change callbacks the component subscribed to.
 */

import type { StoreApi } from "zustand/vanilla";

import type { DomPort } from "@/adapters/dom";
import { noopDomAdapter } from "@/adapters/dom";
import type { MusicPort } from "@/adapters/music";
import { fakeMusic } from "@/adapters/music";
import type { PagefindPort } from "@/adapters/pagefind";
import { fakePagefind } from "@/adapters/pagefind";
import type { StoragePort } from "@/adapters/storage";
import { memoryStorageAdapter } from "@/adapters/storage";
import type { ClientDeps } from "@/hooks/deps";
import type { Locale } from "@/i18n";
import type { MusicPayload, Song } from "@/lib/domain/music";
import { createAppStore } from "@/store/app-store";
import type { AppStore, SearchState } from "@/store/types";

/** Four-song fixture, mirroring the published payload's shape. */
export const FIXTURE_SONGS: Song[] = [
  {
    id: "fixture0001",
    title: "花譜 - 春を発つ",
    artist: "花譜",
    artistId: "UCkaf00000000000000000",
    org: "kamitsubaki",
    thumb: "https://i.ytimg.com/vi/fixture0001/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=fixture0001",
  },
  {
    id: "fixture0002",
    title: "理芽 - ディアマイフレンド",
    artist: "理芽",
    artistId: "UCrim00000000000000000",
    org: "kamitsubaki",
    thumb: "https://i.ytimg.com/vi/fixture0002/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=fixture0002",
  },
  {
    id: "fixture0003",
    title: "夜に駆ける",
    artist: "YOASOBI",
    artistId: "UCother0000000000000000",
    org: null,
    thumb: "https://i.ytimg.com/vi/fixture0003/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=fixture0003",
  },
  {
    id: "fixture0004",
    title: "Another Fixture Track",
    artist: "Fixture Artist",
    artistId: "UCfixture0000000000000000",
    org: null,
    thumb: "https://i.ytimg.com/vi/fixture0004/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=fixture0004",
  },
];

/** Playlist URL the fixture payload advertises. */
export const FIXTURE_PLAYLIST_URL =
  "https://www.youtube.com/playlist?list=PLtestFixture";

/** Build a payload around the four-song fixture (or a caller's list). */
export function makeMusicPayload(songs: Song[] = FIXTURE_SONGS): MusicPayload {
  return {
    version: 1,
    generatedAt: "2026-10-31T12:00:00.000Z",
    playlist: {
      id: "PLtestFixture",
      title: "歌",
      url: FIXTURE_PLAYLIST_URL,
    },
    organisations: { kamitsubaki: "Kamitsubaki 神椿" },
    songs,
  };
}

/** An empty but valid payload, for the empty state. */
export function makeEmptyMusicPayload(): MusicPayload {
  return makeMusicPayload([]);
}

/** Observable DOM port plus the seams to fire its listeners. */
export interface FakeDom {
  port: DomPort;
  emitKeyDown(event: KeyboardEvent): void;
  emitHashChange(hash: string): void;
  keyDownListenerCount(): number;
  keyDownUnsubscribeCount(): number;
  hashChangeListenerCount(): number;
}

/** Build a DOM double whose global event seams can be driven from a test. */
export function createFakeDom(overrides: Partial<DomPort> = {}): FakeDom {
  const keyDown = new Set<(event: KeyboardEvent) => void>();
  const hashChange = new Set<(hash: string) => void>();
  let keyDownUnsubscribed = 0;

  const port: DomPort = {
    ...noopDomAdapter,
    onKeyDown(callback) {
      keyDown.add(callback);
      return () => {
        keyDownUnsubscribed += 1;
        keyDown.delete(callback);
      };
    },
    onHashChange(callback) {
      hashChange.add(callback);
      return () => {
        hashChange.delete(callback);
      };
    },
    ...overrides,
  };

  return {
    port,
    emitKeyDown(event) {
      for (const callback of keyDown) callback(event);
    },
    emitHashChange(hash) {
      for (const callback of hashChange) callback(hash);
    },
    keyDownListenerCount: () => keyDown.size,
    keyDownUnsubscribeCount: () => keyDownUnsubscribed,
    hashChangeListenerCount: () => hashChange.size,
  };
}

/** Options for `createFakeDeps`; every field has a deterministic default. */
export interface FakeDepsOptions {
  locale?: Locale;
  store?: StoreApi<AppStore>;
  dom?: FakeDom;
  pagefind?: PagefindPort;
  music?: MusicPort;
  storage?: StoragePort;
  /** Overrides merged into the store's search slice. */
  search?: Partial<SearchState>;
}

/** The injected bundle plus the handles a test needs to drive it. */
export interface FakeClientDeps {
  deps: ClientDeps;
  store: StoreApi<AppStore>;
  dom: FakeDom;
  storage: StoragePort;
}

/** Assemble a `ClientDeps` bundle with isolated, offline doubles. */
export function createFakeDeps(options: FakeDepsOptions = {}): FakeClientDeps {
  const store = options.store ?? createAppStore();
  if (options.locale !== undefined) store.getState().setLocale(options.locale);
  if (options.search !== undefined) {
    store.setState((state) => ({
      search: { ...state.search, ...options.search },
    }));
  }

  const dom = options.dom ?? createFakeDom();
  const storage = options.storage ?? memoryStorageAdapter();

  const deps: ClientDeps = {
    store,
    adapters: {
      storage,
      dom: dom.port,
      pagefind: options.pagefind ?? fakePagefind([]),
      music: options.music ?? fakeMusic(makeMusicPayload()),
    },
  };

  return { deps, store, dom, storage };
}
