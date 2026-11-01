/**
 * Injection contract for the client hooks.
 *
 * Hooks never construct adapters nor reach for browser globals; they receive
 * this bundle from the `ClientDepsProvider` context (or, without a provider,
 * its composition-root singleton default), so the caller decides which concrete
 * ports are wired in. The composition root is the ONLY place that binds the real
 * adapters (`appStore`, `localStorageAdapter`, `domAdapter`, `pagefindAdapter`,
 * `musicAdapter`); tests inject the deterministic doubles
 * (`memoryStorageAdapter`, `noopDomAdapter`, `fakePagefind`,
 * `fakeMusic`/`fakeMusicError`).
 *
 * `store` is the vanilla Zustand store API (`StoreApi<AppStore>`, as returned
 * by `createStore`) rather than the bare state shape: hooks subscribe through
 * `useStore`, which needs `getState`/`subscribe`/`getInitialState`. The
 * `appStore` singleton satisfies this contract directly.
 */

import type { StoreApi } from "zustand/vanilla";

import type { DomPort } from "@/adapters/dom";
import type { MusicPort } from "@/adapters/music";
import type { PagefindPort } from "@/adapters/pagefind";
import type { StoragePort } from "@/adapters/storage";
import type { AppStore } from "@/store/types";

/** The one bundle every client hook depends on. */
export interface ClientDeps {
  store: StoreApi<AppStore>;
  adapters: {
    storage: StoragePort;
    dom: DomPort;
    pagefind: PagefindPort;
    music: MusicPort;
  };
}
