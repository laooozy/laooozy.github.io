/**
 * Translation hook — returns a `t(key, vars?)` bound to the store's active
 * locale, delegating all interpolation/fallback to the pure `t` from `@/i18n`.
 * The hook only adds reactivity: it re-renders (and rebinds) when the locale
 * changes.
 */

import { useCallback } from "react";
import { useStore } from "zustand";

import {
  t as translate,
  type TranslationKey,
  type TranslationVars,
} from "@/i18n";

import type { ClientDeps } from "./deps";

/** A translation function already bound to one locale. */
export type Translate = (
  key: TranslationKey | (string & {}),
  vars?: TranslationVars,
) => string;

export function useT(deps: ClientDeps): Translate {
  const locale = useStore(deps.store, (state) => state.locale);
  return useCallback(
    (key: TranslationKey | (string & {}), vars?: TranslationVars) =>
      translate(locale, key, vars),
    [locale],
  );
}
