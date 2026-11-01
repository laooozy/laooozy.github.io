/**
 * Crawler policy for the static build.
 *
 * `SITE_INDEXABLE` in `src/lib/seo.ts` is the ONE switch: the same value feeds
 * the page-level `noindex` meta tag, the sitemap integration in
 * `astro.config.mjs` and this generator. Keeping the policy in a pure function
 * lets `seo.test.ts` assert both branches, so the switch and `robots.txt`
 * cannot silently disagree.
 */

import { SITE_URL } from "./site";

/**
 * Render the complete `robots.txt` body for the given indexing state.
 *
 * A hidden site disallows everything and never advertises a sitemap, because
 * no sitemap is generated. A public site allows everything and points at the
 * sitemap index Astro emits.
 */
export function robotsFor(indexable: boolean): string {
  if (!indexable) {
    return ["User-agent: *", "Disallow: /", ""].join("\n");
  }

  return [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${SITE_URL}/sitemap-index.xml`,
    "",
  ].join("\n");
}
