import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow } from "./helpers/overflow";

/**
 * The no-overflow gate must be able to fail.
 *
 * These tests run against the built site (the Playwright harness serves
 * `dist/` on 4322) so `src/styles/global.css` is active. A bare
 * `page.setContent` would not load the stylesheet and would silently miss the
 * root `overflow-x: clip` weakness this file exists to catch.
 */
test.describe("expectNoHorizontalOverflow", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("rejects a deliberately wide child appended to a built page", async ({
    page,
  }) => {
    await page.goto("/");

    await page.evaluate(() => {
      const wide = document.createElement("div");
      wide.setAttribute("data-testid", "overflow-probe");
      wide.style.width = "600px";
      wide.style.height = "10px";
      // A column flex child must not shrink the probe away.
      wide.style.flex = "0 0 auto";
      document.body.append(wide);
    });

    await expect(expectNoHorizontalOverflow(page)).rejects.toThrow(/overflow/);
  });

  test("ignores a wide child inside an internal horizontal scroller", async ({
    page,
  }) => {
    await page.goto("/");

    const measurement = await page.evaluate(() => {
      const scroller = document.createElement("div");
      scroller.setAttribute("data-testid", "scroller-probe");
      scroller.style.width = "300px";
      scroller.style.overflowX = "auto";
      scroller.style.flex = "0 0 auto";

      const wide = document.createElement("div");
      wide.style.width = "600px";
      wide.style.height = "10px";

      scroller.append(wide);
      document.body.append(scroller);

      return {
        childRight: wide.getBoundingClientRect().right,
        viewportWidth: document.documentElement.clientWidth,
      };
    });

    // The probe really is wider than the page; it is only contained because
    // its parent scrolls horizontally.
    expect(measurement.childRight).toBeGreaterThan(measurement.viewportWidth);

    await expect(expectNoHorizontalOverflow(page)).resolves.toBeTruthy();
  });
});
