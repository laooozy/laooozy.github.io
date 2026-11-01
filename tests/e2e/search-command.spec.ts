import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow } from "./helpers/overflow";
import {
  expectMinimumFontSize,
  expectTouchTarget,
} from "./helpers/target-size";

/**
 * Focused contract for Task 18's global ⌘K search palette.
 *
 * Pagefind only exists after `bun run build && bun run pagefind`, so this spec
 * runs against a built preview (`PLAYWRIGHT_BASE_URL=http://127.0.0.1:4321`);
 * it skips against the bare dev server, which has no generated index. Task 46
 * owns the permanent search suite.
 */

const BUILT_PREVIEW = Boolean(process.env.PLAYWRIGHT_BASE_URL);

test.skip(
  !BUILT_PREVIEW,
  "SearchCommand spec needs a built + Pagefind preview (set PLAYWRIGHT_BASE_URL)",
);

const HEADER_TRIGGER = "[data-site-header] [data-search-trigger]";
const DIALOG = '[data-slot="command-dialog"]';
const INPUT = `${DIALOG} [cmdk-input]`;
const ITEMS = `${DIALOG} [cmdk-item]`;
const STATUS = `${DIALOG} [role="status"]`;

/** Wait for an Astro React island to finish hydrating. */
async function waitForIsland(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.waitForFunction((component) => {
    const island = document.querySelector(
      `astro-island[component-url*="${component}"]`,
    );
    return island !== null && !island.hasAttribute("ssr");
  }, name);
}

async function openWithTrigger(page: import("@playwright/test").Page) {
  await waitForIsland(page, "SiteHeader");
  await waitForIsland(page, "SearchCommand");
  await page.locator(HEADER_TRIGGER).click();
  await expect(page.locator(DIALOG)).toBeVisible();
}

test.describe("global palette", () => {
  test("opens from the header trigger and returns focus on Escape", async ({
    page,
  }) => {
    await page.goto("/");
    await openWithTrigger(page);

    await expect(page.locator(INPUT)).toBeFocused();
    await expect(page.locator(DIALOG)).toContainText("快速前往");
    await page.keyboard.press("Escape");

    await expect(page.locator(DIALOG)).toBeHidden();
    await expect(page.locator(HEADER_TRIGGER)).toBeFocused();
  });

  test("Ctrl K opens on every route", async ({ page }) => {
    for (const route of ["/", "/photographer/", "/music/", "/links/"]) {
      await page.goto(route);
      await waitForIsland(page, "SearchCommand");
      await page.keyboard.press("Control+K");
      await expect(page.locator(DIALOG), `Ctrl K on ${route}`).toBeVisible();
      await expect(page.locator(DIALOG)).toContainText("快速前往");
      await page.keyboard.press("Escape");
      await expect(page.locator(DIALOG)).toBeHidden();
    }
  });

  test("close and reopen starts with a clean query and no stale results", async ({
    page,
  }) => {
    await page.goto("/");
    await openWithTrigger(page);

    await page.locator(INPUT).fill("情報系");
    await expect(page.locator(STATUS)).toContainText("找到 1 筆結果");
    await expect(page.locator(ITEMS)).toHaveCount(1);

    await page.keyboard.press("Escape");
    await expect(page.locator(DIALOG)).toBeHidden();

    await page.locator(HEADER_TRIGGER).click();
    await expect(page.locator(DIALOG)).toBeVisible();
    await expect(page.locator(INPUT)).toHaveValue("");
    await expect(page.locator(DIALOG)).toContainText("快速前往");
    await expect(page.locator(ITEMS)).toHaveCount(4);
  });

  test("quick links never offer Photography and navigate", async ({ page }) => {
    await page.goto("/");
    await openWithTrigger(page);

    const quickLinks = page.locator(DIALOG).getByRole("option");
    await expect(quickLinks).toHaveCount(4);
    await expect(page.locator(DIALOG)).not.toContainText("攝影");

    await page.locator(DIALOG).getByRole("option", { name: "文章" }).click();
    await page.waitForURL("**/blog/");
  });
});

test.describe("Pagefind results", () => {
  test("types a known query, shows the count and Enter opens the post", async ({
    page,
  }) => {
    await page.goto("/");
    await openWithTrigger(page);

    await page.locator(INPUT).fill("情報系");
    await expect(page.locator(STATUS)).toContainText("找到 1 筆結果");
    await expect(page.locator(ITEMS)).toHaveCount(1);

    await page.keyboard.press("Enter");
    await page.waitForURL("**/blog/2026-10-20_bootstrap-blog/");
  });

  test("Arrow keys move the selection and Enter follows it", async ({
    page,
  }) => {
    await page.goto("/");
    await openWithTrigger(page);

    await page.locator(INPUT).fill("的");
    await expect(page.locator(ITEMS).first()).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await page.keyboard.press("ArrowDown");
    await expect(page.locator(ITEMS).nth(1)).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/blog\/|\/photographer\/|\/links\//);
  });

  test("a query with no hits shows the empty state", async ({ page }) => {
    await page.goto("/");
    await openWithTrigger(page);

    await page.locator(INPUT).fill("zzzznotarealquery");
    await expect(page.locator(DIALOG)).toContainText("沒有找到結果");
  });

  test("a blocked Pagefind script shows the error and a retry control", async ({
    page,
  }) => {
    await page.route("**/pagefind/pagefind.js", (route) => route.abort());
    await page.goto("/");
    await openWithTrigger(page);

    await page.locator(INPUT).fill("情報系");
    const alert = page.locator(DIALOG).getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("搜尋暫時無法使用");
    await expect(alert.getByRole("button", { name: "重試" })).toBeVisible();
  });
});

test.describe("lazy loading", () => {
  test("the dialog chunk is requested only on first open", async ({ page }) => {
    const requested: string[] = [];
    page.on("request", (request) => {
      if (/SearchCommandDialog/.test(request.url())) {
        requested.push(request.url());
      }
    });

    await page.goto("/");
    await waitForIsland(page, "SearchCommand");
    expect(requested, "dialog chunk before first open").toEqual([]);

    const dialogChunk = page.waitForResponse((response) =>
      /SearchCommandDialog/.test(response.url()),
    );
    await page.locator(HEADER_TRIGGER).click();
    await expect(page.locator(DIALOG)).toBeVisible();
    await dialogChunk;
    expect(requested.length).toBeGreaterThan(0);
  });
});

test.describe("mobile 390", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("is full-screen, overflow-free and touch-sized", async ({ page }) => {
    await page.goto("/");
    await openWithTrigger(page);

    // The open animation scales the popup; poll until it settles.
    await expect
      .poll(async () => (await page.locator(DIALOG).boundingBox())?.width ?? 0)
      .toBeGreaterThanOrEqual(389);
    const box = await page.locator(DIALOG).boundingBox();
    expect(box).not.toBeNull();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(843);

    await expectNoHorizontalOverflow(page, "search dialog @ 390px");

    await expectTouchTarget(page, INPUT, "search input");
    await expectMinimumFontSize(page, INPUT, 16, "search input");
    await expectTouchTarget(
      page,
      `${DIALOG} [data-slot="dialog-close"]`,
      "search close",
    );
    await expectTouchTarget(page, `${ITEMS}`, "quick link row");
  });
});
