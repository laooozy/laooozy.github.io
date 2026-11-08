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
const TEMPLATE = "template[data-ig-template]";
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

/** Count the provider entries held by the inert template. */
async function templateEmbedCount(page: Page): Promise<number> {
  return page.locator(TEMPLATE).evaluate((element) => {
    const template = element as HTMLTemplateElement;
    return template.content.querySelectorAll(".ig-embed, .ig-fallback").length;
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
    await expect(page.locator(`${EMBEDS} > *`)).toHaveCount(0);
    await expect(page.locator("script#instagram-embed")).toHaveCount(0);
    expect(await templateEmbedCount(page)).toBeGreaterThan(0);

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
    const inertCount = await templateEmbedCount(page);

    const button = page.getByRole("button", { name: GATE_BUTTON });
    await expect(button).toBeEnabled();
    await button.click();

    await expect(page.locator(EMBEDS)).not.toHaveAttribute("hidden");
    await expect(page.locator(`${EMBEDS} > *`)).toHaveCount(inertCount);
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
    await expect(page.locator(`${EMBEDS} > *`)).toHaveCount(0);
    await expect(page.locator(`${EMBEDS} iframe`)).toHaveCount(0);
    await expect(page.locator(INDEX)).toBeVisible();
    expect(await templateEmbedCount(page)).toBeGreaterThan(0);
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

  test("times out a stalled embed script and keeps retry available", async ({
    page,
  }) => {
    await page.route("**/embed.js", () => new Promise(() => {}));
    await loadPhotography(page);

    const inertCount = await templateEmbedCount(page);
    const button = page.getByRole("button", { name: GATE_BUTTON });
    await expect(button).toBeEnabled();

    const startedAt = Date.now();
    await button.click();

    const alert = page.locator(GATE_ERROR);
    await expect(alert).toBeVisible();
    const elapsedMs = Date.now() - startedAt;

    expect(elapsedMs).toBeGreaterThanOrEqual(300);
    expect(elapsedMs).toBeLessThan(5_000);

    await expect(alert).toContainText("無法載入 Instagram 貼文");
    await expect(page.locator(GATE)).toHaveAttribute("data-ig-state", "error");
    await expect(page.locator(EMBEDS)).toHaveAttribute("hidden", "");
    await expect(page.locator(`${EMBEDS} > *`)).toHaveCount(0);
    await expect(page.locator(INDEX)).toBeVisible();
    await expect(page.getByRole("button", { name: "再試一次" })).toBeEnabled();
    expect(await templateEmbedCount(page)).toBe(inertCount);
  });
});

for (const width of [320, 390, 1440] as const) {
  test.describe(`blocked instagram gate at ${width}px`, () => {
    test.use({ viewport: { width, height: width === 1440 ? 900 : 800 } });

    test("keeps the failure alert inside its box and the viewport", async ({
      page,
    }) => {
      await page.route("**/embed.js", (route) =>
        route.abort("blockedbyclient"),
      );

      await loadPhotography(page);
      await page.getByRole("button", { name: GATE_BUTTON }).click();

      const alert = page.locator(GATE_ERROR);
      await expect(alert).toBeVisible();
      await expect(page.locator(GATE)).toHaveAttribute(
        "data-ig-state",
        "error",
      );

      const alertBox = await alert.boundingBox();
      expect(alertBox).not.toBeNull();
      if (!alertBox) return;

      const parts = [
        {
          label: "title",
          insideAlert: true,
          locator: alert.getByText("無法載入 Instagram 貼文", { exact: true }),
        },
        {
          label: "description",
          insideAlert: true,
          locator: alert.getByText("Instagram 的載入程式被封鎖或連線失敗", {
            exact: false,
          }),
        },
        {
          label: "retry",
          insideAlert: false,
          locator: page.getByRole("button", { name: "再試一次" }),
        },
        {
          label: "link",
          insideAlert: true,
          locator: alert.getByRole("link", {
            name: `在 Instagram 觀看 ${HANDLE}`,
          }),
        },
      ] as const;

      for (const { label, insideAlert, locator } of parts) {
        await expect(locator, label).toBeVisible();
        const box = await locator.boundingBox();
        expect(box, label).not.toBeNull();
        if (!box) continue;

        if (insideAlert) {
          expect(box.x, `${label} left inside alert`).toBeGreaterThanOrEqual(
            alertBox.x - 1,
          );
          expect(
            box.x + box.width,
            `${label} right inside alert`,
          ).toBeLessThanOrEqual(alertBox.x + alertBox.width + 1);
          expect(box.y, `${label} top inside alert`).toBeGreaterThanOrEqual(
            alertBox.y - 1,
          );
          expect(
            box.y + box.height,
            `${label} bottom inside alert`,
          ).toBeLessThanOrEqual(alertBox.y + alertBox.height + 1);
        }

        expect(box.x, `${label} left inside viewport`).toBeGreaterThanOrEqual(
          0,
        );
        expect(
          box.x + box.width,
          `${label} right inside viewport`,
        ).toBeLessThanOrEqual(width);
      }

      const linkBox = await parts[3].locator.boundingBox();
      expect(linkBox?.height ?? 0).toBeGreaterThanOrEqual(44);
      const retryBox = await parts[2].locator.boundingBox();
      expect(retryBox?.height ?? 0).toBeGreaterThanOrEqual(44);
      await expect(parts[2].locator).toBeEnabled();
      expect(
        await alert.evaluate(
          (element) => element.scrollWidth - element.clientWidth,
        ),
        "alert content is not clipped",
      ).toBeLessThanOrEqual(0);

      if (width === 390) {
        await parts[3].locator.scrollIntoViewIfNeeded();
        mkdirSync(SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({
          path: join(
            SCREENSHOT_DIR,
            `task-55-instagram-blocked-390-${test.info().project.name}.png`,
          ),
          fullPage: true,
        });
      }
    });
  });
}

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

test.describe("photography FAQ", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps answers closed until a question is opened", async ({ page }) => {
    await page.goto("/photographer/");

    const items = page.locator("[data-faq-item]");
    await expect(items).toHaveCount(5);

    const openStates = await items.evaluateAll((elements) =>
      elements.map((element) => (element as HTMLDetailsElement).open),
    );
    expect(openStates).toEqual([false, false, false, false, false]);

    const first = items.first();
    const summary = first.locator("summary");
    const answer = first.locator("[data-faq-answer]");
    const arrow = summary.locator("svg");

    const summaryBox = await summary.boundingBox();
    expect(summaryBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    await expect(answer).toBeHidden();
    expect(
      await arrow.evaluate((element) => getComputedStyle(element).rotate),
    ).toBe("none");

    await summary.click();

    await expect(first).toHaveAttribute("open", "");
    await expect(answer).toBeVisible();
    await expect
      .poll(() => arrow.evaluate((element) => getComputedStyle(element).rotate))
      .toBe("180deg");

    await summary.click();

    await expect(first).not.toHaveAttribute("open", "");
    await expect(answer).toBeHidden();
  });
});
