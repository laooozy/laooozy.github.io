/**
 * Locale-URL helpers for canonical + hreflang SEO alternates.
 *
 * The default locale (zh-hant) is served unprefixed at the root, so every
 * canonical/hreflang URL is derived from a locale-neutral path: strip any
 * non-default locale prefix, then re-prefix with `getRelativeLocaleUrl`. This
 * keeps each locale's alternate pointing at the same page.
 */
import { getRelativeLocaleUrl } from "astro:i18n";
import { defaultLang, languages, type Locale } from "../i18n/ui";

/** Locale-neutral relative path (no leading/trailing slash) for `getRelativeLocaleUrl`. */
export function neutralSlug(pathname: string): string {
  for (const loc of Object.keys(languages)) {
    if (loc === defaultLang) continue;
    if (pathname === `/${loc}` || pathname === `/${loc}/`) return "";
    if (pathname.startsWith(`/${loc}/`)) {
      return pathname
        .slice(loc.length + 1)
        .replace(/^\//, "")
        .replace(/\/$/, "");
    }
  }
  return pathname.replace(/^\//, "").replace(/\/$/, "");
}

export interface Alternate {
  locale: Locale;
  href: string;
}

/** Absolute URL of the current page in every locale, for hreflang alternates. */
export function alternateUrls(pathname: string, site: URL): Alternate[] {
  const slug = neutralSlug(pathname);
  return (Object.keys(languages) as Locale[]).map((locale) => ({
    locale,
    href: new URL(getRelativeLocaleUrl(locale, slug), site).href,
  }));
}
