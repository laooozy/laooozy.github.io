/**
 * Locale metadata — the SINGLE source of truth for the site's locale codes.
 *
 * Every other list of the three codes (components, tests, the inline pre-paint
 * boot script) derives from `LOCALE_CODES` or is asserted against it by a test.
 * Add a locale HERE first and then wire its dictionary and the boot script's
 * generated map; it is deliberately not a one-file change.
 *
 * Codes are LOWERCASE (Astro normalises locale codes to lowercase in generated
 * URLs, so a mixed-case code would produce links that 404 against a
 * case-sensitive output folder). `langAttr` and `ogLocale` map each code to its
 * BCP-47 / Open Graph value.
 *
 * PURE: no Astro, no DOM, no runtime imports — safe to import from the build,
 * the client bootstrap and unit tests alike.
 */

/** The three site locale codes, in declaration order (default first). */
export const LOCALE_CODES = ["zh-hant", "zh-hans", "en"] as const;

/** The union of the site's locale codes, derived from `LOCALE_CODES`. */
export type Locale = (typeof LOCALE_CODES)[number];

/** The build/fallback locale. */
export const DEFAULT_LOCALE: Locale = "zh-hant";

/** Human-readable locale names, used by the language switcher. */
export const localeNames = {
  "zh-hant": "繁體中文",
  "zh-hans": "简体中文",
  en: "English",
} as const satisfies Record<Locale, string>;

/** BCP-47 language tag for the <html lang> attribute. */
export const langAttr = {
  "zh-hant": "zh-Hant",
  "zh-hans": "zh-Hans",
  en: "en",
} as const satisfies Record<Locale, string>;

/** Open Graph locale (`og:locale`) for each site locale. */
export const ogLocale = {
  "zh-hant": "zh_TW",
  "zh-hans": "zh_CN",
  en: "en_US",
} as const satisfies Record<Locale, string>;

/** Storage key the pre-paint boot persists the resolved locale under. */
export const LOCALE_STORAGE_KEY = "locale";

/**
 * Narrow an arbitrary locale string (e.g. `Astro.currentLocale`) to a known
 * locale.
 *
 * Uses `LOCALE_CODES.includes`, so inherited object members (`"toString"`,
 * `"constructor"`) are NOT accepted — they fall back to the default instead of
 * leaking a prototype function as a locale.
 */
export function resolveLocale(locale: string | undefined): Locale {
  return locale !== undefined &&
    (LOCALE_CODES as readonly string[]).includes(locale)
    ? (locale as Locale)
    : DEFAULT_LOCALE;
}

/**
 * Resolve the locale to apply before first paint from client-side hints.
 *
 * PURE: no DOM, no storage — the caller passes the two raw values so the
 * documented resolution order is unit-testable and shared with the inline boot
 * snippet in `src/client/locale-boot.ts` (which cannot import this module).
 *
 * Order:
 *  1. `stored` wins when it is exactly a supported locale code;
 *  2. otherwise `navigatorLang` is matched case-insensitively by prefix —
 *     `zh-hans`/`zh-cn`/`zh-sg` → `zh-hans`, `en` → `en`;
 *  3. anything else (including `zh-tw`/`zh-hk` and a missing hint) → default.
 */
export function resolveClientLocale(
  stored: string | null,
  navigatorLang: string | null,
): Locale {
  if (stored !== null && (LOCALE_CODES as readonly string[]).includes(stored)) {
    return stored as Locale;
  }

  const lang = navigatorLang?.toLowerCase() ?? "";
  if (
    lang.startsWith("zh-hans") ||
    lang.startsWith("zh-cn") ||
    lang.startsWith("zh-sg")
  ) {
    return "zh-hans";
  }
  if (lang.startsWith("en")) return "en";

  return DEFAULT_LOCALE;
}
