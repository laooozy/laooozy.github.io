/**
 * Hydration-safe translation hook — the single locale binding for hydrated
 * chrome.
 *
 * The build emits every page in the build locale (`DEFAULT_LOCALE`, currently
 * `zh-hant`), while the pre-paint boot may seed the store with another locale
 * before React's first client render. Reading the store directly on that first
 * render would make the client markup differ from the SSR HTML and React would
 * log a hydration mismatch.
 *
 * This hook solves that in one place: until the mount effect flips
 * `isHydrated`, `locale` is pinned to the build locale and `t` translates in
 * it. After mount the store locale is adopted, so switching language still
 * re-renders every consumer in place — no reload, no URL change.
 *
 * `isHydrated` is deliberately part of the return value so a consumer that
 * needs to know whether it may read store-dependent data can ask, but it must
 * never be used to render different MARKUP than the server: the first client
 * render is always the build locale.
 */

import { useCallback, useEffect, useState } from "react";
import { useStore } from "zustand";

import { useClientDeps } from "@/components/shared/ClientDepsContext";
import {
  DEFAULT_LOCALE,
  type Locale,
  t as translate,
  type TranslationKey,
  type TranslationVars,
} from "@/i18n";

import type { Translate } from "./useT";

/** What `useHydrationSafeT` returns. */
export interface HydrationSafeTranslation {
  /** Translation function bound to the hydration-safe locale. */
  t: Translate;
  /** Build locale until mounted, then the store locale. */
  locale: Locale;
  /** `false` on the server and the first client render, `true` after mount. */
  isHydrated: boolean;
}

export function useHydrationSafeT(): HydrationSafeTranslation {
  const deps = useClientDeps();
  const storeLocale = useStore(deps.store, (state) => state.locale);
  // `false` on the server AND on the first client render, so SSR and the
  // hydration render agree; flipped once after mount.
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const locale: Locale = isHydrated ? storeLocale : DEFAULT_LOCALE;

  const t = useCallback(
    (key: TranslationKey | (string & {}), vars?: TranslationVars) =>
      translate(locale, key, vars),
    [locale],
  );

  return { t, locale, isHydrated };
}
