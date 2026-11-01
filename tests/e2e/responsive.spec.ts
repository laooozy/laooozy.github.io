import { test } from "@playwright/test";

import { expectNoHorizontalOverflow } from "./helpers/overflow";

/**
 * The routes that must never scroll sideways. `/404` is included: the dev
 * server serves the not-found page at that path (with a 404 status), which
 * Playwright's `goto` still resolves, so the layout is reachable.
 */
const ROUTES = [
  "/",
  "/blog/",
  "/photographer/",
  "/music/",
  "/links/",
  "/404",
] as const;

/** Phone-first widths from the AGENTS.md responsive matrix. */
const VIEWPORTS = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
] as const;

for (const viewport of VIEWPORTS) {
  test.describe(`no horizontal overflow at ${viewport.width}x${viewport.height}`, () => {
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
