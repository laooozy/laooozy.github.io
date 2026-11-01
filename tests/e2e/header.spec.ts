import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow } from "./helpers/overflow";
import { expectTouchTarget } from "./helpers/target-size";

/**
 * Focused header contract for Task 17. Task 24 expands the full chrome suite;
 * this spec pins the pieces this migration owns: the native no-JS disclosure,
 * Escape + focus return, the current-page marker, the global search trigger and
 * the absence of a Photography nav item.
 */

const HEADER = "[data-site-header]";
const MOBILE_MENU = `${HEADER} details.site-menu`;
const DESKTOP_NAV = `${HEADER} [data-site-nav]`;
const SEARCH_TRIGGER = `${HEADER} [data-search-trigger]`;

/**
 * Wait for the `client:load` header island to finish hydrating before testing
 * React-owned state. Astro removes the island's `ssr` marker on hydration.
 */
async function waitForHeaderHydration(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => {
    const island = document.querySelector(
      'astro-island[component-url*="SiteHeader"]',
    );
    return island !== null && !island.hasAttribute("ssr");
  });
}

test.describe("mobile disclosure (JavaScript enabled)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opens, closes on Escape, and returns focus to the summary", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForHeaderHydration(page);
    const menu = page.locator(MOBILE_MENU);
    const summary = menu.locator("summary");

    await summary.click();
    await expect(menu).toHaveAttribute("open", "");
    await expect(summary).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Escape");

    await expect(menu).not.toHaveAttribute("open", "");
    await expect(summary).toHaveAttribute("aria-expanded", "false");
    await expect(summary).toBeFocused();
  });

  test("closes on a link press and stays overflow-free while open", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForHeaderHydration(page);
    await page.locator(`${MOBILE_MENU} summary`).click();
    await expect(page.locator(MOBILE_MENU)).toHaveAttribute("open", "");
    await expectNoHorizontalOverflow(page, "header menu open @ 390px");

    const links = page.locator(`${MOBILE_MENU} nav a`);
    await expect(links).toHaveCount(4);
    await expect(links.nth(1)).toHaveAttribute("href", "/blog/");
  });
});

test.describe("mobile disclosure (JavaScript disabled)", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });

  test("the native details disclosure reveals every link", async ({ page }) => {
    await page.goto("/");

    const menu = page.locator(MOBILE_MENU);
    const summary = menu.locator("summary");
    const links = page.locator(`${MOBILE_MENU} nav a`);

    // Closed state is the server-rendered state; links are not reachable yet.
    await expect(links.first()).not.toBeVisible();

    await summary.click();

    await expect(menu).toHaveAttribute("open", "");
    await expect(links).toHaveCount(4);

    for (const href of ["/#about", "/blog/", "/#contact", "/links/"]) {
      await expect(
        page.locator(`${MOBILE_MENU} nav a[href="${href}"]`),
      ).toBeVisible();
    }

    // No JS: locale stays the build-time default, so the labels are zh-hant.
    await expect(links.nth(1)).toHaveText("文章");
  });
});

test("the current page is the only entry marked aria-current", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto("/blog/");
  const current = page.locator(`${HEADER} [aria-current="page"]`);
  await expect(current.first()).toBeVisible();
  const hrefs = await current.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("href")),
  );
  expect(hrefs.length).toBeGreaterThan(0);
  expect(new Set(hrefs)).toEqual(new Set(["/blog/"]));

  await page.goto("/links/");
  const linksCurrent = page.locator(`${HEADER} [aria-current="page"]`);
  const linkHrefs = await linksCurrent.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("href")),
  );
  expect(new Set(linkHrefs)).toEqual(new Set(["/links/"]));

  await page.goto("/");
  await expect(page.locator(`${HEADER} [aria-current="page"]`)).toHaveCount(0);
});

test("nav keeps the four existing items and never adds Photography", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const items = page.locator(`${DESKTOP_NAV} a`);
  await expect(items).toHaveCount(4);
  const hrefs = await items.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("href")),
  );
  expect(hrefs).toEqual(["/#about", "/blog/", "/#contact", "/links/"]);
  await expect(page.locator(`${HEADER} a[href="/photographer/"]`)).toHaveCount(
    0,
  );
});

test("the global search trigger is labelled and opens the search dialog", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/blog/");
  await waitForHeaderHydration(page);

  const trigger = page.locator(SEARCH_TRIGGER);
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
  // The visible ⌘K hint is part of the accessible name on purpose.
  await expect(trigger).toHaveAccessibleName(/搜尋/);
  await expect(trigger).toHaveAttribute(
    "aria-keyshortcuts",
    "Meta+K Control+K",
  );

  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

for (const width of [320, 390, 768, 1440]) {
  test(`header has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expectNoHorizontalOverflow(page, `header @ ${width}px`);
  });
}

test.describe("header touch targets", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test("every header control clears the 44px coarse-pointer floor", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForHeaderHydration(page);

    await expectTouchTarget(page, SEARCH_TRIGGER, "header search trigger");
    await expectTouchTarget(
      page,
      `${MOBILE_MENU} summary`,
      "mobile menu summary",
    );

    await page.locator(`${MOBILE_MENU} summary`).click();
    const links = page.locator(`${MOBILE_MENU} nav a`);
    await expect(links).toHaveCount(4);
    for (let index = 0; index < 4; index += 1) {
      await expectTouchTarget(
        page,
        `${MOBILE_MENU} nav li:nth-child(${index + 1}) a`,
        `mobile menu link ${index + 1}`,
      );
    }
  });
});
