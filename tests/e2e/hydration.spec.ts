import { expect, type Page, test } from "@playwright/test";

/**
 * Hydration-safety contract for the locale-reactive chrome.
 *
 * The pre-paint boot may seed the store with `en` before React's first client
 * render, while the static build always emits `zh-hant` chrome. The translation
 * hook pins the build locale until mount, so the first client render must match
 * the SSR HTML, then settle to the stored locale without a React hydration
 * mismatch. Without JavaScript the build-locale chrome must stay readable.
 */

const ROUTES = ["/", "/blog/", "/photographer/", "/music/", "/links/"] as const;

/** Resolve once every Astro island has hydrated (it loses its `ssr` marker). */
async function waitForAllIslands(page: Page) {
  await page.waitForFunction(() => {
    const islands = Array.from(document.querySelectorAll("astro-island"));
    return (
      islands.length > 0 &&
      islands.every((island) => !island.hasAttribute("ssr"))
    );
  });
}

/** Collect console errors and hydration-mismatch warnings. */
function collectProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (
      message.type() === "error" ||
      /hydrat/i.test(text) ||
      /did not match/i.test(text) ||
      /minified react error/i.test(text)
    ) {
      problems.push(`${message.type()}: ${text}`);
    }
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  return problems;
}

test.describe("stored non-default locale", () => {
  for (const route of ROUTES) {
    test(`${route} settles to English without a hydration mismatch`, async ({
      page,
    }) => {
      const problems = collectProblems(page);

      await page.addInitScript(() => {
        window.localStorage.setItem("locale", "en");
      });

      await page.goto(route);
      await waitForAllIslands(page);

      // The boot already reflected the stored locale on the document ...
      await expect(page.locator("html")).toHaveAttribute("data-locale", "en");
      await expect(page.locator("html")).toHaveAttribute("lang", "en");

      // ... and the hydrated chrome follows the store, not the build locale.
      await expect(
        page.locator('[data-site-nav] a[href="/#about"]'),
      ).toHaveText("About");
      await expect(page.locator("[data-site-footer]")).toContainText(
        "All rights reserved",
      );

      expect(problems, `console/page errors:\n${problems.join("\n")}`).toEqual(
        [],
      );
    });
  }
});

test.describe("with JavaScript disabled", () => {
  test.use({ javaScriptEnabled: false });

  test("keeps the build-locale chrome readable", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator('[data-site-nav] a[href="/#about"]')).toHaveText(
      "關於",
    );
    await expect(page.locator("[data-site-footer]")).toContainText("版權所有");
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
  });
});
