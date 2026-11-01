import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

/**
 * Task 48 — screenshot regression against committed baselines.
 *
 * The matrix is the migration review set from
 * `.omo/evidence/architecture-artwork-refactor/baseline/`: the seven routes at
 * 390 and 1440 CSS px, plus the four key surfaces at 768 and 1024. Every shot
 * is a full-page capture of the SHIPPED `dist/` artifact served by the Task 46
 * harness (`e2e:serve`), never the dev server.
 *
 * Determinism measures, all applied before the capture:
 *  - `reducedMotion: reduce` + `animations: "disabled"` pin the entrance
 *    reveals, the nebula drift and every transition to a final frame;
 *  - fonts, all Astro islands, every image and two animation frames settle
 *    first, so no glyph or image arrives after the capture;
 *  - ONLY the decorative `#atmosphere-canvas` is hidden. It is a particle
 *    animation with no content or layout, so it can never be a stable pixel
 *    subject; the static CSS nebula wash (`body::before`) stays in frame;
 *  - scrollbars are suppressed so a gutter never shifts a 390/1440 layout;
 *  - `/music/` serves the canonical four-song
 *    `scripts/music/fixtures/playlist.json` and every YouTube thumbnail is a
 *    1x1 local PNG, so no live `music_asset` or third-party request is made;
 *  - the build already uses the Instagram oEmbed fixture
 *    (`INSTAGRAM_OEMBED_FIXTURE=1`, Task 46 harness), so the Photography wall
 *    is deterministic;
 *  - the footer's build stamp changes on every commit (the pre-commit hook
 *    rewrites `src/data/site-updated.json`), so the harness also sets
 *    `SITE_UPDATED_FIXTURE=1` and the build renders the fixed
 *    `2026-01-01T00:00` stamp. A production build is unaffected.
 *
 * Baselines are pinned to the `chromium` project (Desktop Chrome, DPR 1): the
 * `chromium-mobile` project would repeat the same 390px routes at DPR 2.75 on
 * a 393px viewport, adding no coverage but a second, OS-scaled pixel grid. The
 * environment is Linux Chromium with the bundled `@fontsource` Latin faces and
 * system Noto Sans CJK TC (CI installs `fonts-noto-cjk` in Task 50); a
 * different font package invalidates the baselines.
 */

const POST_PATH = "/blog/2026-10-20_bootstrap-blog/";

const MUSIC_FIXTURE = readFileSync(
  join(process.cwd(), "scripts/music/fixtures/playlist.json"),
  "utf8",
);

/** The fixture ships four songs; the literal count is a determinism guard. */
const MUSIC_SONG_COUNT = 4;

/** A 1x1 transparent PNG so fixture thumbnails never reach the network. */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const ROUTES = [
  { key: "home", path: "/" },
  { key: "blog", path: "/blog/" },
  { key: "photographer", path: "/photographer/" },
  { key: "links", path: "/links/" },
  { key: "music", path: "/music/" },
  { key: "404", path: "/404" },
  { key: "post", path: POST_PATH },
] as const;

/** The four surfaces the plan reviews at the middle breakpoints too. */
const KEY_ROUTE_KEYS = new Set(["home", "blog", "photographer", "music"]);

const VIEWPORTS = [
  { width: 390, height: 844, keyRoutes: true },
  { width: 1440, height: 900, keyRoutes: true },
  { width: 768, height: 1024, keyRoutes: false },
  { width: 1024, height: 768, keyRoutes: false },
] as const;

type Route = (typeof ROUTES)[number];

/** Serve the canonical fixture payload and a local thumbnail for every song. */
async function stubMusic(page: Page): Promise<void> {
  await page.route(/i\.ytimg\.com/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: TINY_PNG,
    }),
  );
  await page.route("**/music.json.gz", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: MUSIC_FIXTURE,
    }),
  );
}

/** Resolve once every Astro island has hydrated (it loses its `ssr` marker). */
async function waitForAllIslands(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const islands = Array.from(document.querySelectorAll("astro-island"));
      return (
        islands.length > 0 &&
        islands.every((island) => !island.hasAttribute("ssr"))
      );
    },
    undefined,
    { timeout: 20_000 },
  );
}

/**
 * Hide non-content painting that is not a stable pixel subject, wait for the
 * page to settle, and force off-screen music rows to rasterise.
 */
async function settleForCapture(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      /* Decorative canvas only: a particle animation, no content or layout.
         The static CSS nebula wash (body::before) stays visible. */
      #atmosphere-canvas { visibility: hidden !important; }
      /* No scrollbar gutter in a full-page capture. */
      html, body { scrollbar-width: none !important; }
      html::-webkit-scrollbar,
      body::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
    `,
  });

  await waitForAllIslands(page);

  await page.evaluate(async () => {
    await document.fonts?.ready;
  });

  await page.evaluate(() => {
    // The music list uses `content-visibility: auto` to skip off-screen rows.
    // A full-page capture must include them, so let them paint; this only
    // enables painting, it does not hide or change content.
    for (const row of document.querySelectorAll<HTMLElement>(
      "[data-music-row]",
    )) {
      row.style.contentVisibility = "visible";
    }
    // Force lazy thumbnails to load before the capture.
    for (const image of Array.from(document.images)) {
      image.loading = "eager";
    }
  });

  await page.evaluate(async () => {
    await Promise.all(
      Array.from(document.images).map((image) =>
        image.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            }),
      ),
    );
  });

  // Two frames: one to flush the eager images, one for the final layout.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function capture(page: Page, route: Route): Promise<void> {
  if (route.key === "music") {
    await stubMusic(page);
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route.path, { waitUntil: "load" });

  if (route.key === "music") {
    await expect(page.locator("[data-music-row]")).toHaveCount(
      MUSIC_SONG_COUNT,
    );
    await expect(page.locator("[data-music-row]").first()).toBeVisible();
  }

  await settleForCapture(page);

  await expect(page).toHaveScreenshot(
    `${route.key}-${page.viewportSize()!.width}.png`,
    {
      fullPage: true,
    },
  );
}

test.beforeEach(({ browserName }, testInfo) => {
  test.skip(
    browserName !== "chromium" || testInfo.project.name !== "chromium",
    "Visual baselines are pinned to the chromium project (Desktop Chrome, DPR 1). " +
      "The chromium-mobile project would re-capture the 390px routes at DPR 2.75 " +
      "with no extra coverage; run `bun run test:visual` instead.",
  );
});

for (const viewport of VIEWPORTS) {
  const routes = viewport.keyRoutes
    ? ROUTES
    : ROUTES.filter((route) => KEY_ROUTE_KEYS.has(route.key));

  test.describe(`@visual ${viewport.width}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of routes) {
      test(`${route.key} at ${viewport.width}px`, async ({ page }) => {
        await capture(page, route);
      });
    }
  });
}
