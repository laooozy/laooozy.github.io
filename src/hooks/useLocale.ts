/**
 * Locale hook — reads the active locale from the store and switches it through
 * the injected storage + DOM adapters (persist, then reflect on the document
 * root). No browser global is touched here; `applyLocaleChange` is exported so
 * the side-effect sequence is testable without a React renderer.
 */

import { useCallback } from "react";
import { useStore } from "zustand";

import type { Locale } from "@/i18n";

import type { ClientDeps } from "./deps";

/** Storage key under which the chosen locale is persisted. */
export const LOCALE_STORAGE_KEY = "locale";

/** What `useLocale` returns. */
export interface LocaleController {
  /** The active locale, re-rendering when the store changes it. */
  locale: Locale;
  /** Persist + apply `next`, then update the store. */
  setLocale: (next: Locale) => void;
}

/**
 * The side-effect half of a locale switch, extracted for direct testing:
 * update the store, persist to storage, reflect `<html lang>` + `data-locale`.
 */
export function applyLocaleChange(deps: ClientDeps, next: Locale): void {
  deps.store.getState().setLocale(next);
  deps.adapters.storage.set(LOCALE_STORAGE_KEY, next);
  deps.adapters.dom.applyLocale(next);
}

export function useLocale(deps: ClientDeps): LocaleController {
  const locale = useStore(deps.store, (state) => state.locale);
  const setLocale = useCallback(
    (next: Locale) => applyLocaleChange(deps, next),
    [deps],
  );
  return { locale, setLocale };
}
