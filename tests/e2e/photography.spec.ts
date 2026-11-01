import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow } from "./helpers/overflow";

/**
 * Photography / Instagram wall.
 *
 * Task 26 owns the at-rest portfolio index; Task 34 owns the consent gate and
 * the embed layer. Together the contract is:
 *
 *  - the index is built from the local `instagramPosts` list and shows an
 *    ordinal, the handle and the post path, with no image or iframe at rest;
 *  - `instagram.com/embed.js` is never requested before consent;
 *  - the gate injects the script exactly once, retires the index and reveals
 *    the embed layer;
 *  - the embed layer is one column at 390 and two from `md` up;
 *  - a blocked script leaves the index in place, keeps the embeds hidden and
 *    shows the gate's destructive alert plus its link-out fallback;
 *  - the 320/390/768/1024/1440 matrix does not overflow and captures the
 *    390/1440 screenshots.
 */

const INDEX = "[data-ig-gate]";
const CARDS = `${INDEX} .photo-index__card`;
const EMBEDS = "[data-ig-embeds]";
const GATE = "[data-ig-consent]";
const GATE_ERROR = "[data-ig-gate-error]";
const GATE_BUTTON = "載入 Instagram 貼文";
const HANDLE = "@acg.laooozy";

const THIRD_PARTY = /instagram\.com|cdninstagram\.com|facebook\.com/i;

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

interface CardSummary {
  ordinal: string;
  handle: string;
  path: string;
  href: string;
  target: string;
}

async function loadPhotography(page: Page) {
  await page.goto("/photographer/");
  await page.evaluate(() => document.fonts?.ready);
  await expect(page.locator(INDEX)).toBeVisible();
  await expect(page.locator(GATE)).toBeVisible();
  await expect(
    page.locator('astro-island[component-url*="InstagramGate"]'),
  ).not.toHaveAttribute("ssr", "");
}

/** Every request the page makes to an Instagram/Meta host. */
function watchThirdParty(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request) => {
    if (THIRD_PARTY.test(request.url())) urls.push(request.url());
  });
  return urls;
}

/** Replace embed.js with a deterministic stub so no real iframe is created. */
async function stubEmbedScript(page: Page, onRequest?: () => void) {
  await page.route("**/embed.js", async (route) => {
    onRequest?.();
    await route.fulfill({
      contentType: "application/javascript",
      body: "window.__instagramEmbedStub = true;",
    });
  });
}

async function readCards(page: Page): Promise<CardSummary[]> {
  return page.locator(CARDS).evaluateAll((elements) =>
    elements.map((element) => {
      const card = element as HTMLAnchorElement;
      return {
        ordinal:
          card.querySelector(".photo-index__number")?.textContent?.trim() ?? "",
        handle:
          card.querySelector(".photo-index__handle")?.textContent?.trim() ?? "",
        path:
          card.querySelector(".photo-index__path")?.textContent?.trim() ?? "",
        href: card.getAttribute("href") ?? "",
        target: card.getAttribute("target") ?? "",
      };
    }),
  );
}

/** Number of rendered grid tracks in the embed layer. */
async function embedColumnCount(page: Page): Promise<number> {
  return page.locator(EMBEDS).evaluate((element) => {
    const tracks = getComputedStyle(element).gridTemplateColumns;
    return tracks.split(" ").filter(Boolean).length;
  });
}

for (const { width, height } of MATRIX) {
  test.describe(`photography index at ${width}px`, () => {
    test.use({ viewport: { width, height } });

    test("fits the viewport and captures the at-rest index", async ({
      page,
    }, testInfo) => {
      await loadPhotography(page);
      await expectNoHorizontalOverflow(page, `photography @ ${width}px`);

      if (width === 390 || width === 1440) {
        mkdirSync(SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({
          path: join(
            SCREENSHOT_DIR,
            `task-26-photographer-${width}-${testInfo.project.name}.png`,
          ),
          fullPage: true,
        });
      }
    });
  });
}

test.describe("photography at rest", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("renders a local numbered index and no images, embed or script", async ({
    page,
  }) => {
    const thirdParty = watchThirdParty(page);
    await loadPhotography(page);

    const noMedia = await page
      .locator(
        "[data-ig-wall] img, [data-ig-wall] iframe, [data-ig-wall] picture, [data-ig-wall] video",
      )
      .count();
    expect(noMedia).toBe(0);
    await expect(page.locator(EMBEDS)).toHaveAttribute("hidden", "");
    await expect(page.locator("script#instagram-embed")).toHaveCount(0);

    const cards = await readCards(page);
    expect(cards.length).toBeGreaterThan(0);

    for (const [index, card] of cards.entries()) {
      expect(card.ordinal).toBe(String(index + 1).padStart(2, "0"));
      expect(card.handle).toBe(HANDLE);
      expect(card.path).toMatch(/^\/(p|reel)\//);
      expect(card.href).toContain("instagram.com");
      expect(card.target).toBe("_blank");
    }

    expect(thirdParty).toEqual([]);
  });

  test("loads the embed script exactly once after consent", async ({
    page,
  }) => {
    let embedRequests = 0;
    await stubEmbedScript(page, () => {
      embedRequests += 1;
    });

    const thirdParty = watchThirdParty(page);
    await loadPhotography(page);
    expect(thirdParty).toEqual([]);

    const button = page.getByRole("button", { name: GATE_BUTTON });
    await expect(button).toBeEnabled();
    await button.click();

    await expect(page.locator(EMBEDS)).not.toHaveAttribute("hidden");
    await expect(page.locator(INDEX)).toHaveAttribute("hidden", "");
    await expect(page.locator(GATE)).toHaveAttribute("data-ig-state", "loaded");
    await expect(page.locator("script#instagram-embed")).toHaveCount(1);
    await expect.poll(() => embedRequests).toBe(1);
    await expect
      .poll(() => thirdParty.filter((url) => url.includes("embed.js")).length)
      .toBe(1);
  });

  test("keeps the index and shows the failure alert when the script is blocked", async ({
    page,
  }) => {
    await page.route("**/embed.js", (route) => route.abort("blockedbyclient"));

    await loadPhotography(page);
    const button = page.getByRole("button", { name: GATE_BUTTON });
    await expect(button).toBeEnabled();
    await button.click();

    const alert = page.locator(GATE_ERROR);
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("無法載入 Instagram 貼文");
    await expect(
      alert.getByRole("link", { name: `在 Instagram 觀看 ${HANDLE}` }),
    ).toBeVisible();

    await expect(page.locator(GATE)).toHaveAttribute("data-ig-state", "error");
    await expect(page.locator(EMBEDS)).toHaveAttribute("hidden", "");
    await expect(page.locator(`${EMBEDS} iframe`)).toHaveCount(0);
    await expect(page.locator(INDEX)).toBeVisible();
    await expect(page.getByRole("button", { name: "再試一次" })).toBeEnabled();

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({
      path: join(
        SCREENSHOT_DIR,
        `task-34-instagram-blocked-${test.info().project.name}.png`,
      ),
      fullPage: true,
    });
  });
});

for (const width of [390, 1440] as const) {
  test.describe(`instagram embeds at ${width}px`, () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : 900 } });

    test("reveals a responsive embed layer after consent", async ({
      page,
    }, testInfo) => {
      await stubEmbedScript(page);
      await loadPhotography(page);

      await page.getByRole("button", { name: GATE_BUTTON }).click();
      await expect(page.locator(EMBEDS)).not.toHaveAttribute("hidden");
      await expect(page.locator(EMBEDS)).toHaveAttribute(
        "data-pagefind-ignore",
        "",
      );
      await expect(page.locator(INDEX)).toHaveAttribute("hidden", "");

      expect(await embedColumnCount(page)).toBe(width === 390 ? 1 : 2);
      await expectNoHorizontalOverflow(page, `instagram embeds @ ${width}px`);

      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      mkdirSync(SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({
        path: join(
          SCREENSHOT_DIR,
          `task-34-instagram-loaded-${width}-${testInfo.project.name}.png`,
        ),
        fullPage: true,
      });
    });
  });
}
