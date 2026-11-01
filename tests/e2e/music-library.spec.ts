import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow } from "./helpers/overflow";
import {
  expectMinimumFontSize,
  expectTouchTarget,
} from "./helpers/target-size";

/**
 * Task 31 — the rebuilt `/music/` library.
 *
 * The contract under test:
 *  - a fixed fixture payload (never the live `music_asset` branch) renders
 *    exactly `songs.length` rows, the last one reachable by scrolling;
 *  - every row carries `content-visibility: auto` plus an intrinsic size, so
 *    off-screen rows can be skipped while the whole list stays in the DOM;
 *  - search, artist and organisation filters update the visible rows and the
 *    count without changing the URL;
 *  - the phone filter disclosure opens and its controls are 44px / 16px;
 *  - an empty payload and a failed fetch each render their own state, and the
 *    retry recovers;
 *  - no horizontal overflow at 320/390, with 390/1440 screenshots.
 */

const SCREENSHOT_DIR = join(
  process.cwd(),
  ".omo/evidence/architecture-artwork-refactor/screenshots",
);

const SONG_COUNT = 24;

const ORG_LABELS = { indie: "Indie", label: "Label" } as const;

const SONGS = Array.from({ length: SONG_COUNT }, (_, index) => ({
  id: `music-fixture-${index}`,
  title: `Song ${String(index + 1).padStart(2, "0")}`,
  artist: index % 2 === 0 ? "Aurora" : "Bassline",
  artistId: index % 2 === 0 ? "nova" : "bass",
  org: index % 3 === 0 ? "indie" : index % 3 === 1 ? "label" : null,
  thumb: `https://i.ytimg.com/vi/musicfixture${index}/hqdefault.jpg`,
  url: `https://www.youtube.com/watch?v=musicfixture${index}`,
}));

const MUSIC_PAYLOAD = {
  version: 1,
  generatedAt: "2026-01-01T00:00:00.000Z",
  playlist: {
    id: "PLmusicfixture",
    title: "Music library fixture",
    url: "https://www.youtube.com/playlist?list=PLmusicfixture",
  },
  organisations: ORG_LABELS,
  songs: SONGS,
};

const EMPTY_PAYLOAD = { ...MUSIC_PAYLOAD, songs: [] };

/** A 1x1 transparent PNG so fixture thumbnails never hit the network. */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function stubImages(page: Page) {
  await page.route(/i\.ytimg\.com/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: TINY_PNG,
    }),
  );
}

/** Serve a fixed payload (or a status) from memory. */
async function stubMusic(
  page: Page,
  payload: unknown = MUSIC_PAYLOAD,
  status = 200,
) {
  await stubImages(page);
  await page.route("**/music.json.gz", (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: status === 200 ? JSON.stringify(payload) : "{}",
    }),
  );
}

async function waitForIsland(page: Page, component: string) {
  await page.waitForFunction((name) => {
    const island = document.querySelector(
      `astro-island[component-url*="${name}"]`,
    );
    return island !== null && !island.hasAttribute("ssr");
  }, component);
}

async function openMusic(page: Page) {
  await page.goto("/music/");
  await waitForIsland(page, "MusicLibrary");
  await expect(page.locator("[data-music-row]").first()).toBeVisible();
}

async function openFilters(page: Page) {
  if ((await page.locator("[data-music-artist]:visible").count()) === 0) {
    await page.locator("[data-music-filter-trigger]").click();
  }
  await expect(page.locator("[data-music-artist]:visible")).toBeVisible();
}

async function countText(page: Page): Promise<string> {
  return (await page.locator("[data-music-count]").textContent()) ?? "";
}

test.describe("music library rows", () => {
  test("renders every fixture song and scrolls to the last row", async ({
    page,
  }) => {
    await stubMusic(page);
    await openMusic(page);

    const rows = page.locator("[data-music-row]");
    await expect(rows).toHaveCount(SONG_COUNT);
    await expect(rows.first()).toContainText("Song 01");
    await expect(rows.last()).toContainText("Song 24");
    expect(await countText(page)).toContain(String(SONG_COUNT));

    const firstBox = await rows.first().boundingBox();
    const lastBoxBefore = await rows.last().boundingBox();
    expect(firstBox).not.toBeNull();
    expect(lastBoxBefore).not.toBeNull();
    expect(firstBox!.y).toBeLessThan(844);
    expect(lastBoxBefore!.y).toBeGreaterThan(844);

    await rows.last().scrollIntoViewIfNeeded();
    await expect(rows.last()).toBeInViewport();
    await expect(rows.last()).toContainText("Song 24");
  });

  test("rows opt into content-visibility auto with an intrinsic size", async ({
    page,
  }) => {
    await stubMusic(page);
    await openMusic(page);

    const styles = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-music-row]")).map((row) => {
        const style = getComputedStyle(row);
        return {
          contentVisibility: style.contentVisibility,
          containIntrinsicSize: style.containIntrinsicSize,
        };
      }),
    );

    expect(styles).toHaveLength(SONG_COUNT);
    for (const style of styles) {
      expect(style.contentVisibility).toBe("auto");
      expect(style.containIntrinsicSize).not.toBe("none");
    }

    // The deterministic paint proxy: at rest only the top of the list is in
    // the viewport; the last row is far below it and can be skipped. After the
    // scroll the last row is the visible subset and is painted.
    const visibility = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("[data-music-row]"));
      const first = rows[0]?.getBoundingClientRect();
      const last = rows.at(-1)?.getBoundingClientRect();
      return {
        firstOnScreen: Boolean(
          first && first.top < window.innerHeight && first.bottom > 0,
        ),
        lastOnScreen: Boolean(
          last && last.top < window.innerHeight && last.bottom > 0,
        ),
      };
    });
    expect(visibility.firstOnScreen).toBe(true);
    expect(visibility.lastOnScreen).toBe(false);

    await page.locator("[data-music-row]").last().scrollIntoViewIfNeeded();
    await expect(page.locator("[data-music-row]").last()).toBeInViewport();
  });
});

test.describe("sticky toolbar", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("sticks under the header, then to the top once the header hides", async ({
    page,
  }) => {
    await stubMusic(page);
    await openMusic(page);

    const toolbar = page.locator("[data-music-toolbar]");
    expect(
      await toolbar.evaluate((element) => getComputedStyle(element).position),
    ).toBe("sticky");

    await page.evaluate(() =>
      window.scrollTo({ top: 1200, behavior: "instant" }),
    );
    await page.waitForFunction(() => {
      const element = document.querySelector("[data-music-toolbar]");
      return element && Math.round(element.getBoundingClientRect().top) === 0;
    });
    await expect(page.locator("[data-site-header]")).toHaveAttribute(
      "data-hidden",
      "",
    );

    await page.evaluate(() =>
      window.scrollTo({ top: 900, behavior: "instant" }),
    );
    await page.waitForFunction(() => {
      const element = document.querySelector("[data-music-toolbar]");
      if (!element) return false;
      const headerHeight = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--header-height",
        ),
      );
      return Math.abs(element.getBoundingClientRect().top - headerHeight) <= 1;
    });
    await expect(page.locator("[data-site-header]")).not.toHaveAttribute(
      "data-hidden",
      "",
    );
  });
});

test.describe("music search and filters", () => {
  test("search, artist, organisation and clear update the rows and count", async ({
    page,
  }) => {
    await stubMusic(page);
    await openMusic(page);
    const url = page.url();

    await page.locator("#music-search").fill("Song 07");
    await expect(page.locator("[data-music-row]")).toHaveCount(1);
    await expect(page.locator("[data-music-row]")).toContainText("Song 07");
    expect(await countText(page)).toContain("1");

    await page.locator("#music-search").fill("");
    await openFilters(page);
    await page.locator("[data-music-artist]:visible").selectOption("nova");
    await expect(page.locator("[data-music-row]")).toHaveCount(12);
    expect(await countText(page)).toContain("12");

    await page.locator("[data-music-artist]:visible").selectOption("");
    await page.locator("[data-music-org]:visible").selectOption("indie");
    await expect(page.locator("[data-music-row]")).toHaveCount(8);
    expect(await countText(page)).toContain("8");

    // No URL/query state: filtering is client state only.
    expect(page.url()).toBe(url);
  });

  test("no matches show the empty result state and clear restores the list", async ({
    page,
  }) => {
    await stubMusic(page);
    await openMusic(page);

    await page.locator("#music-search").fill("no such song");
    await expect(page.locator("[data-music-row]")).toHaveCount(0);
    await expect(page.locator('[data-slot="empty-title"]')).toHaveText(
      "沒有符合的歌曲。",
    );

    await page.getByRole("button", { name: "全部" }).click();
    await expect(page.locator("[data-music-row]")).toHaveCount(SONG_COUNT);
    await expect(page.locator("#music-search")).toHaveValue("");
  });
});

test.describe("mobile filter disclosure", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opens from a 44px trigger and exposes 16px selects", async ({
    page,
  }) => {
    await stubMusic(page);
    await openMusic(page);

    await expect(page.locator("[data-music-artist]:visible")).toHaveCount(0);
    const trigger = page.locator("[data-music-filter-trigger]");
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expectTouchTarget(page, "[data-music-filter-trigger]", "filters");

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expectMinimumFontSize(
      page,
      "#music-mobile-artist",
      16,
      "artist select",
    );

    await page.locator("[data-music-artist]:visible").selectOption("nova");
    await expect(page.locator("[data-music-row]")).toHaveCount(12);
  });
});

test.describe("loading, empty and error states", () => {
  test("an empty payload shows the empty state and playlist link", async ({
    page,
  }) => {
    await stubMusic(page, EMPTY_PAYLOAD);
    await page.goto("/music/");
    await waitForIsland(page, "MusicLibrary");

    await expect(page.locator('[data-slot="empty-title"]')).toHaveText(
      "歌單暫時沒有歌曲。",
    );
    await expect(page.locator("[data-music-row]")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /在 YouTube 開啟歌單/ }),
    ).toBeVisible();
  });

  test("a failed fetch shows the error state and retry recovers", async ({
    page,
  }) => {
    let requestCount = 0;
    await stubImages(page);
    await page.route("**/music.json.gz", (route) => {
      requestCount += 1;
      if (requestCount === 1) {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: "{}",
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MUSIC_PAYLOAD),
      });
    });

    await page.goto("/music/");
    await waitForIsland(page, "MusicLibrary");
    await expect(
      page.getByText("歌單暫時無法載入，請再試一次。"),
    ).toBeVisible();

    await page.getByRole("button", { name: "重試" }).click();
    await expect(page.locator("[data-music-row]")).toHaveCount(SONG_COUNT);
    await expect(page.getByText("歌單暫時無法載入，請再試一次。")).toHaveCount(
      0,
    );
  });
});

for (const width of [320, 390] as const) {
  test.describe(`no horizontal overflow at ${width}px`, () => {
    test.use({ viewport: { width, height: width === 320 ? 800 : 844 } });

    test("the library and its filters fit the viewport", async ({ page }) => {
      await stubMusic(page);
      await openMusic(page);
      await openFilters(page);
      await expect(page.locator("[data-music-row]")).toHaveCount(SONG_COUNT);
      await expectNoHorizontalOverflow(page, `music library @ ${width}px`);
    });
  });
}

for (const width of [390, 1440] as const) {
  test.describe(`screenshots at ${width}px`, () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : 900 } });

    test("captures the toolbar and the row list", async ({ page }) => {
      await stubMusic(page);
      await openMusic(page);
      await page.evaluate(() => document.fonts?.ready);

      mkdirSync(SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({
        path: join(SCREENSHOT_DIR, `task-31-music-${width}.png`),
        fullPage: false,
      });

      if (width === 390) {
        await page.locator("[data-music-row]").last().scrollIntoViewIfNeeded();
        await expect(page.locator("[data-music-row]").last()).toBeInViewport();
        await page.screenshot({
          path: join(SCREENSHOT_DIR, `task-31-music-${width}-last-row.png`),
          fullPage: false,
        });
      }
    });
  });
}
