/**
 * Shared hook types — neutral module so the translation-function shape does
 * not live beside a hook implementation.
 *
 * `Translate` is the return shape of every locale-bound translator: a plain
 * `t(key, vars?)` bound to one locale. It is imported by the live
 * `useHydrationSafeT` hook and by consumers that receive a translator as a
 * prop or build one outside React.
 */

import type { TranslationKey, TranslationVars } from "@/i18n";

/** A translation function already bound to one locale. */
export type Translate = (key: TranslationKey, vars?: TranslationVars) => string;
