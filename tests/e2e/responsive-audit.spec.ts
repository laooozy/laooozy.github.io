import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow } from "./helpers/overflow";
import {
  expectMinimumFontSize,
  expectTouchTarget,
  MIN_TOUCH_TARGET,
} from "./helpers/target-size";

/**
 * Task 42 — the full mobile-first responsive audit.
 *
 * Covers the AGENTS.md test matrix at 320, 390, 768, 1024 and 1440 CSS px:
 *
 *  - no route scrolls sideways, at rest and with every overlay open;
 *  - every visible interactive control in chrome, menus, dialogs, lists,
 *    filters and cards is at least 44x44 under a coarse pointer;
 *  - every visible form control computes to at least 16px;
 *  - fixed chrome (sticky header, scroll control, safe-area offsets) stays
 *    inside the viewport and does not cover page content;
 *  - the Photography and Music back-link → page-title gap is the token gap,
 *    not the retired ~180px disconnect.
 *
 * Inline prose links and third-party Instagram embed anchors are excluded from
 * the target-size scan on purpose: prose links are text, not controls, and the
 * embed's own markup is created by Meta and cannot be restyled contractually.
 * Everything else is measured live with `getBoundingClientRect` and
 * `getComputedStyle`; no assertion relies on screenshot pixels.
 */

const ROUTES = [
  "/",
  "/blog/",
  "/photographer/",
  "/music/",
  "/links/",
  "/404",
  "/blog/2026-10-20_bootstrap-blog/",
] as const;

const ROUTE_CAPTURE_NAMES: Record<string, string> = {
  home: "/",
  blog: "/blog/",
  photographer: "/photographer/",
  music: "/music/",
  links: "/links/",
  notfound: "/404",
  post: "/blog/2026-10-20_bootstrap-blog/",
};

const WIDTHS = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
] as const;

/** Coarse-pointer widths from the matrix (phone and touch tablet). */
const COARSE_WIDTHS = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
] as const;

const SCREENSHOT_DIR = join(
  process.cwd(),
  ".omo/evidence/architecture-artwork-refactor/task-42",
);

const MUSIC_PAYLOAD = {
  version: 1,
  generatedAt: "2026-01-01T00:00:00.000Z",
  playlist: {
    id: "PLresponsiveaudit",
    title: "Responsive audit fixture",
    url: "https://www.youtube.com/playlist?list=PLresponsiveaudit",
  },
  organisations: { indie: "Indie", label: "Label" },
  songs: Array.from({ length: 9 }, (_, index) => ({
    id: `responsive-audit-${index}`,
    title: `Song ${String(index + 1).padStart(2, "0")} with a longer title`,
    artist: index % 2 === 0 ? "Aurora" : "Bassline",
    artistId: index % 2 === 0 ? "nova" : "bass",
    org: index % 3 === 0 ? "indie" : index % 3 === 1 ? "label" : null,
    thumb: `https://i.ytimg.com/vi/responsiveaudit${index}/hqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=responsiveaudit${index}`,
  })),
};

/** A 1x1 transparent PNG so the fixture thumbs never hit the network. */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

/** The JavaScript embed library, stubbed so the consent gate reaches `loaded`. */
const EMBED_STUB = "window.instgrm={Embeds:{process(){}}};";

function screenshotPath(name: string): string {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  return join(SCREENSHOT_DIR, name);
}

async function capture(page: Page, name: string, fullPage = true) {
  await page.screenshot({
    path: screenshotPath(`${name}.png`),
    fullPage,
    animations: "disabled",
  });
}

/** Wait for a named hydrated island to finish mounting. */
async function waitForIsland(page: Page, component: string) {
  await page.waitForFunction((name) => {
    const island = document.querySelector(
      `astro-island[component-url*="${name}"]`,
    );
    return island !== null && !island.hasAttribute("ssr");
  }, component);
}

/** Serve the deterministic playlist payload and block its thumbnail host. */
async function stubMusic(page: Page) {
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

/**
 * Every visible interactive control in `scope` whose hit area is smaller than
 * 44x44 CSS px. Excluded, with justification:
 *
 *  - `aria-hidden` subtrees (the search dialog's activation anchors, the modal
 *    backdrop) are not controls a person can operate directly;
 *  - `.prose-brand a` are inline text links inside a paragraph, not controls;
 *  - `.ig-embed a` is Meta's own embed markup, which the site cannot restyle;
 *  - elements entirely outside the viewport (the skip link at rest, a closed
 *    disclosure's content) are not visible affordances.
 */
async function smallTargets(page: Page, scope?: string): Promise<string[]> {
  return page.evaluate((selector) => {
    const root = selector ? document.querySelector(selector) : document;
    if (!root) return [`missing scope: ${selector}`];

    const findings: string[] = [];

    for (const element of root.querySelectorAll<HTMLElement>(
      'a, button, input, select, textarea, summary, [role="button"], [role="option"]',
    )) {
      if (
        !element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        })
      ) {
        continue;
      }
      if (element.closest('[aria-hidden="true"]')) continue;
      if (element.matches("[data-search-navigation-target]")) continue;
      if (element.closest(".prose-brand")) continue;
      if (element.closest(".ig-embed")) continue;

      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) continue;

      if (rect.width < 44 || rect.height < 44) {
        const label = (
          element.getAttribute("aria-label") ??
          element.textContent ??
          ""
        )
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 40);
        findings.push(
          `${element.tagName.toLowerCase()} "${label}" ${Math.round(rect.width)}x${Math.round(rect.height)}`,
        );
      }
    }

    return findings;
  }, scope);
}

/** Visible form controls and their computed font size. */
async function visibleFormControls(
  page: Page,
): Promise<Array<{ id: string; fontSize: number }>> {
  return page.evaluate(() =>
    Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        "input, select, textarea",
      ),
    )
      .filter(
        (element) =>
          element.checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true,
          }) &&
          element.getBoundingClientRect().width > 0 &&
          element.getBoundingClientRect().height > 0,
      )
      .map((element) => ({
        id: element.id || element.tagName.toLowerCase(),
        fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
      })),
  );
}

// ---------------------------------------------------------------------------
// 1. Horizontal overflow matrix
// ---------------------------------------------------------------------------

for (const viewport of WIDTHS) {
  test.describe(`no horizontal overflow — ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    for (const route of ROUTES) {
      test(`${route} fits the viewport`, async ({ page }) => {
        await page.goto(route);
        await expectNoHorizontalOverflow(
          page,
          `${route} @ ${viewport.width}px`,
        );
      });
    }
  });
}

// ---------------------------------------------------------------------------
// 2. Coarse-pointer hit areas and input font sizes, every route
// ---------------------------------------------------------------------------

for (const viewport of COARSE_WIDTHS) {
  test.describe(`coarse-pointer targets — ${viewport.width}px`, () => {
    test.use({ viewport, hasTouch: true });

    test("every visible control is at least 44x44", async ({ page }) => {
      const failures: string[] = [];

      for (const route of ROUTES) {
        await page.goto(route);
        const findings = await smallTargets(page);
        if (findings.length > 0) {
          failures.push(`  ${route}:\n    ${findings.join("\n    ")}`);
        }
      }

      expect(
        failures,
        `controls below ${MIN_TOUCH_TARGET}x${MIN_TOUCH_TARGET} under a coarse pointer:\n${failures.join("\n")}`,
      ).toEqual([]);
    });
  });
}

// ---------------------------------------------------------------------------
// 3. Opened overlays and stateful surfaces
// ---------------------------------------------------------------------------

for (const viewport of [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
] as const) {
  test.describe(`compact menu open — ${viewport.width}px`, () => {
    test.use({ viewport, hasTouch: true });

    test("the panel stays inside the viewport and the backdrop covers it", async ({
      page,
    }) => {
      await page.goto("/");
      await waitForIsland(page, "SiteHeader");
      await page.locator("details.site-menu summary").click();
      await expect(page.locator("details.site-menu")).toHaveAttribute(
        "open",
        "",
      );

      await expectNoHorizontalOverflow(page, `menu open @ ${viewport.width}px`);

      const geometry = await page.evaluate(() => {
        const header = document
          .querySelector<HTMLElement>("[data-site-header]")!
          .getBoundingClientRect();
        const panel = document
          .querySelector<HTMLElement>("[data-site-menu-panel]")!
          .getBoundingClientRect();
        const backdrop = document
          .querySelector<HTMLElement>("details.site-menu > button")!
          .getBoundingClientRect();

        return {
          viewportWidth: document.documentElement.clientWidth,
          viewportHeight: window.innerHeight,
          headerBottom: header.bottom,
          panel: { left: panel.left, right: panel.right, top: panel.top },
          backdrop: {
            left: backdrop.left,
            right: backdrop.right,
            top: backdrop.top,
            bottom: backdrop.bottom,
          },
        };
      });

      expect(geometry.panel.left).toBeGreaterThanOrEqual(0);
      expect(geometry.panel.right).toBeLessThanOrEqual(geometry.viewportWidth);
      expect(geometry.panel.top).toBeGreaterThanOrEqual(
        geometry.headerBottom - 1,
      );
      expect(geometry.backdrop.left).toBeLessThanOrEqual(0);
      expect(geometry.backdrop.right).toBeGreaterThanOrEqual(
        geometry.viewportWidth,
      );
      expect(geometry.backdrop.bottom).toBeGreaterThanOrEqual(
        geometry.viewportHeight - 1,
      );

      expect(await smallTargets(page, "[data-site-header]")).toEqual([]);

      await capture(page, `menu-open-${viewport.width}`, false);
    });
  });
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const) {
  test.describe(`search dialog — ${viewport.width}px`, () => {
    test.use({ viewport, hasTouch: viewport.width === 390 });

    test("opens inside the viewport with reachable controls", async ({
      page,
    }) => {
      await page.goto("/");
      await waitForIsland(page, "SearchCommand");
      await page.locator("[data-search-trigger]").click();
      const dialog = page.locator('[data-slot="command-dialog"]');
      await expect(dialog).toBeVisible();

      await expectNoHorizontalOverflow(
        page,
        `search open @ ${viewport.width}px`,
      );

      const box = await dialog.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 0.5);

      await expectMinimumFontSize(
        page,
        '[data-slot="command-input"]',
        16,
        "search input",
      );
      expect(await smallTargets(page, '[data-slot="command-dialog"]')).toEqual(
        [],
      );

      await capture(page, `search-open-${viewport.width}`, false);
    });
  });
}

for (const viewport of [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
] as const) {
  test.describe(`language menu — ${viewport.width}px`, () => {
    test.use({ viewport, hasTouch: true });

    test("the menu stays inside the viewport with reachable items", async ({
      page,
    }) => {
      await page.goto("/");
      await waitForIsland(page, "LanguageSwitcher");
      await page.locator("[data-language-trigger]").click();
      const menu = page.locator("[data-language-menu]");
      await expect(menu).toBeVisible();

      await expectNoHorizontalOverflow(
        page,
        `language menu open @ ${viewport.width}px`,
      );

      const box = await menu.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 0.5);
      expect(await smallTargets(page, "[data-language-menu]")).toEqual([]);

      await capture(page, `language-menu-${viewport.width}`, false);
    });
  });
}

for (const viewport of [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
] as const) {
  test.describe(`music filters — ${viewport.width}px`, () => {
    test.use({ viewport, hasTouch: true });

    test("the toolbar, disclosure and selects stay inside the page", async ({
      page,
    }) => {
      await stubMusic(page);
      await page.goto("/music/");
      await waitForIsland(page, "MusicLibrary");
      await expect(page.locator("[data-music-row]").first()).toBeVisible();

      const trigger = page.locator("[data-music-filter-trigger]");
      if (await trigger.isVisible()) {
        await trigger.click();
      }

      await expectNoHorizontalOverflow(
        page,
        `music filters open @ ${viewport.width}px`,
      );

      const controls = await visibleFormControls(page);
      expect(controls.length).toBeGreaterThan(0);
      for (const control of controls) {
        expect(
          control.fontSize,
          `${control.id}: font-size ${control.fontSize}px < 16px`,
        ).toBeGreaterThanOrEqual(16);
      }

      await expectTouchTarget(page, "#music-search", "music search");
      expect(await smallTargets(page, "[data-music-library]")).toEqual([]);

      await capture(page, `music-${viewport.width}`);
    });
  });
}

for (const viewport of [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const) {
  test.describe(`photography wall — ${viewport.width}px`, () => {
    test.use({ viewport, hasTouch: viewport.width <= 390 });

    test("at rest and after consent both stay inside the viewport", async ({
      page,
    }) => {
      await page.route("https://www.instagram.com/embed.js", (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/javascript",
          body: EMBED_STUB,
        }),
      );

      await page.goto("/photographer/");
      await expect(page.locator("[data-ig-gate]")).toBeVisible();
      await expectNoHorizontalOverflow(
        page,
        `photography at rest @ ${viewport.width}px`,
      );
      expect(await smallTargets(page, "[data-ig-wall]")).toEqual([]);
      await capture(page, `photographer-rest-${viewport.width}`);

      await waitForIsland(page, "InstagramGate");
      const gate = page.getByRole("button", {
        name: /載入 Instagram 貼文/,
      });
      await gate.click();
      await expect(page.locator("[data-ig-embeds]")).not.toHaveAttribute(
        "hidden",
        "",
      );

      await expectNoHorizontalOverflow(
        page,
        `photography loaded @ ${viewport.width}px`,
      );
      await capture(page, `photographer-loaded-${viewport.width}`);
    });
  });
}

for (const viewport of [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
] as const) {
  test.describe(`blog filter tray — ${viewport.width}px`, () => {
    test.use({ viewport, hasTouch: true });

    test("the tray wraps without overflow and its links are 44px", async ({
      page,
    }) => {
      await page.goto("/blog/");
      await expect(page.locator("[data-blog-filters]")).toBeVisible();
      await expectNoHorizontalOverflow(
        page,
        `blog filters @ ${viewport.width}px`,
      );

      const filterLinks = page.locator("[data-blog-filter]");
      const count = await filterLinks.count();
      expect(count).toBeGreaterThan(0);
      for (let index = 0; index < count; index += 1) {
        const box = await filterLinks.nth(index).boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
        expect(box!.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      }

      await capture(page, `blog-${viewport.width}`);
    });
  });
}

for (const viewport of [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const) {
  test.describe(`post prose and 404 — ${viewport.width}px`, () => {
    test.use({ viewport });

    test("the article body and the not-found panel stay inside the viewport", async ({
      page,
    }) => {
      await page.goto("/blog/2026-10-20_bootstrap-blog/");
      await expect(page.locator(".prose-brand")).toBeVisible();
      await expectNoHorizontalOverflow(
        page,
        `post prose @ ${viewport.width}px`,
      );
      await capture(page, `post-${viewport.width}`);

      await page.goto("/404");
      await expect(page.locator("[data-not-found]")).toBeVisible();
      await expectNoHorizontalOverflow(page, `404 @ ${viewport.width}px`);
      await capture(page, `404-${viewport.width}`);
    });
  });
}

// ---------------------------------------------------------------------------
// 4. Fixed chrome and the Photography / Music top gap
// ---------------------------------------------------------------------------

test.describe("fixed chrome", () => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ] as const) {
    test.describe(`${viewport.width}px`, () => {
      test.use({ viewport, hasTouch: viewport.width <= 768 });

      test("the fixed scroll control clears the safe area and the page", async ({
        page,
      }) => {
        await page.goto("/");
        await waitForIsland(page, "ScrollControls");
        await page.evaluate(() =>
          window.scrollTo(0, document.documentElement.scrollHeight),
        );
        await page.waitForFunction(
          () =>
            document
              .querySelector("[data-back-to-top]")
              ?.getAttribute("data-visible") === "true",
        );

        const measurement = await page.evaluate(() => {
          const control = document
            .querySelector<HTMLElement>("[data-back-to-top]")!
            .getBoundingClientRect();
          const hit = document.elementFromPoint(
            control.left + control.width / 2,
            control.top + control.height / 2,
          );

          // Text rects, not element boxes: padding under the floating control
          // is harmless, a covered glyph is not.
          const contentSelectors =
            "main p, main h1, main h2, main h3, main time, footer p, footer time";
          const covered: string[] = [];
          for (const element of document.querySelectorAll<HTMLElement>(
            contentSelectors,
          )) {
            if (!element.checkVisibility({ checkVisibilityCSS: true }))
              continue;
            const range = document.createRange();
            range.selectNodeContents(element);
            for (const rect of Array.from(range.getClientRects())) {
              const intersects =
                rect.left < control.right &&
                rect.right > control.left &&
                rect.top < control.bottom &&
                rect.bottom > control.top;
              if (intersects) {
                covered.push(
                  `${element.tagName.toLowerCase()} text at ${Math.round(rect.left)},${Math.round(rect.top)}`,
                );
                break;
              }
            }
          }

          return {
            viewportWidth: document.documentElement.clientWidth,
            viewportHeight: window.innerHeight,
            control: {
              left: control.left,
              right: control.right,
              top: control.top,
              bottom: control.bottom,
              width: control.width,
              height: control.height,
            },
            covered,
            selfHit:
              hit instanceof HTMLElement &&
              (hit.hasAttribute("data-back-to-top") ||
                hit.closest("[data-back-to-top]") !== null),
          };
        });

        expect(measurement.control.width).toBeGreaterThanOrEqual(
          MIN_TOUCH_TARGET,
        );
        expect(measurement.control.height).toBeGreaterThanOrEqual(
          MIN_TOUCH_TARGET,
        );
        expect(measurement.control.left).toBeGreaterThanOrEqual(0);
        expect(measurement.control.right).toBeLessThanOrEqual(
          measurement.viewportWidth,
        );
        expect(measurement.control.top).toBeGreaterThanOrEqual(0);
        expect(measurement.control.bottom).toBeLessThanOrEqual(
          measurement.viewportHeight,
        );
        expect(measurement.selfHit).toBe(true);
        expect(
          measurement.covered,
          `the fixed scroll control covers page content: ${measurement.covered.join(", ")}`,
        ).toEqual([]);

        await capture(page, `scroll-control-${viewport.width}`, false);
      });
    });
  }

  test.describe("desktop header", () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("the sticky header stays within the viewport", async ({ page }) => {
      await page.goto("/");
      const header = await page.locator("[data-site-header]").boundingBox();
      expect(header).not.toBeNull();
      expect(header!.x).toBeGreaterThanOrEqual(0);
      expect(header!.x + header!.width).toBeLessThanOrEqual(1440.5);
    });
  });
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const) {
  test.describe(`back-link to page-title gap — ${viewport.width}px`, () => {
    test.use({ viewport, reducedMotion: "reduce" });

    for (const route of ["/photographer/", "/music/", "/links/"] as const) {
      test(`${route} keeps the token gap, not the ~180px disconnect`, async ({
        page,
      }) => {
        await page.goto(route);
        const gap = await page.evaluate(() => {
          const back = document
            .querySelector<HTMLElement>("[data-back-link]")!
            .getBoundingClientRect();
          const title = document
            .querySelector<HTMLElement>("main h1")!
            .getBoundingClientRect();
          return { gap: title.top - back.bottom, backBottom: back.bottom };
        });

        expect(gap.gap).toBeGreaterThan(0);
        expect(
          gap.gap,
          `${route} @ ${viewport.width}px: back link ends at ${Math.round(gap.backBottom)}px, title starts ${Math.round(gap.gap)}px later`,
        ).toBeLessThanOrEqual(32);
      });
    }
  });
}

// ---------------------------------------------------------------------------
// 5. Evidence captures for every at-rest route
// ---------------------------------------------------------------------------

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const) {
  test.describe(`captures — ${viewport.width}px`, () => {
    test.use({ viewport });

    test("capture every route", async ({ page }) => {
      for (const [name, route] of Object.entries(ROUTE_CAPTURE_NAMES)) {
        await page.goto(route);
        await capture(page, `${name}-${viewport.width}`);
      }
    });
  });
}
