/**
 * Injection contract for the client hooks.
 *
 * Hooks never construct adapters nor reach for browser globals; they receive
 * this bundle by parameter, so the caller decides which concrete ports are
 * wired in. The composition root is the ONLY place that binds the real
 * adapters (`appStore`, `localStorageAdapter`, `navigatorLocaleSource`,
 * `domAdapter`, `pagefindAdapter`); tests inject the deterministic doubles
 * (`memoryStorageAdapter`, `fixedLocaleSource`, `noopDomAdapter`,
 * `fakePagefind`).
 *
 * `store` is the vanilla Zustand store API (`StoreApi<AppStore>`, as returned
 * by `createStore`) rather than the bare state shape: hooks subscribe through
 * `useStore`, which needs `getState`/`subscribe`/`getInitialState`. The
 * `appStore` singleton satisfies this contract directly.
 */

import type { StoreApi } from "zustand/vanilla";

import type { DomPort } from "@/adapters/dom";
import type { LocaleSourcePort } from "@/adapters/locale-source";
import type { PagefindPort } from "@/adapters/pagefind";
import type { StoragePort } from "@/adapters/storage";
import type { AppStore } from "@/store/types";

/** The one bundle every client hook depends on. */
export interface ClientDeps {
  store: StoreApi<AppStore>;
  adapters: {
    storage: StoragePort;
    localeSource: LocaleSourcePort;
    dom: DomPort;
    pagefind: PagefindPort;
  };
}
