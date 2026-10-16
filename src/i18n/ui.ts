/**
 * i18n UI-string layer — backward-compatible re-export barrel.
 *
 * The pure core now lives in `./index.ts` (dictionary data + `t()` +
 * `resolveLocale`/`useTranslations`) and `./types.ts` (`Locale` + key helpers).
 * This module is kept so the ~21 existing importers of `src/i18n/ui` keep
 * resolving every export they relied on:
 *
 *   languages, defaultLang, games, vtubers, contactIdentity,
 *   langAttr, ogLocale, ui, Locale,
 *   resolveLocale, useTranslations, t
 *
 * New code should import from `./index` directly.
 */
export * from "./index";
