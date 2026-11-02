import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import {
  auditVisiblePage,
  contrastSummary,
  expectNoSeriousViolations,
  expectTokenContrast,
  measureElementContrast,
  measureTokenContrast,
  overrideToken,
  settlePage,
} from "./helpers/a11y";

/**
 * @a11y page content — Task 47.
 *
 * The chrome audit lives in `chrome-a11y.spec.ts`; this spec covers PAGE
 * CONTENT: every shipped route at 390 (the compact layout) and 1440 (the full
 * layout). Each audit runs after fonts load and after every finite entrance
 * animation has settled, with reduced motion pinned, so axe never samples a
 * half-faded block.
 *
 * Deliberate exclusions (none of them a rule suppression):
 *  - the consent-gated Instagram layer is `hidden` until a visitor opts in, so
 *    it is outside the accessibility tree and axe skips it. Auditing it would
 *    mean auditing third-party blockquote markup the site does not own.
 *  - closed overlays (search dialog, language menu) are covered by the chrome
 *    spec, not here; this spec audits the page as a visitor first sees it.
 *
 * `/music/` is stubbed before navigation: the payload comes from the local
 * fixture and every YouTube thumbnail is a 1×1 PNG, so the audit never depends
 * on the live `music_asset` branch or on i.ytimg.com.
 *
 * Contrast is measured, not asserted from a hex literal: `measureTokenContrast`
 * reads the live custom properties, normalises them to sRGB in the browser and
 * computes the WCAG 2.x ratio. The last test proves that probe can fail by
 * overriding `--accent` with a deliberately dark fill.
 */

const WIDTHS = [390, 1440] as const;

/** Longest hover transition on the filled controls, plus a frame. */
const HOVER_SETTLE_MS = 300;

const MUSIC_PAYLOAD = JSON.parse(
  readFileSync(
    join(process.cwd(), "scripts/music/fixtures/playlist.json"),
    "utf8",
  ),
) as unknown;

/** A 1x1 transparent PNG so fixture thumbnails never hit the network. */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

interface RouteCase {
  name: string;
  path: string;
  /** Islands whose hydration must finish before sampling. */
  islands: string[];
  /** 404 routes need an explicit status assertion. */
  status?: number;
  /** Route-specific setup that must run before navigation. */
  prepare?: (page: Page) => Promise<void>;
  /** Route-specific wait once the document has loaded. */
  ready?: (page: Page) => Promise<void>;
}

async function stubMusic(page: Page): Promise<void> {
  await page.route(/i\.ytimg\.com/, (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: TINY_PNG }),
  );
  await page.route("**/music.json.gz", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MUSIC_PAYLOAD),
    }),
  );
}

/** Wait for every named `client:*` island to finish hydrating. */
async function waitForIslands(page: Page, names: string[]): Promise<void> {
  await page.waitForFunction((components) => {
    return components.every((name) => {
      const island = document.querySelector(
        `astro-island[component-url*="${name}"]`,
      );
      return island !== null && !island.hasAttribute("ssr");
    });
  }, names);
}

async function waitForMusicRows(page: Page): Promise<void> {
  await expect(page.locator("[data-music-row]").first()).toBeVisible();
}

const ROUTES: RouteCase[] = [
  {
    name: "home",
    path: "/",
    islands: ["SiteHeader", "SiteFooter", "ScrollControls"],
  },
  {
    name: "photographer",
    path: "/photographer/",
    islands: ["SiteHeader", "SiteFooter", "ScrollControls", "InstagramGate"],
  },
  {
    name: "links",
    path: "/links/",
    islands: ["SiteHeader", "SiteFooter", "ScrollControls"],
  },
  {
    name: "blog",
    path: "/blog/",
    islands: ["SiteHeader", "SiteFooter", "ScrollControls", "BlogList"],
  },
  {
    name: "post",
    path: "/blog/2026-10-20_bootstrap-blog/",
    islands: ["SiteHeader", "SiteFooter", "ScrollControls", "PostHeader"],
  },
  {
    name: "music",
    path: "/music/",
    islands: ["SiteHeader", "SiteFooter", "ScrollControls", "MusicLibrary"],
    prepare: stubMusic,
    ready: waitForMusicRows,
  },
  {
    name: "not-found",
    path: "/this-page-does-not-exist",
    islands: ["SiteHeader", "SiteFooter", "ScrollControls", "NotFound"],
    status: 404,
  },
];

for (const route of ROUTES) {
  test.describe(`@a11y content: ${route.name}`, () => {
    for (const width of WIDTHS) {
      test(`has zero serious axe violations at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({
          width,
          height: width === 390 ? 844 : 900,
        });
        await route.prepare?.(page);

        const response = await page.goto(route.path);
        if (route.status !== undefined) {
          expect(response?.status(), `${route.path} status`).toBe(route.status);
        }

        await waitForIslands(page, route.islands);
        await route.ready?.(page);
        await settlePage(page);

        const audit = await auditVisiblePage(page);

        await testInfo.attach(`axe-${route.name}-${width}.json`, {
          body: JSON.stringify(audit, null, 2),
          contentType: "application/json",
        });

        expectNoSeriousViolations(
          audit,
          `${route.path} page content @ ${width}px`,
        );
      });
    }
  });
}

test.describe("@a11y contrast", () => {
  test("measured token pairs clear WCAG AA for normal text", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await settlePage(page);

    // Every pair is read from the live `:root` custom properties; the values
    // are never duplicated in this spec, so a token retune cannot drift from
    // what the browser actually paints.
    const pairs = [
      { fg: "--text-on-accent", bg: "--accent" },
      // The filled hover state must stay AA: `hover:bg-primary/80` used to
      // composite the accent over the page and drop this pair to 3.63:1.
      { fg: "--text-on-accent", bg: "--primary-hover" },
      { fg: "--accent", bg: "--bg-base" },
      // `--accent-text` is the body-link colour (`a { color: ... }` in
      // global.css) and `--text-muted` is body-size copy, so both must clear
      // the normal-text floor.
      { fg: "--accent-text", bg: "--bg-base" },
      { fg: "--text-muted", bg: "--bg-base" },
      { fg: "--text", bg: "--bg-base" },
    ] as const;

    const measurements = [];
    for (const { fg, bg } of pairs) {
      const measurement = await measureTokenContrast(page, fg, bg);
      console.log(contrastSummary(measurement));
      expectTokenContrast(measurement, `${fg} on ${bg}`);
      measurements.push(measurement);
    }

    await testInfo.attach("contrast-ratios.json", {
      body: JSON.stringify(measurements, null, 2),
      contentType: "application/json",
    });
  });

  test("the contrast probe rejects a low-contrast fill", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await settlePage(page);

    // QA scenario from the plan: a bad token must make the measurement fail.
    // The override is test-local and never reaches the shipped stylesheet.
    await overrideToken(page, "--accent", "#2a2140");

    const measurement = await measureTokenContrast(
      page,
      "--text-on-accent",
      "--accent",
    );
    console.log(`negative probe: ${contrastSummary(measurement)}`);

    expect(
      measurement.passes,
      `a dark accent fill must fail 4.5:1, got ${measurement.ratio.toFixed(2)}:1`,
    ).toBe(false);
  });
});

test.describe("@a11y hover contrast", () => {
  test("the active blog filter keeps AA while hovered", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "chromium-mobile",
      "touch devices do not expose hover",
    );

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/blog/");
    await settlePage(page);

    const active = page.locator('[data-blog-filter][aria-current="page"]');
    await expect(active).toBeVisible();

    await active.hover();
    // The chip cross-fades its fill; sample only after the transition lands.
    await page.waitForTimeout(HOVER_SETTLE_MS);

    const measurement = await measureElementContrast(active);
    console.log(
      `blog filter hover: ${measurement.foreground} on ${measurement.background} (raw ${measurement.backgroundRaw}, hover ${measurement.hovered}) = ${measurement.ratio.toFixed(2)}:1 (alpha ${measurement.alpha})`,
    );
    expect(
      measurement.passes,
      `active blog filter hover must clear ${measurement.required}:1, got ${measurement.ratio}:1 on ${measurement.background}`,
    ).toBe(true);

    const audit = await auditVisiblePage(page);
    await testInfo.attach("axe-blog-filter-hover.json", {
      body: JSON.stringify(audit, null, 2),
      contentType: "application/json",
    });

    expectNoSeriousViolations(audit, "active blog filter on hover");
  });
});

/**
 * Focus visibility on every keyboard stop. The global `:focus-visible` rule in
 * global.css paints a 2px accent outline; this walks the real tab order of each
 * route and asserts the indicator is present for every stop, so a component
 * that opts out of the ring is caught as content, not just chrome.
 */
for (const route of ROUTES) {
  test(`@a11y focus stays visible on ${route.name} at 390px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await route.prepare?.(page);

    const response = await page.goto(route.path);
    if (route.status !== undefined) {
      expect(response?.status(), `${route.path} status`).toBe(route.status);
    }
    await waitForIslands(page, route.islands);
    await route.ready?.(page);
    await settlePage(page);

    const visited = new Set<string>();
    const failures: string[] = [];

    for (let step = 0; step < 80; step += 1) {
      await page.keyboard.press("Tab");

      const focused = await page.evaluate(() => {
        const element = document.activeElement;
        if (!(element instanceof HTMLElement) || element === document.body) {
          return null;
        }
        const style = getComputedStyle(element);
        const outlined =
          style.outlineStyle !== "none" &&
          Number.parseFloat(style.outlineWidth) >= 1 &&
          style.outlineColor !== "rgba(0, 0, 0, 0)";

        return {
          key: `${element.tagName.toLowerCase()}#${element.id}.${Array.from(
            element.classList,
          )
            .slice(0, 2)
            .join(".")}:${(element.textContent ?? "").trim().slice(0, 24)}`,
          focusVisible: element.matches(":focus-visible"),
          outlined,
        };
      });

      if (!focused) break;
      if (visited.has(focused.key)) break;
      visited.add(focused.key);

      if (!focused.focusVisible || !focused.outlined) {
        failures.push(
          `${focused.key} (focus-visible=${focused.focusVisible}, outline=${focused.outlined})`,
        );
      }
    }

    expect(
      visited.size,
      "the tab walk reached at least one control",
    ).toBeGreaterThan(0);
    expect(
      failures,
      `controls without a visible focus indicator: ${failures.join(", ")}`,
    ).toEqual([]);
  });
}
