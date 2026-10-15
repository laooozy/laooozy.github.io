/**
 * Site-wide SEO switches.
 *
 * SITE_INDEXABLE is the ONE switch that controls whether search engines are
 * allowed to index this site. Everything search-related keys off it:
 *
 *   false (current) → the site is HIDDEN while it is still being built:
 *       - every page emits `<meta name="robots" content="noindex, nofollow" />`
 *         (the load-bearing part — a disallowed-but-known URL can still be
 *         indexed, so robots.txt alone is not enough);
 *       - `public/robots.txt` disallows all crawlers and drops the Sitemap line;
 *       - the @astrojs/sitemap integration is skipped, so no sitemap is emitted.
 *
 *   true → the site is PUBLIC again: the noindex meta tag disappears,
 *       robots.txt is permissive again (see the comment in public/robots.txt),
 *       and the sitemap integration runs as before.
 *
 * To re-enable indexing, flip this value to `true` — nothing else needs to
 * change. This file is imported by both `src/layouts/BaseLayout.astro` and
 * `astro.config.mjs`.
 */
export const SITE_INDEXABLE = false;
