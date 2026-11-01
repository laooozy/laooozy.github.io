/**
 * Site-wide SEO switches.
 *
 * SITE_INDEXABLE is the ONE switch that controls whether search engines are
 * allowed to index this site. Everything search-related keys off it:
 *
 *   false (current) → the site is HIDDEN while it is still being built:
 *       - every page emits `<meta name="robots" content="noindex, nofollow" />`
 *         (the load-bearing part, because a disallowed-but-known URL can still
 *         be indexed, so robots.txt alone is not enough);
 *       - the generated `dist/robots.txt` disallows all crawlers and drops the
 *         Sitemap line (`src/lib/robots.ts`);
 *       - the @astrojs/sitemap integration is skipped, so no sitemap is emitted.
 *
 *   true → the site is PUBLIC again: the noindex meta tag disappears, the
 *       generated robots.txt allows crawlers and points at the sitemap index,
 *       and the sitemap integration runs.
 *
 * To re-enable indexing, flip this value to `true` — nothing else needs to
 * change. This file is imported by both `src/layouts/BaseLayout.astro` and
 * `astro.config.mjs`.
 */
export const SITE_INDEXABLE = false;
