import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

/**
 * Encoding prescan gate.
 *
 * A browser commits to an encoding from a prescan of the first 1024 bytes, so
 * `<meta charset>` must be both inside that window and ahead of the first
 * `<script>`. The inline locale boot script used to precede it, which made the
 * declaration useless for the prescan. Reads the built `dist/index.html` that
 * the Playwright `webServer` produces.
 */

const HTML_PATH = join(process.cwd(), "dist", "index.html");

test.describe("document encoding prescan", () => {
  test("declares charset before any script inside the first 1024 bytes", () => {
    const html = readFileSync(HTML_PATH, "utf8");

    const charsetOffset = html.indexOf("<meta charset");
    expect(charsetOffset).toBeGreaterThanOrEqual(0);

    const viewportOffset = html.indexOf('name="viewport"');
    expect(viewportOffset).toBeGreaterThanOrEqual(0);

    const firstScript = html.search(/<script\b/iu);
    expect(firstScript).toBeGreaterThanOrEqual(0);

    expect(charsetOffset).toBeLessThan(viewportOffset);
    expect(viewportOffset).toBeLessThan(firstScript);
    expect(
      Buffer.byteLength(html.slice(0, charsetOffset), "utf8"),
    ).toBeLessThan(1024);
  });

  test("the browser decodes the built page as UTF-8", async ({ page }) => {
    await page.goto("/");

    expect(await page.evaluate(() => document.characterSet)).toBe("UTF-8");
    await expect(page.locator("main h1").first()).toBeVisible();
  });
});
