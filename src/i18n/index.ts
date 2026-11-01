/**
 * Pure i18n core.
 *
 * Locale metadata (codes, names, BCP-47 tags, storage key and resolution
 * rules) lives in `./locales.ts`; each locale's chrome dictionary lives in
 * `./dictionaries/`. This module assembles them into the `ui` map and the
 * translation helpers.
 *
 * These strings are the FIXED CHROME only: nav, footer, search, blog-listing,
 * 404, the links heading and the brand/meta strings. Page content lives in the
 * zh-hant MDX entries (`src/content/pages/*.mdx`) and is never translated, so
 * there are no content keys here.
 *
 * These strings are authored per locale. LLM-assisted translation is permitted:
 * a locale may be drafted by a model, but it must read naturally, keep the same
 * voice and never ship as raw machine output (see `PRODUCT.md`).
 *
 * This module is pure data + pure functions: no Astro, no DOM.
 */

import en from "./dictionaries/en";
import zhHans from "./dictionaries/zh-hans";
import zhHant from "./dictionaries/zh-hant";
import { DEFAULT_LOCALE, type Locale } from "./locales";
import type { DotPaths, TranslationVars } from "./types";

export {
  DEFAULT_LOCALE,
  LOCALE_CODES,
  LOCALE_STORAGE_KEY,
  langAttr,
  localeNames,
  ogLocale,
  resolveClientLocale,
  resolveLocale,
} from "./locales";
export type { Locale } from "./locales";
export type { DotPaths, TranslationVars } from "./types";

/** Every locale's chrome dictionary, keyed by locale code. */
export const ui = {
  "zh-hant": zhHant,
  "zh-hans": zhHans,
  en,
} as const;

/** The `ui` dictionary shape (all locales share it). */
export type UI = (typeof ui)[Locale];

/** Union of dotted key paths to translatable string leaves, e.g. `"blog.pageOf"`. */
export type TranslationKey = DotPaths<(typeof ui)[typeof DEFAULT_LOCALE]>;

/** Bind the translation dictionary for `locale` (falling back to the default). */
export function getTranslations(locale: Locale): UI {
  return ui[locale] ?? ui[DEFAULT_LOCALE];
}

/** Resolve a dotted path against an object, returning `undefined` if absent. */
function readPath(source: unknown, path: readonly string[]): unknown {
  let current: unknown = source;
  for (const part of path) {
    if (
      current !== null &&
      typeof current === "object" &&
      part in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Pure translation lookup: resolves a dotted `key` against the dictionary for
 * `locale` and interpolates `{var}` placeholders from `vars`.
 *
 * Never throws. If the key is unknown (or resolves to a non-string, e.g. an
 * array branch) the original `key` string is returned as the documented
 * fallback. Missing interpolation variables leave their `{placeholder}` intact.
 */
export function t(
  locale: Locale,
  key: TranslationKey,
  vars?: TranslationVars,
): string {
  const value = readPath(
    ui[locale] ?? ui[DEFAULT_LOCALE],
    String(key).split("."),
  );
  if (typeof value !== "string") return key;
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
