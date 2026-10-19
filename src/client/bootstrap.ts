/**
 * Client composition root.
 *
 * The ONE place that binds the concrete adapters to the store: hooks, islands
 * and vanilla client code all receive the assembled `ClientDeps` from here, so
 * no component imports an adapter directly and the port choices stay swappable
 * in tests. Importing this module is safe on the server: every `document` /
 * `localStorage` touch is guarded, so a build that pulls it in degrades to the
 * default locale instead of throwing.
 *
 * The DOM port (`adapters.dom`) is the single seam for every browser-effect
 * primitive the shell needs: scroll observation, reduced motion, header
 * visibility and locale application, plus the shared animation loop, the
 * document-visibility subscription and the intersection-observer factory that
 * the background atmosphere and the entrance reveal consume. Those clients start
 * from a layout script and read the port off this bundle, so no component or
 * client module ever constructs a port or reaches for a browser global.
 *
 * The store singleton is seeded here with the locale the pre-paint boot chose
 * (task 9). The boot writes its decision to `document.documentElement.dataset.locale`
 * and persists the resolved locale to storage; we prefer the already-applied
 * root value and fall back to storage for the first run, before the boot has
 * touched the DOM.
 */

import { domAdapter } from "@/adapters/dom";
import { navigatorLocaleSource } from "@/adapters/locale-source";
import { pagefindAdapter } from "@/adapters/pagefind";
import { localStorageAdapter } from "@/adapters/storage";
import type { ClientDeps } from "@/hooks/deps";
import { resolveLocale, type Locale } from "@/i18n";
import { appStore } from "@/store/app-store";

/** Storage key the pre-paint boot persists the resolved locale under. */
const LOCALE_STORAGE_KEY = "locale";

/**
 * Read the locale the pre-paint boot applied to the document root, or `null`
 * when unavailable/unsupported. Never throws.
 */
function readRootLocale(): Locale | null {
  try {
    const raw = document.documentElement.dataset.locale;
    if (!raw) return null;
    // `resolveLocale` falls back to the default for unknown codes, so an
    // unchanged round-trip is the supported-locale test.
    const resolved = resolveLocale(raw);
    return resolved === raw ? resolved : null;
  } catch {
    return null;
  }
}

/** Choose the initial locale: the boot's root value, else storage, else default. */
function seedLocale(deps: ClientDeps): void {
  const chosen =
    readRootLocale() ??
    resolveLocale(deps.adapters.storage.get(LOCALE_STORAGE_KEY) ?? undefined);
  deps.store.getState().setLocale(chosen);
}

/** Build the real dependency bundle and seed the store's locale. */
export function createClientDeps(): ClientDeps {
  const deps: ClientDeps = {
    store: appStore,
    adapters: {
      storage: localStorageAdapter,
      localeSource: navigatorLocaleSource,
      dom: domAdapter,
      pagefind: pagefindAdapter,
    },
  };

  seedLocale(deps);

  return deps;
}

/** The shared bundle every client consumer pulls from. */
export const clientDeps: ClientDeps = createClientDeps();
