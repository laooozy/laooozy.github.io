import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import {
  auditVisiblePage,
  expectNoSeriousViolations,
  measureElementContrast,
  settlePage,
} from "./helpers/a11y";
import { expectNoHorizontalOverflow } from "./helpers/overflow";

/**
 * Task 33 — the accessible 404 page.
 *
 * The body is the hydrated `NotFound` island, but the SSR HTML already carries
 * the default-locale copy, so these assertions run before/independent of
 * hydration:
 *
 *  - a bad path answers 404 and renders exactly one `<h1>` inside `<main>`;
 *  - the page content is centred and never scrolls sideways at any tested
 *    width;
 *  - the big numeral is NOT painted with `background-clip: text`, so it stays
 *    visible under `forced-colors: active` (the old gradient clip painted it
 *    transparent there);
 *  - the 390 / 1440 screenshots are captured as evidence.
 */

const SECTION = "[data-not-found]";
const CODE = "[data-not-found-code]";
const MISSING = "/this-page-does-not-exist";

/** Longest hover transition on the filled control, plus a frame. */
const HOVER_SETTLE_MS = 300;

const SCREENSHOT_DIR = join(
  process.cwd(),
  ".omo/evidence/architecture-artwork-refactor/screenshots",
);

const MATRIX = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
] as const;

async function loadNotFound(page: Page) {
  const response = await page.goto(MISSING);
  expect(response?.status()).toBe(404);
  // Clean screenshots: the dev toolbar is not part of the page.
  await page.addStyleTag({
    content: "astro-dev-toolbar { display: none !important; }",
  });
  await page.evaluate(() => document.fonts?.ready);
  await expect(page.locator(`${SECTION} h1`)).toBeVisible();
}

for (const { width, height } of MATRIX) {
  test.describe(`404 at ${width}px`, () => {
    test.use({ viewport: { width, height } });

    test("fits the viewport and captures the page", async ({
      page,
    }, testInfo) => {
      await loadNotFound(page);
      await expectNoHorizontalOverflow(page, `404 @ ${width}px`);

      // One semantic heading, inside the page landmark, with the fixed-chrome
      // copy the SSR render emits.
      await expect(page.locator("main h1")).toHaveCount(1);
      await expect(page.locator("main h1")).toHaveText("找不到頁面");

      if (width === 390 || width === 1440) {
        mkdirSync(SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({
          path: join(
            SCREENSHOT_DIR,
            `task-33-404-${width}-${testInfo.project.name}.png`,
          ),
          fullPage: true,
        });
      }
    });
  });
}

test.describe("404 content", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("centres the content and offers one home action", async ({ page }) => {
    await loadNotFound(page);

    const section = page.locator(SECTION);
    const box = await section.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (!box || !viewport) return;

    expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(
      2,
    );
    await expect(section).toHaveCSS("text-align", "center");

    const home = page.getByRole("link", { name: "回到首頁" });
    await expect(home).toHaveAttribute("href", "/");
    expect(await home.evaluate((el) => el.getBoundingClientRect().height)).toBe(
      44,
    );

    await expect(page.locator(CODE)).toHaveText("404");
    await expect(page.locator(CODE)).toHaveAttribute("aria-hidden", "true");
  });

  test("forced-colors keeps the numeral and copy visible", async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await loadNotFound(page);

    expect(
      await page.evaluate(
        () => window.matchMedia("(forced-colors: active)").matches,
      ),
    ).toBe(true);

    const styles = await page.locator(CODE).evaluate((element) => {
      const computed = getComputedStyle(element);
      // Canvas normalises a colour to hex when opaque and to
      // `rgba(0, 0, 0, 0)` when fully transparent.
      const context = document.createElement("canvas").getContext("2d");
      if (!context) throw new Error("2d canvas context unavailable");
      context.fillStyle = "#ffffff";
      context.fillStyle = computed.color;
      const resolvedColor = context.fillStyle;
      context.fillStyle = "#ffffff";
      context.fillStyle = computed.webkitTextFillColor;
      const resolvedFill = context.fillStyle;
      return {
        backgroundClip: computed.backgroundClip,
        resolvedColor,
        resolvedFill,
      };
    });

    // No `background-clip: text` anywhere on the numeral.
    expect(styles.backgroundClip).not.toBe("text");
    expect(styles.resolvedColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(styles.resolvedFill).not.toBe("rgba(0, 0, 0, 0)");

    await expect(page.locator(CODE)).toBeVisible();
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator(`${SECTION} p`).last()).toBeVisible();

    mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({
      path: join(SCREENSHOT_DIR, "task-33-404-forced-colors-390.png"),
      fullPage: true,
    });
  });
});

test.describe("@a11y 404 hover contrast", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the primary home action keeps AA while hovered", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "chromium-mobile",
      "touch devices do not expose hover",
    );

    await loadNotFound(page);
    await settlePage(page);

    const home = page.getByRole("link", { name: "回到首頁" });
    await home.hover();
    // The button cross-fades its fill; sample only after the transition lands.
    await page.waitForTimeout(HOVER_SETTLE_MS);

    const measurement = await measureElementContrast(home);
    console.log(
      `404 CTA hover: ${measurement.foreground} on ${measurement.background} (raw ${measurement.backgroundRaw}, hover ${measurement.hovered}) = ${measurement.ratio.toFixed(2)}:1 (alpha ${measurement.alpha})`,
    );
    expect(
      measurement.passes,
      `404 primary action hover must clear ${measurement.required}:1, got ${measurement.ratio}:1 on ${measurement.background}`,
    ).toBe(true);

    const audit = await auditVisiblePage(page);
    await testInfo.attach("axe-404-cta-hover.json", {
      body: JSON.stringify(audit, null, 2),
      contentType: "application/json",
    });

    expectNoSeriousViolations(audit, "404 primary action on hover");
  });
});
