/**
 * Search-indexing policy guards.
 *
 * `SITE_INDEXABLE` drives three surfaces: the `noindex` meta tag in
 * `BaseLayout`, the sitemap integration in `astro.config.mjs` and the generated
 * `robots.txt`. These tests pin the generator's two branches and prove the
 * current switch produces the matching policy, so a flip cannot leave a
 * permissive robots file in front of a hidden site (or the reverse).
 */

import { describe, expect, it } from "vitest";

import { robotsFor } from "./robots";
import { SITE_INDEXABLE } from "./seo";
import { SITE_URL } from "./site";

describe("robotsFor", () => {
  it("disallows every crawler and drops the sitemap while the site is hidden", () => {
    const robots = robotsFor(false);

    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Disallow: /");
    expect(robots).not.toContain("Allow: /");
    expect(robots).not.toContain("Sitemap:");
  });

  it("allows crawlers and advertises the sitemap index while the site is public", () => {
    const robots = robotsFor(true);

    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Allow: /");
    expect(robots).not.toContain("Disallow: /");
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap-index.xml`);
  });
});

describe("SITE_INDEXABLE", () => {
  it("keeps the live switch and the generated robots.txt consistent", () => {
    const robots = robotsFor(SITE_INDEXABLE);

    if (SITE_INDEXABLE) {
      expect(robots).toContain("Allow: /");
      expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap-index.xml`);
    } else {
      expect(robots).toContain("Disallow: /");
      expect(robots).not.toContain("Sitemap:");
    }
  });
});
