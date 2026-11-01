import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow } from "./helpers/overflow";

/**
 * Task 25 — the home bento contract.
 *
 * The page body is authored MDX (`src/content/pages/home.mdx`) and rendered at
 * build time, so these assertions run against the real stylesheet:
 *
 *  - the 320/390/768/1024/1440 matrix neither overflows nor collapses;
 *  - every About card ends within 40px of its content at 1440 (the card's own
 *    bottom padding), proving `items-start` keeps short cards from inheriting a
 *    tall neighbour's dead space;
 *  - a sixth card auto-places without becoming a full-width orphan;
 *  - the LatestPosts grid defines a distinct layout for 1, 2, 3 and 4 cards.
 */

const INTEREST = "#about .interest";
const BENTO = "#about [data-home-bento]";
const POST_GRID = "#blog .grid--cards";

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

interface CardMeasurement {
  id: string;
  gap: number;
  width: number;
  height: number;
}

interface SixthCardMeasurement {
  gridWidth: number;
  cloneWidth: number;
  ratio: number;
  scrollWidth: number;
  clientWidth: number;
}

/** Navigate and settle webfonts so line wrapping (and therefore heights) is stable. */
async function loadHome(page: Page) {
  await page.goto("/");
  await page.evaluate(() => document.fonts?.ready);
  await expect(page.locator(BENTO)).toBeVisible();
}

for (const { width, height } of MATRIX) {
  test.describe(`home layout at ${width}px`, () => {
    test.use({ viewport: { width, height } });

    test("fits the viewport and captures a screenshot", async ({
      page,
    }, testInfo) => {
      await loadHome(page);

      await expectNoHorizontalOverflow(page, `home @ ${width}px`);
      await expect(page.locator(INTEREST)).toHaveCount(5);

      mkdirSync(SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({
        path: join(
          SCREENSHOT_DIR,
          `task-25-home-${width}-${testInfo.project.name}.png`,
        ),
        fullPage: true,
      });
    });
  });
}

test.describe("home bento at 1440px", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("each interest card ends within 40px of its content", async ({
    page,
  }) => {
    await loadHome(page);

    const cards = await page
      .locator(INTEREST)
      .evaluateAll((elements): CardMeasurement[] =>
        elements.map((element) => {
          const card = element as HTMLElement;
          const body = card.lastElementChild as HTMLElement | null;
          const cardRect = card.getBoundingClientRect();
          const contentBottom = body
            ? body.getBoundingClientRect().bottom
            : cardRect.bottom;

          return {
            id: card.id || card.className,
            gap: Math.round((cardRect.bottom - contentBottom) * 100) / 100,
            width: Math.round(cardRect.width * 100) / 100,
            height: Math.round(cardRect.height * 100) / 100,
          };
        }),
      );

    expect(cards).toHaveLength(5);

    for (const card of cards) {
      expect(
        card.gap,
        `${card.id} (${card.width}x${card.height}px): content sits ${card.gap}px above the card bottom, expected <= 40px`,
      ).toBeLessThanOrEqual(40);
    }

    const photography = cards.find((card) => card.id.includes("photography"));
    const runner = cards.find((card) => card.id.includes("runner"));
    expect(photography, "photography feature card").toBeTruthy();
    expect(runner, "running card").toBeTruthy();
    // The featured card spans two of the three desktop tracks.
    expect(photography!.width).toBeGreaterThan(runner!.width * 1.5);
  });

  test("a sixth card reflows without a full-width orphan", async ({ page }) => {
    await loadHome(page);

    const measurement = await page.evaluate(
      (selector): SixthCardMeasurement => {
        const grid = document.querySelector<HTMLElement>(selector);
        if (!grid)
          throw new Error(`sixth-card probe: no element matches ${selector}`);

        const last = grid.lastElementChild;
        if (!last) throw new Error("sixth-card probe: the bento grid is empty");

        const clone = last.cloneNode(true) as HTMLElement;
        clone.removeAttribute("id");
        clone.dataset.clone = "sixth";
        grid.append(clone);

        const gridRect = grid.getBoundingClientRect();
        const cloneRect = clone.getBoundingClientRect();
        const root = document.documentElement;

        return {
          gridWidth: gridRect.width,
          cloneWidth: cloneRect.width,
          ratio: cloneRect.width / gridRect.width,
          scrollWidth: root.scrollWidth,
          clientWidth: root.clientWidth,
        };
      },
      BENTO,
    );

    // A third-row orphan would sit at one track (1/3 of the grid), never full width.
    expect(measurement.ratio).toBeLessThan(0.75);
    expect(measurement.cloneWidth).toBeGreaterThan(0);
    expect(measurement.scrollWidth).toBeLessThanOrEqual(
      measurement.clientWidth,
    );
  });

  test("LatestPosts defines a layout for 1, 2, 3 and 4 cards", async ({
    page,
  }) => {
    await loadHome(page);

    const layouts = await page.evaluate((selector) => {
      const grid = document.querySelector<HTMLElement>(selector);
      if (!grid)
        throw new Error(`latest-posts probe: no element matches ${selector}`);

      const originals = Array.from(grid.children).map((child) =>
        child.cloneNode(true),
      );

      const result: Record<
        number,
        { tracks: number; cardWidth: number; gridWidth: number }
      > = {};

      for (const count of [1, 2, 3, 4]) {
        grid.replaceChildren(
          ...originals.slice(0, count).map((child) => child.cloneNode(true)),
        );
        grid.setAttribute("data-count", String(count));

        const tracks = getComputedStyle(grid)
          .gridTemplateColumns.split(" ")
          .filter(Boolean);
        const first = grid.firstElementChild;

        result[count] = {
          tracks: tracks.length,
          cardWidth: first ? first.getBoundingClientRect().width : 0,
          gridWidth: grid.getBoundingClientRect().width,
        };
      }

      return result;
    }, POST_GRID);

    for (const count of [1, 2, 3, 4]) {
      expect(layouts[count].tracks, `data-count=${count} tracks`).toBe(count);
      expect(layouts[count].cardWidth).toBeGreaterThan(0);
      expect(layouts[count].cardWidth).toBeLessThanOrEqual(
        layouts[count].gridWidth,
      );
    }

    // One post widens past the old lonely 26rem tile on a wide screen.
    expect(layouts[1].cardWidth).toBeGreaterThan(26 * 16);
  });
});
