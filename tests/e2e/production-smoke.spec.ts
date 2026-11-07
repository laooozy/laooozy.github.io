import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { SITE_UPDATED_FIXTURE_STAMP } from "../../src/lib/io/site-updated-fixture";
import { SITE_INDEXABLE } from "../../src/lib/seo";

/**
 * Production-artifact smoke (`@production`).
 *
 * This spec is deliberately separate from the fixture suite. It only runs when
 * `PLAYWRIGHT_BASE_URL` points at a real production build (`bun run build` with
 * no fixture environment, then `bun run pagefind` and
 * `node scripts/serve-dist.mjs`). The fixture harness exports
 * `SITE_UPDATED_FIXTURE=1` / `INSTAGRAM_OEMBED_FIXTURE=1`; both are build-time
 * seams, so letting either leak in would make every assertion here prove the
 * wrong artifact.
 *
 * The fixture suite (E2E, a11y, visual) keeps running against the deterministic
 * fixture build. `bun run test:prod` is the only command that selects this spec.
 *
 * Network note: `/music/` reads the published `music_asset` payload at runtime.
 * The smoke stubs that one URL with the repository's canonical playlist fixture
 * exactly like `journey.spec.ts`, so the route is exercised deterministically
 * and a missing/rotated external data branch cannot make the production gate
 * flaky. No other request is intercepted; in particular the Photography wall
 * must make no Instagram/Facebook request before consent.
 */

const PRODUCTION_BASE_URL = process.env.PLAYWRIGHT_BASE_URL;
const GUARD_MESSAGE =
  "set PLAYWRIGHT_BASE_URL to a production artifact server (see bun run test:prod)";

const PRODUCTION_STAMP = (
  JSON.parse(
    readFileSync(join(process.cwd(), "src/data/site-updated.json"), "utf8"),
  ) as { updatedAt: string }
).updatedAt;

const MUSIC_FIXTURE = readFileSync(
  join(process.cwd(), "scripts/music/fixtures/playlist.json"),
  "utf8",
);

/** A 1x1 transparent PNG so fixture thumbnails never touch the network. */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const THIRD_PARTY = /instagram\.com|cdninstagram\.com|facebook\.com/i;

/**
 * GitHub Pages resolves `/404` to `404.html` with status 200, so the not-found
 * document is asserted on its own route and a genuinely unknown path proves the
 * 404 response.
 */
const UNKNOWN_PATH = "/this-page-does-not-exist";

interface RouteCase {
  path: string;
  status: number;
  /** The route's own visible content marker. */
  marker: string;
  /** Text expected in the page's single `<h1>`. */
  heading: string;
  /** The music route fetches its payload at runtime. */
  music?: boolean;
}

const ROUTES: readonly RouteCase[] = [
  { path: "/", status: 200, marker: "[data-site-footer]", heading: "laooozy" },
  {
    path: "/blog/",
    status: 200,
    marker: "[data-blog-listing]",
    heading: "最新文章",
  },
  {
    path: "/photographer/",
    status: 200,
    marker: "[data-ig-wall]",
    heading: "攝影師",
  },
  {
    path: "/links/",
    status: 200,
    marker: "[data-links-list]",
    heading: "連結",
  },
  {
    path: "/music/",
    status: 200,
    marker: "[data-music-library]",
    heading: "Music",
    music: true,
  },
  {
    path: "/404",
    status: 200,
    marker: "[data-not-found]",
    heading: "找不到頁面",
  },
  {
    path: UNKNOWN_PATH,
    status: 404,
    marker: "[data-not-found]",
    heading: "找不到頁面",
  },
  {
    path: "/blog/2026-10-20_bootstrap-blog/",
    status: 200,
    marker: ".prose-brand",
    heading: "創世文",
  },
] as const;

/**
 * Chromium logs the expected 404 DOCUMENT response as a console error when an
 * unknown path is loaded. It is the browser reporting the route's status, not
 * an app error: the served document is still the real not-found page. `/404`
 * itself answers 200 on GitHub Pages, so it must produce no console error.
 * Every other console error (including any 404 subresource) stays fatal.
 */
const EXPECTED_404_CONSOLE_ERROR =
  "console.error: Failed to load resource: the server responded with a status of 404 (Not Found)";

/** Collect uncaught page errors and console errors for one fresh page. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console.error: ${message.text()}`);
    }
  });
  return errors;
}

function unexpectedErrors(status: number, errors: string[]): string[] {
  if (status !== 404) return errors;

  const expected = errors.filter(
    (error) => error === EXPECTED_404_CONSOLE_ERROR,
  );
  expect(expected.length, "expected exactly one 404 document console log").toBe(
    1,
  );
  return errors.filter((error) => error !== EXPECTED_404_CONSOLE_ERROR);
}

/** Wait for fonts, the load event and the idle hydration work to finish. */
async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("load");
  await page.evaluate(async () => {
    await document.fonts?.ready;
  });
  // The shell's islands are `client:idle`; give the browser a moment to run
  // them so a hydration error or an at-rest third-party request is observed.
  await page.waitForTimeout(750);
}

/** Serve the canonical music payload and thumbnails without the live branch. */
async function stubMusic(page: Page): Promise<void> {
  await page.route(/i\.ytimg\.com/, (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: TINY_PNG }),
  );
  await page.route("**/music.json.gz", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: MUSIC_FIXTURE,
    }),
  );
}

test.describe("production artifact smoke @production", () => {
  test.beforeEach(() => {
    test.skip(!PRODUCTION_BASE_URL, GUARD_MESSAGE);
  });

  test("the build was produced without fixture environment", () => {
    expect(process.env.SITE_UPDATED_FIXTURE).not.toBe("1");
    expect(process.env.INSTAGRAM_OEMBED_FIXTURE).not.toBe("1");
  });

  for (const route of ROUTES) {
    test(`${route.path} serves its production content`, async ({ page }) => {
      if (route.music) await stubMusic(page);

      const errors = collectErrors(page);
      const response = await page.goto(route.path);

      expect(response?.status(), route.path).toBe(route.status);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("main h1").first()).toBeVisible();
      await expect(page.locator("main h1").first()).toContainText(
        route.heading,
      );
      await expect(page.locator(route.marker).first()).toBeVisible();

      if (route.music) {
        await expect(page.locator("[data-music-row]").first()).toBeVisible();
      }

      await settle(page);

      const remaining = unexpectedErrors(route.status, errors);
      expect(
        remaining,
        `${route.path} browser errors:\n${remaining.join("\n")}`,
      ).toEqual([]);
    });
  }

  test("the production footer shows the committed stamp, not the fixture", async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.goto("/");

    const stamp = page.locator("[data-site-footer] time");
    await expect(stamp).toBeVisible();
    await expect(stamp).toHaveAttribute("datetime", PRODUCTION_STAMP);
    await expect(stamp).not.toHaveAttribute(
      "datetime",
      SITE_UPDATED_FIXTURE_STAMP,
    );

    await settle(page);

    expect(errors, `browser errors:\n${errors.join("\n")}`).toEqual([]);
  });

  test("raw production HTML carries no fixture marker or fixture stamp", async ({
    request,
  }) => {
    const response = await request.get("/");
    expect(response.status()).toBe(200);
    const html = await response.text();

    expect(html).not.toContain(SITE_UPDATED_FIXTURE_STAMP);
    expect(html).not.toContain("SITE_UPDATED_FIXTURE");
    expect(html).not.toContain("INSTAGRAM_OEMBED_FIXTURE");
  });

  test("photography is inert before consent", async ({ page }) => {
    const thirdParty: string[] = [];
    page.on("request", (request) => {
      if (THIRD_PARTY.test(request.url())) thirdParty.push(request.url());
    });

    const errors = collectErrors(page);
    await page.goto("/photographer/");

    await expect(page.locator("[data-ig-wall]")).toBeVisible();
    await expect(page.locator("[data-ig-gate]")).toBeVisible();
    await expect(page.locator("[data-ig-consent]")).toBeVisible();

    const liveMedia = await page
      .locator(
        [
          "[data-ig-wall] img",
          "[data-ig-wall] iframe",
          "[data-ig-wall] picture",
          "[data-ig-wall] video",
          "[data-ig-wall] script",
          "[data-ig-embeds] > *",
          "[data-ig-embeds] script",
          "script#instagram-embed",
        ].join(", "),
      )
      .count();
    expect(liveMedia).toBe(0);
    await expect(page.locator("[data-ig-embeds]")).toHaveAttribute(
      "hidden",
      "",
    );

    await settle(page);
    expect(thirdParty, "third-party requests before consent").toEqual([]);

    expect(errors, `browser errors:\n${errors.join("\n")}`).toEqual([]);
  });

  test("robots metadata and robots.txt agree with SITE_INDEXABLE", async ({
    page,
    request,
  }) => {
    await page.goto("/");

    const robots = page.locator('meta[name="robots"]');
    if (SITE_INDEXABLE) {
      await expect(robots).toHaveCount(0);
    } else {
      await expect(robots).toHaveAttribute("content", "noindex, nofollow");
    }

    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();

    if (SITE_INDEXABLE) {
      expect(body).toContain("Allow: /");
      expect(body).toContain("Sitemap:");
      expect(body).not.toContain("Disallow: /");
    } else {
      expect(body).toContain("Disallow: /");
      expect(body).not.toContain("Allow: /");
      expect(body).not.toContain("Sitemap:");
    }
  });
});
