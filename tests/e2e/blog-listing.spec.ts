import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow } from "./helpers/overflow";

/**
 * Task 28 — the rebuilt blog listing.
 *
 * The contract:
 *  - `/blog/`, a tag page and a year archive all render through the same
 *    `[data-blog-listing]` island and the same shared filter tray;
 *  - the active filter carries `aria-current="page"` and the active chip style,
 *    and clicking a tag/year lands on the filter URL with the matching heading;
 *  - pagination keeps the 4-per-page contract (with the current one-post data
 *    set the index has a single page, so no paginator renders; the multi-page
 *    markup and links are pinned by the component test);
 *  - the zero-post empty panel is pinned by the component test because the
 *    build emits no empty listing route from the current content;
 *  - filter controls are 44×44 on a coarse pointer, focus is visible, and the
 *    layout does not overflow at 390 or 1440;
 *  - 390/1440 screenshots of the index, tag page and archive.
 */

const INDEX = "[data-blog-listing]";
const FILTERS = "[data-blog-filters]";
const FILTER_LINK = "[data-blog-filter][href]";

const SCREENSHOT_DIR = join(
  process.cwd(),
  ".omo/evidence/architecture-artwork-refactor/screenshots",
);

const ALL_POSTS = "所有文章";
const TAG = "隨筆";
const PERIOD = "2026年";

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.evaluate(() => document.fonts?.ready);
}

function decodedPath(page: Page): string {
  return decodeURIComponent(new URL(page.url()).pathname);
}

async function screenshot(page: Page, name: string) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({
    path: join(SCREENSHOT_DIR, `${name}-${test.info().project.name}.png`),
    fullPage: true,
  });
}

test.describe("blog listing", () => {
  test("index, tag and archive share the listing and filter controls", async ({
    page,
  }) => {
    await open(page, "/blog/");

    await expect(page.locator(INDEX)).toHaveCount(1);
    await expect(page.locator(`${INDEX} h1`)).toHaveText("最新文章");
    await expect(page.locator(FILTERS)).toHaveCount(1);

    const allPosts = page.getByRole("link", { name: ALL_POSTS });
    const tag = page.locator('[data-blog-filter="tag"]', { hasText: TAG });
    const period = page.locator('[data-blog-filter="period"]', {
      hasText: PERIOD,
    });

    await expect(allPosts).toHaveAttribute("aria-current", "page");
    await expect(tag).not.toHaveAttribute("aria-current", "page");
    await expect(period).not.toHaveAttribute("aria-current", "page");

    // The card action is the post's one primary action.
    const post = page.locator('[data-post-card][data-variant="row"]').first();
    await expect(post).toHaveCount(1);
    await expect(post.locator("h2")).toHaveCount(1);
    await expect(post.getByRole("link", { name: "閱讀文章" })).toHaveAttribute(
      "href",
      "/blog/2026-10-20_bootstrap-blog/",
    );

    await tag.click();
    await page.waitForURL(/\/blog\/tags\//u);
    expect(decodedPath(page)).toBe(`/blog/tags/${TAG}/`);
    await expect(page.locator(`${INDEX} h1`)).toHaveText(`#${TAG}`);
    await expect(
      page.locator(`[data-blog-filter="tag"][aria-current="page"]`),
    ).toHaveText(TAG);
    await expect(allPosts).not.toHaveAttribute("aria-current", "page");
    await expect(page.locator("[data-post-card]")).toHaveCount(1);

    await page
      .locator('[data-blog-filter="period"]', { hasText: PERIOD })
      .click();
    await page.waitForURL(/\/blog\/archive\//u);
    expect(decodedPath(page)).toBe("/blog/archive/2026/");
    await expect(page.locator(`${INDEX} h1`)).toHaveText(PERIOD);
    await expect(
      page.locator(`[data-blog-filter="period"][aria-current="page"]`),
    ).toHaveText(PERIOD);
    await expect(
      page.locator(`[data-blog-filter="tag"][aria-current="page"]`),
    ).toHaveCount(0);
    await expect(page.locator("[data-post-card]")).toHaveCount(1);
  });

  test("single-page index renders no paginator and keeps the active style", async ({
    page,
  }) => {
    await open(page, "/blog/");

    await expect(page.locator("[data-blog-pagination]")).toHaveCount(0);

    const active = page.locator('[data-blog-filter][aria-current="page"]');
    const idle = page.locator('[data-blog-filter]:not([aria-current="page"])');
    await expect(active).toHaveText(ALL_POSTS);

    const activeBackground = await active.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    const idleBackground = await idle
      .first()
      .evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(activeBackground).not.toBe(idleBackground);
    expect(await active.getAttribute("class")).toContain("bg-primary");
  });

  test("idle filter shows a hover background", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "chromium-mobile",
      "touch devices do not expose hover",
    );
    await open(page, "/blog/");

    const tag = page.locator('[data-blog-filter="tag"]').first();
    const before = await tag.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    await tag.hover();
    await expect
      .poll(async () =>
        tag.evaluate((element) => getComputedStyle(element).backgroundColor),
      )
      .not.toBe(before);
  });

  test("filter links show a visible focus ring", async ({ page }) => {
    await open(page, "/blog/");

    const allPosts = page.getByRole("link", { name: ALL_POSTS });
    for (let step = 0; step < 40; step += 1) {
      if (
        await allPosts.evaluate((element) => element === document.activeElement)
      ) {
        break;
      }
      await page.keyboard.press("Tab");
    }

    expect(
      await allPosts.evaluate((element) => element === document.activeElement),
    ).toBe(true);

    const ring = await allPosts.evaluate((element) => {
      const styles = getComputedStyle(element);
      return { boxShadow: styles.boxShadow, outline: styles.outlineStyle };
    });
    expect(ring.boxShadow !== "none" || ring.outline !== "none").toBe(true);
  });

  test("filter controls meet the 44px touch target on a coarse pointer", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-mobile",
      "coarse-pointer rule only applies to the mobile project",
    );
    await open(page, "/blog/");

    const links = page.locator(FILTER_LINK);
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    for (let index = 0; index < count; index += 1) {
      const box = await links.nth(index).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    const action = page.locator('[data-post-card] [data-slot="button"]');
    const actionBox = await action.boundingBox();
    expect(actionBox).not.toBeNull();
    expect(actionBox!.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe("blog listing responsive matrix", () => {
  const MATRIX = [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ] as const;

  for (const viewport of MATRIX) {
    test(`index, tag and archive fit ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);

      for (const [path, name] of [
        ["/blog/", "index"],
        [`/blog/tags/${encodeURIComponent(TAG)}/`, "tag"],
        ["/blog/archive/2026/", "archive"],
      ] as const) {
        await open(page, path);
        await expectNoHorizontalOverflow(page, `${path} @ ${viewport.width}px`);
        await screenshot(page, `task-28-blog-${name}-${viewport.width}`);
      }
    });
  }
});
