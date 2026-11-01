import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow } from "./helpers/overflow";
import { expectTouchTarget } from "./helpers/target-size";

/**
 * Focused scroll-control contract for Task 21.
 *
 * There is exactly ONE fixed scroll control (back to top): hidden at the top of
 * the document, visible after a scrolled threshold, 44x44 under a coarse
 * pointer, and it never covers a music row once the list has been scrolled to
 * its end (the `<main>` bottom gutter reserves that band). Clicking it returns
 * to the top, and under `prefers-reduced-motion: reduce` the DOM port requests
 * an instant (`behavior: "auto"`) jump instead of a smooth scroll.
 *
 * `/music/` is the surface under test because its card rows span the content
 * column and are the tightest fit against the fixed control. The payload is
 * served from a local fixture so the list is deterministic and does not depend
 * on the remote `music_asset` branch.
 */

const CONTROL = "[data-back-to-top]";
const SONG_COUNT = 24;
const SCREENSHOT_DIR = join(
  process.cwd(),
  ".omo/evidence/architecture-artwork-refactor/screenshots",
);

/** A valid generated payload (hosts match the domain schema). */
const MUSIC_PAYLOAD = {
  version: 1,
  generatedAt: "2026-01-01T00:00:00.000Z",
  playlist: {
    id: "PLscrollcontrols",
    title: "Scroll control fixture",
    url: "https://www.youtube.com/playlist?list=PLscrollcontrols",
  },
  organisations: {},
  songs: Array.from({ length: SONG_COUNT }, (_, index) => ({
    id: `song-${index}`,
    title: `Fixture song ${index + 1}`,
    artist: "Fixture artist",
    artistId: "fixture-artist",
    org: null,
    thumb: `https://i.ytimg.com/vi/fixture${index}/hqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=fixture${index}`,
  })),
};

/** Serve the playlist payload from memory so rows always render. */
async function stubMusic(page: Page) {
  await page.route("**/music.json.gz", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MUSIC_PAYLOAD),
    }),
  );
}

/** Wait for a `client:load` island to finish hydrating (it loses `ssr`). */
async function waitForIsland(page: Page, component: string) {
  await page.waitForFunction((name) => {
    const island = document.querySelector(
      `astro-island[component-url*="${name}"]`,
    );
    return island !== null && !island.hasAttribute("ssr");
  }, component);
}

/** Load `/music/` with the stubbed payload and wait for the control. */
async function openMusicWithControl(page: Page) {
  await stubMusic(page);
  await page.goto("/music/");
  await waitForIsland(page, "MusicLibrary");
  await waitForIsland(page, "ScrollControls");
  await expect(page.locator(".song-row")).toHaveCount(SONG_COUNT);
}

/**
 * Scroll to the absolute bottom, where the control must be visible.
 * `behavior: "instant"` is deliberate: the document's CSS `scroll-behavior:
 * smooth` would otherwise make a plain `scrollTo` animate, and the intersection
 * measurement could land mid-flight.
 */
async function scrollToBottom(page: Page) {
  await page.evaluate(() => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "instant",
    });
  });
  await page.waitForFunction(() => {
    const max = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    return max > 500 && Math.abs(window.scrollY - max) <= 1;
  });
}

interface RowRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Every music row that overlaps the control's box, measured live. */
async function overlappingRows(page: Page): Promise<{
  control: RowRect | null;
  rows: number;
  overlapping: number[];
}> {
  return page.evaluate(() => {
    const control = document.querySelector("[data-back-to-top]");
    if (!(control instanceof HTMLElement)) {
      return { control: null, rows: 0, overlapping: [] };
    }

    const box = control.getBoundingClientRect();
    const rows = Array.from(document.querySelectorAll(".song-row"));
    const overlapping: number[] = [];

    rows.forEach((row, index) => {
      const rect = row.getBoundingClientRect();
      const intersects =
        rect.left < box.right &&
        rect.right > box.left &&
        rect.top < box.bottom &&
        rect.bottom > box.top;
      if (intersects) overlapping.push(index);
    });

    return {
      control: {
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        left: box.left,
      },
      rows: rows.length,
      overlapping,
    };
  });
}

/** Record every `window.scrollTo` call so the motion behaviour is provable. */
async function recordScrollCalls(page: Page) {
  await page.addInitScript(() => {
    const target = window as unknown as {
      __scrollCalls?: Array<ScrollToOptions | { left: number; top: number }>;
    };
    target.__scrollCalls = [];
    const original = window.scrollTo.bind(window);

    window.scrollTo = function scrollToSpy(
      ...args: [ScrollToOptions] | [number, number]
    ) {
      const [first, second] = args;
      if (typeof first === "object") {
        target.__scrollCalls?.push({ ...first });
      } else {
        target.__scrollCalls?.push({ left: first, top: second });
      }
      return original(...(args as [ScrollToOptions]));
    } as typeof window.scrollTo;
  });
}

test.describe("single back-to-top control", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("is the only control, hidden at the top, visible after scrolling, and clears every music row", async ({
    page,
  }) => {
    await openMusicWithControl(page);

    // Exactly one scroll control: the old down arrow must be gone.
    await expect(page.locator(CONTROL)).toHaveCount(1);
    await expect(page.locator("[data-back-to-bottom]")).toHaveCount(0);

    const control = page.locator(CONTROL);
    await expect(control).toHaveAttribute("data-visible", "false");
    await expect(control).toBeHidden();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    // 44x44: the visible box is a full coarse-pointer target.
    await expectTouchTarget(page, CONTROL, "back-to-top");

    await scrollToBottom(page);
    await expect(control).toHaveAttribute("data-visible", "true");
    await expect(control).toBeVisible();

    const overlap = await overlappingRows(page);
    expect(overlap.rows).toBe(SONG_COUNT);
    expect(
      overlap.overlapping,
      `control ${JSON.stringify(overlap.control)} overlaps rows ${overlap.overlapping.join(", ")}`,
    ).toEqual([]);
  });

  test("returns to the top and hides again", async ({ page }) => {
    await openMusicWithControl(page);
    await scrollToBottom(page);

    const control = page.locator(CONTROL);
    await expect(control).toBeVisible();
    await control.click();

    await page.waitForFunction(() => window.scrollY === 0);
    await expect(control).toHaveAttribute("data-visible", "false");
    await expect(control).toBeHidden();
  });
});

test.describe("reduced motion", () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });

  test("jumps to the top instantly with behavior auto", async ({ page }) => {
    await recordScrollCalls(page);
    await openMusicWithControl(page);
    await scrollToBottom(page);

    const control = page.locator(CONTROL);
    await expect(control).toBeVisible();
    await control.click();
    await page.waitForFunction(() => window.scrollY === 0);

    const topCall = await page.evaluate(() => {
      const calls =
        (
          window as unknown as {
            __scrollCalls?: Array<
              ScrollToOptions | { left: number; top: number }
            >;
          }
        ).__scrollCalls ?? [];

      const topCalls = calls.filter(
        (call): call is ScrollToOptions =>
          typeof call === "object" &&
          call !== null &&
          "behavior" in call &&
          call.top === 0,
      );

      return topCalls.at(-1) ?? null;
    });

    expect(topCall).not.toBeNull();
    expect(topCall?.behavior).toBe("auto");
  });
});

for (const width of [320, 390] as const) {
  test.describe(`no horizontal overflow at ${width}px`, () => {
    test.use({ viewport: { width, height: width === 320 ? 800 : 844 } });

    test("the visible control stays inside the viewport", async ({ page }) => {
      await openMusicWithControl(page);
      await scrollToBottom(page);
      await expect(page.locator(CONTROL)).toBeVisible();

      await expectNoHorizontalOverflow(
        page,
        `music + back-to-top @ ${width}px`,
      );
    });
  });
}

for (const width of [390, 1440] as const) {
  test.describe(`screenshot at ${width}px`, () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : 900 } });

    test("captures the control above the music list", async ({ page }) => {
      await openMusicWithControl(page);
      await scrollToBottom(page);

      const control = page.locator(CONTROL);
      await expect(control).toBeVisible();

      mkdirSync(SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({
        path: join(SCREENSHOT_DIR, `task-21-scroll-${width}.png`),
      });
    });
  });
}
