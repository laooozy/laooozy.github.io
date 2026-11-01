import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow } from "./helpers/overflow";

/**
 * Task 27 — the shared back link and the rebuilt Links page.
 *
 * The contract:
 *  - ONE back-link implementation (`[data-back-link]`) on every page that had
 *    its own copy: `/photographer/`, `/music/`, `/links/`;
 *  - its label follows all three locales through the static `<T>` toggle;
 *  - the links list stays sourced from `src/content/links/index.md`, but is
 *    rendered as shadcn cards whose text wraps with `keep-all` + `anywhere`, so
 *    short CJK compounds never split and a long run never overflows;
 *  - 320/390/768/1024/1440 fit, with 390/1440 screenshots.
 */

const ROUTES = ["/photographer/", "/music/", "/links/"] as const;

const LABELS = {
  "zh-hant": "回到首頁",
  "zh-hans": "回到首页",
  en: "Back to home",
} as const;

type Locale = keyof typeof LABELS;

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

/** Seed the pre-paint locale before the first document runs. */
async function useLocale(page: Page, locale: Locale) {
  await page.addInitScript((value) => {
    window.localStorage.setItem("locale", value);
  }, locale);
}

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.evaluate(() => document.fonts?.ready);
}

test.describe("shared back link", () => {
  for (const route of ROUTES) {
    test(`${route} renders exactly one shared back link`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await open(page, route);

      const backLink = page.locator("[data-back-link]");
      await expect(backLink).toHaveCount(1);
      await expect(backLink).toHaveAttribute("href", "/");
      await expect(backLink).toHaveAccessibleName(LABELS["zh-hant"]);

      const box = await backLink.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    });
  }

  for (const locale of Object.keys(LABELS) as Locale[]) {
    test(`the back label follows the ${locale} locale`, async ({ page }) => {
      await useLocale(page, locale);
      await open(page, "/links/");

      await expect(page.locator("html")).toHaveAttribute("data-locale", locale);
      await expect(page.locator("[data-back-link]")).toHaveAccessibleName(
        LABELS[locale],
      );
      await expect(
        page.locator(`[data-back-link] [data-l="${locale}"]`),
      ).toBeVisible();
    });
  }
});

test.describe("links list", () => {
  test("renders the Markdown entry as cards, not as raw prose", async ({
    page,
  }) => {
    await open(page, "/links/");

    const cards = page.locator("[data-link-card]");
    await expect(cards).toHaveCount(1);

    const card = cards.first();
    await expect(card.locator('[data-slot="card-title"]')).toHaveText(
      "laooozy/laooozy.github.io",
    );
    await expect(card.locator('[data-slot="card-description"]')).toHaveText(
      "這個網站的源碼",
    );

    const action = card.locator('[data-slot="button"]');
    await expect(action).toHaveAttribute(
      "href",
      "https://github.com/laooozy/laooozy.github.io",
    );
    await expect(action).toHaveAttribute("target", "_blank");
    await expect(action).toContainText("github.com");
  });

  test("short CJK compounds stay whole while a long label wraps", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, "/links/");

    const title = page
      .locator('[data-link-card] [data-slot="card-title"]')
      .first();

    const LONG_CJK =
      "這是一個很長的中文連結標題，用來測試換行時不會把開源專案拆開，而且整張卡片不會超出畫面";
    await title.evaluate((element, value) => {
      element.textContent = value;
    }, LONG_CJK);

    const styles = await title.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        wordBreak: computed.wordBreak,
        overflowWrap: computed.overflowWrap,
      };
    });
    expect(styles.wordBreak).toBe("keep-all");
    expect(styles.overflowWrap).toBe("anywhere");

    // `開源專案` must be a single line fragment: if the browser split the
    // compound, the Range would report two client rects.
    const fragments = await title.evaluate((element, compound) => {
      const text = element.firstChild;
      if (!text || text.nodeType !== Node.TEXT_NODE) return -1;
      const source = text.textContent ?? "";
      const start = source.indexOf(compound);
      if (start === -1) return -1;
      const range = document.createRange();
      range.setStart(text, start);
      range.setEnd(text, start + compound.length);
      return range.getClientRects().length;
    }, "開源專案");

    expect(fragments).toBe(1);
    await expectNoHorizontalOverflow(page, "links long CJK @ 390px");
  });
});

for (const { width, height } of MATRIX) {
  test.describe(`links at ${width}px`, () => {
    test.use({ viewport: { width, height } });

    test("fits the viewport and captures the rebuilt page", async ({
      page,
    }, testInfo) => {
      await open(page, "/links/");
      await expectNoHorizontalOverflow(page, `links @ ${width}px`);

      if (width === 390 || width === 1440) {
        mkdirSync(SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({
          path: join(
            SCREENSHOT_DIR,
            `task-27-links-${width}-${testInfo.project.name}.png`,
          ),
          fullPage: true,
        });
      }
    });
  });
}
